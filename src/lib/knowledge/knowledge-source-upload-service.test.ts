import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./knowledge-extractor', () => ({
  extractPdfFullSource: vi.fn(async () => ({
    extractorName: 'test', extractorVersion: '1', configurationVersion: '1', pageCount: 1,
    pages: [{ pageNumber: 1, status: 'TEXT_EXTRACTED', textHash: 'b'.repeat(64), ocrUsed: false, confidence: null,
      blocks: [{ pageNumber: 1, blockType: 'PARAGRAPH', blockOrder: 0, exactText: 'Veilige inhoud', textHash: 'a'.repeat(64), metadata: {} }] }],
    extractionFingerprint: 'f'.repeat(64), warningSummary: null,
  })),
}))

vi.mock('./knowledge-library-ingest-service', () => ({
  ingestKnowledgeLibraryDocument: vi.fn(async () => ({ sourceId: 'source', sourceVersionId: 'version', extractionRunId: 'run', created: true })),
}))

import { extractPdfFullSource } from './knowledge-extractor'
import { ingestKnowledgeLibraryDocument } from './knowledge-library-ingest-service'
import {
  analyzeKnowledgeSourceUpload,
  confirmKnowledgeSourceUpload,
  KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES,
} from './knowledge-source-upload-service'
import { InMemoryKnowledgeSourceUploadStorage } from './knowledge-source-upload-storage'

const pdf = new TextEncoder().encode('%PDF-1.7\nfixture')
const database = (duplicate: object | null = null, sources: object[] = []) => ({ knowledgeSourceVersion: { findFirst: vi.fn(async () => duplicate) }, knowledgeSource: { findMany: vi.fn(async () => sources) } })

const metadata = {
  sourceCode: 'TEST-01', title: 'Geteste bron', publisher: 'Testuitgever', versionLabel: '2026',
  canonicalFamily: 'GOVERNMENT_GUIDANCE' as const, sourceType: 'PROFESSIONAL_GUIDANCE' as const,
  authorityStatus: 'OFFICIAL_GUIDANCE' as const, temporalStatus: 'CURRENT' as const,
  series: 'Testreeks', publicationCode: 'TEST-01', edition: '1', publicationYear: '2026', isbn: '',
  canonicalUrl: 'https://example.org/bron.pdf', jurisdiction: 'NL', applicabilityScope: 'Werkgevers in Nederland',
  scopeCode: 'NL_OSH', scopeEffect: 'APPLIES' as const, topics: ['veiligheid'],
}

