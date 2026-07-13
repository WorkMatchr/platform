import { z } from 'zod'
import type { IntakeQuestionCategory, IntakeQuestionInputType } from '@/generated/prisma/client'
import { IntakeServiceError } from './intake-errors'
import type { IntakeProgress, NormalizedIntakeAnswer } from './intake-types'

const uuidSchema = z.string().uuid()

export const createIntakeInputSchema = z.object({
  freeText: z.string(),
})

export const saveIntakeStepInputSchema = z.object({
  expectedIntakeVersion: z.number().int().positive(),
  category: z.enum([
    'HELP_REQUEST',
    'DESIRED_OUTCOME',
    'SITUATION',
    'IMPACT',
    'URGENCY',
    'LOCATION',
    'WORK_MODE',
    'PLANNING',
    'CONSTRAINTS',
  ]),
  answers: z
    .array(
      z.object({
        questionId: uuidSchema,
        value: z.unknown(),
      }),
    )
    .min(1)
    .max(25),
})

export const intakeVersionInputSchema = z.object({
  expectedIntakeVersion: z.number().int().positive(),
})

export const intakeIdentifierSchema = uuidSchema
export const organizationIdentifierSchema = uuidSchema

type DecimalValue = { toString(): string } | number | string

export type IntakeQuestionDefinition = {
  id: string
  key: string
  category: IntakeQuestionCategory
  inputType: IntakeQuestionInputType
  isRequired: boolean
  minLength: number | null
  maxLength: number | null
  minNumber: DecimalValue | null
  maxNumber: DecimalValue | null
  minSelections: number | null
  maxSelections: number | null
  options: Array<{
    id: string
    value: string
    isActive: boolean
    isExclusive: boolean
  }>
}

export type StoredIntakeAnswer = {
  questionId: string
  textValue: string | null
  numberValue: DecimalValue | null
  booleanValue: boolean | null
  dateValue: Date | null
  organizationLocationId: string | null
  options: Array<{ option: { value: string } }>
}

const EMPTY_ANSWER: NormalizedIntakeAnswer = {
  textValue: null,
  numberValue: null,
  booleanValue: null,
  dateValue: null,
  organizationLocationId: null,
  optionIds: [],
  isEmpty: true,
}

function validationError(question: IntakeQuestionDefinition, message: string): never {
  throw new IntakeServiceError('VALIDATION_ERROR', 'Een of meer antwoorden zijn niet geldig.', [
    { questionId: question.id, questionKey: question.key, message },
  ])
}

function isEmptyInput(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

function numberBoundary(value: DecimalValue | null): number | null {
  return value === null ? null : Number(value.toString())
}

function normalizeText(question: IntakeQuestionDefinition, value: unknown): NormalizedIntakeAnswer {
  if (typeof value !== 'string') validationError(question, 'Voer tekst in.')
  const normalized = value.trim()
  if (normalized.length === 0) return { ...EMPTY_ANSWER }
  if (/<\/?[a-z][^>]*>/i.test(normalized) || /javascript:/i.test(normalized)) {
    validationError(question, 'HTML of uitvoerbare inhoud is niet toegestaan.')
  }
  if (question.minLength !== null && normalized.length < question.minLength) {
    validationError(question, `Gebruik minimaal ${question.minLength} tekens.`)
  }
  if (question.maxLength !== null && normalized.length > question.maxLength) {
    validationError(question, `Gebruik maximaal ${question.maxLength} tekens.`)
  }
  return { ...EMPTY_ANSWER, textValue: normalized, isEmpty: false }
}

function normalizeNumber(question: IntakeQuestionDefinition, value: unknown): NormalizedIntakeAnswer {
  const raw = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim().replace(',', '.') : ''
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) validationError(question, 'Voer een geldig getal in.')
  const normalized = Number(raw)
  if (!Number.isFinite(normalized)) validationError(question, 'Voer een geldig getal in.')
  if (question.key === 'AFFECTED_EMPLOYEE_COUNT' && !Number.isInteger(normalized)) {
    validationError(question, 'Voer een geheel aantal medewerkers in.')
  }
  const min = numberBoundary(question.minNumber)
  const max = numberBoundary(question.maxNumber)
  if (min !== null && normalized < min) validationError(question, `De minimale waarde is ${min}.`)
  if (max !== null && normalized > max) validationError(question, `De maximale waarde is ${max}.`)
  return { ...EMPTY_ANSWER, numberValue: raw, isEmpty: false }
}

function normalizeDate(question: IntakeQuestionDefinition, value: unknown, today: Date): NormalizedIntakeAnswer {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    validationError(question, 'Voer een geldige datum in.')
  }
  const normalized = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(normalized.getTime()) || normalized.toISOString().slice(0, 10) !== value) {
    validationError(question, 'Voer een geldige datum in.')
  }
  if (question.key === 'PREFERRED_START_DATE' && value < today.toISOString().slice(0, 10)) {
    validationError(question, 'De gewenste startdatum mag niet in het verleden liggen.')
  }
  return { ...EMPTY_ANSWER, dateValue: normalized, isEmpty: false }
}

