import type { PublicCallToActionContent } from './knowledge/types'
import { knowledgeArticles } from './knowledge/articles'
import { obligations } from './obligations'
import type { DetailContent, PublicContentType } from './public-content-model'
import { indexablePublicRoutes, isRegisteredPublicHref, publicRoutes, type PublicRoute } from './public-routes'
import { publicSources, validatePublicSources } from './public-sources'
import { sectors } from './sectors'
import { services } from './services'

export type { PublicContentType } from './public-content-model'
export type PublicContentId = string
export type PublicContentKind = 'overview' | 'detail' | 'tool'
export type PublicRelationPurpose = 'explanation' | 'legal-context' | 'support' | 'sector-context' | 'next-step'
export type PublicContentItem = {
  id: PublicContentId
  type: PublicContentType
  kind: PublicContentKind
  title: string
  description: string
  href: PublicRoute
  status: 'PUBLISHED'
  validationStatus: 'VALIDATED' | 'CONTEXT_DEPENDENT'
  lastReviewed?: string
  sourceIds: readonly string[]
  searchTerms: readonly string[]
  indexable: true
}
export type PublicContentReference = { id: PublicContentId; type: PublicContentType }
export type PublicContentRelation = { target: PublicContentReference; purpose: PublicRelationPurpose }
type PublicContentCtaDefinition = { title: string; description: string; primary: { label: string; target: PublicContentReference }; secondary?: { label: string; target: PublicContentReference } }
export type ResolvedPublicContentRelation = PublicContentItem & { purpose: PublicRelationPurpose }

export const publicContentTypeLabels = {
  knowledge: 'Kennis', service: 'Dienst', obligation: 'Wettelijke verplichting', sector: 'Sectorcontext', tool: 'Begeleide vervolgstap', overview: 'Overzicht',
} as const satisfies Record<PublicContentType, string>

const overviewItems: readonly PublicContentItem[] = [
  { id: 'overview:services', type: 'overview', kind: 'overview', title: 'Diensten', description: 'Verken mogelijke professionele ondersteuning voor gezond en veilig werken.', href: publicRoutes.services, status: 'PUBLISHED', validationStatus: 'VALIDATED', sourceIds: [], searchTerms: [], indexable: true },
  { id: 'overview:obligations', type: 'overview', kind: 'overview', title: 'Wettelijke verplichtingen', description: 'Lees algemene context over veelvoorkomende verplichtingen voor werkgevers.', href: publicRoutes.obligations, status: 'PUBLISHED', validationStatus: 'VALIDATED', sourceIds: [], searchTerms: [], indexable: true },
  { id: 'overview:sectors', type: 'overview', kind: 'overview', title: 'Sectoren', description: 'Bekijk hoe werkomgeving en werkzaamheden invloed hebben op arbo- en veiligheidsvragen.', href: publicRoutes.sectors, status: 'PUBLISHED', validationStatus: 'CONTEXT_DEPENDENT', sourceIds: [], searchTerms: [], indexable: true },
  { id: 'overview:knowledge', type: 'overview', kind: 'overview', title: 'Kenniscentrum', description: 'Vind begrijpelijke, onderbouwde uitleg bij vragen over gezond en veilig werken.', href: publicRoutes.knowledge, status: 'PUBLISHED', validationStatus: 'VALIDATED', sourceIds: [], searchTerms: [], indexable: true },
]
const toolItem: PublicContentItem = { id: 'tool:advice-guide', type: 'tool', kind: 'tool', title: 'Advieswijzer', description: 'Verduidelijk uw situatie in maximaal vijf gerichte stappen, zonder opslag of juridische eindconclusie.', href: publicRoutes.adviceGuide, status: 'PUBLISHED', validationStatus: 'CONTEXT_DEPENDENT', sourceIds: [], searchTerms: ['vraag verduidelijken', 'advies'], indexable: true }
const detailContent: readonly DetailContent[] = [...knowledgeArticles, ...services, ...obligations, ...sectors]
const detailItems: readonly PublicContentItem[] = detailContent.map((content) => ({ id: content.id, type: content.type, kind: 'detail', title: content.title, description: content.summary, href: content.href, status: 'PUBLISHED', validationStatus: content.validationStatus, lastReviewed: content.lastReviewed, sourceIds: content.sourceIds, searchTerms: content.searchTerms, indexable: true }))
export const publicContentCatalog = Object.fromEntries([...overviewItems, ...detailItems, toolItem].map((item) => [item.id, item])) as Record<PublicContentId, PublicContentItem>

