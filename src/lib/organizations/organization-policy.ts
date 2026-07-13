import type { MembershipStatus, OrganizationMembershipRole, OrganizationStatus, UserStatus } from '@/generated/prisma/client'

export const MANAGE_ORGANIZATION_ROLES = ['OWNER', 'ADMIN'] as const satisfies readonly OrganizationMembershipRole[]

export function canCreateOrganization(status: UserStatus): boolean {
  return status === 'ACTIVE'
}

export function canUseMembership(status: MembershipStatus): boolean {
  return status === 'ACTIVE'
}

export function canViewOrganization(status: OrganizationStatus): boolean {
  return status !== 'ARCHIVED'
}

export function canManageOrganization(
  role: OrganizationMembershipRole,
  membershipStatus: MembershipStatus,
  organizationStatus: OrganizationStatus,
): boolean {
  return (
    canUseMembership(membershipStatus) &&
    organizationStatus !== 'SUSPENDED' &&
    organizationStatus !== 'ARCHIVED' &&
    MANAGE_ORGANIZATION_ROLES.includes(role as (typeof MANAGE_ORGANIZATION_ROLES)[number])
  )
}

export function shouldCreateProviderProfile(organizationType: 'CLIENT' | 'PROVIDER' | 'BOTH'): boolean {
  return organizationType === 'PROVIDER' || organizationType === 'BOTH'
}

export function selectActiveMembership<T extends { organization: { id: string } }>(memberships: T[], selectedId?: string): T | null {
  if (memberships.length === 0) return null
  return memberships.find((membership) => membership.organization.id === selectedId) ?? memberships[0]
}
