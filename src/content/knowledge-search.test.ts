import { describe, expect, it } from 'vitest'
import { parseKnowledgeSearchFilter, searchPublicContent, searchablePublicContent } from './knowledge-search'

describe('kenniszoekfunctie v1', () => {
  it('geeft bij lege invoer een stabiele alfabetische catalogus', () => {
    const first = searchPublicContent('')
    const second = searchPublicContent('')
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
    expect(first).toHaveLength(searchablePublicContent.length)
  })
  it('rangschikt exacte titel boven gedeeltelijke en inhoudsmatches', () => {
    expect(searchPublicContent('Moet ik een RI&E hebben?')[0]?.id).toBe('knowledge:rie-required')
    expect(searchPublicContent('bedrijfsarts')[0]?.title.toLocaleLowerCase('nl-NL')).toContain('bedrijfsarts')
  })
  it('ondersteunt aliases, samenvattingen, meerdere woorden en hoofdletters', () => {
    expect(searchPublicContent('Hvk').some((item) => item.id === 'service:hogere-veiligheidskundige')).toBe(true)
    expect(searchPublicContent('BLIJVEND LETSEL').some((item) => item.id === 'knowledge:accident-reporting')).toBe(true)
    expect(searchPublicContent('werk gezondheid').some((item) => item.id === 'service:bedrijfsarts')).toBe(true)
  })
  it('filtert per contenttype en combineert query met filter', () => {
    expect(searchPublicContent('', 'sector').every((item) => item.type === 'sector')).toBe(true)
    expect(searchPublicContent('rie', 'obligation').every((item) => item.type === 'obligation')).toBe(true)
    expect(parseKnowledgeSearchFilter('tool')).toBe('all')
  })
  it('geeft eerlijk geen resultaten en normaliseert ongeldige filters', () => {
    expect(searchPublicContent('bestaat beslist niet')).toEqual([])
    expect(parseKnowledgeSearchFilter('private')).toBe('all')
  })
  it('doorzoekt alleen live detailcontent zonder private routes', () => {
    expect(searchablePublicContent.every((item) => item.status === 'PUBLISHED' && item.indexable && item.kind === 'detail')).toBe(true)
    expect(searchablePublicContent.some((item) => /account|organisatie|inloggen/.test(item.href))).toBe(false)
  })
})