const ref = (id: string, type: PublicContentType): PublicContentReference => ({ id, type })
const advice = ref('tool:advice-guide', 'tool')
const relation = (id: string, type: PublicContentType, purpose: PublicRelationPurpose): PublicContentRelation => ({ target: ref(id, type), purpose })

type Associations = { knowledge?: string; service?: string; obligation?: string; sector?: string }
const associations: Record<string, Associations> = {
  'service:rie': { knowledge: 'knowledge:rie-required', obligation: 'obligation:rie', sector: 'sector:bouw' },
  'service:preventiemedewerker': { knowledge: 'knowledge:preventiemedewerker', obligation: 'obligation:preventiemedewerker', sector: 'sector:zakelijke-dienstverlening' },
  'service:bhv': { knowledge: 'knowledge:bhv-capacity', obligation: 'obligation:bhv', sector: 'sector:onderwijs' },
  'service:bedrijfsarts': { knowledge: 'knowledge:occupational-physician', obligation: 'obligation:toegang-bedrijfsarts', sector: 'sector:zorg' },
  'service:pmo': { knowledge: 'knowledge:pmo-pago', obligation: 'obligation:pago', sector: 'sector:zorg' },
  'service:hogere-veiligheidskundige': { knowledge: 'knowledge:incident-investigation', obligation: 'obligation:voorlichting-en-onderricht', sector: 'sector:industrie' },
  'service:arbeidshygienist': { knowledge: 'knowledge:occupational-hygienist', obligation: 'obligation:rie', sector: 'sector:industrie' },
  'service:incidentonderzoek': { knowledge: 'knowledge:incident-investigation', obligation: 'obligation:arbeidsongevallen', sector: 'sector:logistiek-en-transport' },
  'obligation:rie': { knowledge: 'knowledge:rie-required', service: 'service:rie', sector: 'sector:bouw' },
  'obligation:plan-van-aanpak': { knowledge: 'knowledge:rie-required', service: 'service:rie', sector: 'sector:industrie' },
  'obligation:preventiemedewerker': { knowledge: 'knowledge:preventiemedewerker', service: 'service:preventiemedewerker', sector: 'sector:zakelijke-dienstverlening' },
  'obligation:bhv': { knowledge: 'knowledge:bhv-capacity', service: 'service:bhv', sector: 'sector:onderwijs' },
  'obligation:basiscontract': { knowledge: 'knowledge:occupational-physician', service: 'service:bedrijfsarts', sector: 'sector:zorg' },
  'obligation:toegang-bedrijfsarts': { knowledge: 'knowledge:occupational-physician', service: 'service:bedrijfsarts', sector: 'sector:zorg' },
  'obligation:pago': { knowledge: 'knowledge:pmo-pago', service: 'service:pmo', sector: 'sector:zorg' },
  'obligation:psa': { knowledge: 'knowledge:psa', service: 'service:bedrijfsarts', sector: 'sector:onderwijs' },
  'obligation:arbeidsongevallen': { knowledge: 'knowledge:accident-reporting', service: 'service:incidentonderzoek', sector: 'sector:logistiek-en-transport' },
  'obligation:voorlichting-en-onderricht': { knowledge: 'knowledge:preventiemedewerker', service: 'service:hogere-veiligheidskundige', sector: 'sector:bouw' },
  'knowledge:rie-required': { obligation: 'obligation:rie', service: 'service:rie', sector: 'sector:bouw' },
  'knowledge:preventiemedewerker': { obligation: 'obligation:preventiemedewerker', service: 'service:preventiemedewerker', sector: 'sector:zakelijke-dienstverlening' },
  'knowledge:bhv-capacity': { obligation: 'obligation:bhv', service: 'service:bhv', sector: 'sector:onderwijs' },
  'knowledge:pmo-pago': { obligation: 'obligation:pago', service: 'service:pmo', sector: 'sector:zorg' },
  'knowledge:occupational-physician': { obligation: 'obligation:toegang-bedrijfsarts', service: 'service:bedrijfsarts', sector: 'sector:zorg' },
  'knowledge:psa': { obligation: 'obligation:psa', service: 'service:bedrijfsarts', sector: 'sector:onderwijs' },
  'knowledge:accident-reporting': { obligation: 'obligation:arbeidsongevallen', service: 'service:incidentonderzoek', sector: 'sector:logistiek-en-transport' },
  'knowledge:occupational-hygienist': { obligation: 'obligation:rie', service: 'service:arbeidshygienist', sector: 'sector:industrie' },
  'knowledge:incident-investigation': { obligation: 'obligation:arbeidsongevallen', service: 'service:incidentonderzoek', sector: 'sector:bouw' },
  'sector:bouw': { knowledge: 'knowledge:incident-investigation', obligation: 'obligation:voorlichting-en-onderricht', service: 'service:hogere-veiligheidskundige' },
  'sector:industrie': { knowledge: 'knowledge:occupational-hygienist', obligation: 'obligation:rie', service: 'service:arbeidshygienist' },
  'sector:zorg': { knowledge: 'knowledge:pmo-pago', obligation: 'obligation:pago', service: 'service:bedrijfsarts' },
  'sector:onderwijs': { knowledge: 'knowledge:psa', obligation: 'obligation:psa', service: 'service:bhv' },
  'sector:logistiek-en-transport': { knowledge: 'knowledge:accident-reporting', obligation: 'obligation:arbeidsongevallen', service: 'service:incidentonderzoek' },
  'sector:zakelijke-dienstverlening': { knowledge: 'knowledge:preventiemedewerker', obligation: 'obligation:psa', service: 'service:pmo' },
}

