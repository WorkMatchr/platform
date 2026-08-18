import 'dotenv/config'
import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { attachReviewedKnowledgeToExistingSourceVersion } from '../src/lib/knowledge/knowledge-reviewed-attachment-service'

const baseUrl = process.env.DATABASE_URL
if (!baseUrl || /neon|production/iu.test(baseUrl)) throw new Error('TEMPORARY_TEST_DATABASE_REQUIRED')
const connectionString = baseUrl

async function runTest() {
  const database = getPrisma()
  const root = await mkdtemp(path.join(tmpdir(), 'reviewed-attachment-db-'))
  const sourceVersionId = randomUUID(); const blockId = randomUUID(); const otherVersionId = randomUUID()
  const blockText = 'Een gecontroleerde passage uit een bestaande immutable full-source extractie.'
  const textHash = createHash('sha256').update(blockText).digest('hex')
  const pdf = Buffer.from('%PDF-1.4\n%%EOF\n'); const checksum = createHash('sha256').update(pdf).digest('hex')
  await mkdir(path.join(root, 'ai-bladen')); await writeFile(path.join(root, 'ai-bladen', 'source.pdf'), pdf)
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify({ schemaVersion: '2.0', sources: [{ code: 'AI-ATTACH', sourceKind: 'AI_SHEET', sourceType: 'AI_SHEET', format: 'PDF', logicalPath: 'ai-bladen/source.pdf', sha256: checksum }] }))
  process.env.KNOWLEDGE_SOURCE_ROOT = root; process.env.KNOWLEDGE_SOURCE_MANIFEST = path.join(root, 'manifest.json')
  const source = await database.knowledgeSource.create({ data: { code: 'AI-ATTACH', title: 'Attachmentproef', sourceType: 'AI_SHEET', sourceFormat: 'PDF', metadataStatus: 'COMPLETE', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'TEST', independenceGroup: 'TEST', isPrimarySource: false } })
  await database.knowledgeSourceVersion.create({ data: { id: sourceVersionId, sourceId: source.id, versionLabel: 'v1', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED' } })
  const otherVersion = await database.knowledgeSourceVersion.create({ data: { id: otherVersionId, sourceId: source.id, versionLabel: 'other', checksum: 'b'.repeat(64) } })
  const run = await database.knowledgeExtractionRun.create({ data: { sourceVersionId, extractorName: 'TEST', extractorVersion: '1', configurationVersion: '1', status: 'COMPLETED', pageCount: 1, extractionFingerprint: 'c'.repeat(64), startedAt: new Date(), completedAt: new Date() } })
  const page = await database.knowledgeSourcePage.create({ data: { extractionRunId: run.id, pageNumber: 1, status: 'EXTRACTED', textHash } })
  await database.knowledgeSourceBlock.create({ data: { id: blockId, sourcePageId: page.id, extractionRunId: run.id, globalSequence: 1, pageSequence: 1, blockType: 'PARAGRAPH', exactText: blockText, normalizedSearchText: blockText.toLowerCase(), textHash, extractionMethod: 'TEST' } })
  const packageFile = path.join(root, 'package.json')
  const makePackage = (sourceBlockId: string = blockId) => ({ schemaVersion: '1.1', source: { code: 'AI-ATTACH', title: 'Attachmentproef', publisher: 'Test', publicationDate: '2000-01-01', edition: 'v1', applicabilityScope: 'Test', metadataStatus: 'COMPLETE', language: 'nl', jurisdiction: 'NL', sourceType: 'AI_SHEET', sourceFormat: 'PDF', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'TEST', independenceGroup: 'TEST', isPrimarySource: false }, sourceVersion: { externalKey: 'ai-attach:v1', versionLabel: 'v1', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED' }, topics: [{ externalKey: 'ai-attach:topic', slug: 'attachmentproef', title: 'Attachmentproef', description: 'Tijdelijke integratieproef.', domain: 'OTHER' }], fragments: [{ externalKey: 'ai-attach:f1', sourceVersionKey: 'ai-attach:v1', pageFrom: 1, fragmentType: 'EXACT_PASSAGE', internalExcerpt: blockText, excerptHash: textHash, extractionMethod: 'MANUAL_VERIFIED', requiresReview: true, sourceBlockEvidence: [{ sourceVersionId, sourceBlockId, evidenceRole: 'DIRECT_SUPPORT', blockTextHash: textHash }] }], claims: [{ externalKey: 'ai-attach:c1', topicKey: 'ai-attach:topic', claimType: 'OTHER', statement: blockText, applicability: 'Historische testkennis.', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', confidenceLevel: 'MEDIUM', accessTier: 'INTERNAL_REVIEWER', controlRisk: 'MEDIUM' }], citations: [{ claimKey: 'ai-attach:c1', sourceVersionKey: 'ai-attach:v1', fragmentKey: 'ai-attach:f1', supportType: 'DIRECT_SUPPORT' }], relations: [], rules: [], calculations: [], checklists: [], procedures: [], roles: [], formTemplates: [], importMetadata: { createdAt: '2026-08-18T12:00:00.000Z', createdBy: 'WORKMATCHR_TEST', uncertainties: ['Integratieproef.'] } })
  const before = { source: await database.knowledgeSource.count(), version: await database.knowledgeSourceVersion.count(), run: await database.knowledgeExtractionRun.count(), page: await database.knowledgeSourcePage.count(), block: await database.knowledgeSourceBlock.count() }
  await writeFile(packageFile, JSON.stringify(makePackage(otherVersion.id)))
  await assert.rejects(() => attachReviewedKnowledgeToExistingSourceVersion(packageFile, { confirm: true }), /andere bronversie|bestaat niet/u)
  assert.equal(await database.knowledgeClaim.count(), 0)
  await writeFile(packageFile, JSON.stringify(makePackage()))
  const first = await attachReviewedKnowledgeToExistingSourceVersion(packageFile, { confirm: true })
  const replay = await attachReviewedKnowledgeToExistingSourceVersion(packageFile, { confirm: true })
  assert.equal(first.reused, false); assert.equal(replay.reused, true)
  assert.equal(await database.knowledgeClaim.count(), 1); assert.equal(await database.knowledgeFragment.count(), 1); assert.equal(await database.knowledgeCitation.count(), 1); assert.equal(await database.knowledgeFragmentBlock.count(), 1)
  assert.deepEqual({ source: await database.knowledgeSource.count(), version: await database.knowledgeSourceVersion.count(), run: await database.knowledgeExtractionRun.count(), page: await database.knowledgeSourcePage.count(), block: await database.knowledgeSourceBlock.count() }, before)
  const changed = makePackage(); changed.claims[0].statement = 'Afwijkende replay met dezelfde code.'; await writeFile(packageFile, JSON.stringify(changed))
  await assert.rejects(() => attachReviewedKnowledgeToExistingSourceVersion(packageFile, { confirm: true }), /wijkt af/u)
  assert.equal(await database.knowledgeClaim.count(), 1)
  assert.equal((await database.knowledgeSourceVersion.findUniqueOrThrow({ where: { id: otherVersion.id } })).id, otherVersionId)
  await database.$disconnect(); await rm(root, { recursive: true, force: true })
  console.info('Reviewed Claims Attachment database-integratietest geslaagd.')
}

async function main() {
  if (process.argv.includes('--run')) return runTest()
  const adminUrl = new URL(connectionString); adminUrl.pathname = '/postgres'
  const dbName = `wm_attach_${randomUUID().replaceAll('-', '')}`; const admin = new Pool({ connectionString: adminUrl.toString() })
  await admin.query(`CREATE DATABASE "${dbName}"`)
  const target = new URL(connectionString); target.pathname = `/${dbName}`
  try {
    const migrate = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (migrate.status !== 0) throw new Error(migrate.stderr || migrate.stdout)
    const test = spawnSync(process.execPath, ['--import', 'tsx', path.resolve('scripts/test-knowledge-reviewed-attachment-database.ts'), '--run'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (test.status !== 0) throw new Error(test.stderr || test.stdout)
    console.info(test.stdout.trim())
  } finally {
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [dbName]); await admin.query(`DROP DATABASE "${dbName}"`); await admin.end()
  }
}
main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
