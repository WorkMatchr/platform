import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { extractPdfFullSource, normalizeKnowledgeSourceText } from '../src/lib/knowledge/knowledge-extractor'
import { searchKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-search'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'

function requiredEnvironment(name: 'DATABASE_URL' | 'KNOWLEDGE_AI02_TEST_PDF') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is niet geconfigureerd.`)
  return value
}

const connectionString = requiredEnvironment('DATABASE_URL')
const ai02Path = requiredEnvironment('KNOWLEDGE_AI02_TEST_PDF')
const target = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_full_source')) {
  throw new Error('Deze integratietest mag uitsluitend tegen de tijdelijke lokale full-source database draaien.')
}

function run(command: string, args: string[], env = process.env) {
  const result = spawnSync(command, args, { cwd: process.cwd(), env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  return result
}

async function expectImmutable(pool: Pool, table: string, id: string) {
  try {
    await pool.query(`UPDATE "${table}" SET "createdAt" = "createdAt" WHERE "id" = $1`, [id])
    throw new Error(`${table} liet een UPDATE toe.`)
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('liet een UPDATE toe.')) throw error
  }
  try {
    await pool.query(`DELETE FROM "${table}" WHERE "id" = $1`, [id])
    throw new Error(`${table} liet een DELETE toe.`)
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('liet een DELETE toe.')) throw error
  }
}

async function main() {
  run(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  run(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', 'data/knowledge/poc/AI-02.v1.json', '--confirm'])

  const database = getPrisma()
  const sourceVersion = await database.knowledgeSourceVersion.findFirstOrThrow({
    where: { source: { code: 'AI-02' } },
    select: { id: true },
  })
  const baseline = await Promise.all([
    database.knowledgeClaim.count({ where: { citations: { some: { sourceVersionId: sourceVersion.id } } } }),
    database.knowledgeFragment.count({ where: { sourceVersionId: sourceVersion.id } }),
    database.knowledgeCitation.count({ where: { sourceVersionId: sourceVersion.id } }),
  ])
  if (baseline.join(',') !== '8,8,8') throw new Error(`Onverwachte AI-02-uitgangstoestand: ${baseline.join(',')}`)

  const bytes = await readFile(ai02Path)
  const extraction = await extractPdfFullSource(bytes)
  if (extraction.pageCount !== 51) throw new Error(`AI-02 heeft onverwacht ${extraction.pageCount} pagina's.`)
  const first = await storeKnowledgeFullSource(sourceVersion.id, extraction, database)
  const replay = await storeKnowledgeFullSource(sourceVersion.id, extraction, database)
  if (!first.created || replay.created || replay.extractionRunId !== first.extractionRunId) throw new Error('Identieke extractie is niet idempotent hergebruikt.')

  const changed = await extractPdfFullSource(bytes, {
    name: extraction.extractorName,
    version: extraction.extractorVersion,
    configurationVersion: 'FULL_SOURCE_V1_TEST_CHANGED',
  })
  const second = await storeKnowledgeFullSource(sourceVersion.id, changed, database)
  if (!second.created || second.extractionRunId === first.extractionRunId) throw new Error('Gewijzigde extractorconfiguratie maakte geen nieuwe run.')

  const runs = await database.knowledgeExtractionRun.findMany({
    where: { sourceVersionId: sourceVersion.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, previousRunId: true, pages: { select: { id: true, blocks: { select: { id: true, exactText: true, blockType: true } } } } },
  })
  if (runs.length !== 2 || runs[1].previousRunId !== runs[0].id) throw new Error('De extraction-runhistorie is niet lineair herleidbaar.')
  const pageCount = runs[0].pages.length
  const blockCount = runs[0].pages.flatMap((page) => page.blocks).length
  if (pageCount !== 51 || blockCount < 100) throw new Error(`Onvolledige full-source opslag: ${pageCount} pagina's, ${blockCount} blokken.`)

  const claims = await database.knowledgeClaim.findMany({
    where: { citations: { some: { sourceVersionId: sourceVersion.id } } },
    select: { statement: true },
  })
  const claimText = normalizeKnowledgeSourceText(claims.map((claim) => claim.statement).join(' '))
  const eligibleBlocks = runs[1].pages.slice(4, 45).flatMap((page) => page.blocks)
  const outsideClaim = eligibleBlocks.find((block) => normalizeKnowledgeSourceText(block.exactText).includes('dit hoofdstuk geeft een beschrijving van de gezondheidsproblemen'))
    ?? eligibleBlocks.find((block) => block.blockType === 'PARAGRAPH' && block.exactText.length >= 100 && !claimText.includes(normalizeKnowledgeSourceText(block.exactText)))
  if (!outsideClaim) throw new Error('Geen passage buiten de acht bestaande claims gevonden.')
  if (claimText.includes(normalizeKnowledgeSourceText(outsideClaim.exactText))) throw new Error('De zoekproef koos ten onrechte bestaande claiminhoud.')
  const terms = normalizeKnowledgeSourceText(outsideClaim.exactText).includes('beschrijving van de gezondheidsproblemen')
    ? 'beschrijving gezondheidsproblemen'
    : normalizeKnowledgeSourceText(outsideClaim.exactText).split(' ').filter((word) => word.length >= 7).slice(0, 2).join(' ')
  const searchResults = await searchKnowledgeFullSource({ query: terms, sourceCode: 'AI-02', accessTiers: ['INTERNAL_REVIEWER'], limit: 20 })
  if (!searchResults.some((result) => result.blockId === outsideClaim.id)) throw new Error('Een passage buiten de bestaande claims is niet via full-text search teruggevonden.')

  const after = await Promise.all([
    database.knowledgeClaim.count({ where: { citations: { some: { sourceVersionId: sourceVersion.id } } } }),
    database.knowledgeFragment.count({ where: { sourceVersionId: sourceVersion.id } }),
    database.knowledgeCitation.count({ where: { sourceVersionId: sourceVersion.id } }),
  ])
  if (after.join(',') !== baseline.join(',')) throw new Error(`Bestaande AI-02-kennis wijzigde: ${baseline.join(',')} -> ${after.join(',')}`)

  const pool = new Pool({ connectionString })
  const firstPage = runs[0].pages[0]
  const firstBlock = firstPage.blocks[0]
  const fragment = await database.knowledgeFragment.findFirstOrThrow({ where: { sourceVersionId: sourceVersion.id }, select: { id: true } })
  const link = await database.knowledgeFragmentBlock.create({ data: { fragmentId: fragment.id, blockId: firstBlock.id, sequence: 1 }, select: { id: true } })
  await expectImmutable(pool, 'KnowledgeExtractionRun', runs[0].id)
  await expectImmutable(pool, 'KnowledgeSourcePage', firstPage.id)
  await expectImmutable(pool, 'KnowledgeSourceBlock', firstBlock.id)
  await expectImmutable(pool, 'KnowledgeFragmentBlock', link.id)
  await pool.end()

  console.info(JSON.stringify({ pageCount, blockCount, linkedFragmentCount: first.linkedFragmentCount, outsideClaimPassage: outsideClaim.exactText.slice(0, 160), searchResultCount: searchResults.length }))
  await database.$disconnect()
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
