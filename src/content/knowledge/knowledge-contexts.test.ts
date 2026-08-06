import { describe, expect, it } from 'vitest'
import { knowledgeArticles } from './articles'
import {
  knowledgeContextHref,
  knowledgeContexts,
  resolveActiveKnowledgeContext,
  resolveKnowledgeContextByRoute,
  validateKnowledgeContextCatalog,
} from './knowledge-contexts'

describe('knowledge context catalog', () => {
  it('is uniek, versieerbaar en dekt alle inhoudelijke kennispagina’s', () => {
    expect(validateKnowledgeContextCatalog()).toEqual([])
    expect(new Set(knowledgeContexts.map((context) => context.id)).size).toBe(knowledgeContexts.length)
    expect(knowledgeArticles.every((article) => resolveKnowledgeContextByRoute(article.href))).toBe(true)
  })

  it('accepteert uitsluitend bekende actieve contexten', () => {
    expect(resolveActiveKnowledgeContext('OCCUPATIONAL_PHYSICIAN')?.version).toBe(1)
    expect(resolveActiveKnowledgeContext('UNKNOWN_CONTEXT')).toBeNull()
    expect(resolveActiveKnowledgeContext('')).toBeNull()
  })

  it('neemt alleen de veilige context-ID in vervolglinks op', () => {
    const context = resolveActiveKnowledgeContext('OCCUPATIONAL_PHYSICIAN')!
    expect(knowledgeContextHref('/advieswijzer', context)).toBe('/advieswijzer?context=OCCUPATIONAL_PHYSICIAN')
    expect(knowledgeContextHref('/hulpvragen/nieuw', context)).toBe('/hulpvragen/nieuw?context=OCCUPATIONAL_PHYSICIAN')
  })
})
