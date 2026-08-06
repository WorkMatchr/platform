import { findIntakeClassificationClarificationSet } from './intake-classification-clarifications'

export type IntakeClassificationConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type IntakeClassificationOutcome = 'DIRECT_PROPOSAL' | 'TARGETED_CLARIFICATION' | 'GENERIC_FALLBACK'
export type IntakeClassificationSecondaryContext = 'FIRE_SAFETY' | 'ENVIRONMENT' | 'EXTERNAL_SAFETY'

type SignalGroup = 'domain' | 'intent' | 'context' | 'risk'

type CategoryRule = {
  phrases: readonly string[]
  domainSignals: readonly string[]
  intentSignals?: readonly string[]
  contextSignals?: readonly string[]
  riskSignals?: readonly string[]
  combinations?: readonly Readonly<{
    allOf: readonly string[]
    score: number
  }>[]
}

const CATEGORY_RULES = {
  BHV: {
    phrases: ['bedrijfshulpverlening', 'bhv organisatie', 'bhv-organisatie', 'ontruimingsplan', 'ontruimingsoefening'],
    domainSignals: ['bhv', 'ontruiming', 'ehbo', 'vluchtroute', 'hulpverlener'],
    riskSignals: ['brandveiligheid'],
  },
  RIE: {
    phrases: ['risico inventarisatie', 'risico-inventarisatie', 'plan van aanpak'],
    domainSignals: ['ri&e', 'rie', 'risicoanalyse'],
    riskSignals: ['risico\'s', 'risicos'],
  },
  HAZARDOUS_SUBSTANCES: {
    phrases: ['gevaarlijke stoffen', 'chemische stoffen', 'blootstelling aan stoffen', 'gasopslag', 'brandstofopslag'],
    domainSignals: ['atex', 'pgs', 'brandstof', 'oplosmiddelen', 'chemicaliën', 'asbest', 'gas'],
    intentSignals: ['eisen', 'vergunning', 'uitbreiding', 'uitbreiden', 'vergroten'],
    contextSignals: ['liter', 'tank', 'capaciteit', 'opslag', 'installatie', 'reservoir'],
    riskSignals: ['explosie', 'lekkage', 'ontvlambaar'],
    combinations: [
      { allOf: ['gas', 'opslag'], score: 6 },
      { allOf: ['brandstof', 'opslag'], score: 6 },
    ],
  },
  INCIDENT: {
    phrases: ['bijna ongeval', 'bijna-ongeval', 'arbeidsongeval', 'incidentonderzoek'],
    domainSignals: ['incident', 'ongeval', 'gevallen', 'letsel', 'onderzoek'],
  },
  ERGONOMICS: {
    phrases: ['fysieke belasting', 'lichamelijke belasting', 'werkplekonderzoek'],
    domainSignals: ['ergonomie', 'tillen', 'houding', 'stoel', 'repetitief', 'rugklachten'],
  },
  OCCUPATIONAL_HEALTH: {
    phrases: ['duurzame inzetbaarheid', 'preventief medisch onderzoek', 'periodiek arbeidsgezondheidskundig onderzoek'],
    domainSignals: ['bedrijfsarts', 'verzuim', 'pmo', 'pago', 'gezondheid', 'inzetbaarheid'],
  },
  MACHINERY_SAFETY: {
    phrases: ['machine veiligheid', 'machineveiligheid', 'arbeidsmiddelen keuren'],
    domainSignals: ['machine', 'arbeidsmiddel', 'ce-markering', 'gereedschap', 'afscherming'],
  },
  PSA: {
    phrases: ['psychosociale arbeidsbelasting', 'sociale veiligheid', 'ongewenst gedrag'],
    domainSignals: ['werkdruk', 'psa', 'pesten', 'agressie', 'intimidatie', 'stress'],
  },
} as const satisfies Record<string, CategoryRule>

export type IntakeClassificationCategory = keyof typeof CATEGORY_RULES

export type IntakeClassification = {
  category: IntakeClassificationCategory | 'NOT_SURE'
  confidence: IntakeClassificationConfidence
  outcome: IntakeClassificationOutcome
  matchedSignals: number
  score: number
  clarificationSetId?: string
  secondaryContexts: readonly IntakeClassificationSecondaryContext[]
}

export type IntakeClassificationContext = Readonly<{
  suggestedCategory?: IntakeClassificationCategory
  classificationSignals?: readonly string[]
}>

function normalize(value: string): string {
  return value.toLocaleLowerCase('nl-NL').replace(/\s+/g, ' ').trim()
}

function containsSignal(input: string, signal: string): boolean {
  return input.includes(signal)
}

