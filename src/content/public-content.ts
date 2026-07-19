import type { PublicCallToActionContent } from '@/content/knowledge/types'
import { rieLegalPage, rieQuestionArticle, rieServicePage } from '@/content/knowledge/rie'
import {
  indexablePublicRoutes,
  isRegisteredPublicHref,
  publicRoutes,
  type PublicRoute,
} from '@/content/public-routes'

export type PublicContentType = 'knowledge' | 'service' | 'obligation' | 'sector' | 'tool'
export type PublicContentKind = 'overview' | 'detail' | 'tool'
export type PublicContentStatus = 'PUBLISHED'
export type PublicRelationPurpose =
  | 'explanation'
  | 'legal-context'
  | 'support'
  | 'sector-context'
  | 'next-step'

export type PublicContentId =
  | 'overview:services'
  | 'overview:obligations'
  | 'overview:sectors'
  | 'overview:knowledge'
  | 'knowledge:rie-required'
  | 'service:rie'
  | 'obligation:rie'
  | 'tool:advice-guide'

export type PublicContentItem = {
  id: PublicContentId
  type: PublicContentType
  kind: PublicContentKind
  title: string
  description: string
  href: PublicRoute
  status: PublicContentStatus
  indexable: true
}

export type PublicContentReference = {
  id: PublicContentId
  type: PublicContentType
}

export type PublicContentRelation = {
  target: PublicContentReference
  purpose: PublicRelationPurpose
}

type PublicContentCtaDefinition = {
  title: string
  description: string
  primary: { label: string; target: PublicContentReference }
  secondary?: { label: string; target: PublicContentReference }
}

export type ResolvedPublicContentRelation = PublicContentItem & {
  purpose: PublicRelationPurpose
}

export const publicContentTypeLabels = {
  knowledge: 'Kennis',
  service: 'Dienst',
  obligation: 'Wettelijke verplichting',
  sector: 'Sectorcontext',
  tool: 'Begeleide vervolgstap',
} as const satisfies Record<PublicContentType, string>

export const publicContentCatalog = {
  'overview:services': {
    id: 'overview:services',
    type: 'service',
    kind: 'overview',
    title: 'Diensten',
    description: 'Verken mogelijke professionele ondersteuning voor gezond en veilig werken.',
    href: publicRoutes.services,
    status: 'PUBLISHED',
    indexable: true,
  },
  'overview:obligations': {
    id: 'overview:obligations',
    type: 'obligation',
    kind: 'overview',
    title: 'Wettelijke verplichtingen',
    description: 'Lees algemene context over veelvoorkomende verplichtingen voor werkgevers.',
    href: publicRoutes.obligations,
    status: 'PUBLISHED',
    indexable: true,
  },
  'overview:sectors': {
    id: 'overview:sectors',
    type: 'sector',
    kind: 'overview',
    title: 'Sectoren',
    description: 'Bekijk hoe werkomgeving en werkzaamheden invloed hebben op arbo- en veiligheidsvragen.',
    href: publicRoutes.sectors,
    status: 'PUBLISHED',
    indexable: true,
  },
  'overview:knowledge': {
    id: 'overview:knowledge',
    type: 'knowledge',
    kind: 'overview',
    title: 'Kenniscentrum',
    description: 'Vind begrijpelijke, onderbouwde uitleg bij vragen over gezond en veilig werken.',
    href: publicRoutes.knowledge,
    status: 'PUBLISHED',
    indexable: true,
  },
  'knowledge:rie-required': {
    id: 'knowledge:rie-required',
    type: 'knowledge',
    kind: 'detail',
    title: rieQuestionArticle.title,
    description: rieQuestionArticle.summary,
    href: publicRoutes.rieQuestion,
    status: 'PUBLISHED',
    indexable: true,
  },
  'service:rie': {
    id: 'service:rie',
    type: 'service',
    kind: 'detail',
    title: rieServicePage.title,
    description: rieServicePage.summary,
    href: publicRoutes.rieService,
    status: 'PUBLISHED',
    indexable: true,
  },
  'obligation:rie': {
    id: 'obligation:rie',
    type: 'obligation',
    kind: 'detail',
    title: rieLegalPage.title,
    description: rieLegalPage.summary,
    href: publicRoutes.rieObligation,
    status: 'PUBLISHED',
    indexable: true,
  },
  'tool:advice-guide': {
    id: 'tool:advice-guide',
    type: 'tool',
    kind: 'tool',
    title: 'Advieswijzer',
    description: 'Verduidelijk uw situatie in maximaal vijf gerichte stappen, zonder opslag of juridische eindconclusie.',
    href: publicRoutes.adviceGuide,
    status: 'PUBLISHED',
    indexable: true,
  },
} as const satisfies Record<PublicContentId, PublicContentItem>

