import { publicContentCatalog, publicContentTypeLabels, type PublicContentItem } from './public-content'

export type SearchableContentType = 'knowledge' | 'service' | 'obligation' | 'sector'
export type KnowledgeSearchFilter = 'all' | SearchableContentType
export type KnowledgeSearchResult = PublicContentItem & { score: number }

export const knowledgeSearchFilters = [
  { value: 'all', label: 'Alles' }, { value: 'knowledge', label: 'Kennis' }, { value: 'service', label: 'Diensten' }, { value: 'obligation', label: 'Wettelijke verplichtingen' }, { value: 'sector', label: 'Sectoren' },
] as const satisfies readonly { value: KnowledgeSearchFilter; label: string }[]

export const searchablePublicContent = Object.values(publicContentCatalog).filter((item): item is PublicContentItem & { type: SearchableContentType } => item.kind === 'detail' && ['knowledge', 'service', 'obligation', 'sector'].includes(item.type))

function normalize(value: string): string { return value.toLocaleLowerCase('nl-NL').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[’']/g, '').trim() }
function scoreItem(item: PublicContentItem, query: string): number {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0
  const words = normalizedQuery.split(/\s+/).filter(Boolean)
  const title = normalize(item.title)
  const aliases = item.searchTerms.map(normalize)
  const summary = normalize(item.description)
  const type = normalize(publicContentTypeLabels[item.type])
  const haystack = [title, aliases.join(' '), summary, type].join(' ')
  if (!words.every((word) => haystack.includes(word))) return -1
  if (title === normalizedQuery) return 100
  if (title.includes(normalizedQuery)) return 80
  if (aliases.some((alias) => alias === normalizedQuery || alias.includes(normalizedQuery))) return 60
  if (summary.includes(normalizedQuery)) return 40
  if (type.includes(normalizedQuery)) return 20
  return 10
}

export function searchPublicContent(query: string, filter: KnowledgeSearchFilter = 'all'): readonly KnowledgeSearchResult[] {
  const normalizedQuery = normalize(query)
  return searchablePublicContent
    .filter((item) => filter === 'all' || item.type === filter)
    .map((item) => ({ ...item, score: scoreItem(item, normalizedQuery) }))
    .filter((item) => !normalizedQuery || item.score >= 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, 'nl-NL'))
}

export function parseKnowledgeSearchFilter(value: string | null): KnowledgeSearchFilter { return knowledgeSearchFilters.some((item) => item.value === value) ? value as KnowledgeSearchFilter : 'all' }
