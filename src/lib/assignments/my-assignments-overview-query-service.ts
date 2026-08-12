import {
  listAssignmentsForOrganization,
  type AssignmentListItem,
} from './assignment-query-service'
import {
  listIntakesForOrganization,
  type IntakeListItem,
} from '@/lib/intakes/intake-query-service'

export type MyAssignmentsOverview = {
  intakes: IntakeListItem[]
  assignments: AssignmentListItem[]
  viewerRole: 'OWNER' | 'ADMIN' | 'MEMBER'
}

/**
 * Combines existing, independently authorized read models for one client-facing
 * overview. It deliberately does not combine Intake and Assignment at the
 * persistence or domain layer.
 */
export async function getMyAssignmentsOverview(
  userId: string,
  organizationId: string,
): Promise<MyAssignmentsOverview> {
  const [intakeResult, activeAssignments, completedAssignments, cancelledAssignments] = await Promise.all([
    listIntakesForOrganization(userId, organizationId),
    listAssignmentsForOrganization(userId, organizationId, 'active'),
    listAssignmentsForOrganization(userId, organizationId, 'completed'),
    listAssignmentsForOrganization(userId, organizationId, 'cancelled'),
  ])

  return {
    // A converted intake is represented by its Assignment from this point on.
    // Omitting it here prevents the same customer assignment appearing twice.
    intakes: intakeResult.items.filter((intake) => intake.status !== 'CONVERTED'),
    assignments: [...activeAssignments.items, ...completedAssignments.items, ...cancelledAssignments.items],
    viewerRole: intakeResult.viewerRole,
  }
}
