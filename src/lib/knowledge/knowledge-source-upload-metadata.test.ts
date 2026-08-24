import { describe, expect, it } from 'vitest'
import { analyzeKnowledgeSourceUploadBatch, proposeKnowledgeSourceMetadata } from './knowledge-source-upload-metadata'

function extraction(text: string) {
  return { pageCount: 1, pages: [{ pageNumber: 1, status: 'TEXT_EXTRACTED', textHash: 'a'.repeat(64), blocks: [{ pageNumber: 1, blockType: 'PARAGRAPH', blockOrder: 0, exactText: text, textHash: 'b'.repeat(64), metadata: {} }] }] } as never
}

function document(fileName: string, text: string, checksum: string) {
  const result = proposeKnowledgeSourceMetadata(fileName, extraction(text))
  return { fileName, checksum, proposal: result.metadata, comparison: result.comparison }
}

describe('Knowledge Upload UX v2 metadata en batchrelaties', () => {
  it('stelt herkenbare NVAB-metadata voor maar markeert een bron uit 2013 voor actualiteitscontrole', () => {
    const result = proposeKnowledgeSourceMetadata('richtlijn-veilig-gedrag.pdf', extraction('Multidisciplinaire richtlijn Bevorderen van veilig gedrag in productieomgevingen NVAB Publicatiejaar 2013 Nederland'))
    expect(result.metadata.publisher).toMatchObject({ value: 'NVAB', confidence: 'HIGH_CONFIDENCE' })
    expect(result.metadata.canonicalFamily.value).toBe('NVAB')
    expect(result.metadata.publicationYear.value).toBe(2013)
    expect(result.metadata.temporalStatus.value).toBe('UNDER_REVIEW')
    expect(result.metadata.jurisdiction.value).toBe('NL')
  })

  it('gokt onbekende metadata niet en maakt een deterministische broncode', () => {
    const first = proposeKnowledgeSourceMetadata('onbekend.pdf', extraction('Een onbekende publicatie zonder bibliografische gegevens'))
    const replay = proposeKnowledgeSourceMetadata('onbekend.pdf', extraction('Een onbekende publicatie zonder bibliografische gegevens'))
    expect(first.metadata.publisher).toMatchObject({ value: null, confidence: 'UNKNOWN' })
    expect(first.metadata.sourceCode).toEqual(replay.metadata.sourceCode)
  })

  it('herkent een richtlijn en achtergronddocument als corrigeerbaar familievoorstel', () => {
    const guideline = document('richtlijn.pdf', 'Multidisciplinaire richtlijn Bevorderen van veilig gedrag NVAB 2013 Nederland productie veiligheid gedrag', 'a'.repeat(64))
    const background = document('achtergrond.pdf', 'Achtergronddocument bij richtlijn Bevorderen van veilig gedrag NVAB 2013 Nederland productie veiligheid gedrag', 'b'.repeat(64))
    const analysis = analyzeKnowledgeSourceUploadBatch([guideline, background])
    expect(analysis.familySuggestions).toHaveLength(1)
    expect(analysis.familySuggestions[0].members.map((member) => member.role)).toEqual(expect.arrayContaining(['PRIMARY_GUIDELINE', 'BACKGROUND_EVIDENCE']))
    expect(analysis.sharedMetadata.publisher).toBe('NVAB')
  })

  it('houdt niet-gerelateerde documenten gescheiden en weigert meer dan tien documenten', () => {
    const first = document('a.pdf', 'NVAB Richtlijn veilig gedrag 2013 Nederland', 'a'.repeat(64))
    const second = document('b.pdf', 'RIVM factsheet biologische agentia 2024', 'b'.repeat(64))
    expect(analyzeKnowledgeSourceUploadBatch([first, second]).familySuggestions).toHaveLength(0)
    expect(() => analyzeKnowledgeSourceUploadBatch(Array.from({ length: 11 }, (_, index) => ({ ...first, checksum: String(index).padStart(64, '0') })))).toThrow('KNOWLEDGE_UPLOAD_BATCH_SIZE_INVALID')
  })

  it('analyseert ook een batch van tien geldige documenten deterministisch', () => {
    const documents = Array.from({ length: 10 }, (_, index) => document(`document-${index}.pdf`, `NVAB Richtlijn veilig gedrag 2013 Nederland onderdeel ${index}`, String(index).padStart(64, 'a')))
    expect(analyzeKnowledgeSourceUploadBatch(documents)).toEqual(analyzeKnowledgeSourceUploadBatch(documents))
  })
})