describe('Knowledge Source Upload v2', () => {
  beforeEach(() => vi.clearAllMocks())

  it('analyseert een geldige PDF deterministisch als metadatareview', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const result = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'veilige_bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    expect(result).toMatchObject({ status: 'HUMAN_REVIEW_REQUIRED', proposedTitle: 'Veilige inhoud', pageCount: 1, blockCount: 1 })
    expect(result.checksum).toMatch(/^[0-9a-f]{64}$/u)
  })

  it.each([
    ['verkeerd bestandstype', { bytes: pdf, fileName: 'bron.exe', mediaType: 'application/octet-stream' }, 'FILE_TYPE_INVALID'],
    ['gespoofde PDF', { bytes: new TextEncoder().encode('geen pdf'), fileName: 'bron.pdf', mediaType: 'application/pdf' }, 'PDF_SIGNATURE_INVALID'],
    ['te groot bestand', { bytes: new Uint8Array(KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES + 1).fill(1), fileName: 'bron.pdf', mediaType: 'application/pdf' }, 'FILE_TOO_LARGE'],
  ])('weigert %s', async (_name, file, code) => {
    await expect(analyzeKnowledgeSourceUpload({ ...file, storage: new InMemoryKnowledgeSourceUploadStorage(), database: database() as never })).rejects.toMatchObject({ code })
  })

  it('markeert een identieke checksum als mogelijk duplicaat', async () => {
    const duplicate = { id: 'version', sourceId: 'source', versionLabel: '2026', source: { code: 'TEST-01', title: 'Bron' } }
    const result = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage: new InMemoryKnowledgeSourceUploadStorage(), database: database(duplicate) as never })
    expect(result.status).toBe('DUPLICATE')
    expect(result.duplicate?.sourceCode).toBe('TEST-01')
    expect(result.storageKey).toBe('')
  })

  it('weigert import zonder expliciete bevestiging en met ontbrekende metadata', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    await expect(confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: false, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })).rejects.toMatchObject({ code: 'EXPLICIT_CONFIRMATION_REQUIRED' })
    await expect(confirmKnowledgeSourceUpload({ preview, metadata: { ...metadata, publisher: '' }, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })).rejects.toMatchObject({ code: 'METADATA_REQUIRED' })
  })

  it('importeert na bevestiging via de bestaande atomische conceptstraat met auditcontext', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    const result = await confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })
    expect(result).toMatchObject({ sourceVersionId: 'version', status: 'REVIEW_REQUIRED' })
    expect(ingestKnowledgeLibraryDocument).toHaveBeenCalledWith(expect.objectContaining({ audit: { actorUserId: 'actor', checksum: preview.checksum, origin: 'PLATFORM_UPLOAD', topics: ['veiligheid'] } }), expect.anything())
    expect(extractPdfFullSource).toHaveBeenCalled()
  })

  it('weigert een mogelijke duplicate fail-closed', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const duplicate = { id: 'version', sourceId: 'source', versionLabel: '2026', source: { code: 'TEST-01', title: 'Bron' } }
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database(duplicate) as never })
    await expect(confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })).rejects.toMatchObject({ code: 'POSSIBLE_DUPLICATE' })
  })

  it.each(['SOURCE_VERSION_CONFLICT', 'SOURCE_IDENTITY_CONFLICT'])('laat %s fail-closed door de bestaande onboardingstraat afhandelen', async (code) => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    vi.mocked(ingestKnowledgeLibraryDocument).mockRejectedValueOnce(Object.assign(new Error(code), { code }))
    await expect(confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })).rejects.toMatchObject({ code })
  })

  it('laat een identieke bevestigde replay idempotent door de bestaande ingest hergebruiken', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    vi.mocked(ingestKnowledgeLibraryDocument).mockResolvedValue({ sourceId: 'source', sourceVersionId: 'version', extractionRunId: 'run', created: false, sourceCreated: false, extractionCreated: false, linkedFragmentCount: 0 })
    const first = await confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })
    const replay = await confirmKnowledgeSourceUpload({ preview, metadata, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })
    expect(first).toEqual(replay)
    expect(first.created).toBe(false)
  })

  it('ondersteunt een sterke bibliografische identiteit zonder synthetische URL', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const preview = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    await confirmKnowledgeSourceUpload({ preview, metadata: { ...metadata, canonicalUrl: '' }, explicitlyConfirmed: true, relationshipReviewed: true, actorUserId: 'actor', storage, database: {} as never })
    expect(ingestKnowledgeLibraryDocument).toHaveBeenLastCalledWith(expect.objectContaining({ onboarding: expect.objectContaining({ source: expect.objectContaining({ canonicalUrl: undefined, canonicalIdentity: expect.objectContaining({ type: 'BIBLIOGRAPHIC', publisher: 'Testuitgever', series: 'Testreeks', publicationCode: 'TEST-01', publicationYear: 2026 }) }) }) }), expect.anything())
  })

  it('markeert een botsende voorgestelde broncode met een andere titel als conflict', async () => {
    const storage = new InMemoryKnowledgeSourceUploadStorage()
    const initial = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database() as never })
    const conflict = await analyzeKnowledgeSourceUpload({ bytes: pdf, fileName: 'bron.pdf', mediaType: 'application/pdf', storage, database: database(null, [{ id: 'existing', code: initial.proposal.sourceCode.value, title: 'Andere titel', publisher: 'Andere uitgever' }]) as never })
    expect(conflict.status).toBe('CONFLICT')
    expect(conflict.existingRelations).toHaveLength(1)
  })
})
