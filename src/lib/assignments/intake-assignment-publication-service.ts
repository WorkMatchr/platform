import { getPrisma } from '@/lib/prisma'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import type { IntakeVersionInput } from '@/lib/intakes/intake-types'
import { convertIntakeToAssignmentInTransaction } from './assignment-conversion-service'
import { AssignmentServiceError } from './assignment-errors'
import { publishAssignmentInTransaction } from './assignment-publication-service'
import { processAssignmentAvailabilityFailSafe } from '@/lib/marketplace/assignment-availability-service'

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === code)
}

function logPublicationFailure(error: unknown) {
  const prismaCode = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined
  console.error('[assignment-publication] publicatie mislukt', {
    errorClass: error instanceof Error ? error.name : 'UnknownError',
    prismaCode,
    domainCode: error instanceof AssignmentServiceError ? error.code : undefined,
  })
}

/**
 * Vormt en publiceert een gevalideerde intake als één transactionele,
 * idempotente gebruikershandeling. De bestaande afzonderlijke services blijven
 * beschikbaar voor historische conceptopdrachten en andere productflows.
 */
export async function publishIntakeAsAssignment(
  userId: string,
  organizationId: string,
  intakeId: string,
  input: IntakeVersionInput,
) {
  try {
    const published = await getPrisma().$transaction(
      async (transaction) => {
        const assignment = await convertIntakeToAssignmentInTransaction(
          transaction,
          userId,
          intakeId,
          input,
        )

        return publishAssignmentInTransaction(transaction, userId, organizationId, {
          assignmentId: assignment.id,
          expectedAssignmentVersion: assignment.version,
        })
      },
      { isolationLevel: 'Serializable' },
    )
    await processAssignmentAvailabilityFailSafe(published.id)
    return published
  } catch (error) {
    logPublicationFailure(error)
    if (error instanceof AssignmentServiceError) throw error
    if (error instanceof IntakeServiceError && error.code === 'ACCESS_DENIED') {
      throw new AssignmentServiceError('ACCESS_DENIED')
    }
    if (isPrismaErrorWithCode(error, 'P2002') || isPrismaErrorWithCode(error, 'P2034')) {
      throw new AssignmentServiceError(
        'CONFLICT',
        'De opdracht is intussen gewijzigd. Controleer de actuele gegevens en probeer het opnieuw.',
      )
    }
    throw new AssignmentServiceError(
      'INTEGRITY_ERROR',
      'De opdracht kon niet veilig en volledig worden gepubliceerd.',
    )
  }
}
