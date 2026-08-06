'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { publishIntakeAsAssignment } from '@/lib/assignments/intake-assignment-publication-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { archiveUnpublishedAssignment, cancelAssignment, markAssignmentReadyForReview, reopenAssignment, updateAssignment } from '@/lib/assignments/assignment-service'
import { publishAssignment, withdrawPublishedAssignment } from '@/lib/assignments/assignment-publication-service'
import { assignmentEditSchema, assignmentReasonTransitionSchema, assignmentTransitionSchema } from '@/lib/assignments/assignment-validation'
import type { IntakeAssignmentReadinessIssue } from '@/lib/assignments/intake-assignment-readiness'

export type AssignmentActionState = {
  message?: string
  errors?: Record<string, string[] | undefined>
  values?: Record<string, string | boolean>
  readinessIssues?: IntakeAssignmentReadinessIssue[]
}
export type PublishIntakeActionState = AssignmentActionState

const submitSchema = z.object({
  intakeId: z.uuid(),
  expectedIntakeVersion: z.coerce.number().int().positive(),
})
const cancelActionSchema = assignmentReasonTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat u de opdracht wilt annuleren.' }),
})
const publishActionSchema = assignmentTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat u de opdracht definitief wilt publiceren.' }),
})
const withdrawActionSchema = assignmentReasonTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat u de publicatie wilt intrekken.' }),
})

function safeIntakePublicationState(error: AssignmentServiceError): PublishIntakeActionState {
  const errors = error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const key = issue.questionKey ?? issue.questionId ?? 'assignment'
    result[key] = [...(result[key] ?? []), issue.message]
    return result
  }, {})

  switch (error.code) {
    case 'CONFLICT':
      return { message: 'Deze opdracht is ondertussen gewijzigd. Controleer de actuele gegevens voordat u opnieuw publiceert.' }
    case 'INVALID_STATUS':
      return { message: 'Controleer de opdracht voordat u deze publiceert.' }
    case 'VALIDATION_ERROR':
      return {
        message: error.readinessIssues.length > 0
          ? 'Uw opdracht kan nog niet worden gepubliceerd. Vul eerst de ontbrekende gegevens aan.'
          : 'De opdracht is nog niet volledig. Controleer de ontbrekende gegevens.',
        errors: {
          ...error.fieldErrors,
          ...errors,
        },
        ...(error.readinessIssues.length > 0 ? { readinessIssues: error.readinessIssues } : {}),
      }
    case 'ACCESS_DENIED':
      return { message: 'U mag deze opdracht niet publiceren.' }
    case 'INTEGRITY_ERROR':
      return { message: 'Publiceren is nu niet gelukt. Uw gegevens zijn bewaard. Probeer het later opnieuw.' }
  }
}

export async function publishIntakeAction(
  _state: PublishIntakeActionState,
  formData: FormData,
): Promise<PublishIntakeActionState> {
  const parsed = submitSchema.safeParse({
    intakeId: formData.get('intakeId'),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
  })
  if (!parsed.success) return { message: 'De publicatiegegevens zijn niet meer geldig. Vernieuw de pagina en probeer het opnieuw.', errors: parsed.error.flatten().fieldErrors }

  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/hulpvragen')
  const organizationId = activeMembership.organization.id

  let assignment
  try {
    assignment = await publishIntakeAsAssignment(
      user.id,
      organizationId,
      parsed.data.intakeId,
      {
        expectedIntakeVersion: parsed.data.expectedIntakeVersion,
      },
    )
  } catch (error) {
    if (error instanceof AssignmentServiceError) return safeIntakePublicationState(error)
    throw error
  }

  revalidatePath('/hulpvragen')
  revalidatePath(`/hulpvragen/${parsed.data.intakeId}/controle`)
  revalidatePath('/opdrachten')
  redirect(`/opdrachten/${assignment.id}?status=gepubliceerd`)
}

function assignmentValues(formData: FormData) {
  return {
    assignmentId: String(formData.get('assignmentId') ?? ''),
    expectedAssignmentVersion: String(formData.get('expectedAssignmentVersion') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    employeeCount: String(formData.get('employeeCount') ?? ''),
    desiredStartDate: String(formData.get('desiredStartDate') ?? ''),
    locationType: String(formData.get('locationType') ?? ''),
    locationId: String(formData.get('locationId') ?? ''),
    locationCity: String(formData.get('locationCity') ?? ''),
    locationRegion: String(formData.get('locationRegion') ?? ''),
    locationDescription: String(formData.get('locationDescription') ?? ''),
    locationCount: String(formData.get('locationCount') ?? ''),
  }
}

function reasonValues(formData: FormData) {
  return {
    assignmentId: String(formData.get('assignmentId') ?? ''),
    expectedAssignmentVersion: String(formData.get('expectedAssignmentVersion') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  }
}

function safeAssignmentState(error: unknown, values?: Record<string, string | boolean>): AssignmentActionState {
  if (error instanceof AssignmentServiceError) {
    return { message: error.message, errors: error.fieldErrors, values }
  }
  return { message: 'De opdracht kon niet veilig worden bijgewerkt.', values }
}

async function activeAssignmentContext(returnTo: string) {
  const context = await requireOrganizationMembership(undefined, returnTo)
  return { userId: context.user.id, organizationId: context.activeMembership.organization.id }
}

export async function updateAssignmentAction(_state: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  const values = assignmentValues(formData)
  const parsed = assignmentEditSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde velden.', errors: parsed.error.flatten().fieldErrors, values }
  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}/bewerken`)
  try {
    await updateAssignment(context.userId, context.organizationId, parsed.data)
  } catch (error) {
    return safeAssignmentState(error, values)
  }
  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?gewijzigd=1`)
}

