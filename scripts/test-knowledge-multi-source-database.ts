import 'dotenv/config'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { extractHtmlFullSource, extractPdfFullSource, extractStructuredTextFullSource } from '../src/lib/knowledge/knowledge-extractor'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'
import { onboardKnowledgeSource, type KnowledgeOnboardingInput } from '../src/lib/knowledge/knowledge-source-onboarding-service'

const url = process.env.DATABASE_URL
const pgsPath = process.env.KNOWLEDGE_PGS6_TEST_PDF
if (!url || !pgsPath) throw new Error('DATABASE_URL en KNOWLEDGE_PGS6_TEST_PDF zijn vereist.')
const pgsFilePath = pgsPath
const target = new URL(url)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_multi_source')) throw new Error('Alleen de tijdelijke lokale multi-source database is toegestaan.')
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}

function input(code: string, family: KnowledgeOnboardingInput['source']['canonicalFamily'], format: KnowledgeOnboardingInput['source']['sourceFormat'], checksum: string, scopeCode = 'GENERIC'): KnowledgeOnboardingInput {
  const authority = family === 'LEGISLATION' ? 'OFFICIAL_PRIMARY' : family === 'PGS' ? 'AUTHORIZED_PUBLICATION' : 'OFFICIAL_GUIDANCE'
  return {
    source: { code, title: code, publisher: family, sourceType: family === 'LEGISLATION' ? 'LEGISLATION' : family === 'LABOUR_INSPECTORATE' ? 'INSPECTORATE_GUIDANCE' : 'PROFESSIONAL_GUIDANCE', sourceFormat: format, canonicalFamily: family, authorityStatus: authority, canonicalUrl: `https://example.invalid/${code.toLowerCase()}`, jurisdiction: 'NL', applicabilityScope: scopeCode, temporalStatus: 'CURRENT', sourceFamily: family, independenceGroup: family, isPrimarySource: family === 'LEGISLATION' },
    version: { versionLabel: 'acceptatie-1', checksum },
    artifact: { type: family === 'PGS' ? 'BROWSER_RENDERED_SNAPSHOT' : format === 'PDF' ? 'OFFICIAL_DOWNLOAD' : 'LOCAL_SNAPSHOT', mediaType: format === 'PDF' ? 'application/pdf' : format === 'HTML' ? 'text/html' : 'text/plain', locator: `local-test/${code}`, checksum, retrievedAt: new Date('2026-08-16T00:00:00Z') },
    scopes: [{ jurisdiction: 'NL', scopeCode, effect: scopeCode === 'SEVESO' ? 'CONDITIONAL' : 'APPLIES', rationale: scopeCode === 'SEVESO' ? 'Uitsluitend conditioneel toepasbaar op Seveso-inrichtingen.' : 'Generieke Nederlandse bron binnen de eigen wettelijke of guidance-scope.' }],
  }
}

async function expectImmutable(pool: Pool, table: string, id: string) {
  for (const sql of [`UPDATE "${table}" SET "createdAt"="createdAt" WHERE "id"=$1`, `DELETE FROM "${table}" WHERE "id"=$1`]) {
    try { await pool.query(sql, [id]); throw new Error(`${table} liet mutatie toe.`) } catch (error) { if (error instanceof Error && error.message.endsWith('liet mutatie toe.')) throw error }
  }
}

