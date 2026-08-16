import { describe, expect, it, vi } from 'vitest'
import { storeKnowledgeDocumentFamily } from './knowledge-document-family-service'

describe('Knowledge documentfamilies', () => {
  it('hergebruikt een identieke familie en weigert een afwijkende replay', async () => {
    const existing = { id: 'family', title: 'Richtlijn en achtergrond', members: [
      { sourceVersionId: 'v1', role: 'PRIMARY_GUIDELINE', sequence: 1 },
      { sourceVersionId: 'v2', role: 'BACKGROUND_EVIDENCE', sequence: 2 },
    ] }
    const tx = { knowledgeDocumentFamily: { findUnique: vi.fn().mockResolvedValue(existing) } }
    const database = { $transaction: vi.fn(async (callback) => callback(tx)) }
    const base = { code: 'NVAB-OVERGANG-WERK', title: existing.title, members: existing.members }
    await expect(storeKnowledgeDocumentFamily(base as never, database as never)).resolves.toEqual({ documentFamilyId: 'family', created: false })
    await expect(storeKnowledgeDocumentFamily({ ...base, title: 'Anders' } as never, database as never)).rejects.toThrow('KNOWLEDGE_DOCUMENT_FAMILY_CONFLICT')
  })

  it('valideert volgorde, uniciteit en minimaal twee leden vóór een write', async () => {
    const database = { $transaction: vi.fn() }
    await expect(storeKnowledgeDocumentFamily({ code: 'X', title: 'X', members: [] }, database as never)).rejects.toThrow('KNOWLEDGE_DOCUMENT_FAMILY_INVALID')
    await expect(storeKnowledgeDocumentFamily({ code: 'X', title: 'X', members: [{ sourceVersionId: 'v', role: 'SUMMARY', sequence: 2 }, { sourceVersionId: 'w', role: 'TOOL', sequence: 3 }] }, database as never)).rejects.toThrow('KNOWLEDGE_DOCUMENT_FAMILY_SEQUENCE_INVALID')
    expect(database.$transaction).not.toHaveBeenCalled()
  })
})
