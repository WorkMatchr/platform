import type { AssignmentStatus, Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireAssignmentManager } from './assignment-authorization'
import { AssignmentServiceError } from './assignment-errors'
import {
  assignmentEditSchema,
  assignmentReasonTransitionSchema,
  assignmentTransitionSchema,
  type AssignmentEditInput,
  type AssignmentReasonTransitionInput,
  type AssignmentTransitionInput,
} from './assignment-validation'

function validationError(fieldErrors: Record<string, string[]> = {}) {
  return new AssignmentServiceError('VALIDATION_ERROR', 'Controleer de gemarkeerde velden.', [], fieldErrors)
}

export function parseAssignmentInput<T>(schema: { safeParse(value: unknown): { success: true; data: T } | { success: false; error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } } } }, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    const errors = Object.fromEntries(Object.entries(result.error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])))
    throw validationError(errors)
  }
  return result.data
}

export function assertAssignmentVersion(current: number, expected: number) {
  if (current !== expected) throw new AssignmentServiceError('CONFLICT', 'De opdracht is intussen gewijzigd. Vernieuw de pagina en controleer de actuele gegevens.')
}

export async function validateAssignmentLocation(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  locationId: string | null,
  allowsRemoteWork: boolean,
) {
  if (!locationId && !allowsRemoteWork) {
    throw validationError({ locationId: ['Kies een locatie of geef aan dat werken op afstand mogelijk is.'] })
  }
  if (!locationId) return
  const location = await transaction.organizationLocation.findFirst({
    where: { id: locationId, organizationId, archivedAt: null },
    select: { id: true },
  })
  if (!location) throw validationError({ locationId: ['Deze locatie is niet meer beschikbaar.'] })
}

function revisionData(assignment: {
  primarySpecialismId: string | null
  sectorId: string | null
  responseDeadline: Date | null
}, input: AssignmentEditInput, version: number, userId: string) {
  return {
    version,
    title: input.title,
    description: input.description,
    primarySpecialismId: assignment.primarySpecialismId,
    sectorId: assignment.sectorId,
    employeeCount: input.employeeCount,
    desiredStartDate: input.desiredStartDate ? new Date(`${input.desiredStartDate}T00:00:00.000Z`) : null,
    responseDeadline: assignment.responseDeadline,
    locationId: input.locationId,
    allowsRemoteWork: input.allowsRemoteWork,
    changedByUserId: userId,
  }
}

export async function updateAssignment(
  userId: string,
  organizationId: string,
  rawInput: AssignmentEditInput,
) {
  const input = parseAssignmentInput(assignmentEditSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const assignment = await requireAssignmentManager(transaction, userId, organizationId, input.assignmentId)
    if (assignment.status !== 'DRAFT') throw new AssignmentServiceError('INVALID_STATUS', 'Alleen een conceptopdracht kan worden gewijzigd.')
    assertAssignmentVersion(assignment.version, input.expectedAssignmentVersion)
    await validateAssignmentLocation(transaction, organizationId, input.locationId, input.allowsRemoteWork)
    const nextVersion = assignment.version + 1
    const desiredStartDate = input.desiredStartDate ? new Date(`${input.desiredStartDate}T00:00:00.000Z`) : null
    const updated = await transaction.assignment.updateMany({
      where: { id: assignment.id, version: assignment.version, status: 'DRAFT' },
      data: {
        title: input.title,
        description: input.description,
        employeeCount: input.employeeCount,
        desiredStartDate,
        locationId: input.locationId,
        allowsRemoteWork: input.allowsRemoteWork,
        version: { increment: 1 },
      },
    })
    if (updated.count !== 1) throw new AssignmentServiceError('CONFLICT')
    await transaction.assignmentRevision.create({
      data: { assignmentId: assignment.id, ...revisionData(assignment, input, nextVersion, userId) },
    })
    return { id: assignment.id, status: assignment.status, version: nextVersion }
  })
}

async function transitionAssignment(
  userId: string,
  organizationId: string,
  input: AssignmentTransitionInput,
  fromStatuses: AssignmentStatus[],
  toStatus: AssignmentStatus,
  reason: string,
) {
  return getPrisma().$transaction(async (transaction) => {
    const assignment = await requireAssignmentManager(transaction, userId, organizationId, input.assignmentId)
    if (!fromStatuses.includes(assignment.status)) throw new AssignmentServiceError('INVALID_STATUS', 'Deze statuswijziging is niet toegestaan.')
    assertAssignmentVersion(assignment.version, input.expectedAssignmentVersion)
    if (toStatus === 'READY_FOR_REVIEW') {
      if (assignment.title.trim().length < 5 || assignment.description.trim().length < 20) throw validationError()
      await validateAssignmentLocation(transaction, organizationId, assignment.locationId, assignment.allowsRemoteWork)
    }
    const updated = await transaction.assignment.updateMany({
      where: { id: assignment.id, version: assignment.version, status: assignment.status },
      data: { status: toStatus, version: { increment: 1 } },
    })
    if (updated.count !== 1) throw new AssignmentServiceError('CONFLICT')
    await transaction.assignmentStatusHistory.create({
      data: { assignmentId: assignment.id, fromStatus: assignment.status, toStatus, changedByUserId: userId, reason },
    })
    return { id: assignment.id, status: toStatus, version: assignment.version + 1 }
  })
}

export function markAssignmentReadyForReview(userId: string, organizationId: string, rawInput: AssignmentTransitionInput) {
  const input = parseAssignmentInput(assignmentTransitionSchema, rawInput)
  return transitionAssignment(userId, organizationId, input, ['DRAFT'], 'READY_FOR_REVIEW', 'Opdracht intern gereed voor controle.')
}

export function reopenAssignment(userId: string, organizationId: string, rawInput: AssignmentReasonTransitionInput) {
  const input = parseAssignmentInput(assignmentReasonTransitionSchema, rawInput)
  return transitionAssignment(userId, organizationId, input, ['READY_FOR_REVIEW'], 'DRAFT', input.reason)
}

export function cancelAssignment(userId: string, organizationId: string, rawInput: AssignmentReasonTransitionInput) {
  const input = parseAssignmentInput(assignmentReasonTransitionSchema, rawInput)
  return transitionAssignment(userId, organizationId, input, ['DRAFT', 'READY_FOR_REVIEW'], 'CANCELLED', input.reason)
}
