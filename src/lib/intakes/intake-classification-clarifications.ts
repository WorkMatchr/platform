import type { IntakeClassificationCategory, IntakeClassificationConfidence } from './intake-classification'

export type IntakeClassificationClarificationOption = Readonly<{
  id: string
  label: string
  category: IntakeClassificationCategory | 'NOT_SURE' | null
}>

export type IntakeClassificationClarificationSet = Readonly<{
  id: string
  version: number
  active: boolean
  priority: number
  contextSignals: readonly string[]
  confidenceRange: Readonly<{
    minimum: IntakeClassificationConfidence
    maximum: IntakeClassificationConfidence
  }>
  introduction: string
  question: string
  options: readonly IntakeClassificationClarificationOption[]
}>

export const CLASSIFICATION_CLARIFICATION_SET_FIELD = 'classificationClarificationSetId'
export const CLASSIFICATION_CLARIFICATION_OPTION_FIELD = 'classificationClarificationOptionId'

const CONFIDENCE_ORDER: Readonly<Record<IntakeClassificationConfidence, number>> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
}

export const intakeClassificationClarificationSets = Object.freeze([
  Object.freeze({
    id: 'WORKPLACE_CONTEXT_KITCHEN_V1',
    version: 1,
    active: false,
    priority: 100,
    contextSignals: Object.freeze(['keuken', 'bedrijfskeuken', 'horecakeuken', 'grootkeuken', 'restaurantkeuken']),
    confidenceRange: Object.freeze({ minimum: 'LOW', maximum: 'MEDIUM' }),
    introduction: 'We hebben nog één korte vraag om uw hulpvraag beter te begrijpen.',
    question: 'Waar gaat uw vraag vooral over?',
    options: Object.freeze([
      Object.freeze({ id: 'KITCHEN_EQUIPMENT', label: 'Veilig gebruik van keukenapparatuur', category: 'MACHINERY_SAFETY' }),
      Object.freeze({ id: 'KITCHEN_CUT_HEAT_FIRE', label: 'Snij-, hitte- of brandgevaar', category: 'BHV' }),
      Object.freeze({ id: 'KITCHEN_CHEMICALS', label: 'Schoonmaakmiddelen en gevaarlijke stoffen', category: 'HAZARDOUS_SUBSTANCES' }),
      Object.freeze({ id: 'KITCHEN_PHYSICAL_LOAD', label: 'Fysieke belasting', category: 'ERGONOMICS' }),
      Object.freeze({ id: 'KITCHEN_GENERAL_SAFETY', label: 'Een algemene veiligheidsbeoordeling', category: 'RIE' }),
      Object.freeze({ id: 'KITCHEN_NOT_SURE', label: 'Dat weet ik nog niet', category: null }),
    ]),
  } satisfies IntakeClassificationClarificationSet),
  Object.freeze({
    id: 'WORKPLACE_CONTEXT_KITCHEN_V2',
    version: 2,
    active: true,
    priority: 110,
    contextSignals: Object.freeze(['keuken', 'bedrijfskeuken', 'horecakeuken', 'grootkeuken', 'restaurantkeuken']),
    confidenceRange: Object.freeze({ minimum: 'LOW', maximum: 'MEDIUM' }),
    introduction: 'We hebben nog één korte vraag om uw hulpvraag beter te begrijpen.',
    question: 'Waar gaat uw vraag vooral over?',
    options: Object.freeze([
      Object.freeze({
        id: 'KITCHEN_V2_EQUIPMENT',
        label: 'Veilig gebruik van keukenapparatuur, zoals ovens, vaatwassers en mixers',
        category: 'MACHINERY_SAFETY',
      }),
      Object.freeze({
        id: 'KITCHEN_V2_CUTTING_EQUIPMENT',
        label: 'Messen, snijmachines en ander keukenmaterieel voor snijwerk',
        category: 'MACHINERY_SAFETY',
      }),
      Object.freeze({
        id: 'KITCHEN_V2_HEAT_BURNS',
        label: 'Hete oppervlakken, stoom, olie en risico op brandwonden',
        category: 'RIE',
      }),
      Object.freeze({
        id: 'KITCHEN_V2_FIRE_EVACUATION',
        label: 'Brandveiligheid, blusmiddelen en ontruiming',
        category: 'BHV',
      }),
      Object.freeze({
        id: 'KITCHEN_V2_CHEMICALS',
        label: 'Schoonmaakmiddelen en gevaarlijke stoffen',
        category: 'HAZARDOUS_SUBSTANCES',
      }),
      Object.freeze({ id: 'KITCHEN_V2_PHYSICAL_LOAD', label: 'Fysieke belasting', category: 'ERGONOMICS' }),
      Object.freeze({
        id: 'KITCHEN_V2_GENERAL_SAFETY',
        label: 'Een algemene veiligheidsbeoordeling',
        category: 'RIE',
      }),
      Object.freeze({ id: 'KITCHEN_V2_NOT_SURE', label: 'Dat weet ik nog niet', category: null }),
    ]),
  } satisfies IntakeClassificationClarificationSet),
] satisfies readonly IntakeClassificationClarificationSet[])

function normalize(value: string): string {
  return value.toLocaleLowerCase('nl-NL').replace(/\s+/g, ' ').trim()
}

function confidenceIsInRange(
  confidence: IntakeClassificationConfidence,
  range: IntakeClassificationClarificationSet['confidenceRange'],
): boolean {
  const value = CONFIDENCE_ORDER[confidence]
  return value >= CONFIDENCE_ORDER[range.minimum] && value <= CONFIDENCE_ORDER[range.maximum]
}

export function findIntakeClassificationClarificationSet(
  freeText: string,
  confidence: IntakeClassificationConfidence,
): IntakeClassificationClarificationSet | undefined {
  const input = normalize(freeText)
  return intakeClassificationClarificationSets
    .filter((set) => set.active && confidenceIsInRange(confidence, set.confidenceRange))
    .filter((set) => set.contextSignals.some((signal) => input.includes(signal)))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))[0]
}

export function getIntakeClassificationClarificationSet(
  setId: string,
): IntakeClassificationClarificationSet | undefined {
  return intakeClassificationClarificationSets.find((set) => set.id === setId)
}

export function resolveIntakeClassificationClarification(
  setId: string,
  optionId: string,
): IntakeClassificationClarificationOption | undefined {
  return getIntakeClassificationClarificationSet(setId)?.options.find((option) => option.id === optionId)
}
