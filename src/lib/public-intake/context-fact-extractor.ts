import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import type { PublicIntakeAnswerView } from './public-intake-types'
import type { ExtractedFact, KnowledgeConceptCandidate } from './context-question-engine-types'
import { caseUnderstandingFacts } from './case-understanding'
import type { CaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'

function normalized(input: string) {
  return input.trim().toLocaleLowerCase('nl-NL')
}

function uniqueFacts(facts: readonly ExtractedFact[]) {
  const byCode = new Map<string, ExtractedFact>()
  for (const fact of facts) {
    const existing = byCode.get(fact.code)
    if (!existing || fact.confidence > existing.confidence) byCode.set(fact.code, fact)
  }
  return Object.freeze([...byCode.values()])
}

export function extractPublicIntakeFacts(input: {
  originalInput: string
  answers: readonly PublicIntakeAnswerView[]
  caseUnderstanding?: CaseUnderstanding | null
}): readonly ExtractedFact[] {
  const text = normalized(input.originalInput)
  const facts: ExtractedFact[] = [...caseUnderstandingFacts(input.caseUnderstanding ?? null)]
  const count = text.match(/\b(\d{1,6})\s+(?:medewerkers|werknemers|personen|chauffeurs)\b/)
  if (count) {
    const countIsAffected = /(?:last|klacht|hoofdpijn|rug|betrokken|blootgesteld|ongeval)/.test(text)
    facts.push(Object.freeze({
      code: countIsAffected ? 'AFFECTED_COUNT' : 'ORGANIZATION_SIZE',
      value: Number(count[1]),
      status: 'RELIABLE_EXTRACTION',
      confidence: countIsAffected ? 0.98 : 0.9,
    }))
  }
  if (/\b(?:meerdere|verschillende|enkele|een paar|veel|twee|drie|vier|vijf|zes|zeven|acht|negen|tien)\s+(?:medewerkers|werknemers|collega[’']?s|personen|chauffeurs)\b/.test(text)) {
    facts.push(Object.freeze({ code: 'AFFECTED_SCOPE', value: 'MULTIPLE', status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  }
  const occupations = [
    ['chauffeur', /\bchauffeurs?\b/],
    ['kantoormedewerker', /\bkantoor(?:medewerkers?|werk)?\b/],
  ] as const
  for (const [value, pattern] of occupations) if (pattern.test(text)) facts.push(Object.freeze({ code: 'OCCUPATION', value, status: 'RELIABLE_EXTRACTION', confidence: 0.92 }))
  const complaints = [
    ['HEADACHE', /\bhoofdpijn\b/],
    ['BACK_COMPLAINT', /\b(?:rugklacht(?:en)?|last van (?:hun|de) rug)\b/],
  ] as const
  for (const [value, pattern] of complaints) if (pattern.test(text)) facts.push(Object.freeze({ code: 'HEALTH_COMPLAINT', value, status: 'RELIABLE_EXTRACTION', confidence: 0.95 }))
  if (/\b(?:loods|werkplaats|kantoor|magazijn)\b/.test(text)) facts.push(Object.freeze({ code: 'WORK_LOCATION_MENTIONED', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  const locationCount = text.match(/\b(\d{1,3}|twee|drie|vier|vijf)\s+(?:vestigingen|locaties|werklocaties)\b/)
  if (locationCount) {
    const words: Readonly<Record<string, number>> = { twee: 2, drie: 3, vier: 4, vijf: 5 }
    facts.push(Object.freeze({
      code: 'WORKSITE_COUNT',
      value: words[locationCount[1]] ?? Number(locationCount[1]),
      status: 'RELIABLE_EXTRACTION',
      confidence: 0.96,
    }))
  }
  if (
    /\b(?:verhuisd|verhuizing|nieuw kantoor|nieuwe werkplek|verbouwd)\b/.test(text)
    || /\b(?:werkplek|werkomgeving|kantoor|werkruimte)\b.{0,40}\b(?:gewijzigd|veranderd|aangepast)\b/.test(text)
    || /\b(?:gewijzigd|veranderd|aangepast)\b.{0,40}\b(?:werkplek|werkomgeving|kantoor|werkruimte)\b/.test(text)
  ) {
    facts.push(Object.freeze({ code: 'WORK_ENVIRONMENT_CHANGE', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
    facts.push(Object.freeze({ code: 'WORK_ENVIRONMENT_CHANGE_SIGNAL', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  }
  if (/\bheftrucks?\b/.test(text)) facts.push(Object.freeze({ code: 'EQUIPMENT', value: 'FORKLIFT', status: 'RELIABLE_EXTRACTION', confidence: 0.98 }))
  if (/\b(?:dampen?|gassen?|geuren?|stof|rook|emissie)\b/.test(text)) facts.push(Object.freeze({ code: 'EXPOSURE_SIGNAL', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.85 }))
  if (/\b(?:tillen|dragen|duwen|trekken|repeterend werk|lichamelijke belasting)\b/.test(text)) facts.push(Object.freeze({ code: 'PHYSICAL_LOAD_RELEVANT', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  if (/\b(?:na (?:een )?(?:hele )?(?:werk)?dag werken|na (?:de )?werkdag|tijdens (?:het )?werk|aan het einde van (?:de )?werkdag)\b/.test(text)) facts.push(Object.freeze({ code: 'DURATION_FREQUENCY', value: 'WORKDAY_PATTERN', status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  if (/\b(?:ploegendienst|ploegendiensten|nachtdienst|nachtdiensten)\b/.test(text)) facts.push(Object.freeze({ code: 'SHIFT_WORK', value: true, status: 'RELIABLE_EXTRACTION', confidence: 0.95 }))
  if (/\b(?:zo snel mogelijk|per direct|binnen (?:vier|\d+) weken|binnen (?:drie|\d+) maanden|volgende maand)\b/.test(text)) facts.push(Object.freeze({ code: 'START_WINDOW', value: 'MENTIONED', status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  if (/\b(?:ri&e|risico-inventarisatie)\b/.test(text)) facts.push(Object.freeze({ code: 'RIE_MENTIONED', value: true, status: 'EXPLICIT_INPUT', confidence: 1 }))
  if (/\b(?:voor het eerst|nieuwe? ri&e|ri&e nodig|ri&e laten uitvoeren)\b/.test(text)) facts.push(Object.freeze({ code: 'RIE_INTENT', value: 'NEW', status: 'RELIABLE_EXTRACTION', confidence: 0.95 }))
  if (/\b(?:actualiseren|bijwerken|verouderd|jaar oud)\b/.test(text) && /ri&e/.test(text)) facts.push(Object.freeze({ code: 'RIE_INTENT', value: 'UPDATE', status: 'RELIABLE_EXTRACTION', confidence: 0.95 }))
  if (/\b(?:bestaande|onze)\s+ri&e\b/.test(text) && /\b(?:risico|opgenomen|staat|controleren)\b/.test(text)) facts.push(Object.freeze({ code: 'RIE_INTENT', value: 'RISK_IN_EXISTING', status: 'RELIABLE_EXTRACTION', confidence: 0.9 }))
  if (/\bbedrijfsarts\b/.test(text)) facts.push(Object.freeze({ code: 'REQUESTED_DIRECTION', value: 'OCCUPATIONAL_PHYSICIAN', status: 'SUGGESTED_DIRECTION', confidence: 1 }))

  for (const answer of input.answers) {
    if (answer.disposition !== 'ANSWERED' || answer.value === null) continue
    const answerFactCodes: Readonly<Record<string, string>> = {
      context_sector: 'SECTOR',
      context_employee_count: 'ORGANIZATION_SIZE',
      context_location_count: 'WORKSITE_COUNT',
      context_preferred_start: 'START_WINDOW',
      context_work_activity: 'WORK_ACTIVITY',
      context_physical_load: 'PHYSICAL_LOAD',
      context_affected_scope: 'AFFECTED_SCOPE',
      context_existing_investigation: 'EXISTING_ASSESSMENT',
      context_urgency: 'URGENCY',
      context_location_pattern: 'LOCATION_PATTERN',
      context_environment_change: 'WORK_ENVIRONMENT_CHANGE',
      context_exposure_source: 'EXPOSURE_SOURCE',
      context_duration_frequency: 'DURATION_FREQUENCY',
      context_equipment_process: 'EQUIPMENT_OR_PROCESS',
    }
    const code = answerFactCodes[answer.questionKey]
    if (code) facts.push(Object.freeze({ code, value: answer.value, status: 'USER_CONFIRMED', confidence: 1, sourceQuestionKey: answer.questionKey }))
  }
  return uniqueFacts(facts)
}

export function deriveKnowledgeConceptCandidates(input: {
  originalInput: string
  classification: AIClassifierOutput | null
  facts: readonly ExtractedFact[]
}): readonly KnowledgeConceptCandidate[] {
  const concepts: KnowledgeConceptCandidate[] = []
  const fact = (code: string) => input.facts.find((item) => item.code === code)
  const semanticDomains = input.classification?.caseUnderstanding?.candidateExpertiseDomains.value ?? []
  for (const domain of semanticDomains) {
    if (domain === 'UNKNOWN') continue
    if (domain === 'RIE' && !fact('RIE_MENTIONED')) continue
    concepts.push(Object.freeze({
      code: domain,
      confidence: input.classification?.caseUnderstanding?.candidateExpertiseDomains.confidence ?? 0,
      source: 'CLASSIFIER',
      supportingKnowledgeIds: Object.freeze([]),
    }))
  }
  if (
    input.classification
    && semanticDomains.length === 0
    && input.classification.primarySubject !== 'UNKNOWN'
    && (input.classification.primarySubject !== 'RIE' || fact('RIE_MENTIONED'))
  ) {
    concepts.push(Object.freeze({ code: input.classification.primarySubject, confidence: input.classification.confidence === 'HIGH' ? 1 : 0.75, source: 'CLASSIFIER', supportingKnowledgeIds: Object.freeze([]) }))
  }
  if (fact('HEALTH_COMPLAINT')) concepts.push(Object.freeze({ code: 'HEALTH_COMPLAINT', confidence: 0.95, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: Object.freeze([]) }))
  if (fact('EQUIPMENT')) concepts.push(Object.freeze({ code: 'WORK_EQUIPMENT', confidence: 0.95, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: Object.freeze([]) }))
  if (fact('EXPOSURE_SIGNAL') || fact('EQUIPMENT')) concepts.push(Object.freeze({ code: 'EXPOSURE', confidence: 0.8, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: Object.freeze([]) }))
  if (fact('WORK_ENVIRONMENT_CHANGE_SIGNAL')) concepts.push(Object.freeze({ code: 'WORK_ENVIRONMENT_CHANGE', confidence: 0.9, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: Object.freeze([]) }))
  const text = normalized(input.originalInput)
  const explicitConceptSignals = [
    ['NOISE', /\b(?:geluid|lawaai|lawaaiig)\b/],
    ['PSA', /\b(?:werkdruk|psychosociale arbeidsbelasting|ongewenst gedrag|sociale veiligheid)\b/],
    ['MACHINE_SAFETY', /\b(?:machineveiligheid|machine|arbeidsmiddel)\b/],
    ['EMERGENCY_RESPONSE', /\b(?:bhv|bedrijfshulpverlening|ontruiming)\b/],
    ['DISPLAY_SCREEN_WORK', /\b(?:beeldschermwerk|beeldscherm|computerwerk)\b/],
    ['INDOOR_CLIMATE', /\b(?:binnenklimaat|ventilatie|luchtkwaliteit)\b/],
    ['WORK_AT_HEIGHT', /\b(?:werken op hoogte|valgevaar|dakwerk)\b/],
  ] as const
  for (const [code, pattern] of explicitConceptSignals) {
    if (pattern.test(text) && !concepts.some((concept) => concept.code === code)) {
      concepts.push(Object.freeze({ code, confidence: 0.9, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: Object.freeze([]) }))
    }
  }
  return Object.freeze(concepts)
}
