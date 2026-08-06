import type { IntakeClassificationCategory } from '@/lib/intakes/intake-classification'
import type { InternalHref } from '@/content/public-homepage'
import { knowledgeArticles } from './articles'

export const KNOWLEDGE_CONTEXT_QUERY_PARAM = 'context' as const

export const knowledgeContextIds = [
  'RIE',
  'PREVENTION_OFFICER',
  'BHV',
  'PMO_PAGO',
  'OCCUPATIONAL_PHYSICIAN',
  'PSA',
  'ACCIDENT_REPORTING',
  'OCCUPATIONAL_HYGIENE',
  'INCIDENT_INVESTIGATION',
] as const

export type KnowledgeContextId = (typeof knowledgeContextIds)[number]
export type KnowledgeContextStatus = 'ACTIVE' | 'INACTIVE'

export type KnowledgeContextDefinition = Readonly<{
  id: KnowledgeContextId
  version: number
  status: KnowledgeContextStatus
  sourceRoutes: readonly `/${string}`[]
  title: string
  shortLabel: string
  adviceIntro: string
  assignmentIntro: string
  classificationSignals: readonly string[]
  suggestedCategory?: IntakeClassificationCategory
  clarificationSetId?: string
}>

export const knowledgeContexts: readonly KnowledgeContextDefinition[] = Object.freeze([
  {
    id: 'RIE', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/moet-ik-een-rie-hebben'],
    title: 'RI&E en plan van aanpak', shortLabel: 'RI&E',
    adviceIntro: 'Uw vraag gaat over de RI&E en het plan van aanpak.',
    assignmentIntro: 'U wilt een opdracht starten over de RI&E of het plan van aanpak.',
    classificationSignals: ['ri&e', 'risico-inventarisatie', 'plan van aanpak'], suggestedCategory: 'RIE',
  },
  {
    id: 'PREVENTION_OFFICER', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wat-doet-een-preventiemedewerker'],
    title: 'De preventiemedewerker', shortLabel: 'Preventiemedewerker',
    adviceIntro: 'Uw vraag gaat over de rol en inzet van een preventiemedewerker.',
    assignmentIntro: 'U wilt een opdracht starten over de inrichting of ondersteuning van de preventiemedewerker.',
    classificationSignals: ['preventiemedewerker', 'interne deskundige', 'preventietaken'],
  },
  {
    id: 'BHV', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/hoeveel-bhvers-heb-ik-nodig'],
    title: 'BHV-organisatie', shortLabel: 'BHV en ontruiming',
    adviceIntro: 'Uw vraag gaat over een doeltreffende BHV-organisatie.',
    assignmentIntro: 'U wilt een opdracht starten over BHV, ontruiming of noodorganisatie.',
    classificationSignals: ['bhv', 'bedrijfshulpverlening', 'ontruiming'], suggestedCategory: 'BHV',
  },
  {
    id: 'PMO_PAGO', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/verschil-pmo-en-pago'],
    title: 'PMO en PAGO', shortLabel: 'PMO en PAGO',
    adviceIntro: 'Uw vraag gaat over preventief medisch onderzoek of arbeidsgezondheidskundig onderzoek.',
    assignmentIntro: 'U wilt een opdracht starten over PMO of PAGO.',
    classificationSignals: ['pmo', 'pago', 'preventief medisch onderzoek'], suggestedCategory: 'OCCUPATIONAL_HEALTH',
  },
  {
    id: 'OCCUPATIONAL_PHYSICIAN', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wanneer-bedrijfsarts-inschakelen'],
    title: 'De bedrijfsarts inschakelen', shortLabel: 'Bedrijfsarts',
    adviceIntro: 'Uw vraag gaat over het inschakelen van een bedrijfsarts.',
    assignmentIntro: 'U wilt een opdracht starten over het inschakelen van een bedrijfsarts.',
    classificationSignals: ['bedrijfsarts', 'arbodienst', 'verzuim', 'preventief spreekuur'], suggestedCategory: 'OCCUPATIONAL_HEALTH',
  },
  {
    id: 'PSA', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wat-is-psychosociale-arbeidsbelasting'],
    title: 'Psychosociale arbeidsbelasting', shortLabel: 'Werkdruk en sociale veiligheid',
    adviceIntro: 'Uw vraag gaat over werkdruk, ongewenst gedrag of sociale veiligheid.',
    assignmentIntro: 'U wilt een opdracht starten over psychosociale arbeidsbelasting.',
    classificationSignals: ['psychosociale arbeidsbelasting', 'werkdruk', 'sociale veiligheid'], suggestedCategory: 'PSA',
  },
  {
    id: 'ACCIDENT_REPORTING', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wanneer-arbeidsongeval-melden'],
    title: 'Een arbeidsongeval melden', shortLabel: 'Arbeidsongeval',
    adviceIntro: 'Uw vraag gaat over een arbeidsongeval en mogelijke vervolgstappen.',
    assignmentIntro: 'U wilt een opdracht starten naar aanleiding van een arbeidsongeval.',
    classificationSignals: ['arbeidsongeval', 'ongeval melden', 'arbeidsinspectie'], suggestedCategory: 'INCIDENT',
  },
  {
    id: 'OCCUPATIONAL_HYGIENE', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wat-doet-een-arbeidshygienist'],
    title: 'Arbeidshygiëne en blootstelling', shortLabel: 'Arbeidshygiëne',
    adviceIntro: 'Uw vraag gaat over blootstelling en gezondheid in de werkomgeving.',
    assignmentIntro: 'U wilt een opdracht starten over blootstelling of arbeidshygiënische beoordeling.',
    classificationSignals: ['arbeidshygiëne', 'blootstelling', 'stoffen', 'geluid', 'binnenklimaat'],
  },
  {
    id: 'INCIDENT_INVESTIGATION', version: 1, status: 'ACTIVE', sourceRoutes: ['/kenniscentrum/wanneer-incidentonderzoek-zinvol'],
    title: 'Incidentonderzoek', shortLabel: 'Incidentonderzoek',
    adviceIntro: 'Uw vraag gaat over onderzoek naar een incident of bijna-ongeval.',
    assignmentIntro: 'U wilt een opdracht starten over incidentonderzoek.',
    classificationSignals: ['incidentonderzoek', 'bijna-ongeval', 'oorzaakanalyse'], suggestedCategory: 'INCIDENT',
  },
])

