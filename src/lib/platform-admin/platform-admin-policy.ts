export type PlatformMembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER'

const PLATFORM_OPERATOR_MEMBERSHIP_ROLES = new Set<PlatformMembershipRole>(['OWNER', 'ADMIN'])

export function isPlatformOperatorMembershipRole(role: PlatformMembershipRole) {
  return PLATFORM_OPERATOR_MEMBERSHIP_ROLES.has(role)
}

export function isPlatformAuditorMembershipRole(role: PlatformMembershipRole) {
  return role === 'MEMBER'
}

export function hasPlatformAdministratorIdentity(
  administrator: { memberships: Array<{ organization: { systemKey: string | null } }> } | null,
): administrator is { memberships: Array<{ organization: { systemKey: string | null } }> } {
  return administrator?.memberships[0]?.organization.systemKey === 'WORKMATCHR_PLATFORM'
}
