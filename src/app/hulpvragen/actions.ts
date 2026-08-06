'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import { classifyIntakeHelpRequest } from '@/lib/intakes/intake-classification'
import {
  CLASSIFICATION_CLARIFICATION_OPTION_FIELD,
  CLASSIFICATION_CLARIFICATION_SET_FIELD,
  resolveIntakeClassificationClarification,
} from '@/lib/intakes/intake-classification-clarifications'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getNextIntakeCategory } from '@/lib/intakes/intake-presentation'
import { getVisibleIntakeSteps } from '@/lib/intakes/intake-presentation'
import { createIntakeAnswerLookup, getVisibleIntakeCategories } from '@/lib/intakes/intake-question-catalog'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'
import { validateMultipleLocations } from '@/lib/intakes/intake-multiple-locations'
import {
  archiveIntake,
  createIntake,
  markIntakeReadyForReview,
  reopenIntake,
  saveIntakeStep,
} from '@/lib/intakes/intake-service'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'

export type IntakeFormValue = string | string[] | boolean

export type IntakeActionState = {
  message?: string
  success?: boolean
  errors?: Record<string, string[] | undefined>
  values?: Record<string, IntakeFormValue>
}

const uuidSchema = z.string().uuid()
const categorySchema = z.enum([
  'HELP_REQUEST',
  'DESIRED_OUTCOME',
  'SITUATION',
  'IMPACT',
  'URGENCY',
  'LOCATION',
  'WORK_MODE',
  'PLANNING',
  'CONSTRAINTS',
])

const stepEnvelopeSchema = z.object({
  intakeId: uuidSchema,
  category: categorySchema,
  expectedIntakeVersion: z.coerce.number().int().positive(),
  questionIds: z.array(uuidSchema).min(1).max(25),
  multiQuestionIds: z.array(uuidSchema).max(25),
  booleanQuestionIds: z.array(uuidSchema).max(25),
  repeatableQuestionIds: z.array(uuidSchema).max(25),
  returnToReview: z.literal('true').optional(),
})

const versionEnvelopeSchema = z.object({
  intakeId: uuidSchema,
  expectedIntakeVersion: z.coerce.number().int().positive(),
})

function serviceErrorState(
  error: unknown,
  values?: Record<string, IntakeFormValue>,
  fallback = 'Deze actie is door een technische fout niet gelukt. Uw gegevens zijn bewaard. Probeer het opnieuw of neem contact op met WorkMatchr.',
): IntakeActionState {
  if (!(error instanceof IntakeServiceError)) return { message: fallback, values }

  const errors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.questionId ?? issue.questionKey
    if (key) errors[key] = [...(errors[key] ?? []), issue.message]
  }

  return {
    message: error.message,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    values,
  }
}

function stringValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String).filter(Boolean)
}

function collectStepValues(
  formData: FormData,
  questionIds: string[],
  multiQuestionIds: ReadonlySet<string>,
  booleanQuestionIds: ReadonlySet<string>,
  repeatableQuestionIds: ReadonlySet<string>,
): Record<string, IntakeFormValue> {
  return Object.fromEntries(
    questionIds.map((questionId) => {
      const fieldName = `answer-${questionId}`
      if (repeatableQuestionIds.has(questionId)) {
        return [questionId, formData.getAll(fieldName).map(String)]
      }
      if (multiQuestionIds.has(questionId)) {
        return [questionId, formData.getAll(fieldName).map(String).filter(Boolean)]
      }

      const rawValue = String(formData.get(fieldName) ?? '')
      if (booleanQuestionIds.has(questionId) && rawValue !== '') {
        return [questionId, rawValue === 'true']
      }
      return [questionId, rawValue]
    }),
  )
}

export async function createIntakeAction(
  _state: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const user = await requireUser('/hulpvragen/nieuw')
  const organizationId = String(formData.get('organizationId') ?? '')
  const freeText = String(formData.get('freeText') ?? '')
  const knowledgeContextId = String(formData.get('knowledgeContextId') ?? '') || undefined
  const values = { freeText }

  let intakeId: string
  try {
    intakeId = (await createIntake(user.id, organizationId, { freeText, knowledgeContextId })).id
  } catch (error) {
    const state = serviceErrorState(error, values, 'De opdracht kon door een technische fout niet worden gestart. Uw beschrijving is niet verloren gegaan. Probeer het opnieuw of neem contact op met WorkMatchr.')
    if (state.errors && !state.errors.freeText) {
      state.errors.freeText = Object.values(state.errors)
        .flat()
        .filter((message): message is string => Boolean(message))
    }
    return state
  }

  revalidatePath('/hulpvragen')
  redirect(`/hulpvragen/${intakeId}`)
}

