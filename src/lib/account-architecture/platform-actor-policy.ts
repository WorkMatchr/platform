import type { ProviderPlatformPermission } from '@/generated/prisma/enums'
import { WORKMATCHR_PLATFORM_ORGANIZATION } from './platform-organization-service'
import { isCentralPlatformAdministrator, type CentralPlatformAdministratorContext } from './account-management-policy'

type PlatformMembershipContext = {
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  organization: {
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
    organizationType: 'CLIENT' | 'PROVIDER' | 'BOTH' | 'PLATFORM_OPERATOR'
    systemKey: string | null
  }
}

export class PlatformPermissionPolicyError extends Error {
  constructor() {
    super('De platformpermission voldoet niet aan de centrale governancevoorwaarden.')
    this.name = 'PlatformPermissionPolicyError'
  }
}

export function hasValidPlatformActorFoundation(
  permission: ProviderPlatformPermission,
  membership: PlatformMembershipContext | null,
): boolean {
  if (permission === 'PROVIDER_AUDITOR') return membership === null
  if (!membership) return false
  return (
    membership.status === 'ACTIVE' &&
    membership.organization.status === 'ACTIVE' &&
    membership.organization.organizationType === 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === WORKMATCHR_PLATFORM_ORGANIZATION.systemKey
  )
}

export function assertFuturePlatformPermissionAssignment(
  permission: ProviderPlatformPermission,
  membership: PlatformMembershipContext | null,
  options: { centralAdministrator: CentralPlatformAdministratorContext; viaTenantInvitation: boolean },
): void {
  if (
    !isCentralPlatformAdministrator(options.centralAdministrator) ||
    options.viaTenantInvitation ||
    !hasValidPlatformActorFoundation(permission, membership)
  ) {
    throw new PlatformPermissionPolicyError()
  }
}