function relationsFor(item: PublicContentItem): readonly PublicContentRelation[] {
  if (item.kind !== 'detail') return []
  const linked = associations[item.id] ?? {}
  const links: PublicContentRelation[] = []
  if (linked.knowledge && linked.knowledge !== item.id) links.push(relation(linked.knowledge, 'knowledge', 'explanation'))
  if (linked.obligation && linked.obligation !== item.id) links.push(relation(linked.obligation, 'obligation', 'legal-context'))
  if (linked.service && linked.service !== item.id) links.push(relation(linked.service, 'service', 'support'))
  if (linked.sector && linked.sector !== item.id) links.push(relation(linked.sector, 'sector', 'sector-context'))
  links.push({ target: advice, purpose: 'next-step' })
  return links.slice(0, 4)
}

const overviewRelations: Record<string, readonly PublicContentRelation[]> = {
  'overview:services': [relation('overview:knowledge', 'overview', 'explanation'), relation('overview:obligations', 'overview', 'legal-context'), { target: advice, purpose: 'next-step' }],
  'overview:obligations': [relation('overview:knowledge', 'overview', 'explanation'), relation('overview:services', 'overview', 'support'), { target: advice, purpose: 'next-step' }],
  'overview:sectors': [relation('overview:knowledge', 'overview', 'explanation'), relation('overview:services', 'overview', 'support'), { target: advice, purpose: 'next-step' }],
  'overview:knowledge': [relation('overview:obligations', 'overview', 'legal-context'), relation('overview:services', 'overview', 'support'), { target: advice, purpose: 'next-step' }],
}
export const publicContentRelations: Partial<Record<PublicContentId, readonly PublicContentRelation[]>> = { ...overviewRelations, ...Object.fromEntries(detailItems.map((item) => [item.id, relationsFor(item)])) }

