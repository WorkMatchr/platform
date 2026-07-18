import type {
  OrganizationMembershipRole,
  PlatformRole,
  UserStatus,
} from '@/generated/prisma/enums'

export type TenantAccountAction =
  | 'VIEW'
  | 'INVITE_MEMBER'
  | 'INVITE_ADMIN'
  | 'BLOCK'
  | 'UNBLOCK'
  | 'CHANGE_NON_OWNER_ROLE'
  | 'ADD_OWNER'
  | 'TRANSFER_OWNER'
  | 'END_MEMBERSHIP'
  | 'MANAGE_PLATFORM_ROLES'

export type CentralPlatformAdministratorContext = {
  status: UserStatus
  platformRole: PlatformRole
  platformMembership: {
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED'
    organization: {
      status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED'
      organizationType: 'CLIENT' | 'PROVIDER' | 'BOTH' | 'PLATFORM_OPERATOR'
      systemKey: string | null
    }
  } | null
}

export function canManageTenantAccount(
  actorRole: OrganizationMembershipRole,
  subjectRole: OrganizationMembershipRole,
  action: TenantAccountAction,
): boolean {
  if (actorRole === 'MEMBER') return false

  if (actorRole === 'ADMIN') {
    if (action === 'VIEW' || action === 'INVITE_MEMBER') return true
    return (action === 'BLOCK' || action === 'UNBLOCK') && subjectRole === 'MEMBER'
  }

  if (action === 'END_MEMBERSHIP' || action === 'MANAGE_PLATFORM_ROLES') return false
  if (action === 'CHANGE_NON_OWNER_ROLE') return subjectRole !== 'OWNER'
  return true
}

export function creatorScopeAllowsManagement(input: {
  roleAllowsAction: boolean
  actorUserId: string
  createdByUserId: string | null
}): boolean {
  return input.roleAllowsAction && input.createdByUserId === input.actorUserId
}

export function isCentralPlatformAdministrator(context: CentralPlatformAdministratorContext): boolean {
  const membership = context.platformMembership
  return (
    context.status === 'ACTIVE' &&
    context.platformRole === 'ADMIN' &&
    membership?.status === 'ACTIVE' &&
    membership.organization.status === 'ACTIVE' &&
    membership.organization.organizationType === 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === 'WORKMATCHR_PLATFORM'
  )
}

export function canSelfBlock(actorUserId: string, subjectUserId: string): boolean {
  return actorUserId !== subjectUserId
}
