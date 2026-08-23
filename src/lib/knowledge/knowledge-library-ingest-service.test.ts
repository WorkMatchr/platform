import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ingestKnowledgeLibraryDocument, KNOWLEDGE_LIBRARY_INGEST_TRANSACTION_OPTIONS } from './knowledge-library-ingest-service'
import { storeKnowledgeFullSourceInTransaction } from './knowledge-full-source-service'
import { onboardKnowledgeSourceInTransaction } from './knowledge-source-onboarding-service'

vi.mock('./knowledge-source-onboarding-service', () => ({ onboardKnowledgeSourceInTransaction: vi.fn() }))
vi.mock('./knowledge-full-source-service', () => ({ storeKnowledgeFullSourceInTransaction: vi.fn() }))

const onboarding = {} as never
const extraction = {} as never

describe('atomische Knowledge Library-ingest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('schrijft niets wanneer extractie faalt', async () => {
    const database = { $transaction: vi.fn() }
    await expect(ingestKnowledgeLibraryDocument({ onboarding, extract: async () => { throw new Error('EXTRACTION_FAILED') } }, database as never)).rejects.toThrow('EXTRACTION_FAILED')
    expect(database.$transaction).not.toHaveBeenCalled()
    expect(onboardKnowledgeSourceInTransaction).not.toHaveBeenCalled()
  })

  it('gebruikt voor onboarding en full-source exact dezelfde transactie', async () => {
    const tx = { marker: 'shared-transaction' }
    const database = { $transaction: vi.fn(async (callback) => callback(tx)) }
    vi.mocked(onboardKnowledgeSourceInTransaction).mockResolvedValue({ sourceId: 'source', sourceVersionId: 'version', created: true })
    vi.mocked(storeKnowledgeFullSourceInTransaction).mockResolvedValue({ extractionRunId: 'run', created: true, linkedFragmentCount: 0 })
    await expect(ingestKnowledgeLibraryDocument({ onboarding, extract: async () => extraction }, database as never)).resolves.toMatchObject({ sourceId: 'source', sourceVersionId: 'version', extractionRunId: 'run', created: true })
    expect(onboardKnowledgeSourceInTransaction).toHaveBeenCalledWith(onboarding, tx)
    expect(storeKnowledgeFullSourceInTransaction).toHaveBeenCalledWith('version', extraction, tx)
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), KNOWLEDGE_LIBRARY_INGEST_TRANSACTION_OPTIONS)
    expect(KNOWLEDGE_LIBRARY_INGEST_TRANSACTION_OPTIONS).toEqual({ isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 })
  })

  it('legt een platformupload zonder broninhoud vast in de append-only audittrail', async () => {
    const auditCreate = vi.fn()
    const tx = { knowledgeAuditEvent: { create: auditCreate } }
    const database = { $transaction: vi.fn(async (callback) => callback(tx)), knowledgeAuditEvent: { create: vi.fn() } }
    const fullExtraction = { pageCount: 1, pages: [{ blocks: [{ text: 'niet loggen' }] }] } as never
    vi.mocked(onboardKnowledgeSourceInTransaction).mockResolvedValue({ sourceId: 'source', sourceVersionId: 'version', created: true })
    vi.mocked(storeKnowledgeFullSourceInTransaction).mockResolvedValue({ extractionRunId: 'run', created: true, linkedFragmentCount: 0 })
    await ingestKnowledgeLibraryDocument({ onboarding, extract: async () => fullExtraction, audit: { actorUserId: 'actor', checksum: 'a'.repeat(64), origin: 'PLATFORM_UPLOAD', topics: ['BHV'] } }, database as never)
    expect(auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'IMPORT_COMPLETED', actorUserId: 'actor', result: 'SUCCESS', metadata: { origin: 'PLATFORM_UPLOAD', checksum: 'a'.repeat(64), topics: ['BHV'], pageCount: 1, blockCount: 1 } }) })
    expect(JSON.stringify(auditCreate.mock.calls)).not.toContain('niet loggen')
  })

  it('registreert een mislukte platformupload nadat de documentingest volledig is teruggerold', async () => {
    const failureAudit = vi.fn()
    const database = { $transaction: vi.fn(async () => { throw new Error('DATABASE_FAILURE') }), knowledgeAuditEvent: { create: failureAudit } }
    await expect(ingestKnowledgeLibraryDocument({ onboarding, extract: async () => ({ pageCount: 0, pages: [] }) as never, audit: { actorUserId: 'actor', checksum: 'b'.repeat(64), origin: 'PLATFORM_UPLOAD' } }, database as never)).rejects.toThrow('DATABASE_FAILURE')
    expect(failureAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'IMPORT_FAILED', result: 'FAILED', reason: 'Error' }) })
  })
})
