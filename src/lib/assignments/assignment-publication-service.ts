import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireAssignmentManager } from './assignment-authorization'
import { AssignmentServiceError } from './assignment-errors'
import {
  assertAssignmentVersion,
  parseAssignmentInput,
  validateAssignmentLocation,
} from './assignment-service'
import {
  assignmentReasonTransitionSchema,
  assignmentTransitionSchema,
  type AssignmentReasonTransitionInput,
  type AssignmentTransitionInput,
} from './assignment-validation'

type ManagedAssignment = Awaited<ReturnType<typeof requireAssignmentManager>>

function publicationValidationError(fieldErrors: Record<string, string[]> = {}) {
  return new AssignmentServiceError(
    'VALIDATION_ERROR',
    'De opdracht voldoet nog niet aan alle publicatievoorwaarden.',
    [],
    fieldErrors,
  )
}

function publicationIntegrityError(message = 'De publicatiestatus van deze opdracht is niet consistent.') {
  return new AssignmentServiceError('INTEGRITY_ERROR', message)
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left?.getTime() === right?.getTime()
}

function hasCompletePublicationMetadata(assignment: ManagedAssignment): assignment is ManagedAssignment & {
  publishedAt: Date
  publishedByUserId: string
  publishedVersion: number
} {
  return Boolean(
    assignment.publishedAt &&
      assignment.publishedByUserId &&
      assignment.publishedVersion,
  )
}

function hasAnyPublicationMetadata(assignment: ManagedAssignment): boolean {
  return Boolean(
    assignment.publishedAt ||
      assignment.publishedByUserId ||
      assignment.publishedVersion,
  )
}