const contextsById = new Map<KnowledgeContextId, KnowledgeContextDefinition>(knowledgeContexts.map((context) => [context.id, context]))
const contextsByRoute = new Map<string, KnowledgeContextDefinition>(
  knowledgeContexts.flatMap((context) => context.sourceRoutes.map((route) => [route, context] as const)),
)

export function resolveActiveKnowledgeContext(value: unknown): KnowledgeContextDefinition | null {
  if (typeof value !== 'string' || !knowledgeContextIds.includes(value as KnowledgeContextId)) return null
  const context = contextsById.get(value as KnowledgeContextId)
  return context?.status === 'ACTIVE' ? context : null
}

export function resolveKnowledgeContextByRoute(route: string): KnowledgeContextDefinition | null {
  const context = contextsByRoute.get(route)
  return context?.status === 'ACTIVE' ? context : null
}

export function knowledgeContextHref(base: '/advieswijzer' | '/hulpvragen/nieuw', context: KnowledgeContextDefinition): InternalHref {
  return `${base}?${KNOWLEDGE_CONTEXT_QUERY_PARAM}=${encodeURIComponent(context.id)}` as InternalHref
}

export function validateKnowledgeContextCatalog(): readonly string[] {
  const issues: string[] = []
  const activeArticles = new Set<string>(knowledgeArticles.map((article) => article.href))
  const ids = knowledgeContexts.map((context) => context.id)
  const routes = knowledgeContexts.flatMap((context) => context.sourceRoutes)
  if (new Set(ids).size !== ids.length) issues.push('Kenniscontext-ID’s moeten uniek zijn.')
  if (new Set(routes).size !== routes.length) issues.push('Iedere kennispagina mag hoogstens één actieve context hebben.')
  for (const context of knowledgeContexts) {
    if (!Number.isInteger(context.version) || context.version < 1) issues.push(`${context.id} heeft geen geldige versie.`)
    if (!context.title || !context.shortLabel || !context.adviceIntro || !context.assignmentIntro) issues.push(`${context.id} mist gebruikerscopy.`)
    if (context.classificationSignals.length === 0) issues.push(`${context.id} mist classificatiesignalen.`)
    for (const route of context.sourceRoutes) if (!activeArticles.has(route)) issues.push(`${context.id} verwijst naar een onbekende kennispagina: ${route}.`)
  }
  return issues
}

const catalogIssues = validateKnowledgeContextCatalog()
if (catalogIssues.length > 0) throw new Error(`Ongeldige kenniscontextcatalogus:\n${catalogIssues.join('\n')}`)