export async function markAssignmentReadyAction(_state: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  const values = reasonValues(formData)
  const parsed = assignmentTransitionSchema.safeParse(values)
  if (!parsed.success) return { message: 'De opdrachtgegevens zijn niet geldig.' }
  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}`)
  try {
    await markAssignmentReadyForReview(context.userId, context.organizationId, parsed.data)
  } catch (error) {
    return safeAssignmentState(error)
  }
  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?status=gereed`)
}

async function reasonTransitionAction(
  formData: FormData,
  service: typeof reopenAssignment | typeof cancelAssignment,
  status: string,
): Promise<AssignmentActionState> {
  const values = reasonValues(formData)
  const parsed = assignmentReasonTransitionSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde reden.', errors: parsed.error.flatten().fieldErrors, values }
  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}`)
  try {
    await service(context.userId, context.organizationId, parsed.data)
  } catch (error) {
    return safeAssignmentState(error, values)
  }
  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?status=${status}`)
}

export async function reopenAssignmentAction(_state: AssignmentActionState, formData: FormData) {
  return reasonTransitionAction(formData, reopenAssignment, 'concept')
}

export async function cancelAssignmentAction(_state: AssignmentActionState, formData: FormData): Promise<AssignmentActionState> {
  const values = { ...reasonValues(formData), confirmed: String(formData.get('confirmed') ?? '') }
  const parsed = cancelActionSchema.safeParse(values)
  if (!parsed.success) return { message: 'Controleer de annuleringsgegevens.', errors: parsed.error.flatten().fieldErrors, values }
  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}`)
  try {
    await cancelAssignment(context.userId, context.organizationId, parsed.data)
  } catch (error) {
    return safeAssignmentState(error, values)
  }
  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?status=geannuleerd`)
}

export async function archiveAssignmentAction(formData: FormData): Promise<void> {
  const parsed = assignmentTransitionSchema.safeParse({
    assignmentId: String(formData.get('assignmentId') ?? ''),
    expectedAssignmentVersion: String(formData.get('expectedAssignmentVersion') ?? ''),
  })
  if (!parsed.success) redirect('/opdrachten?actie=mislukt')
  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}/verwijderen`)
  try {
    await archiveUnpublishedAssignment(context.userId, context.organizationId, parsed.data)
  } catch {
    redirect('/opdrachten?actie=mislukt')
  }
  revalidatePath('/opdrachten')
  redirect('/opdrachten?verwijderd=1')
}

export async function publishAssignmentAction(
  _state: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const values = {
    assignmentId: String(formData.get('assignmentId') ?? ''),
    expectedAssignmentVersion: String(formData.get('expectedAssignmentVersion') ?? ''),
    confirmed: String(formData.get('confirmed') ?? ''),
  }
  const parsed = publishActionSchema.safeParse(values)
  if (!parsed.success) {
    return {
      message: 'Bevestig de publicatie voordat u verdergaat.',
      errors: parsed.error.flatten().fieldErrors,
      values,
    }
  }

  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}/publiceren`)
  try {
    await publishAssignment(context.userId, context.organizationId, {
      assignmentId: parsed.data.assignmentId,
      expectedAssignmentVersion: parsed.data.expectedAssignmentVersion,
    })
  } catch (error) {
    return safeAssignmentState(error, values)
  }

  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?status=gepubliceerd`)
}

export async function withdrawPublishedAssignmentAction(
  _state: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const values = {
    ...reasonValues(formData),
    confirmed: String(formData.get('confirmed') ?? ''),
  }
  const parsed = withdrawActionSchema.safeParse(values)
  if (!parsed.success) {
    return {
      message: 'Controleer de gegevens voor het intrekken.',
      errors: parsed.error.flatten().fieldErrors,
      values,
    }
  }

  const context = await activeAssignmentContext(`/opdrachten/${parsed.data.assignmentId}`)
  try {
    await withdrawPublishedAssignment(context.userId, context.organizationId, {
      assignmentId: parsed.data.assignmentId,
      expectedAssignmentVersion: parsed.data.expectedAssignmentVersion,
      reason: parsed.data.reason,
    })
  } catch (error) {
    return safeAssignmentState(error, values)
  }

  revalidatePath('/opdrachten')
  revalidatePath(`/opdrachten/${parsed.data.assignmentId}`)
  redirect(`/opdrachten/${parsed.data.assignmentId}?status=ingetrokken`)
}