async function validateOptionalReferences(
  transaction: Prisma.TransactionClient,
  assignment: ManagedAssignment,
) {
  const [sector, primarySpecialism, inactiveRequestedSpecialism, intake] = await Promise.all([
    assignment.sectorId
      ? transaction.sector.findFirst({
          where: { id: assignment.sectorId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    assignment.primarySpecialismId
      ? transaction.specialism.findFirst({
          where: { id: assignment.primarySpecialismId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    transaction.assignmentSpecialism.findFirst({
      where: { assignmentId: assignment.id, specialism: { isActive: false } },
      select: { id: true },
    }),
    assignment.intakeId
      ? transaction.intake.findFirst({
          where: {
            id: assignment.intakeId,
            clientOrganizationId: assignment.clientOrganizationId,
            status: 'CONVERTED',
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  const fieldErrors: Record<string, string[]> = {}
  if (assignment.sectorId && !sector) fieldErrors.sectorId = ['Deze sector is niet meer actief.']
  if (assignment.primarySpecialismId && !primarySpecialism) {
    fieldErrors.primarySpecialismId = ['Dit specialisme is niet meer actief.']
  }
  if (inactiveRequestedSpecialism) {
    fieldErrors.specialisms = ['Eén of meer gekozen specialismen zijn niet meer actief.']
  }
  if (!intake) fieldErrors.intakeId = ['De bronintake is niet geldig geconverteerd.']

  if (Object.keys(fieldErrors).length > 0) throw publicationValidationError(fieldErrors)
}

async function validatePublicationRequirements(
  transaction: Prisma.TransactionClient,
  assignment: ManagedAssignment,
) {
  const fieldErrors: Record<string, string[]> = {}
  const titleLength = assignment.title.trim().length
  const descriptionLength = assignment.description.trim().length
  const today = new Date().toISOString().slice(0, 10)

  if (titleLength < 5 || titleLength > 120) {
    fieldErrors.title = ['Gebruik 5 tot en met 120 tekens.']
  }
  if (descriptionLength < 20 || descriptionLength > 7000) {
    fieldErrors.description = ['Gebruik 20 tot en met 7.000 tekens.']
  }
  if (
    assignment.employeeCount !== null &&
    (!Number.isInteger(assignment.employeeCount) ||
      assignment.employeeCount < 1 ||
      assignment.employeeCount > 1_000_000)
  ) {
    fieldErrors.employeeCount = ['Vul 1 tot en met 1.000.000 medewerkers in.']
  }
  if (
    assignment.desiredStartDate &&
    assignment.desiredStartDate.toISOString().slice(0, 10) < today
  ) {
    fieldErrors.desiredStartDate = ['Kies vandaag of een datum in de toekomst.']
  }
  if (assignment.responseDeadline && assignment.responseDeadline.getTime() <= Date.now()) {
    fieldErrors.responseDeadline = ['De aanwezige responstermijn moet in de toekomst liggen.']
  }

  if (Object.keys(fieldErrors).length > 0) throw publicationValidationError(fieldErrors)

  await validateAssignmentLocation(
    transaction,
    assignment.clientOrganizationId,
    assignment.locationId,
    assignment.allowsRemoteWork,
  )
  await validateOptionalReferences(transaction, assignment)
}

function snapshotData(assignment: ManagedAssignment, version: number, userId: string) {
  return {
    assignmentId: assignment.id,
    version,
    title: assignment.title,
    description: assignment.description,
    primarySpecialismId: assignment.primarySpecialismId,
    sectorId: assignment.sectorId,
    employeeCount: assignment.employeeCount,
    desiredStartDate: assignment.desiredStartDate,
    responseDeadline: assignment.responseDeadline,
    locationId: assignment.locationId,
    allowsRemoteWork: assignment.allowsRemoteWork,
    changedByUserId: userId,
  }
}

async function requireConsistentPublishedState(
  transaction: Prisma.TransactionClient,
  assignment: ManagedAssignment,
  expectedStatus: 'OPEN' | 'CANCELLED',
) {
  if (!hasCompletePublicationMetadata(assignment)) throw publicationIntegrityError()
  if (
    assignment.publishedVersion > assignment.version ||
    (expectedStatus === 'OPEN' && assignment.publishedVersion !== assignment.version) ||
    (expectedStatus === 'CANCELLED' && assignment.publishedVersion + 1 !== assignment.version)
  ) {
    throw publicationIntegrityError()
  }

  const [revision, publicationHistory, withdrawalHistory] = await Promise.all([
    transaction.assignmentRevision.findFirst({
      where: { assignmentId: assignment.id, version: assignment.publishedVersion },
      select: {
        title: true,
        description: true,
        primarySpecialismId: true,
        sectorId: true,
        employeeCount: true,
        desiredStartDate: true,
        responseDeadline: true,
        locationId: true,
        allowsRemoteWork: true,
      },
    }),
    transaction.assignmentStatusHistory.findMany({
      where: {
        assignmentId: assignment.id,
        fromStatus: 'READY_FOR_REVIEW',
        toStatus: 'OPEN',
      },
      select: { changedByUserId: true, createdAt: true },
      take: 2,
    }),
    transaction.assignmentStatusHistory.findMany({
      where: {
        assignmentId: assignment.id,
        fromStatus: 'OPEN',
        toStatus: 'CANCELLED',
      },
      select: { id: true },
      take: 2,
    }),
  ])

  const snapshotMatches = Boolean(
    revision &&
      revision.title === assignment.title &&
      revision.description === assignment.description &&
      revision.primarySpecialismId === assignment.primarySpecialismId &&
      revision.sectorId === assignment.sectorId &&
      revision.employeeCount === assignment.employeeCount &&
      sameDate(revision.desiredStartDate, assignment.desiredStartDate) &&
      sameDate(revision.responseDeadline, assignment.responseDeadline) &&
      revision.locationId === assignment.locationId &&
      revision.allowsRemoteWork === assignment.allowsRemoteWork,
  )
  const publicationMatches =
    publicationHistory.length === 1 &&
    publicationHistory[0]?.changedByUserId === assignment.publishedByUserId &&
    sameDate(publicationHistory[0]?.createdAt ?? null, assignment.publishedAt)
  const withdrawalMatches =
    expectedStatus === 'OPEN'
      ? withdrawalHistory.length === 0
      : withdrawalHistory.length === 1

  if (!snapshotMatches || !publicationMatches || !withdrawalMatches) {
    throw publicationIntegrityError()
  }

  return assignment
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

function mapPublicationError(error: unknown, operation: 'publish' | 'withdraw'): never {
  if (error instanceof AssignmentServiceError) throw error
  if (isPrismaErrorWithCode(error, 'P2002') || isPrismaErrorWithCode(error, 'P2034')) {
    throw new AssignmentServiceError(
      'CONFLICT',
      'De opdracht is intussen gewijzigd. Vernieuw de gegevens en probeer het opnieuw.',
    )
  }
  throw new AssignmentServiceError(
    'INTEGRITY_ERROR',
    operation === 'publish'
      ? 'De opdracht kon niet veilig worden gepubliceerd.'
      : 'De publicatie kon niet veilig worden ingetrokken.',
  )
}

export async function publishAssignment(
  userId: string,
  organizationId: string,
  rawInput: AssignmentTransitionInput,
) {
  const input = parseAssignmentInput(assignmentTransitionSchema, rawInput)

  try {
    return await getPrisma().$transaction(
      async (transaction) => {
        const assignment = await requireAssignmentManager(
          transaction,
          userId,
          organizationId,
          input.assignmentId,
        )

        if (assignment.status === 'OPEN') {
          const published = await requireConsistentPublishedState(
            transaction,
            assignment,
            'OPEN',
          )
          return {
            id: published.id,
            status: published.status,
            version: published.version,
            publishedAt: published.publishedAt,
            publishedByUserId: published.publishedByUserId,
            publishedVersion: published.publishedVersion,
            idempotent: true,
          }
        }
        if (assignment.status === 'CANCELLED') {
          throw new AssignmentServiceError(
            'INVALID_STATUS',
            'Een geannuleerde of ingetrokken opdracht kan niet worden gepubliceerd.',
          )
        }
        if (assignment.status !== 'READY_FOR_REVIEW') {
          throw new AssignmentServiceError(
            'INVALID_STATUS',
            'Alleen een opdracht die gereedstaat voor controle kan worden gepubliceerd.',
          )
        }
        if (assignment.closedAt || assignment.archivedAt) {
          throw new AssignmentServiceError(
            'INVALID_STATUS',
            'Een gesloten of gearchiveerde opdracht kan niet worden gepubliceerd.',
          )
        }
        if (hasAnyPublicationMetadata(assignment)) throw publicationIntegrityError()

        assertAssignmentVersion(assignment.version, input.expectedAssignmentVersion)
        await validatePublicationRequirements(transaction, assignment)

        const publishedVersion = assignment.version + 1
        const reserved = await transaction.assignment.updateMany({
          where: {
            id: assignment.id,
            clientOrganizationId: organizationId,
            status: 'READY_FOR_REVIEW',
            version: assignment.version,
            publishedAt: null,
            publishedByUserId: null,
            publishedVersion: null,
          },
          data: { version: { increment: 1 } },
        })
        if (reserved.count !== 1) throw new AssignmentServiceError('CONFLICT')

        await transaction.assignmentRevision.create({
          data: snapshotData(assignment, publishedVersion, userId),
        })

        const publishedAt = new Date()
        const opened = await transaction.assignment.updateMany({
          where: {
            id: assignment.id,
            clientOrganizationId: organizationId,
            status: 'READY_FOR_REVIEW',
            version: publishedVersion,
            publishedAt: null,
            publishedByUserId: null,
            publishedVersion: null,
          },
          data: {
            status: 'OPEN',
            publishedAt,
            publishedByUserId: userId,
            publishedVersion,
          },
        })
        if (opened.count !== 1) throw publicationIntegrityError()

        await transaction.assignmentStatusHistory.create({
          data: {
            assignmentId: assignment.id,
            fromStatus: 'READY_FOR_REVIEW',
            toStatus: 'OPEN',
            changedByUserId: userId,
            reason: 'Opdracht gepubliceerd en gereed voor toekomstige marktverwerking.',
            createdAt: publishedAt,
          },
        })

        return {
          id: assignment.id,
          status: 'OPEN' as const,
          version: publishedVersion,
          publishedAt,
          publishedByUserId: userId,
          publishedVersion,
          idempotent: false,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    return mapPublicationError(error, 'publish')
  }
}

export async function withdrawPublishedAssignment(
  userId: string,
  organizationId: string,
  rawInput: AssignmentReasonTransitionInput,
) {
  const input = parseAssignmentInput(assignmentReasonTransitionSchema, rawInput)

  try {
    return await getPrisma().$transaction(
      async (transaction) => {
        const assignment = await requireAssignmentManager(
          transaction,
          userId,
          organizationId,
          input.assignmentId,
        )

        if (assignment.status === 'CANCELLED' && hasAnyPublicationMetadata(assignment)) {
          const withdrawn = await requireConsistentPublishedState(
            transaction,
            assignment,
            'CANCELLED',
          )
          return {
            id: withdrawn.id,
            status: withdrawn.status,
            version: withdrawn.version,
            publishedAt: withdrawn.publishedAt,
            publishedByUserId: withdrawn.publishedByUserId,
            publishedVersion: withdrawn.publishedVersion,
            idempotent: true,
          }
        }
        if (assignment.status !== 'OPEN') {
          throw new AssignmentServiceError(
            'INVALID_STATUS',
            'Alleen een gepubliceerde opdracht kan worden ingetrokken.',
          )
        }

        assertAssignmentVersion(assignment.version, input.expectedAssignmentVersion)
        const published = await requireConsistentPublishedState(
          transaction,
          assignment,
          'OPEN',
        )
        const nextVersion = assignment.version + 1
        const withdrawn = await transaction.assignment.updateMany({
          where: {
            id: assignment.id,
            clientOrganizationId: organizationId,
            status: 'OPEN',
            version: assignment.version,
            publishedAt: published.publishedAt,
            publishedByUserId: published.publishedByUserId,
            publishedVersion: published.publishedVersion,
          },
          data: { status: 'CANCELLED', version: { increment: 1 } },
        })
        if (withdrawn.count !== 1) throw new AssignmentServiceError('CONFLICT')

        await transaction.assignmentStatusHistory.create({
          data: {
            assignmentId: assignment.id,
            fromStatus: 'OPEN',
            toStatus: 'CANCELLED',
            changedByUserId: userId,
            reason: input.reason,
          },
        })

        return {
          id: assignment.id,
          status: 'CANCELLED' as const,
          version: nextVersion,
          publishedAt: published.publishedAt,
          publishedByUserId: published.publishedByUserId,
          publishedVersion: published.publishedVersion,
          idempotent: false,
        }
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    return mapPublicationError(error, 'withdraw')
  }
}
