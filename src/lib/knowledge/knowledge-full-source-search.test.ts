import { beforeEach, describe, expect, it, vi } from 'vitest'

const queryRaw = vi.fn()
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $queryRaw: queryRaw }) }))

describe('interne volledige-bronzoeklaag', () => {
  beforeEach(() => queryRaw.mockReset())

  it('weigert toegang zonder interne reviewer- of platformtoegang', async () => {
    const { searchKnowledgeFullSource } = await import('./knowledge-full-source-search')
    await expect(searchKnowledgeFullSource({ query: 'beeldscherm', accessTiers: ['PUBLIC_BASIC'] })).rejects.toThrow('KNOWLEDGE_FULL_SOURCE_ACCESS_DENIED')
    expect(queryRaw).not.toHaveBeenCalled()
  })

  it('geeft interne, herleidbare resultaten terug', async () => {
    const result = [{ blockId: 'b1', sourceCode: 'AI-02', sourceTitle: 'Werken met beeldschermen', sourceVersionId: 'v1', versionLabel: '1', temporalStatus: 'HISTORICAL', pageNumber: 12, sectionPath: 'Werkplek', blockType: 'PARAGRAPH', exactText: 'Een teruggevonden passage.', rank: 0.5, accessTier: 'INTERNAL_REVIEWER' }]
    queryRaw.mockResolvedValue(result)
    const { searchKnowledgeFullSource } = await import('./knowledge-full-source-search')
    await expect(searchKnowledgeFullSource({ query: 'werkplek', accessTiers: ['INTERNAL_REVIEWER'], sourceCode: 'AI-02' })).resolves.toEqual(result)
    expect(queryRaw).toHaveBeenCalledOnce()
  })
})
