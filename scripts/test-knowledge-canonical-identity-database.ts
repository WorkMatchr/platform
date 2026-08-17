import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { resolveCanonicalIdentity } from '../src/lib/knowledge/knowledge-canonical-source-identity'
import { extractPdfFullSource } from '../src/lib/knowledge/knowledge-extractor'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'
import { onboardKnowledgeSource, type KnowledgeOnboardingInput } from '../src/lib/knowledge/knowledge-source-onboarding-service'

const url = process.env.DATABASE_URL
const pdfPath = process.env.KNOWLEDGE_AI03_TEST_PDF
if (!url || !pdfPath) throw new Error('DATABASE_URL en KNOWLEDGE_AI03_TEST_PDF zijn vereist.')
const requiredPdfPath = pdfPath
const target = new URL(url)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_canonical_identity')) throw new Error('Alleen de tijdelijke lokale canonical-identitydatabase is toegestaan.')

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}

const checksum = '69d109e02eb0d966cb2d8d7f5f480a1ce4d682a325235d2078a86476c64b62b0'
function bibliographic(code = 'AI-03', edition = 'Tweede herziene druk', publicationYear = 2001, isbn: string | undefined = '90-12-08941-7'): KnowledgeOnboardingInput {
  return {
    source: { code, title: 'Asbest', publisher: 'Sdu Uitgevers', sourceType: 'AI_SHEET', sourceFormat: 'PDF', canonicalFamily: 'AI_SHEET', authorityStatus: 'PROFESSIONAL_REFERENCE', canonicalIdentity: { type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03', edition, publicationYear, isbn }, jurisdiction: 'NL', applicabilityScope: 'Historische Nederlandse arbo-informatie', temporalStatus: 'HISTORICAL', sourceFamily: 'SZW-AI-BLADEN', independenceGroup: 'SZW-AI-BLADEN', isPrimarySource: false },
    version: { versionLabel: `${publicationYear}-${edition}`, publicationDate: new Date(`${publicationYear}-01-01T00:00:00Z`), checksum },
    artifact: { type: 'LOCAL_SNAPSHOT', mediaType: 'application/pdf', locator: `local-sources/ai-bladen/${code}.pdf`, checksum, retrievedAt: new Date('2026-08-17T00:00:00Z') },
    scopes: [{ jurisdiction: 'NL', scopeCode: 'HISTORICAL_ARBO_INFORMATION', effect: 'CONDITIONAL', rationale: 'Historische vakinformatie; inhoudelijke actualiteitscontrole blijft verplicht.' }],
  }
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const db = getPrisma(); const pool = new Pool({ connectionString: url })

  const legacyId = randomUUID()
  await pool.query(`INSERT INTO "KnowledgeSource" ("id","sourceType","sourceFormat","code","title","copyrightClassification","authorityLevel","temporalStatus","sourceFamily","independenceGroup","isPrimarySource","createdAt","updatedAt") VALUES ($1,'AI_SHEET','PDF','AI-LEGACY-COMPAT','Legacy AI','RESTRICTED_REFERENCE_ONLY','PROFESSIONAL_GUIDANCE','HISTORICAL','SZW-AI-BLADEN','SZW-AI-BLADEN',false,now(),now())`, [legacyId])
  assert.equal(await db.knowledgeSource.count({ where: { id: legacyId } }), 1)

  const first = await onboardKnowledgeSource(bibliographic(), db)
  const replay = await onboardKnowledgeSource(bibliographic(), db)
  assert.equal(first.created, true); assert.equal(replay.created, false); assert.equal(replay.sourceId, first.sourceId)
  const identity = await db.knowledgeSourceCanonicalIdentity.findUniqueOrThrow({ where: { sourceId: first.sourceId } })
  assert.equal(identity.identityType, 'BIBLIOGRAPHIC'); assert.equal(identity.bibliographicIsbn, '9012089417')

  const extraction = await extractPdfFullSource(await readFile(requiredPdfPath))
  const stored = await storeKnowledgeFullSource(first.sourceVersionId, extraction, db)
  const extractionReplay = await storeKnowledgeFullSource(first.sourceVersionId, extraction, db)
  assert.equal(stored.created, true); assert.equal(extractionReplay.created, false); assert.equal(extraction.pages.length, 66)

  await assert.rejects(() => onboardKnowledgeSource({ ...bibliographic(), source: { ...bibliographic().source, code: 'AI-WEAK', canonicalIdentity: { type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03' } } }, db), /Editie of publicatiejaar is verplicht/u)
  await assert.rejects(() => onboardKnowledgeSource({ ...bibliographic('AI-03-CONFLICT'), source: { ...bibliographic('AI-03-CONFLICT').source, title: 'Andere titel', canonicalIdentity: { type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Andere titel', publicationCode: 'AI-03-X', edition: 'Tweede herziene druk', publicationYear: 2001, isbn: '90-12-08941-7' } } }, db), /ISBN hoort al bij conflicterende/u)
  await assert.rejects(() => onboardKnowledgeSource({ ...bibliographic(), version: { ...bibliographic().version, versionLabel: 'afwijkend', checksum: 'b'.repeat(64) }, artifact: { ...bibliographic().artifact, checksum: 'b'.repeat(64) } }, db), /ander artifact/u)

  const nextResolved = resolveCanonicalIdentity({ type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03', edition: 'Derde herziene druk', publicationYear: 2005, supersedesIdentityId: identity.id })
  const nextChecksum = 'c'.repeat(64)
  const nextInput = bibliographic('AI-03-2005', 'Derde herziene druk', 2005, undefined)
  nextInput.source.canonicalIdentity = { type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03', edition: 'Derde herziene druk', publicationYear: 2005, supersedesIdentityId: identity.id }
  nextInput.version.checksum = nextChecksum; nextInput.artifact.checksum = nextChecksum
  const next = await onboardKnowledgeSource(nextInput, db)
  const nextIdentity = await db.knowledgeSourceCanonicalIdentity.findUniqueOrThrow({ where: { sourceId: next.sourceId } })
  assert.equal(nextIdentity.canonicalFingerprint, nextResolved.canonicalFingerprint); assert.equal(nextIdentity.supersedesIdentityId, identity.id)

  const urlInput: KnowledgeOnboardingInput = { ...bibliographic('URL-SOURCE'), source: { ...bibliographic('URL-SOURCE').source, code: 'URL-SOURCE', title: 'URL-bron', publisher: 'Officiële uitgever', canonicalUrl: 'https://example.invalid/source', canonicalIdentity: undefined, canonicalFamily: 'GOVERNMENT_GUIDANCE', sourceType: 'PROFESSIONAL_GUIDANCE', authorityStatus: 'OFFICIAL_GUIDANCE', temporalStatus: 'CURRENT' } }
  urlInput.version.checksum = 'd'.repeat(64); urlInput.artifact.checksum = 'd'.repeat(64)
  const urlSource = await onboardKnowledgeSource(urlInput, db)
  assert.equal((await db.knowledgeSourceCanonicalIdentity.findUniqueOrThrow({ where: { sourceId: urlSource.sourceId } })).identityType, 'URL')

  for (const statement of [`UPDATE "KnowledgeSourceCanonicalIdentity" SET "canonicalFingerprint"="canonicalFingerprint" WHERE "id"=$1`, `DELETE FROM "KnowledgeSourceCanonicalIdentity" WHERE "id"=$1`]) await assert.rejects(() => pool.query(statement, [identity.id]), /immutable/u)
  await pool.query('BEGIN')
  await pool.query(`INSERT INTO "KnowledgeSource" ("id","sourceType","sourceFormat","code","title","copyrightClassification","authorityLevel","temporalStatus","sourceFamily","canonicalFamily","authorityStatus","independenceGroup","isPrimarySource","createdAt","updatedAt") VALUES ($1,'AI_SHEET','PDF',$2,'Direct zonder identiteit','RESTRICTED_REFERENCE_ONLY','PROFESSIONAL_GUIDANCE','HISTORICAL','TEST','AI_SHEET','PROFESSIONAL_REFERENCE','TEST',false,now(),now())`, [randomUUID(), `DIRECT-${randomUUID()}`])
  await assert.rejects(() => pool.query('COMMIT'), /requires exactly one canonical identity/u)
  await pool.query('ROLLBACK').catch(() => undefined)

  console.info(JSON.stringify({ bibliographicSourceId: first.sourceId, identityId: identity.id, fingerprint: identity.canonicalFingerprint, replayIdempotent: true, extractedPages: extraction.pages.length, extractedBlocks: extraction.pages.reduce((sum, page) => sum + page.blocks.length, 0), supersession: nextIdentity.supersedesIdentityId, urlCompatible: true, legacyCompatible: true, immutable: true }))
  await pool.end(); await db.$disconnect()
}
main().catch((error) => { console.error(error); process.exitCode = 1 })
