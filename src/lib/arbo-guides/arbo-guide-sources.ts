import type { PublicSource, PublicSourceType } from '@/content/public-content-model'
import { publicSources, type PublicSourceId } from '@/content/public-sources'

export const arboGuideSourceCategories = ['LEGISLATION', 'GUIDANCE', 'SUPPLEMENTARY'] as const
export type ArboGuideSourceCategory = (typeof arboGuideSourceCategories)[number]

export type ArboGuideReportSource = Readonly<{
  id: string
  title: string
  publisher: string
  url: string
  reviewedAt: string
  category: ArboGuideSourceCategory
}>

const categoryBySourceType: Record<PublicSourceType, ArboGuideSourceCategory> = {
  LAW: 'LEGISLATION',
  OFFICIAL_GUIDANCE: 'GUIDANCE',
  ENFORCEMENT_GUIDANCE: 'GUIDANCE',
  OFFICIAL_RESEARCH: 'SUPPLEMENTARY',
  PROFESSIONAL_REFERENCE: 'SUPPLEMENTARY',
}

export const arboGuideSourceCategoryLabels: Record<ArboGuideSourceCategory, string> = {
  LEGISLATION: 'Wetgeving',
  GUIDANCE: 'Richtlijn',
  SUPPLEMENTARY: 'Aanvullende bron',
}

export function toArboGuideReportSource(source: PublicSource): ArboGuideReportSource {
  return {
    id: source.id,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    reviewedAt: source.reviewedAt,
    category: categoryBySourceType[source.type],
  }
}

export function selectArboGuideSources(sources: readonly ArboGuideReportSource[]): readonly ArboGuideReportSource[] {
  const unique = Array.from(new Map(sources.map((source) => [source.id, source])).values())
  const legislation = unique.filter((source) => source.category === 'LEGISLATION')
  const guidance = unique.find((source) => source.category === 'GUIDANCE')
  const supplementary = unique.find((source) => source.category === 'SUPPLEMENTARY')
  return [...legislation, ...(guidance ? [guidance] : []), ...(supplementary ? [supplementary] : [])]
}

export function normalizeArboGuideReportSource(source: Omit<ArboGuideReportSource, 'category'> & { category?: ArboGuideSourceCategory }): ArboGuideReportSource {
  if (source.category) return { ...source, category: source.category }
  const catalogSource = publicSources[source.id as PublicSourceId]
  if (!catalogSource) throw new Error(`Broncategorie ontbreekt voor historische bron ${source.id}.`)
  return { ...source, category: categoryBySourceType[catalogSource.type] }
}

export function groupArboGuideSources(sources: readonly ArboGuideReportSource[]) {
  const selected = selectArboGuideSources(sources)
  return arboGuideSourceCategories.map((category) => ({
    category,
    label: arboGuideSourceCategoryLabels[category],
    sources: selected.filter((source) => source.category === category),
  })).filter((group) => group.sources.length > 0)
}
