import { z } from 'zod'
import type {
  PublicIntakeAnswerDisposition,
  PublicIntakeAnswerType,
  PublicIntakeEntryPoint,
} from '@/generated/prisma/client'
import { PublicIntakeServiceError } from './public-intake-errors'
import { getPublicIntakeQuestion } from './public-intake-questions'
import { knowledgeContextIds, type KnowledgeContextId } from '@/content/knowledge/knowledge-contexts'

export const recognizableRequestKeys = [
  'rie_needed',
  'rie_update',
  'rie_uncertain',
  'health_complaints',
  'occupational_health_service',
  'legal_requirements',
  'other',
] as const

export type RecognizableRequestKey = (typeof recognizableRequestKeys)[number]

const createDraftSchema = z
  .object({
    entryPoint: z.enum(['FREE_TEXT', 'RECOGNIZABLE_REQUEST']),
    originalInput: z.string().trim().min(20).max(2000).optional(),
    selectedRequestKey: z
      .enum(recognizableRequestKeys, { error: 'Kies een geldige hulpvraag.' })
      .optional(),
    knowledgeContextId: z.enum(knowledgeContextIds).optional(),
    experience: z.enum(['ADVICE_GUIDE', 'HELP_REQUEST_V2']).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.entryPoint === 'FREE_TEXT' && !value.originalInput) {
      context.addIssue({ code: 'custom', path: ['originalInput'], message: 'Beschrijf uw situatie in minimaal 20 tekens.' })
    }
    if (value.entryPoint === 'RECOGNIZABLE_REQUEST' && !value.selectedRequestKey) {
      context.addIssue({ code: 'custom', path: ['selectedRequestKey'], message: 'Kies een geldige hulpvraag.' })
    }
  })

export type CreatePublicIntakeDraftInput = {
  entryPoint: PublicIntakeEntryPoint
  originalInput?: string
  selectedRequestKey?: RecognizableRequestKey
  knowledgeContextId?: KnowledgeContextId
  experience?: 'ADVICE_GUIDE' | 'HELP_REQUEST_V2'
}

export type NormalizedPublicIntakeAnswer = {
  questionKey: string
  questionVersion: number
  answerType: PublicIntakeAnswerType
  disposition: PublicIntakeAnswerDisposition
  textValue: string | null
  optionValue: string | null
  numberValue: number | null
  booleanValue: boolean | null
  dateValue: Date | null
  periodValue: string | null
}

export type RecordPublicIntakeAnswerInput = {
  questionKey: string
  questionVersion: number
  disposition: PublicIntakeAnswerDisposition
  value?: unknown
}

function validationError(message = 'Controleer het antwoord.'): never {
  throw new PublicIntakeServiceError('VALIDATION_ERROR', message)
}

export function parseCreatePublicIntakeDraftInput(
  input: unknown,
): CreatePublicIntakeDraftInput {
  const parsed = createDraftSchema.safeParse(input)
  if (!parsed.success) validationError(parsed.error.issues[0]?.message)
  return parsed.data
}

function emptyAnswer(
  questionKey: string,
  questionVersion: number,
  answerType: PublicIntakeAnswerType,
  disposition: PublicIntakeAnswerDisposition,
): NormalizedPublicIntakeAnswer {
  return {
    questionKey,
    questionVersion,
    answerType,
    disposition,
    textValue: null,
    optionValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    periodValue: null,
  }
}

export function normalizePublicIntakeAnswer(
  input: RecordPublicIntakeAnswerInput,
): NormalizedPublicIntakeAnswer {
  const question = getPublicIntakeQuestion(input.questionKey)
  if (!question || question.version !== input.questionVersion) validationError('Deze vraag is niet beschikbaar.')
  if (!['ANSWERED', 'UNKNOWN', 'SKIPPED'].includes(input.disposition)) validationError()

  const normalized = emptyAnswer(
    question.questionKey,
    question.version,
    question.answerType,
    input.disposition,
  )

  if (input.disposition !== 'ANSWERED') {
    if (!question.canSkip) validationError('Deze vraag kan niet worden overgeslagen.')
    if (input.value !== undefined && input.value !== null && input.value !== '') validationError()
    return normalized
  }

  switch (question.answerType) {
    case 'TEXT': {
      if (typeof input.value !== 'string') validationError('Voer tekst in.')
      const value = input.value.trim()
      const min = question.validation.minLength ?? 1
      const max = question.validation.maxLength ?? 2000
      if (value.length < min || value.length > max) validationError(`Gebruik ${min} tot ${max} tekens.`)
      return { ...normalized, textValue: value }
    }
    case 'OPTION':
    case 'PERIOD': {
      if (typeof input.value !== 'string' || !question.validation.options?.includes(input.value)) {
        validationError('Kies een geldige optie.')
      }
      return question.answerType === 'OPTION'
        ? { ...normalized, optionValue: input.value }
        : { ...normalized, periodValue: input.value }
    }
    case 'NUMBER': {
      const value =
        typeof input.value === 'number'
          ? input.value
          : typeof input.value === 'string' && input.value.trim() !== ''
            ? Number(input.value.replace(',', '.'))
            : Number.NaN
      if (!Number.isFinite(value) || !Number.isInteger(value)) validationError('Voer een geldig geheel getal in.')
      if (
        value < (question.validation.minNumber ?? Number.MIN_SAFE_INTEGER) ||
        value > (question.validation.maxNumber ?? Number.MAX_SAFE_INTEGER)
      ) {
        validationError('Het getal valt buiten de toegestane grenzen.')
      }
      return { ...normalized, numberValue: value }
    }
    case 'BOOLEAN':
      if (typeof input.value !== 'boolean') validationError('Kies ja of nee.')
      return { ...normalized, booleanValue: input.value }
    case 'DATE': {
      if (typeof input.value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.value)) {
        validationError('Voer een geldige datum in.')
      }
      const value = new Date(`${input.value}T00:00:00.000Z`)
      if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== input.value) {
        validationError('Voer een geldige datum in.')
      }
      return { ...normalized, dateValue: value }
    }
    default: {
      const exhaustive: never = question.answerType
      return exhaustive
    }
  }
}
