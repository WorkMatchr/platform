import type {
  MembershipStatus,
  OrganizationMembershipRole,
  OrganizationStatus,
  OrganizationType,
  ProviderPlatformPermission,
  UserStatus,
} from '@/generated/prisma/client'

export type ProviderOrganizationActor = {
  userStatus: UserStatus
  membershipStatus: MembershipStatus
  membershipRole: OrganizationMembershipRole
  organizationStatus: OrganizationStatus
  organizationType: OrganizationType
}

export function canManageProviderData(actor: ProviderOrganizationActor): boolean {
  return (
    actor.userStatus === 'ACTIVE' &&
    actor.membershipStatus === 'ACTIVE' &&
    (actor.membershipRole === 'OWNER' || actor.membershipRole === 'ADMIN') &&
    actor.organizationStatus === 'ACTIVE' &&
    (actor.organizationType === 'PROVIDER' || actor.organizationType === 'BOTH')
  )
}

export function isPermissionActive(
  grant: { permission: ProviderPlatformPermission; validFrom: Date; validUntil: Date | null; revocation: unknown | null },
  permission: ProviderPlatformPermission,
  at: Date,
): boolean {
  return (
    grant.permission === permission &&
    grant.validFrom <= at &&
    (grant.validUntil === null || grant.validUntil > at) &&
    grant.revocation === null
  )
}

export function requiresFourEyes(reviewedByUserId: string, approvedByUserId: string): boolean {
  return reviewedByUserId !== approvedByUserId
}