const knowledgeOverview = { id: 'overview:knowledge', type: 'knowledge' } as const
const servicesOverview = { id: 'overview:services', type: 'service' } as const
const obligationsOverview = { id: 'overview:obligations', type: 'obligation' } as const
const rieKnowledge = { id: 'knowledge:rie-required', type: 'knowledge' } as const
const rieService = { id: 'service:rie', type: 'service' } as const
const rieObligation = { id: 'obligation:rie', type: 'obligation' } as const
const adviceGuide = { id: 'tool:advice-guide', type: 'tool' } as const

export const publicContentRelations: Partial<Record<PublicContentId, readonly PublicContentRelation[]>> = {
  'overview:services': [
    { target: knowledgeOverview, purpose: 'explanation' },
    { target: obligationsOverview, purpose: 'legal-context' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'overview:obligations': [
    { target: knowledgeOverview, purpose: 'explanation' },
    { target: servicesOverview, purpose: 'support' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'overview:sectors': [
    { target: knowledgeOverview, purpose: 'explanation' },
    { target: servicesOverview, purpose: 'support' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'overview:knowledge': [
    { target: obligationsOverview, purpose: 'legal-context' },
    { target: servicesOverview, purpose: 'support' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'knowledge:rie-required': [
    { target: rieObligation, purpose: 'legal-context' },
    { target: rieService, purpose: 'support' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'obligation:rie': [
    { target: rieKnowledge, purpose: 'explanation' },
    { target: rieService, purpose: 'support' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
  'service:rie': [
    { target: rieKnowledge, purpose: 'explanation' },
    { target: rieObligation, purpose: 'legal-context' },
    { target: adviceGuide, purpose: 'next-step' },
  ],
}

const publicContentCtas: Partial<Record<PublicContentId, PublicContentCtaDefinition>> = {
  'overview:services': {
    title: 'Nog niet zeker welke dienst past?',
    description: 'Verduidelijk eerst uw situatie of lees welke wettelijke context bij uw vraag kan horen.',
    primary: { label: 'Start de Advieswijzer', target: adviceGuide },
    secondary: { label: 'Bekijk wettelijke verplichtingen', target: obligationsOverview },
  },
  'overview:obligations': {
    title: 'Plaats de regels in uw situatie',
    description: 'Lees praktische uitleg of gebruik de Advieswijzer om uw vraag gericht te verduidelijken.',
    primary: { label: 'Bekijk praktische uitleg', target: knowledgeOverview },
    secondary: { label: 'Start de Advieswijzer', target: adviceGuide },
  },
  'overview:sectors': {
    title: 'Uw situatie is altijd specifiek',
    description: 'Breng uw werkzaamheden en aandachtspunten in kaart, ook wanneer sectorspecifieke informatie nog wordt voorbereid.',
    primary: { label: 'Start de Advieswijzer', target: adviceGuide },
    secondary: { label: 'Bekijk het kenniscentrum', target: knowledgeOverview },
  },
  'overview:knowledge': {
    title: 'Wilt u uw situatie verder verduidelijken?',
    description: 'Gebruik de Advieswijzer voor een eerste inhoudelijke richting of lees de algemene wettelijke context.',
    primary: { label: 'Start de Advieswijzer', target: adviceGuide },
    secondary: { label: 'Bekijk wettelijke verplichtingen', target: obligationsOverview },
  },
  'knowledge:rie-required': {
    title: 'Plaats de uitleg in de juiste context',
    description: 'Lees de algemene wettelijke context of verduidelijk uw eigen situatie zonder een juridische eindconclusie.',
    primary: { label: 'Lees de wettelijke context', target: rieObligation },
    secondary: { label: 'Start de Advieswijzer', target: adviceGuide },
  },
  'obligation:rie': {
    title: 'Van wettelijke context naar uw situatie',
    description: 'Lees de praktische uitleg of gebruik de Advieswijzer om uw vraag stap voor stap te verduidelijken.',
    primary: { label: 'Lees de praktische uitleg', target: rieKnowledge },
    secondary: { label: 'Start de Advieswijzer', target: adviceGuide },
  },
  'service:rie': {
    title: 'Bepaal eerst welke ondersteuning past',
    description: 'De Advieswijzer geeft een eerste inhoudelijke richting. Lees daarnaast wat de RI&E voor werkgevers kan betekenen.',
    primary: { label: 'Start de Advieswijzer', target: adviceGuide },
    secondary: { label: 'Lees de praktische uitleg', target: rieKnowledge },
  },
}

export function getPublicContentItem(id: PublicContentId): PublicContentItem {
  return publicContentCatalog[id]
}

export function resolvePublicContentRelations(id: PublicContentId): readonly ResolvedPublicContentRelation[] {
  return (publicContentRelations[id] ?? []).map((relation) => ({
    ...getPublicContentItem(relation.target.id),
    purpose: relation.purpose,
  }))
}

export function resolvePublicContentCta(id: PublicContentId): PublicCallToActionContent | null {
  const definition = publicContentCtas[id]
  if (!definition) return null

  return {
    title: definition.title,
    description: definition.description,
    primary: {
      label: definition.primary.label,
      href: getPublicContentItem(definition.primary.target.id).href,
    },
    secondary: definition.secondary
      ? {
          label: definition.secondary.label,
          href: getPublicContentItem(definition.secondary.target.id).href,
        }
      : undefined,
  }
}

export function resolveRelatedPublicContent(
  id: PublicContentId,
  limit = 3,
): readonly ResolvedPublicContentRelation[] {
  const cta = publicContentCtas[id]
  const ctaTargetIds = new Set([
    cta?.primary.target.id,
    cta?.secondary?.target.id,
  ].filter((targetId): targetId is PublicContentId => Boolean(targetId)))

  return resolvePublicContentRelations(id)
    .filter((item) => item.id !== id && !ctaTargetIds.has(item.id))
    .slice(0, Math.max(0, limit))
}

export function validatePublicContentArchitecture(
  catalog: Record<string, PublicContentItem> = publicContentCatalog,
  relations: Partial<Record<string, readonly PublicContentRelation[]>> = publicContentRelations,
  ctas: Partial<Record<string, PublicContentCtaDefinition>> = publicContentCtas,
): string[] {
  const issues: string[] = []
  const items = Object.values(catalog)
  const indexableRoutes = new Set<string>(indexablePublicRoutes)

  if (new Set(items.map((item) => item.id)).size !== items.length) issues.push('Content-ID’s moeten uniek zijn.')
  if (new Set(items.map((item) => item.href)).size !== items.length) issues.push('Catalogusroutes moeten uniek zijn.')

  for (const [key, item] of Object.entries(catalog)) {
    if (key !== item.id) issues.push(`Catalogussleutel ${key} komt niet overeen met content-ID ${item.id}.`)
    if (!isRegisteredPublicHref(item.href)) issues.push(`${item.id} gebruikt een niet-geregistreerde route.`)
    if (!indexableRoutes.has(item.href)) issues.push(`${item.id} gebruikt een niet-indexeerbare route.`)
    if (item.status !== 'PUBLISHED' || !item.indexable) issues.push(`${item.id} is geen live clusteritem.`)
  }

  for (const [sourceId, sourceRelations] of Object.entries(relations)) {
    const source = catalog[sourceId]
    if (!source) {
      issues.push(`Relatiebron ${sourceId} bestaat niet.`)
      continue
    }

    if (!sourceRelations) continue
    const targetIds = sourceRelations.map((relation) => relation.target.id)
    if (new Set(targetIds).size !== targetIds.length) issues.push(`${sourceId} bevat dubbele relaties.`)

    for (const relation of sourceRelations) {
      const target = catalog[relation.target.id]
      if (!target) {
        issues.push(`${sourceId} verwijst naar ontbrekende content ${relation.target.id}.`)
        continue
      }
      if (source.id === target.id) issues.push(`${sourceId} verwijst naar zichzelf.`)
      if (target.type !== relation.target.type) issues.push(`${sourceId} gebruikt een onjuist type voor ${target.id}.`)
      if (!target.indexable || target.status !== 'PUBLISHED') issues.push(`${sourceId} verwijst naar niet-live content ${target.id}.`)
    }
  }

  for (const [sourceId, definition] of Object.entries(ctas)) {
    if (!definition) continue
    const relationTargets = new Set((relations[sourceId] ?? []).map((relation) => relation.target.id))
    const targets = [definition.primary.target, definition.secondary?.target].filter(
      (target): target is PublicContentReference => Boolean(target),
    )
    if (new Set(targets.map((target) => target.id)).size !== targets.length) issues.push(`${sourceId} bevat dubbele CTA-doelen.`)

    for (const targetReference of targets) {
      const target = catalog[targetReference.id]
      if (!target) {
        issues.push(`${sourceId} gebruikt een ontbrekend CTA-doel ${targetReference.id}.`)
        continue
      }
      if (target.type !== targetReference.type) issues.push(`${sourceId} gebruikt een onjuist CTA-type voor ${target.id}.`)
      if (!relationTargets.has(target.id)) issues.push(`${sourceId} gebruikt CTA-doel ${target.id} zonder expliciete relatie.`)
    }
  }

  return issues
}

export function assertValidPublicContentArchitecture(): void {
  const issues = validatePublicContentArchitecture()
  if (issues.length > 0) throw new Error(`Ongeldige publieke contentrelaties:\n${issues.join('\n')}`)
}

assertValidPublicContentArchitecture()