export async function saveIntakeStepAction(
  _state: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const user = await requireUser('/hulpvragen')
  const envelope = stepEnvelopeSchema.safeParse({
    intakeId: String(formData.get('intakeId') ?? ''),
    category: String(formData.get('category') ?? ''),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
    questionIds: stringValues(formData, 'questionId'),
    multiQuestionIds: stringValues(formData, 'multiQuestionId'),
    booleanQuestionIds: stringValues(formData, 'booleanQuestionId'),
    repeatableQuestionIds: stringValues(formData, 'repeatableQuestionId'),
    returnToReview: formData.get('returnToReview') || undefined,
  })
  if (!envelope.success) {
    return { message: 'De formuliergegevens zijn niet meer geldig. Vernieuw de pagina en probeer het opnieuw.' }
  }

  const multiQuestionIds = new Set(envelope.data.multiQuestionIds)
  const booleanQuestionIds = new Set(envelope.data.booleanQuestionIds)
  const repeatableQuestionIds = new Set(envelope.data.repeatableQuestionIds)
  const values = collectStepValues(
    formData,
    envelope.data.questionIds,
    multiQuestionIds,
    booleanQuestionIds,
    repeatableQuestionIds,
  )
  const clarificationSetId = String(formData.get(CLASSIFICATION_CLARIFICATION_SET_FIELD) ?? '')
  const clarificationOptionId = String(formData.get(CLASSIFICATION_CLARIFICATION_OPTION_FIELD) ?? '')
  if (clarificationSetId) values[CLASSIFICATION_CLARIFICATION_SET_FIELD] = clarificationSetId
  if (clarificationOptionId) values[CLASSIFICATION_CLARIFICATION_OPTION_FIELD] = clarificationOptionId

  for (const questionId of repeatableQuestionIds) {
    const result = validateMultipleLocations(values[questionId])
    if (result.generalError || Object.keys(result.errors).length > 0) {
      const errors: Record<string, string[]> = {}
      if (result.generalError) errors[questionId] = [result.generalError]
      for (const [index, message] of Object.entries(result.errors)) errors[`${questionId}:${index}`] = [message]
      return {
        message: 'Controleer de gemarkeerde locaties.',
        errors,
        values,
      }
    }
  }

  try {
    if (envelope.data.category === 'HELP_REQUEST') {
      const intakeBeforeSave = await getIntakeDetail(user.id, envelope.data.intakeId)
      const classification = intakeBeforeSave.questionnaireVersion >= 2
        ? classifyIntakeHelpRequest(
            intakeBeforeSave.freeText,
            resolveActiveKnowledgeContext(intakeBeforeSave.knowledgeContext?.id),
          )
        : undefined
      const categoryQuestion = intakeBeforeSave.questions.find((question) => question.key === 'CONFIRMED_HELP_CATEGORY')
      const hasStoredCategory = Array.isArray(categoryQuestion?.value)
        ? categoryQuestion.value.length > 0
        : Boolean(categoryQuestion?.value)
      const expectsClarification = classification?.outcome === 'TARGETED_CLARIFICATION' && !hasStoredCategory
      const clarificationOption = clarificationSetId && clarificationOptionId
        ? resolveIntakeClassificationClarification(clarificationSetId, clarificationOptionId)
        : undefined
      const invalidClarification =
        (expectsClarification && (
          clarificationSetId !== classification.clarificationSetId ||
          !clarificationOptionId ||
          !clarificationOption
        )) ||
        (!expectsClarification && Boolean(clarificationSetId || clarificationOptionId)) ||
        (Boolean(clarificationSetId || clarificationOptionId) && !clarificationOption)

      if (invalidClarification) {
        const questionId = categoryQuestion?.id
        return {
          message: 'Kies opnieuw wat het beste bij uw hulpvraag past.',
          errors: questionId ? { [questionId]: ['De gekozen verduidelijking is niet geldig.'] } : undefined,
          values,
        }
      }
    }

    await saveIntakeStep(user.id, envelope.data.intakeId, {
      expectedIntakeVersion: envelope.data.expectedIntakeVersion,
      category: envelope.data.category,
      answers: envelope.data.questionIds.map((questionId) => ({
        questionId,
        value: repeatableQuestionIds.has(questionId)
          ? validateMultipleLocations(values[questionId]).serialized
          : values[questionId],
      })),
    })
  } catch (error) {
    return serviceErrorState(error, values, 'De antwoorden konden door een technische fout niet worden opgeslagen. Uw invoer blijft staan. Probeer het opnieuw of neem contact op met WorkMatchr.')
  }

  revalidatePath('/hulpvragen')
  revalidatePath(`/hulpvragen/${envelope.data.intakeId}`)
  if (envelope.data.returnToReview === 'true') {
    return redirect(`/hulpvragen/${envelope.data.intakeId}/controle?opgeslagen=1`)
  }
  const intake = await getIntakeDetail(user.id, envelope.data.intakeId)
  const lookup = createIntakeAnswerLookup(intake.questions)
  const visibleSteps = getVisibleIntakeSteps(getVisibleIntakeCategories(intake.questions, lookup, intake.questionnaireVersion))
  const currentIndex = visibleSteps.findIndex((step) => step.category === envelope.data.category)
  const currentStep = visibleSteps[currentIndex]
  const nextCategory = intake.progress.nextIncompleteCategory === envelope.data.category
    ? currentStep
    : currentIndex >= 0
      ? visibleSteps[currentIndex + 1]
      : getNextIntakeCategory(envelope.data.category)
  redirect(
    nextCategory
      ? `/hulpvragen/${envelope.data.intakeId}/${nextCategory.slug}?opgeslagen=1`
      : `/hulpvragen/${envelope.data.intakeId}/controle?opgeslagen=1`,
  )
}

