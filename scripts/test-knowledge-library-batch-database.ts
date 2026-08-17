import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getPrisma } from '../src/lib/prisma'
import { storeKnowledgeDocumentFamily } from '../src/lib/knowledge/knowledge-document-family-service'
import { resolveCanonicalIdentity } from '../src/lib/knowledge/knowledge-canonical-source-identity'
import { extractStructuredTextFullSource } from '../src/lib/knowledge/knowledge-extractor'
import { ingestKnowledgeLibraryDocument } from '../src/lib/knowledge/knowledge-library-ingest-service'
import { searchKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-search'
import type { KnowledgeOnboardingInput } from '../src/lib/knowledge/knowledge-source-onboarding-service'

async function main() {
  if (!process.env.DATABASE_URL || /neon|production/iu.test(process.env.DATABASE_URL)) throw new Error('TEST_DATABASE_REQUIRED')
  const database = getPrisma()
  const extraction = extractStructuredTextFullSource([{ heading: 'Veilige batchproef', paragraphs: ['Volledige inhoud voor de atomische ingestproef.'] }])
  const onboarding = (code: string, checksum: string): KnowledgeOnboardingInput => ({
    source: { code, title: 'Gecontroleerde batchbron', publisher: 'NVAB', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'TEXT', canonicalFamily: 'NVAB', authorityStatus: 'PROFESSIONAL_REFERENCE', canonicalUrl: `https://example.invalid/knowledge/${code.toLowerCase()}`, jurisdiction: 'NL', applicabilityScope: 'Nederlandse arbeidsgezondheidszorg', temporalStatus: 'CURRENT', sourceFamily: 'NVAB', independenceGroup: `NVAB:${code}`, isPrimarySource: false },
    version: { versionLabel: '2026', publicationDate: new Date('2026-01-01T00:00:00Z'), checksum },
    artifact: { type: 'LOCAL_SNAPSHOT', mediaType: 'text/plain', locator: `manifest:nvab/${code}.txt`, checksum, retrievedAt: new Date('2026-08-16T00:00:00Z') },
    scopes: [{ jurisdiction: 'NL', scopeCode: 'GENERAL', effect: 'APPLIES', rationale: 'Gecontroleerde tijdelijke acceptatieproef.' }],
  })

  const testCode = (label: string) => `LIB-${label}-${randomUUID().slice(0, 16).toUpperCase()}`
  const atomicCode = testCode('ATOMIC')
  const firstIngest = await ingestKnowledgeLibraryDocument({ onboarding: onboarding(atomicCode, 'c'.repeat(64)), extract: async () => extraction }, database)
  const ingestReplay = await ingestKnowledgeLibraryDocument({ onboarding: onboarding(atomicCode, 'c'.repeat(64)), extract: async () => extraction }, database)
  assert.equal(firstIngest.sourceCreated, true); assert.equal(firstIngest.extractionCreated, true)
  assert.equal(ingestReplay.sourceId, firstIngest.sourceId); assert.equal(ingestReplay.sourceVersionId, firstIngest.sourceVersionId); assert.equal(ingestReplay.extractionRunId, firstIngest.extractionRunId)
  assert.equal(ingestReplay.sourceCreated, false); assert.equal(ingestReplay.extractionCreated, false)

  const nulCode = testCode('NUL')
  const nulExtraction = extractStructuredTextFullSource([{ heading: 'NUL-proef', paragraphs: ['Veilige\u0000 inhoud blijft volledig doorzoekbaar.'] }])
  const nulIngest = await ingestKnowledgeLibraryDocument({ onboarding: onboarding(nulCode, '0'.repeat(64)), extract: async () => nulExtraction }, database)
  const storedNulRun = await database.knowledgeExtractionRun.findUniqueOrThrow({ where: { id: nulIngest.extractionRunId }, include: { pages: { include: { blocks: true } } } })
  assert.match(storedNulRun.warningSummary ?? '', /1 PostgreSQL-onveilige NUL-byte/u)
  assert.equal(storedNulRun.pages[0].blocks[1].exactText, 'Veilige inhoud blijft volledig doorzoekbaar.')
  assert.equal(storedNulRun.pages[0].blocks[1].exactText.includes('\u0000'), false)
  const nulSearch = await searchKnowledgeFullSource({ query: 'volledig doorzoekbaar', sourceCode: nulCode, accessTiers: ['INTERNAL_REVIEWER'] })
  assert.equal(nulSearch[0]?.exactText, 'Veilige inhoud blijft volledig doorzoekbaar.')

  const largeCode = testCode('LARGE')
  let globalSequence = 0
  const largeExtraction = {
    ...extraction,
    pageCount: 120,
    extractionFingerprint: 'f'.repeat(64),
    pages: Array.from({ length: 120 }, (_, pageIndex) => ({
      ...extraction.pages[0],
      pageNumber: pageIndex + 1,
      blocks: Array.from({ length: 30 }, (_, blockIndex) => ({
        ...extraction.pages[0].blocks[1],
        globalSequence: ++globalSequence,
        pageSequence: blockIndex + 1,
        exactText: `Pagina ${pageIndex + 1}, blok ${blockIndex + 1}: grote transactionele extractieproef.`,
        normalizedSearchText: `pagina ${pageIndex + 1}, blok ${blockIndex + 1}: grote transactionele extractieproef.`,
      })),
    })),
  }
  const largeIngest = await ingestKnowledgeLibraryDocument({ onboarding: onboarding(largeCode, 'f'.repeat(64)), extract: async () => largeExtraction }, database)
  assert.equal(await database.knowledgeSourcePage.count({ where: { extractionRunId: largeIngest.extractionRunId } }), 120)
  assert.equal(await database.knowledgeSourceBlock.count({ where: { extractionRunId: largeIngest.extractionRunId } }), 3_600)
  assert.equal(await database.knowledgeSourceBlock.count({ where: { extractionRunId: largeIngest.extractionRunId, sourcePage: { extractionRunId: largeIngest.extractionRunId } } }), 3_600)
  const largeReplay = await ingestKnowledgeLibraryDocument({ onboarding: onboarding(largeCode, 'f'.repeat(64)), extract: async () => largeExtraction }, database)
  assert.equal(largeReplay.extractionRunId, largeIngest.extractionRunId)
  assert.equal(largeReplay.extractionCreated, false)

  const extractionFailureCode = testCode('EXTRACT')
  await assert.rejects(() => ingestKnowledgeLibraryDocument({ onboarding: onboarding(extractionFailureCode, 'd'.repeat(64)), extract: async () => { throw new Error('FORCED_EXTRACTION_FAILURE') } }, database), /FORCED_EXTRACTION_FAILURE/u)
  assert.equal(await database.knowledgeSource.count({ where: { code: extractionFailureCode } }), 0)

  const databaseFailureCode = testCode('DATABASE')
  const invalidExtraction = { ...extraction, pageCount: 2, pages: [extraction.pages[0], { ...extraction.pages[0] }] }
  await assert.rejects(() => ingestKnowledgeLibraryDocument({ onboarding: onboarding(databaseFailureCode, 'e'.repeat(64)), extract: async () => invalidExtraction }, database))
  assert.equal(await database.knowledgeSource.count({ where: { code: databaseFailureCode } }), 0)
  assert.equal(await database.knowledgeSourceVersion.count({ where: { source: { code: databaseFailureCode } } }), 0)
  assert.equal(await database.knowledgeSourceArtifact.count({ where: { sourceVersion: { source: { code: databaseFailureCode } } } }), 0)
  assert.equal(await database.knowledgeSourceApplicability.count({ where: { sourceVersion: { source: { code: databaseFailureCode } } } }), 0)
  assert.equal(await database.knowledgeExtractionRun.count({ where: { sourceVersion: { source: { code: databaseFailureCode } } } }), 0)

  const sourceId = randomUUID(); const firstVersionId = randomUUID(); const secondVersionId = randomUUID()
  const familyUrl = `https://example.invalid/knowledge/library-${sourceId}`
  const familyIdentity = resolveCanonicalIdentity({ type: 'URL', url: familyUrl })
  await database.knowledgeSource.create({ data: {
    id: sourceId, code: `LIBRARY-${sourceId}`, title: 'Tijdelijke documentfamilie', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'PDF',
    metadataStatus: 'COMPLETE', copyrightClassification: 'INTERNAL', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'CURRENT', sourceFamily: 'NVAB',
    canonicalFamily: 'NVAB', authorityStatus: 'PROFESSIONAL_REFERENCE', sourceUrl: familyUrl, independenceGroup: 'NVAB',
    canonicalIdentity: { create: familyIdentity }, versions: { create: [
      { id: firstVersionId, versionLabel: 'richtlijn-1', checksum: 'a'.repeat(64) },
      { id: secondVersionId, versionLabel: 'achtergrond-1', checksum: 'b'.repeat(64) },
    ] },
  } })
  const input = { code: `FAMILY-${sourceId}`, title: 'Richtlijn met achtergronddocument', members: [
    { sourceVersionId: firstVersionId, role: 'PRIMARY_GUIDELINE' as const, sequence: 1 },
    { sourceVersionId: secondVersionId, role: 'BACKGROUND_EVIDENCE' as const, sequence: 2 },
  ] }
  const first = await storeKnowledgeDocumentFamily(input, database)
  const replay = await storeKnowledgeDocumentFamily(input, database)
  assert.equal(first.created, true); assert.deepEqual(replay, { documentFamilyId: first.documentFamilyId, created: false })
  await assert.rejects(() => storeKnowledgeDocumentFamily({ ...input, title: 'Conflict' }, database), /KNOWLEDGE_DOCUMENT_FAMILY_CONFLICT/)
  await assert.rejects(() => database.knowledgeDocumentFamily.update({ where: { id: first.documentFamilyId }, data: { title: 'Mutatie' } }), /immutable/iu)
  await assert.rejects(() => database.knowledgeDocumentFamilyMember.deleteMany({ where: { documentFamilyId: first.documentFamilyId } }), /immutable/iu)
  const stored = await database.knowledgeDocumentFamily.findUniqueOrThrow({ where: { id: first.documentFamilyId }, include: { members: { orderBy: { sequence: 'asc' } } } })
  assert.deepEqual(stored.members.map(({ role, sequence }) => ({ role, sequence })), [{ role: 'PRIMARY_GUIDELINE', sequence: 1 }, { role: 'BACKGROUND_EVIDENCE', sequence: 2 }])
  console.info('Knowledge Library database-integratietest geslaagd.')
  await database.$disconnect()
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
