import type { InternalHref } from './public-homepage'
import { obligations } from './obligations'
import { sectors } from './sectors'
import { services } from './services'

export type PublicOverviewItem = {
  title: string
  description: string
  href?: InternalHref
  status?: string
}

export const serviceOverview = services.map((item) => ({ title: item.title, description: item.summary, href: item.href, status: 'Dienst' })) satisfies readonly PublicOverviewItem[]

export const legalOverview = obligations.map((item) => ({ title: item.title, description: item.summary, href: item.href, status: 'Algemene wettelijke context' })) satisfies readonly PublicOverviewItem[]

export const sectorOverview = sectors.map((item) => ({ title: item.title, description: item.summary, href: item.href, status: 'Sectorcontext' })) satisfies readonly PublicOverviewItem[]

export const knowledgeCategories = [
  ['Arbowet en verplichtingen', 'Begrijp de algemene kaders en verantwoordelijkheden.'],
  ['RI&E en preventie', 'Herken, beoordeel en beheers arbeidsrisico’s.'],
  ['Veilig en gezond werken', 'Praktische uitleg over arbeidsomstandigheden.'],
  ['Verzuim en inzetbaarheid', 'Informatie over gezondheid, verzuim en preventie.'],
  ['Specialistische ondersteuning', 'Ontdek welke deskundigheid bij een vraag kan passen.'],
].map(([title, description]) => ({ title, description })) satisfies readonly PublicOverviewItem[]
