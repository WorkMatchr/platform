import type { IntakeQuestionCategory } from '@/generated/prisma/client'
import { intakeQuestionnaireV2 } from '../../../prisma/intake-questionnaire-v2'

export type IntakeAnswerLookup = ReadonlyMap<string, readonly string[]>

export const intakeQuestionCatalog = new Map(
  intakeQuestionnaireV2.questions.map((question) => [question.key, question]),
)

const intakeQuestionPresentationOverrides: Readonly<Record<string, { label: string; helpText: string }>> = {
  OTHER_LOCATION_CITY: {
    label: 'In welke plaats of regio vindt de opdracht plaats?',
    helpText: 'Deze locatie geldt alleen voor deze opdracht en wordt niet automatisch als vestiging opgeslagen.',
  },
  MULTIPLE_LOCATION_DETAILS: {
    label: 'Op welke plaatsen of in welke regio’s vindt de opdracht plaats?',
    helpText: 'Vul minimaal twee plaatsen of regio’s in. De volgorde blijft bewaard in de opdracht.',
  },
}

export function getIntakeQuestionPresentation(
  questionKey: string,
  questionnaireVersion: number,
  fallback: { label: string; helpText: string | null },
) {
  if (questionnaireVersion < 2) return fallback
  return intakeQuestionPresentationOverrides[questionKey] ?? fallback
}

export function isCatalogQuestionActive(
  questionKey: string,
  questionnaireVersion = 2,
): boolean {
  if (questionnaireVersion < 2) return true
  return intakeQuestionCatalog.get(questionKey)?.active ?? true
}

export function createIntakeAnswerLookup(
  questions: ReadonlyArray<{
    key: string
    value: string | string[] | boolean | null
    options: ReadonlyArray<{ id: string; value: string }>
  }>,
): IntakeAnswerLookup {
  return new Map(questions.map((question) => {
    const selectedIds = Array.isArray(question.value)
      ? question.value
      : typeof question.value === 'string'
        ? [question.value]
        : []
    const optionValues = selectedIds
      .map((id) => question.options.find((option) => option.id === id)?.value)
      .filter((value): value is string => Boolean(value))
    return [question.key, optionValues]
  }))
}

export function isCatalogQuestionVisible(
  questionKey: string,
  answers: IntakeAnswerLookup,
  questionnaireVersion = 2,
): boolean {
  if (!isCatalogQuestionActive(questionKey, questionnaireVersion)) return false
  if (questionnaireVersion < 2) return true
  const metadata = intakeQuestionCatalog.get(questionKey)
  if (!metadata) return true
  if (!metadata.visibleWhen) return true
  const values = answers.get(metadata.visibleWhen.questionKey) ?? []
  return metadata.visibleWhen.oneOf.some((value) => values.includes(value))
}

export function getVisibleQuestionKeys(
  questionKeys: readonly string[],
  answers: IntakeAnswerLookup,
  questionnaireVersion = 2,
): Set<string> {
  return new Set(questionKeys.filter((key) => isCatalogQuestionVisible(key, answers, questionnaireVersion)))
}

export function getVisibleIntakeCategories(
  questions: ReadonlyArray<{ key: string; category: IntakeQuestionCategory }>,
  answers: IntakeAnswerLookup,
  questionnaireVersion = 2,
): IntakeQuestionCategory[] {
  return [...new Set(
    questions
      .filter((question) => isCatalogQuestionVisible(question.key, answers, questionnaireVersion))
      .map((question) => question.category),
  )]
}

export function isReviewQuestionVisible(
  questionKey: string,
  answers: IntakeAnswerLookup,
  questionnaireVersion: number,
  hasStoredAnswer: boolean,
): boolean {
  return isCatalogQuestionVisible(questionKey, answers, questionnaireVersion) || hasStoredAnswer
}

export const helpCategoryLabels: Readonly<Record<string, string>> = {
  BHV: 'BHV en ontruiming',
  RIE: 'RI&E en plan van aanpak',
  HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen',
  INCIDENT: 'Incident of ongeval',
  ERGONOMICS: 'Ergonomie en fysieke belasting',
  OCCUPATIONAL_HEALTH: 'Gezondheid en inzetbaarheid',
  MACHINERY_SAFETY: 'Machine- en arbeidsmiddelenveiligheid',
  PSA: 'Werkdruk en sociale veiligheid',
  OTHER: 'Anders',
  NOT_SURE: 'Dat weet ik nog niet',
}