export async function markIntakeReadyForReviewAction(
  _state: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const user = await requireUser('/hulpvragen')
  const envelope = versionEnvelopeSchema.safeParse({
    intakeId: String(formData.get('intakeId') ?? ''),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
  })
  if (!envelope.success) return { message: 'Vernieuw de pagina en probeer het opnieuw.' }

  try {
    await markIntakeReadyForReview(user.id, envelope.data.intakeId, envelope.data)
  } catch (error) {
    return serviceErrorState(error, undefined, 'De opdracht kon door een technische fout niet worden voorbereid voor controle. Uw antwoorden zijn bewaard. Probeer het opnieuw.')
  }

  revalidatePath('/hulpvragen')
  revalidatePath(`/hulpvragen/${envelope.data.intakeId}`)
  redirect(`/hulpvragen/${envelope.data.intakeId}/controle?gereed=1`)
}

export async function reopenIntakeAction(formData: FormData): Promise<void> {
  const user = await requireUser('/hulpvragen')
  const envelope = versionEnvelopeSchema.safeParse({
    intakeId: String(formData.get('intakeId') ?? ''),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
  })
  if (!envelope.success) redirect('/hulpvragen?actie=mislukt')

  try {
    await reopenIntake(user.id, envelope.data.intakeId, envelope.data)
  } catch {
    redirect(`/hulpvragen/${envelope.data.intakeId}/controle?actie=mislukt`)
  }

  revalidatePath('/hulpvragen')
  redirect(`/hulpvragen/${envelope.data.intakeId}`)
}

export async function archiveIntakeAction(formData: FormData): Promise<void> {
  const user = await requireUser('/hulpvragen')
  const envelope = versionEnvelopeSchema.safeParse({
    intakeId: String(formData.get('intakeId') ?? ''),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
  })
  if (!envelope.success) redirect('/hulpvragen?actie=mislukt')

  try {
    await archiveIntake(user.id, envelope.data.intakeId, envelope.data)
  } catch {
    redirect('/hulpvragen?actie=mislukt')
  }

  revalidatePath('/hulpvragen')
  redirect('/hulpvragen?gearchiveerd=1')
}
