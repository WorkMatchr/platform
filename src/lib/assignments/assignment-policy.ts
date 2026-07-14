import type {
  MembershipStatus,
  OrganizationMembershipRole,
  OrganizationType,
  OrganizationStatus,
  UserStatus,
} from '@/generated/prisma/client'

export type AssignmentAccessContext = {
  userId: string
  userStatus: UserStatus
  membershipRole: OrganizationMembershipRole
  membershipStatus: MembershipStatus
  organizationStatus: OrganizationStatus
  organizationType: OrganizationType
  intakeCreatedByUserId: string | null
}

function hasActiveAssignmentContext(context: AssignmentAccessContext): boolean {
  return (
    context.userStatus === 'ACTIVE' &&
    context.membershipStatus === 'ACTIVE' &&
    context.organizationStatus === 'ACTIVE' &&
    (context.organizationType === 'CLIENT' || context.organizationType === 'BOTH')
  )
}

export function canViewAssignment(context: AssignmentAccessContext): boolean {
  if (!hasActiveAssignmentContext(context)) return false
  if (context.membershipRole === 'OWNER' || context.membershipRole === 'ADMIN') return true
  return context.intakeCreatedByUserId === context.userId
}

export function canManageAssignment(context: AssignmentAccessContext): boolean {
  return (
    hasActiveAssignmentContext(context) &&
    (context.membershipRole === 'OWNER' || context.membershipRole === 'ADMIN')
  )
}
