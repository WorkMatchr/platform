import { knowledgeArticles } from '@/content/knowledge/articles'
import { publicSources } from '@/content/public-sources'
import type {
  GuidanceOutcome,
  ProfessionalRequirement,
} from '@/lib/guidance/guidance-domain'

const professionalTypeLabels: Readonly<Record<string, string>> =
  Object.freeze({
    RIE_ADVISOR: 'RI&E-deskundige',
    INCIDENT_INVESTIGATOR: 'Veiligheidskundige of incidentonderzoeker',
    OCCUPATIONAL_HYGIENIST: 'Arbeidshygiënist',
    OCCUPATIONAL_PHYSICIAN: 'Bedrijfsarts',
    PHYSICAL_WORKLOAD_SPECIALIST:
      'Deskundige in fysieke belasting of ergonomie',
    BHV_ADVISOR: 'BHV-adviseur',
  })

type PresentedProfessionalRequirement = Readonly<{
  label: string
  reason: string
  expertise: readonly string[]
}>

type PresentedKnowledgeReference = Readonly<{
  id: string
  title: string
  summary: string
  href: string
}>

type PresentedSourceReference = Readonly<{
  id: string
  title: string
  publisher: string
  url: string
}>

export type PublicIntakeGuidancePresentation = Readonly<{
  situationSummary: string
  adviceTitle: string
  adviceBody: string
  adviceReasons: readonly string[]
  selfActions: readonly string[]
  primaryProfessionalRequirement: PresentedProfessionalRequirement | null
  additionalProfessionalRequirements: readonly PresentedProfessionalRequirement[]
  knowledgeReferences: readonly PresentedKnowledgeReference[]
  sourceReferences: readonly PresentedSourceReference[]
  uncertainties: readonly string[]
  disclaimer: string
  hasSpecificAdvice: boolean
}>

function presentRequirement(
  requirement: ProfessionalRequirement,
): PresentedProfessionalRequirement {
  return Object.freeze({
    label:
      professionalTypeLabels[requirement.professionalType] ??
      'Passende arbodeskundige',
    reason: requirement.reason,
    expertise: Object.freeze([...requirement.expertise]),
  })
}

function unique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)])
}

/**
 * Vertaalt het gevalideerde Professional Advice-contract naar bezoekerstaal.
 * Onbekende kennis- of bronverwijzingen worden fail-closed niet getoond.
 */
export function presentPublicIntakeGuidance(
  outcome: GuidanceOutcome,
): PublicIntakeGuidancePresentation {
  const advice = outcome.professionalAdvice
  const knowledgeReferences = advice.knowledgeReferences.flatMap(
    ({ contentId }) => {
      const content = knowledgeArticles.find(
        (article) => article.id === contentId,
      )

      return content
        ? [
            Object.freeze({
              id: content.id,
              title: content.title,
              summary: content.summary,
              href: content.href,
            }),
          ]
        : []
    },
  )
  const sourceReferences = advice.sourceReferences.flatMap(({ sourceId }) => {
    const source =
      publicSources[sourceId as keyof typeof publicSources]

    return source
      ? [
          Object.freeze({
            id: source.id,
            title: source.title,
            publisher: source.publisher,
            url: source.url,
          }),
        ]
      : []
  })

  return Object.freeze({
    situationSummary: advice.situationSummary,
    adviceTitle: advice.adviceTitle,
    adviceBody: advice.adviceBody,
    adviceReasons: Object.freeze([...advice.adviceReasons]),
    selfActions: Object.freeze([...advice.selfActions]),
    primaryProfessionalRequirement:
      advice.primaryProfessionalRequirement
        ? presentRequirement(advice.primaryProfessionalRequirement)
        : null,
    additionalProfessionalRequirements: Object.freeze(
      advice.additionalProfessionalRequirements.map(presentRequirement),
    ),
    knowledgeReferences: Object.freeze(knowledgeReferences),
    sourceReferences: Object.freeze(sourceReferences),
    uncertainties: unique(
      outcome.uncertainties.map((uncertainty) => uncertainty.description),
    ),
    disclaimer: advice.disclaimer,
    hasSpecificAdvice: advice.outcomeSpecificity === 'SPECIFIC',
  })
}
