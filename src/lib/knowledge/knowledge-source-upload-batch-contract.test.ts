import { describe, expect, it } from 'vitest'
import { duplicateChecksumIndexes, KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES, validateKnowledgeSourceUploadBatch } from './knowledge-source-upload-batch-contract'

const pdf = (name = 'bron.pdf', size = 100) => ({ name, size, type: 'application/pdf' })

describe('Knowledge Source Upload batchcontract', () => {
  it('accepteert één en tien PDF-documenten', () => {
    expect(validateKnowledgeSourceUploadBatch([pdf()]).batchError).toBeNull()
    expect(validateKnowledgeSourceUploadBatch(Array.from({ length: 10 }, (_, index) => pdf(`${index}.pdf`))).batchError).toBeNull()
  })

  it('isoleert één ongeldig bestand zonder geldige documenten af te keuren', () => {
    const result = validateKnowledgeSourceUploadBatch([pdf('goed-a.pdf'), { name: 'fout.txt', type: 'text/plain', size: 10 }, pdf('goed-b.pdf')])
    expect(result.batchError).toBeNull()
    expect([...result.fileErrors.entries()]).toEqual([[1, 'Alleen PDF-bestanden zijn toegestaan.']])
  })

  it('begrensd ieder document en de volledige batch', () => {
    expect(validateKnowledgeSourceUploadBatch([pdf('te-groot.pdf', KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES + 1)]).fileErrors.has(0)).toBe(true)
    expect(validateKnowledgeSourceUploadBatch(Array.from({ length: 6 }, (_, index) => pdf(`${index}.pdf`, KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES))).batchError).toContain('50 MB')
  })

  it('weigert nul of meer dan tien bestanden', () => {
    expect(validateKnowledgeSourceUploadBatch([]).batchError).not.toBeNull()
    expect(validateKnowledgeSourceUploadBatch(Array.from({ length: 11 }, (_, index) => pdf(`${index}.pdf`))).batchError).not.toBeNull()
  })

  it('markeert alleen latere checksumduplicaten zodat één Blob-object volstaat', () => {
    expect([...duplicateChecksumIndexes(['a'.repeat(64), 'b'.repeat(64), 'a'.repeat(64)])]).toEqual([2])
  })
})
