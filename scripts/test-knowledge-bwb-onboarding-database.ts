import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'
import { extractBwbXmlFullSource } from '../src/lib/knowledge/knowledge-bwb-xml-adapter'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'
import { onboardKnowledgeSource, KnowledgeSourceOnboardingError, type KnowledgeOnboardingInput } from '../src/lib/knowledge/knowledge-source-onboarding-service'
import { getPrisma } from '../src/lib/prisma'

const url = process.env.DATABASE_URL
const xmlPath = process.env.KNOWLEDGE_ARBOWET_BWB_XML
if (!url || !xmlPath) throw new Error('DATABASE_URL en KNOWLEDGE_ARBOWET_BWB_XML zijn vereist.')
const databaseUrl = url
const arbowetXmlPath = xmlPath
const target = new URL(databaseUrl)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_arbowet_onboarding')) throw new Error('Alleen de tijdelijke lokale Arbowet-database is toegestaan.')

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const bytes = await readFile(arbowetXmlPath)
  const checksum = createHash('sha256').update(bytes).digest('hex')
  if (checksum !== '73eab70e3a47370f63c5b4a2e5509a1f787578ca314a23bf77596e2444aa0a59') throw new Error('De officiële Arbowet-checksum wijkt af.')
  const xml = bytes.toString('utf8')
  const extraction = extractBwbXmlFullSource(xml)
  const db = getPrisma()
  const pool = new Pool({ connectionString: databaseUrl })
  const before = {
    claims: await db.knowledgeClaim.count(),
    methods: await db.knowledgeMethod.count(),
    aiSources: await db.knowledgeSource.count({ where: { code: { in: ['AI-01', 'AI-02', 'AI-10'] } } }),
  }
  const input: KnowledgeOnboardingInput = {
    source: {
      code: 'NL-ARBOWET-BWBR0010346', title: 'Arbeidsomstandighedenwet', publisher: 'Nederlandse overheid',
      sourceType: 'LEGISLATION', sourceFormat: 'TEXT', canonicalFamily: 'LEGISLATION', authorityStatus: 'OFFICIAL_PRIMARY',
      canonicalUrl: 'https://wetten.overheid.nl/BWBR0010346/', jurisdiction: 'NL', applicabilityScope: 'Nederlandse arbeidsomstandighedenwetgeving',
      temporalStatus: 'CURRENT', sourceFamily: 'Nederlandse wetgeving', independenceGroup: 'BWBR0010346', isPrimarySource: true,
    },
    version: { versionLabel: '2026-07-01_0', validFrom: new Date('2026-07-01'), checksum },
    artifact: { type: 'OFFICIAL_DOWNLOAD', mediaType: 'application/xml', locator: 'https://repository.officiele-overheidspublicaties.nl/bwb/BWBR0010346/2026-07-01_0/xml/BWBR0010346_2026-07-01_0.xml', checksum, retrievedAt: new Date('2026-08-16T00:00:00Z') },
    scopes: [{ jurisdiction: 'NL', scopeCode: 'NATIONAL_EMPLOYMENT', effect: 'APPLIES', rationale: 'Uitsluitend toepassen binnen het wettelijke toepassingsgebied van de Arbeidsomstandighedenwet.' }],
  }
  const first = await onboardKnowledgeSource(input, db)
  const replay = await onboardKnowledgeSource(input, db)
  if (!first.created || replay.created || replay.sourceVersionId !== first.sourceVersionId) throw new Error('Onboarding-replay is niet idempotent.')
  const storedVersion = await db.knowledgeSourceVersion.findUniqueOrThrow({ where: { id: first.sourceVersionId }, include: { artifacts: true } })
  if (storedVersion.validFrom?.toISOString().slice(0, 10) !== '2026-07-01' || storedVersion.validUntil !== null) throw new Error('Officiële geldigheidsdatum is niet exact opgeslagen.')
  if (storedVersion.checksum !== checksum || storedVersion.artifacts[0]?.checksum !== checksum) throw new Error('XML-checksum is niet intact opgeslagen.')
  const stored = await storeKnowledgeFullSource(first.sourceVersionId, extraction, db)
  const extractionReplay = await storeKnowledgeFullSource(first.sourceVersionId, extraction, db)
  if (!stored.created || extractionReplay.created || extractionReplay.extractionRunId !== stored.extractionRunId) throw new Error('Extractie-replay is niet idempotent.')
  for (const article of [3, 5, 15]) {
    const prefix = `Artikel ${article} `
    const blocks = await db.knowledgeSourceBlock.findMany({ where: { extractionRunId: stored.extractionRunId, sectionPath: { contains: prefix } }, select: { sectionPath: true } })
    if (!blocks.some((block) => block.sectionPath?.includes(`Artikel ${article} `) && block.sectionPath.includes('Lid '))) throw new Error(`Artikel ${article} is niet per lid herleidbaar.`)
  }
  const altered = { ...input, version: { ...input.version, checksum: 'a'.repeat(64) }, artifact: { ...input.artifact, checksum: 'a'.repeat(64) } }
  try { await onboardKnowledgeSource(altered, db); throw new Error('Afwijkende checksum werd geaccepteerd.') } catch (error) {
    if (error instanceof Error && error.message === 'Afwijkende checksum werd geaccepteerd.') throw error
    if (!(error instanceof KnowledgeSourceOnboardingError) || error.code !== 'SOURCE_VERSION_CONFLICT') throw error
  }
  const artifactId = storedVersion.artifacts[0]!.id
  try { await pool.query('UPDATE "KnowledgeSourceArtifact" SET "locator"="locator" WHERE "id"=$1', [artifactId]); throw new Error('Artifact liet mutatie toe.') } catch (error) {
    if (error instanceof Error && error.message === 'Artifact liet mutatie toe.') throw error
  }
  const after = { claims: await db.knowledgeClaim.count(), methods: await db.knowledgeMethod.count(), aiSources: await db.knowledgeSource.count({ where: { code: { in: ['AI-01', 'AI-02', 'AI-10'] } } }) }
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Bestaande Knowledge-structuur is geraakt.')
  console.info(JSON.stringify({ sourceId: first.sourceId, sourceVersionId: first.sourceVersionId, validFrom: '2026-07-01', checksum, sections: 341, blocks: extraction.pages[0].blocks.length, fingerprint: extraction.extractionFingerprint, articles: [3, 5, 15], idempotent: true, immutable: true }))
  await pool.end()
  await db.$disconnect()
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
