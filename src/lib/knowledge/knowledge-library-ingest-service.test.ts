import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ingestKnowledgeLibraryDocument } from './knowledge-library-ingest-service'
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
    expect(database.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })
})