function normalizeOptions(question: IntakeQuestionDefinition, value: unknown): NormalizedIntakeAnswer {
  const requestedIds = question.inputType === 'SINGLE_SELECT' ? [value] : value
  if (!Array.isArray(requestedIds) || requestedIds.some((optionId) => typeof optionId !== 'string')) {
    validationError(question, 'Kies een geldige optie.')
  }
  const optionIds = [...new Set(requestedIds as string[])]
  const available = new Map(question.options.filter((option) => option.isActive).map((option) => [option.id, option]))
  if (optionIds.some((optionId) => !available.has(optionId))) validationError(question, 'Een gekozen optie is niet beschikbaar.')
  if (question.minSelections !== null && optionIds.length < question.minSelections) {
    validationError(question, `Kies minimaal ${question.minSelections} optie(s).`)
  }
  if (question.maxSelections !== null && optionIds.length > question.maxSelections) {
    validationError(question, `Kies maximaal ${question.maxSelections} optie(s).`)
  }
  const exclusiveCount = optionIds.filter((optionId) => available.get(optionId)?.isExclusive).length
  if (exclusiveCount > 0 && optionIds.length > 1) {
    validationError(question, 'Deze optie kan niet samen met een andere optie worden gekozen.')
  }
  return { ...EMPTY_ANSWER, optionIds, isEmpty: optionIds.length === 0 }
}

export function normalizeIntakeAnswer(
  question: IntakeQuestionDefinition,
  value: unknown,
  context: { activeLocationIds: ReadonlySet<string>; today?: Date },
): NormalizedIntakeAnswer {
  if (isEmptyInput(value)) return { ...EMPTY_ANSWER }

  switch (question.inputType) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      return normalizeText(question, value)
    case 'NUMBER':
      return normalizeNumber(question, value)
    case 'BOOLEAN':
      if (typeof value !== 'boolean') validationError(question, 'Kies ja of nee.')
      return { ...EMPTY_ANSWER, booleanValue: value, isEmpty: false }
    case 'DATE':
      return normalizeDate(question, value, context.today ?? new Date())
    case 'SINGLE_SELECT':
    case 'MULTI_SELECT':
      return normalizeOptions(question, value)
    case 'ORGANIZATION_LOCATION':
      if (typeof value !== 'string' || !context.activeLocationIds.has(value)) {
        validationError(question, 'Kies een actieve locatie van Uw organisatie.')
      }
      return { ...EMPTY_ANSWER, organizationLocationId: value, isEmpty: false }
    default: {
      const exhaustive: never = question.inputType
      return exhaustive
    }
  }
}

export function answersAreEqual(
  current: {
    textValue: string | null
    numberValue: DecimalValue | null
    booleanValue: boolean | null
    dateValue: Date | null
    organizationLocationId: string | null
    options: Array<{ optionId: string }>
  },
  normalized: NormalizedIntakeAnswer,
): boolean {
  const currentOptionIds = current.options.map((entry) => entry.optionId).sort()
  return (
    current.textValue === normalized.textValue &&
    (current.numberValue === null ? null : current.numberValue.toString()) === normalized.numberValue &&
    current.booleanValue === normalized.booleanValue &&
    (current.dateValue?.toISOString().slice(0, 10) ?? null) === (normalized.dateValue?.toISOString().slice(0, 10) ?? null) &&
    current.organizationLocationId === normalized.organizationLocationId &&
    JSON.stringify(currentOptionIds) === JSON.stringify([...normalized.optionIds].sort())
  )
}

function storedAnswerHasValue(answer: StoredIntakeAnswer | undefined): boolean {
  return Boolean(
    answer &&
      (answer.textValue !== null ||
        answer.numberValue !== null ||
        answer.booleanValue !== null ||
        answer.dateValue !== null ||
        answer.organizationLocationId !== null ||
        answer.options.length > 0),
  )
}

export function calculateIntakeProgress(
  questions: Array<Pick<IntakeQuestionDefinition, 'id' | 'key' | 'category' | 'isRequired'>>,
  answers: StoredIntakeAnswer[],
): IntakeProgress {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]))
  const workModeQuestion = questions.find((question) => question.key === 'PREFERRED_WORK_MODE')
  const workModeAnswer = workModeQuestion ? answersByQuestion.get(workModeQuestion.id) : undefined
  const isRemote = workModeAnswer?.options.some((entry) => entry.option.value === 'REMOTE') ?? false

  const missingQuestions = questions
    .filter((question) => question.isRequired || (question.key === 'PRIMARY_LOCATION' && !isRemote))
    .filter((question) => !storedAnswerHasValue(answersByQuestion.get(question.id)))

  return {
    isComplete: missingQuestions.length === 0,
    missingQuestionKeys: missingQuestions.map((question) => question.key),
    nextIncompleteCategory: missingQuestions[0]?.category ?? null,
    answeredQuestionCount: questions.filter((question) => storedAnswerHasValue(answersByQuestion.get(question.id))).length,
    totalQuestionCount: questions.length,
  }
}