function ctaFor(item: PublicContentItem): PublicContentCtaDefinition | undefined {
  if (item.kind === 'tool') return undefined
  const related = publicContentRelations[item.id] ?? []
  const nextStep = related.find((itemRelation) => itemRelation.purpose === 'next-step')?.target ?? advice
  const explanatory = related.find((itemRelation) => itemRelation.purpose !== 'next-step')?.target
  if (item.id === 'knowledge:rie-required') return { title: 'Plaats de uitleg in de juiste context', description: 'Lees de algemene wettelijke context of verduidelijk uw situatie.', primary: { label: 'Lees de wettelijke context', target: ref('obligation:rie', 'obligation') }, secondary: { label: 'Start de Advieswijzer', target: advice } }
  if (item.id === 'obligation:rie') return { title: 'Van wettelijke context naar uw situatie', description: 'Lees praktische uitleg of verduidelijk uw vraag stap voor stap.', primary: { label: 'Lees de praktische uitleg', target: ref('knowledge:rie-required', 'knowledge') }, secondary: { label: 'Start de Advieswijzer', target: advice } }
  return { title: item.kind === 'overview' ? 'Verduidelijk uw volgende stap' : 'Wat is voor uw situatie relevant?', description: 'Gebruik de Advieswijzer voor een eerste richting. De uitkomst is algemene vraagverheldering en geen individueel juridisch of medisch advies.', primary: { label: 'Start de Advieswijzer', target: nextStep }, secondary: explanatory ? { label: `Bekijk ${publicContentCatalog[explanatory.id]?.title ?? 'gerelateerde uitleg'}`, target: explanatory } : undefined }
}
const publicContentCtas: Partial<Record<PublicContentId, PublicContentCtaDefinition>> = Object.fromEntries(Object.values(publicContentCatalog).map((item) => [item.id, ctaFor(item)]).filter((entry): entry is [string, PublicContentCtaDefinition] => Boolean(entry[1])))

export function getPublicContentItem(id: PublicContentId): PublicContentItem { const item = publicContentCatalog[id]; if (!item) throw new Error(`Onbekend publiek contentitem: ${id}`); return item }
export function resolvePublicContentRelations(id: PublicContentId): readonly ResolvedPublicContentRelation[] { return (publicContentRelations[id] ?? []).map((itemRelation) => ({ ...getPublicContentItem(itemRelation.target.id), purpose: itemRelation.purpose })) }
export function resolvePublicContentCta(id: PublicContentId): PublicCallToActionContent | null { const definition = publicContentCtas[id]; if (!definition) return null; return { title: definition.title, description: definition.description, primary: { label: definition.primary.label, href: getPublicContentItem(definition.primary.target.id).href }, secondary: definition.secondary ? { label: definition.secondary.label, href: getPublicContentItem(definition.secondary.target.id).href } : undefined } }
export function resolveRelatedPublicContent(id: PublicContentId, limit = 3): readonly ResolvedPublicContentRelation[] { const cta = publicContentCtas[id]; const ctaIds = new Set([cta?.primary.target.id, cta?.secondary?.target.id].filter(Boolean)); return resolvePublicContentRelations(id).filter((item) => item.id !== id && !ctaIds.has(item.id)).slice(0, Math.max(0, limit)) }