async function expectDirectPgsRejected(pool: Pool, test: { jurisdiction: string; scope?: { jurisdiction: string; code: string; effect: string } }) {
  const sourceId = randomUUID()
  await pool.query('BEGIN')
  try {
    await pool.query(`INSERT INTO "KnowledgeSource" (
      "id","sourceType","sourceFormat","code","title","publisher","jurisdiction","sourceUrl",
      "copyrightClassification","authorityLevel","temporalStatus","sourceFamily","canonicalFamily",
      "authorityStatus","independenceGroup","isPrimarySource","createdAt","updatedAt"
    ) VALUES ($1,'PROFESSIONAL_GUIDANCE','PDF',$2,'Ongeldige directe PGS-proef','Test',$3,$4,
      'RESTRICTED_REFERENCE_ONLY','OFFICIAL_GUIDANCE','CURRENT','PGS','PGS','AUTHORIZED_PUBLICATION','PGS',false,now(),now())`,
      [sourceId, `PGS-INVALID-${randomUUID()}`, test.jurisdiction, `https://example.invalid/${sourceId}`])
    if (test.scope) await pool.query(`INSERT INTO "KnowledgeSourceApplicability" (
      "sourceId","jurisdiction","scopeCode","effect","rationale"
    ) VALUES ($1,$2,$3,$4::"KnowledgeScopeEffect",'Negatieve databaseproef')`,
      [sourceId, test.scope.jurisdiction, test.scope.code, test.scope.effect])
    await pool.query('COMMIT')
    throw new Error('Directe ongeldige PGS-invoer werd geaccepteerd.')
  } catch (error) {
    await pool.query('ROLLBACK').catch(() => undefined)
    if (error instanceof Error && error.message === 'Directe ongeldige PGS-invoer werd geaccepteerd.') throw error
    if (!(error instanceof Error) || !error.message.includes('Canonical PGS source')) throw error
  }
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const db = getPrisma(); const pool = new Pool({ connectionString: url })
  await expectDirectPgsRejected(pool, { jurisdiction: 'NL' })
  await expectDirectPgsRejected(pool, { jurisdiction: 'US', scope: { jurisdiction: 'NL', code: 'SEVESO', effect: 'CONDITIONAL' } })
  await expectDirectPgsRejected(pool, { jurisdiction: 'NL', scope: { jurisdiction: 'US', code: 'SEVESO', effect: 'CONDITIONAL' } })
  await expectDirectPgsRejected(pool, { jurisdiction: 'NL', scope: { jurisdiction: 'NL', code: 'GENERAL', effect: 'CONDITIONAL' } })
  await expectDirectPgsRejected(pool, { jurisdiction: 'NL', scope: { jurisdiction: 'NL', code: 'SEVESO', effect: 'APPLIES' } })
  const pgsBytes = await readFile(pgsFilePath)
  const documents = [
    { spec: input('ARBEIDSWET-BHV', 'LEGISLATION', 'TEXT', sha('artikel 15')), extraction: extractStructuredTextFullSource([{ heading: 'Artikel 15', paragraphs: ['Bedrijfshulpverleners zijn zodanig opgeleid, uitgerust, in aantal en georganiseerd dat zij hun taken naar behoren kunnen vervullen.'] }]) },
    { spec: input('NLA-BHV-2025', 'LABOUR_INSPECTORATE', 'HTML', sha('nla bhv 2025')), extraction: extractHtmlFullSource('<h1>Bedrijfshulpverlening</h1><p>De BHV-organisatie wordt ingevuld op basis van de RI&E en restrisico’s.</p>') },
    { spec: input('ARBOPORTAAL-BHV', 'GOVERNMENT_GUIDANCE', 'HTML', sha('arboportaal bhv')), extraction: extractHtmlFullSource('<h1>Wat zegt de wet?</h1><p>Het aantal BHV’ers hangt af van de grootte van het bedrijf en de risico’s.</p>') },
    { spec: input('PGS-6-2023', 'PGS', 'PDF', sha(pgsBytes), 'SEVESO'), extraction: await extractPdfFullSource(pgsBytes) },
  ]
  const blockIds: string[] = []
  for (const document of documents) {
    const first = await onboardKnowledgeSource(document.spec, db)
    const replay = await onboardKnowledgeSource(document.spec, db)
    if (!first.created || replay.created || replay.sourceVersionId !== first.sourceVersionId) throw new Error(`Onboarding ${document.spec.source.code} is niet idempotent.`)
    const stored = await storeKnowledgeFullSource(first.sourceVersionId, document.extraction, db)
    const extractionReplay = await storeKnowledgeFullSource(first.sourceVersionId, document.extraction, db)
    if (!stored.created || extractionReplay.created || extractionReplay.extractionRunId !== stored.extractionRunId) throw new Error(`Extractie ${document.spec.source.code} is niet idempotent.`)
    const blocks = await db.knowledgeSourceBlock.findMany({ where: { extractionRunId: stored.extractionRunId, blockType: { not: 'HEADER_FOOTER' } }, orderBy: { globalSequence: 'asc' }, select: { id: true, normalizedSearchText: true } })
    const selected = document.spec.source.canonicalFamily === 'PGS'
      ? blocks.find((block) => block.normalizedSearchText.includes('intern noodplan'))
      : blocks.find((block) => block.normalizedSearchText.length > 20)
    if (!selected) throw new Error(`Geen bruikbaar bewijsblok voor ${document.spec.source.code}.`)
    blockIds.push(selected.id)
  }
  const pgsVersion = await db.knowledgeSourceVersion.findFirstOrThrow({ where: { source: { code: 'PGS-6-2023' } }, include: { applicabilityScopes: true, extractionRuns: { include: { _count: { select: { pages: true } } } }, artifacts: true } })
  if (pgsVersion.extractionRuns[0].pageCount !== 136 || pgsVersion.extractionRuns[0]._count.pages !== 136) throw new Error('PGS 6 is niet 136/136 pagina’s geëxtraheerd.')
  if (!pgsVersion.applicabilityScopes.some((scope) => scope.scopeCode === 'SEVESO' && scope.effect === 'CONDITIONAL')) throw new Error('PGS 6 verloor de conditionele Seveso-scope.')
  const pgsSearch = await db.knowledgeSourceBlock.findMany({ where: { extractionRunId: pgsVersion.extractionRuns[0].id, OR: [{ normalizedSearchText: { contains: 'maatgevende scenario' } }, { normalizedSearchText: { contains: 'intern noodplan' } }, { normalizedSearchText: { contains: 'opleiding' } }] }, select: { normalizedSearchText: true } })
  if (!pgsSearch.some((block) => block.normalizedSearchText.includes('maatgevende')) || !pgsSearch.some((block) => block.normalizedSearchText.includes('noodplan')) || !pgsSearch.some((block) => block.normalizedSearchText.includes('opleiding'))) throw new Error('PGS-scenario/noodplan/BHV-inhoud is niet terugvindbaar.')
  const arbo = documents[2].spec
  const changedChecksum = sha('arboportaal bhv versie 2')
  const nextVersion = await onboardKnowledgeSource({ ...arbo, version: { versionLabel: 'acceptatie-2', checksum: changedChecksum }, artifact: { ...arbo.artifact, checksum: changedChecksum, retrievedAt: new Date('2026-08-17T00:00:00Z') } }, db)
  if (!nextVersion.created || await db.knowledgeSource.count({ where: { code: 'ARBOPORTAAL-BHV' } }) !== 1 || await db.knowledgeSourceVersion.count({ where: { source: { code: 'ARBOPORTAAL-BHV' } } }) !== 2) throw new Error('Een gewijzigde officiële bron maakte geen nieuwe immutable bronversie.')
  const topic = await db.knowledgeTopic.create({ data: { slug: `multi-source-${randomUUID()}`, title: 'Multi-source test', description: 'Tijdelijke acceptatieproef.', domain: 'EMERGENCY_RESPONSE', status: 'DRAFT' } })
  const checklist = await db.knowledgeChecklist.create({ data: { code: `MULTI_SOURCE_${randomUUID().replaceAll('-', '').slice(0, 8)}`, version: 1, title: 'Multi-source BHV', description: 'Acceptatieproef.', topicId: topic.id, audience: 'INTERNAL_REVIEWER', scoringMethod: 'NONE', temporalStatus: 'CURRENT', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT' } })
  const itemId = randomUUID()
  await db.$transaction(async (tx) => {
    await tx.knowledgeChecklistItem.create({ data: { id: itemId, checklistId: checklist.id, order: 1, question: 'Is de BHV-inrichting actueel onderbouwd?', answerType: 'TEXT', required: true } })
    for (const [index, sourceBlockId] of blockIds.entries()) await tx.knowledgeStructuredComponentEvidence.create({ data: { checklistItemId: itemId, sourceBlockId, evidenceRole: 'BASIS', sequence: index + 1, rationale: 'Afzonderlijke actuele bronfamilie voor de acceptatieproef.' } })
  })
  const evidence = await db.knowledgeStructuredComponentEvidence.findMany({ where: { checklistItemId: itemId }, include: { sourceBlock: { include: { sourcePage: { include: { extractionRun: { include: { sourceVersion: { include: { source: true, applicabilityScopes: true } } } } } } } } } })
  const families = new Set(evidence.map((entry) => entry.sourceBlock.sourcePage.extractionRun.sourceVersion.source.canonicalFamily))
  if (evidence.length !== 4 || families.size !== 4) throw new Error('Eén component heeft niet vier onafhankelijke bronfamilies als evidence.')
  const artifact = pgsVersion.artifacts[0]; const scope = pgsVersion.applicabilityScopes[0]
  await expectImmutable(pool, 'KnowledgeSourceArtifact', artifact.id); await expectImmutable(pool, 'KnowledgeSourceApplicability', scope.id)
  try { await pool.query('UPDATE "KnowledgeSource" SET "sourceUrl"=$1 WHERE "code"=$2', ['https://example.invalid/gewijzigd', 'PGS-6-2023']); throw new Error('Canonieke bronidentiteit liet mutatie toe.') } catch (error) { if (error instanceof Error && error.message.endsWith('liet mutatie toe.')) throw error }
  console.info(JSON.stringify({ sources: documents.length, pgsPages: 136, pgsBlocks: await db.knowledgeSourceBlock.count({ where: { extractionRunId: pgsVersion.extractionRuns[0].id } }), pgsScope: 'NL/SEVESO/CONDITIONAL', pgsArtifact: artifact.artifactType, multiSourceEvidence: evidence.length, families: [...families], immutable: true, searchable: ['maatgevende scenario', 'intern noodplan', 'opleiding'] }))
  await pool.end(); await db.$disconnect()
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