function countSignals(input: string, signals: readonly string[] | undefined): number {
  return signals?.filter((signal) => containsSignal(input, signal)).length ?? 0
}

function detectSecondaryContexts(input: string): readonly IntakeClassificationSecondaryContext[] {
  const contexts: IntakeClassificationSecondaryContext[] = []
  if (['brandveiligheid', 'brand', 'explosie'].some((signal) => containsSignal(input, signal))) contexts.push('FIRE_SAFETY')
  if (['milieu', 'emissie', 'bodem'].some((signal) => containsSignal(input, signal))) contexts.push('ENVIRONMENT')
  if (['externe veiligheid', 'omgeving', 'omwonenden'].some((signal) => containsSignal(input, signal))) contexts.push('EXTERNAL_SAFETY')
  return Object.freeze(contexts)
}

function scoreCategory(input: string, category: IntakeClassificationCategory, rule: CategoryRule) {
  const phrases = countSignals(input, rule.phrases)
  const domain = countSignals(input, rule.domainSignals)
  const intent = countSignals(input, rule.intentSignals)
  const context = countSignals(input, rule.contextSignals)
  const risk = countSignals(input, rule.riskSignals)
  const combinationScore = rule.combinations
    ?.filter((combination) => combination.allOf.every((signal) => containsSignal(input, signal)))
    .reduce((total, combination) => total + combination.score, 0) ?? 0
  const matchedGroups = ([
    phrases + domain > 0 ? 'domain' : undefined,
    intent > 0 ? 'intent' : undefined,
    context > 0 ? 'context' : undefined,
    risk > 0 ? 'risk' : undefined,
  ].filter(Boolean) as SignalGroup[])

  return {
    category,
    score: phrases * 4 + domain * 2 + intent + context + risk * 2 + combinationScore,
    signals: phrases + domain + intent + context + risk,
    matchedGroups,
    hasDomainEvidence: phrases + domain > 0,
  }
}

export function classifyIntakeHelpRequest(
  freeText: string,
  context?: IntakeClassificationContext | null,
): IntakeClassification {
  const input = normalize(freeText)
  const results = (Object.entries(CATEGORY_RULES) as Array<[IntakeClassificationCategory, CategoryRule]>)
    .map(([category, rule]) => {
      const result = scoreCategory(input, category, rule)
      const contextMatches = category === context?.suggestedCategory
        ? countSignals(input, context.classificationSignals)
        : 0
      const contextSupportScore = contextMatches > 0 ? Math.min(contextMatches + 2, 3) : 0
      return {
        ...result,
        score: result.score + contextSupportScore,
        signals: result.signals + contextMatches,
      }
    })
    .sort((left, right) => right.score - left.score || right.signals - left.signals || left.category.localeCompare(right.category))

  const best = results[0]
  const runnerUp = results[1]
  const margin = best ? best.score - (runnerUp?.score ?? 0) : 0
  const secondaryContexts = detectSecondaryContexts(input)

  const lowConfidence = !best || best.score < 2 || (!best.hasDomainEvidence && best.matchedGroups.length < 2)
  if (lowConfidence) {
    const clarificationSet = findIntakeClassificationClarificationSet(freeText, 'LOW')
    if (clarificationSet) {
      return {
        category: 'NOT_SURE',
        confidence: 'MEDIUM',
        outcome: 'TARGETED_CLARIFICATION',
        matchedSignals: best?.signals ?? 0,
        score: best?.score ?? 0,
        clarificationSetId: clarificationSet.id,
        secondaryContexts,
      }
    }
    return {
      category: 'NOT_SURE',
      confidence: 'LOW',
      outcome: 'GENERIC_FALLBACK',
      matchedSignals: best?.signals ?? 0,
      score: best?.score ?? 0,
      secondaryContexts,
    }
  }

  const highConfidence = best.hasDomainEvidence && best.score >= 5 && margin >= 2
  if (highConfidence) {
    return {
      category: best.category,
      confidence: 'HIGH',
      outcome: 'DIRECT_PROPOSAL',
      matchedSignals: best.signals,
      score: best.score,
      secondaryContexts,
    }
  }

  const clarificationSet = findIntakeClassificationClarificationSet(freeText, 'MEDIUM')
  return clarificationSet
    ? {
        category: 'NOT_SURE',
        confidence: 'MEDIUM',
        outcome: 'TARGETED_CLARIFICATION',
        matchedSignals: best.signals,
        score: best.score,
        clarificationSetId: clarificationSet.id,
        secondaryContexts,
      }
    : {
        category: 'NOT_SURE',
        confidence: 'LOW',
        outcome: 'GENERIC_FALLBACK',
        matchedSignals: best.signals,
        score: best.score,
        secondaryContexts,
      }
}