export function validatePublicContentArchitecture(catalog: Record<string, PublicContentItem> = publicContentCatalog, relations: Partial<Record<string, readonly PublicContentRelation[]>> = publicContentRelations, ctas: Partial<Record<string, PublicContentCtaDefinition>> = publicContentCtas): string[] {
  const issues = [...validatePublicSources()]
  const items = Object.values(catalog)
  const indexable = new Set<string>(indexablePublicRoutes)
  if (new Set(items.map((item) => item.id)).size !== items.length) issues.push('Content-ID’s moeten uniek zijn.')
  if (new Set(items.map((item) => item.href)).size !== items.length) issues.push('Catalogusroutes moeten uniek zijn.')
  for (const [key, item] of Object.entries(catalog)) {
    if (key !== item.id) issues.push(`Catalogussleutel ${key} komt niet overeen met content-ID ${item.id}.`)
    if (!item.title || !item.description) issues.push(`${item.id} mist titel of samenvatting.`)
    if (!isRegisteredPublicHref(item.href) || !indexable.has(item.href)) issues.push(`${item.id} gebruikt een niet-geregistreerde of niet-indexeerbare route.`)
    if (item.kind === 'detail' && (!item.lastReviewed || item.sourceIds.length === 0)) issues.push(`${item.id} mist controledatum of bronnen.`)
    for (const sourceId of item.sourceIds) if (!publicSources[sourceId as keyof typeof publicSources]) issues.push(`${item.id} gebruikt ontbrekende bron ${sourceId}.`)
    const expectedPrefix = item.type === 'overview' || item.type === 'tool' ? null : `/${item.type === 'knowledge' ? 'kenniscentrum' : item.type === 'service' ? 'diensten' : item.type === 'obligation' ? 'wettelijke-verplichtingen' : 'sectoren'}/`
    if (expectedPrefix && !item.href.startsWith(expectedPrefix)) issues.push(`${item.id} gebruikt een route die niet bij het contenttype past.`)
  }
  for (const content of detailContent) {
    if (new Set(content.faq.map((item) => item.id)).size !== content.faq.length) issues.push(`${content.id} bevat dubbele FAQ-ID’s.`)
    if (!content.metadata.title || !content.metadata.description) issues.push(`${content.id} mist metadata.`)
  }
  for (const [sourceId, sourceRelations] of Object.entries(relations)) {
    if (!catalog[sourceId]) { issues.push(`Relatiebron ${sourceId} bestaat niet.`); continue }
    const ids = (sourceRelations ?? []).map((itemRelation) => itemRelation.target.id)
    if (new Set(ids).size !== ids.length) issues.push(`${sourceId} bevat dubbele relaties.`)
    for (const itemRelation of sourceRelations ?? []) { const target = catalog[itemRelation.target.id]; if (!target) issues.push(`${sourceId} verwijst naar ontbrekende content ${itemRelation.target.id}.`); else { if (target.id === sourceId) issues.push(`${sourceId} verwijst naar zichzelf.`); if (target.type !== itemRelation.target.type) issues.push(`${sourceId} gebruikt een onjuist type voor ${target.id}.`) } }
  }
  for (const [sourceId, definition] of Object.entries(ctas)) { if (!definition) continue; const targets = [definition.primary.target, definition.secondary?.target].filter((target): target is PublicContentReference => Boolean(target)); const relationIds = new Set((relations[sourceId] ?? []).map((itemRelation) => itemRelation.target.id)); if (new Set(targets.map((target) => target.id)).size !== targets.length) issues.push(`${sourceId} bevat dubbele CTA-doelen.`); for (const target of targets) { if (!catalog[target.id]) issues.push(`${sourceId} gebruikt een ontbrekend CTA-doel ${target.id}.`); else if (!relationIds.has(target.id)) issues.push(`${sourceId} gebruikt CTA-doel ${target.id} zonder expliciete relatie.`) } }
  for (const type of ['service', 'obligation', 'sector'] as const) { const slugs = detailContent.filter((item) => item.type === type).map((item) => item.slug); if (new Set(slugs).size !== slugs.length) issues.push(`${type}-slugs moeten uniek zijn.`) }
  return issues
}
export function assertValidPublicContentArchitecture(): void { const issues = validatePublicContentArchitecture(); if (issues.length) throw new Error(`Ongeldige publieke contentarchitectuur:\n${issues.join('\n')}`) }
assertValidPublicContentArchitecture()
