export const RIE_CONTEXT_PROFILE_VERSION = 'rie-context-profile/1.0.0' as const

export const RIE_INTENTS = [
  'NEW_RIE',
  'UPDATE_RIE',
  'RIE_QUESTION_OR_UNCLEAR',
  'RISK_IN_EXISTING_RIE',
] as const

export type RIEIntent = (typeof RIE_INTENTS)[number]

type RIEContextProfile = Readonly<{
  intent: RIEIntent
  questionKeys: readonly string[]
}>

const profiles = Object.freeze({
  NEW_RIE: {
    intent: 'NEW_RIE',
    questionKeys: [
      'context_employee_count',
      'context_location_count',
      'context_preferred_start',
    ],
  },
  UPDATE_RIE: {
    intent: 'UPDATE_RIE',
    questionKeys: [
      'context_employee_count',
      'context_location_count',
      'context_preferred_start',
    ],
  },
  RIE_QUESTION_OR_UNCLEAR: {
    intent: 'RIE_QUESTION_OR_UNCLEAR',
    questionKeys: [
      'context_rie_status',
      'context_employee_count',
      'context_location_count',
    ],
  },
  RISK_IN_EXISTING_RIE: {
    intent: 'RISK_IN_EXISTING_RIE',
    questionKeys: [
      'context_existing_investigation',
      'context_affected_scope',
      'context_preferred_start',
    ],
  },
} satisfies Record<RIEIntent, RIEContextProfile>)

const updatePattern =
  /\b(actualiseren|actualisatie|bijwerken|bijgewerkt|herzien|herziening|verouderd|ouder dan|\d+\s+jaar\s+oud)\b/
const newPattern =
  /\b(nieuwe?\s+ri&e|ri&e\s+(nodig|opstellen|uitvoeren|laten uitvoeren|maken)|voor het eerst\s+(?:een\s+)?ri&e)\b/
const existingRiePattern =
  /\b(in|opgenomen in|onderzocht in|staat in|binnen)\s+(?:onze|de|een|bestaande)?\s*ri&e\b|\bri&e\s+(?:staat|opgenomen|onderzocht)\b/
const concreteRiskPattern =
  /\b(lawaai|geluid|machine|gevaarlijke?\s+stof|stoffen|werkdruk|agressie|ongeval|incident|valgevaar|tillen|lichamelijke belasting|blootstelling|onveilige?\s+situatie|risico|probleem)\b/

function normalized(input: string): string {
  return input.trim().toLocaleLowerCase('nl-NL')
}

export function determineRIEIntent(originalInput: string): RIEIntent {
  const text = normalized(originalInput)
  if (existingRiePattern.test(text) && concreteRiskPattern.test(text)) {
    return 'RISK_IN_EXISTING_RIE'
  }
  if (updatePattern.test(text)) return 'UPDATE_RIE'
  if (/^(hebben|moeten|is|hoe|wat|wanneer|waarom)\b/.test(text) && text.includes('ri&e')) {
    return 'RIE_QUESTION_OR_UNCLEAR'
  }
  if (newPattern.test(text)) return 'NEW_RIE'
  return 'RIE_QUESTION_OR_UNCLEAR'
}

export function getRIEContextProfile(intent: RIEIntent): RIEContextProfile {
  return profiles[intent]
}

function mentionsEmployeeCount(text: string): boolean {
  return /\b\d+\s+(medewerkers|werknemers|personeelsleden)\b/.test(text)
}

function mentionsLocationCount(text: string): boolean {
  return /\b(?:\d+|een|één|twee|drie|vier|vijf)\s+(locaties|vestigingen)\b/.test(text)
}

function mentionsPreferredStart(text: string): boolean {
  return /(zo snel mogelijk|per direct|binnen (?:vier|\d+) weken|binnen (?:drie|\d+) maanden|vanaf \w+|starten? (?:in|op|vanaf))/.test(text)
}

function mentionsAffectedScope(text: string): boolean {
  return /\b(?:één|een|meerdere|verschillende|veel|\d+)\s+(?:medewerkers|werknemers|personen)\b/.test(text)
}

export function knownRIEContextQuestionKeys(originalInput: string): ReadonlySet<string> {
  const text = normalized(originalInput)
  const intent = determineRIEIntent(originalInput)
  const known = new Set<string>()

  if (intent !== 'RIE_QUESTION_OR_UNCLEAR') known.add('context_rie_status')
  if (mentionsEmployeeCount(text)) known.add('context_employee_count')
  if (mentionsLocationCount(text)) known.add('context_location_count')
  if (mentionsPreferredStart(text)) known.add('context_preferred_start')
  if (mentionsAffectedScope(text)) known.add('context_affected_scope')

  return known
}

export function selectRIEContextQuestionKeys(originalInput: string): readonly string[] {
  const intent = determineRIEIntent(originalInput)
  const known = knownRIEContextQuestionKeys(originalInput)
  return Object.freeze(
    getRIEContextProfile(intent).questionKeys.filter((questionKey) => !known.has(questionKey)),
  )
}
