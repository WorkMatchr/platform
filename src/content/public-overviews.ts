import type { InternalHref } from './public-homepage'
import { knowledgeArticles } from './knowledge/articles'
import { obligations } from './obligations'
import { sectors } from './sectors'
import { services } from './services'
import { canonicalExpertiseServices } from './canonical-expertise-services'

export type PublicOverviewItem = {
  title: string
  description: string
  href?: InternalHref
  status?: string
}

const canonicalHrefs = new Set<string>(canonicalExpertiseServices.map((item) => item.href))
export const serviceOverview = services.filter((item) => !canonicalHrefs.has(item.href)).map((item) => ({ title: item.title, description: item.summary, href: item.href })) satisfies readonly PublicOverviewItem[]
export const expertiseOverview = canonicalExpertiseServices.map((expertise) => {
  const service = services.find((item) => item.href === expertise.href)!
  return { title: expertise.label, description: service.summary, href: service.href }
}) satisfies readonly PublicOverviewItem[]

export const legalOverview = obligations.map((item) => ({ title: item.title, description: item.summary, href: item.href })) satisfies readonly PublicOverviewItem[]

export const knowledgeOverview = knowledgeArticles.map((item) => ({ title: item.title, description: item.summary, href: item.href })) satisfies readonly PublicOverviewItem[]

export const sectorOverview = sectors.map((item) => ({ title: item.title, description: item.summary, href: item.href })) satisfies readonly PublicOverviewItem[]

export const knowledgeCategories = [
  ['Arbowet en verplichtingen', 'Begrijp de algemene kaders en verantwoordelijkheden.'],
  ['RI&E en preventie', 'Herken, beoordeel en beheers arbeidsrisico’s.'],
  ['Veilig en gezond werken', 'Praktische uitleg over arbeidsomstandigheden.'],
  ['Verzuim en inzetbaarheid', 'Informatie over gezondheid, verzuim en preventie.'],
  ['Specialistische ondersteuning', 'Ontdek welke deskundigheid bij een vraag kan passen.'],
].map(([title, description]) => ({ title, description })) satisfies readonly PublicOverviewItem[]
