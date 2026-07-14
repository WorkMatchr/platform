'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { convertIntakeToAssignment } from '@/lib/assignments/assignment-conversion-service'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getIntakeSubmissionContext } from '@/lib/assignments/assignment-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { cancelAssignment, markAssignmentReadyForReview, reopenAssignment, updateAssignment } from '@/lib/assignments/assignment-service'
import { publishAssignment, withdrawPublishedAssignment } from '@/lib/assignments/assignment-publication-service'
import { assignmentEditSchema, assignmentReasonTransitionSchema, assignmentTransitionSchema } from '@/lib/assignments/assignment-validation'

export type AssignmentActionState = {
  message?: string
  errors?: Record<string, string[] | undefined>
  values?: Record<string, string | boolean>
}
export type SubmitIntakeActionState = AssignmentActionState

const submitSchema = z.object({
  intakeId: z.uuid(),
  expectedIntakeVersion: z.coerce.number().int().positive(),
  confirmed: z.literal('on', { error: 'Bevestig dat U de hulpvraag namens de organisatie indient.' }),
})
const cancelActionSchema = assignmentReasonTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat U de opdracht wilt annuleren.' }),
})
const publishActionSchema = assignmentTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat U de opdracht definitief wilt publiceren.' }),
})
const withdrawActionSchema = assignmentReasonTransitionSchema.extend({
  confirmed: z.literal('on', { error: 'Bevestig dat U de publicatie wilt intrekken.' }),
})

function safeSubmissionMessage(error: AssignmentServiceError): string {
  switch (error.code) {
    case 'CONFLICT':
      return 'Deze hulpvraag is ondertussen gewijzigd. Controleer de actuele gegevens voordat U opnieuw indient.'
    case 'INVALID_STATUS':
      return 'Controleer de hulpvraag voordat U deze indient.'
    case 'VALIDATION_ERROR':
      return 'De hulpvraag is nog niet volledig. Controleer de ontbrekende gegevens.'
    case 'ACCESS_DENIED':
      return 'U mag deze hulpvraag niet indienen.'
    case 'INTEGRITY_ERROR':
      return 'De hulpvraag kon niet veilig worden ingediend. Probeer het later opnieuw.'
  }
}

export async function submitIntakeAction(
  _state: SubmitIntakeActionState,
  formData: FormData,
): Promise<SubmitIntakeActionState> {
  const parsed = submitSchema.safeParse({
    intakeId: formData.get('intakeId'),
    expectedIntakeVersion: formData.get('expectedIntakeVersion'),
    confirmed: formData.get('confirmed'),
  })
  if (!parsed.success) return { message: 'Bevestig de indiening voordat U verdergaat.', errors: parsed.error.flatten().fieldErrors }

  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/hulpvragen')
  const organizationId = activeMembership.organization.id

  try {
    const context = await getIntakeSubmissionContext(user.id, organizationId, parsed.data.intakeId)
    const assignment = await convertIntakeToAssignment(user.id, context.intakeId, {
      expectedIntakeVersion: parsed.data.expectedIntakeVersion,
    })
    redirect(`/opdrachten/${assignment.id}/aangemaakt`)
  } catch (error) {
    if (error instanceof AssignmentServiceError) return { message: safeSubmissionMessage(error) }
    throw error
  }
}

function assignmentValues(formData: FormData) {
  return {
    assignmentId: String(formData.get('assignmentId') ?? ''),
    expectedAssignmentVersion: String(formData.get('expectedAssignmentVersion') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    employeeCount: String(formData.get('employeeCount') ?? ''),
    desiredStartDate: String(formData.get('desiredStartDate') ?? ''),
    locationId: String(formData.get('locationId') ?? ''),
    allowsRemoteWork: formData.get('allowsRemoteWork') === 'on',
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
      message: 'Bevestig de publicatie voordat U verdergaat.',
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
