'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getNextIntakeCategory } from '@/lib/intakes/intake-presentation'
import {
  archiveIntake,
  createIntake,
  markIntakeReadyForReview,
  reopenIntake,
  saveIntakeStep,
} from '@/lib/intakes/intake-service'

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
})

const versionEnvelopeSchema = z.object({
  intakeId: uuidSchema,
  expectedIntakeVersion: z.coerce.number().int().positive(),
})

function serviceErrorState(
  error: unknown,
  values?: Record<string, IntakeFormValue>,
  fallback = 'De intake kon niet veilig worden verwerkt.',
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
): Record<string, IntakeFormValue> {
  return Object.fromEntries(
    questionIds.map((questionId) => {
      const fieldName = `answer-${questionId}`
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
  const values = { freeText }

  let intakeId: string
  try {
    intakeId = (await createIntake(user.id, organizationId, { freeText })).id
  } catch (error) {
    const state = serviceErrorState(error, values, 'De hulpvraag kon niet worden gestart.')
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
  })
  if (!envelope.success) {
    return { message: 'De formuliergegevens zijn niet meer geldig. Vernieuw de pagina en probeer het opnieuw.' }
  }

  const multiQuestionIds = new Set(envelope.data.multiQuestionIds)
  const booleanQuestionIds = new Set(envelope.data.booleanQuestionIds)
  const values = collectStepValues(
    formData,
    envelope.data.questionIds,
    multiQuestionIds,
    booleanQuestionIds,
  )

  try {
    await saveIntakeStep(user.id, envelope.data.intakeId, {
      expectedIntakeVersion: envelope.data.expectedIntakeVersion,
      category: envelope.data.category,
      answers: envelope.data.questionIds.map((questionId) => ({
        questionId,
        value: values[questionId],
      })),
    })
  } catch (error) {
    return serviceErrorState(error, values, 'De antwoorden konden niet worden opgeslagen.')
  }

  revalidatePath('/hulpvragen')
  revalidatePath(`/hulpvragen/${envelope.data.intakeId}`)
  const nextCategory = getNextIntakeCategory(envelope.data.category)
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
    return serviceErrorState(error, undefined, 'De intake kon niet gereed worden gemeld.')
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
