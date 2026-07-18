import type { OrganizationMembershipRole } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { canManageTenantAccount, canSelfBlock, isCentralPlatformAdministrator } from './account-management-policy'
import { isPlatformOrganization, normalTenantOrganizationWhere } from './platform-organization-governance'

export class AccountManagementQueryError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'FORBIDDEN') {
    super('Het gebruikersbeheer is niet beschikbaar.')
    this.name = 'AccountManagementQueryError'
  }
}

export type ManagedOrganizationAccount = {
  userId: string
  displayName: string
  email: string
  role: OrganizationMembershipRole
  membershipStatus: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  accountStatus: 'INVITED' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' | 'DELETION_PENDING' | 'ANONYMIZED'
  canBlock: boolean
  canUnblock: boolean
  canResendInvitation: boolean
  invitationDeliveryStatus: 'ACCEPTED' | 'FAILED' | 'UNKNOWN' | null
  canChangeRole: boolean
  roleNotificationStatus: 'ACCEPTED' | 'FAILED' | 'UNKNOWN' | null
  canResendRoleNotification: boolean
  actionExplanation: string | null
}

export async function getOrganizationAccountManagement(actorUserId: string, organizationId: string) {
  const prisma = getPrisma()
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: {
      status: true,
      platformRole: true,
      memberships: {
        where: { status: 'ACTIVE' },
        select: {
          role: true,
          status: true,
          organizationId: true,
          organization: { select: { status: true, organizationType: true, systemKey: true } },
        },
      },
    },
  })
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, status: 'ACTIVE', ...normalTenantOrganizationWhere },
    select: { id: true, name: true },
  })
  if (!actor || !organization) throw new AccountManagementQueryError('NOT_FOUND')

  const platformMembership = actor.memberships.find((item) => item.organization.systemKey === 'WORKMATCHR_PLATFORM') ?? null
  const centralAdministrator = isCentralPlatformAdministrator({
    status: actor.status,
    platformRole: actor.platformRole,
    platformMembership,
  })
  const actorMembership = actor.memberships.find((item) => item.organizationId === organizationId) ?? null
  if (
    !centralAdministrator &&
    (!actorMembership || !canManageTenantAccount(actorMembership.role, 'MEMBER', 'VIEW'))
  ) {
    throw new AccountManagementQueryError('FORBIDDEN')
  }

  const memberships = await prisma.organizationMembership.findMany({
    where: { organizationId, status: { not: 'REMOVED' } },
    select: {
      role: true,
      status: true,
      historyEvents: {
        where: {
          eventType: 'ROLE_CHANGED',
          previousRole: { in: ['ADMIN', 'MEMBER'] },
          newRole: { in: ['ADMIN', 'MEMBER'] },
        },
        orderBy: { occurredAt: 'desc' },
        select: { id: true },
        take: 1,
      },
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          status: true,
          migrationClassification: true,
          createdByUserId: true,
          platformRole: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: { organization: { select: { organizationType: true, systemKey: true } } },
          },
          providerPermissionSubjects: { where: { revocation: null }, select: { id: true }, take: 1 },
          provisioningEventsAsSubject: {
            where: {
              reasonCode: { in: [
                'ORGANIZATION_INVITATION_DELIVERY_ACCEPTED',
                'ORGANIZATION_INVITATION_DELIVERY_FAILED',
                'ORGANIZATION_ROLE_NOTIFICATION_ACCEPTED',
                'ORGANIZATION_ROLE_NOTIFICATION_FAILED',
              ] },
            },
            orderBy: { occurredAt: 'desc' },
            select: { reasonCode: true },
            take: 10,
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  const activeOwnerCount = memberships.filter(
    (membership) => membership.role === 'OWNER' && membership.status === 'ACTIVE' && membership.user.status === 'ACTIVE',
  ).length

  const accounts = memberships
    .filter((membership) => membership.user.migrationClassification !== 'MIGRATION_TEMP')
    .map((membership): ManagedOrganizationAccount => {
      const protectedAccount =
        membership.user.platformRole === 'ADMIN' ||
        membership.user.providerPermissionSubjects.length > 0 ||
        membership.user.memberships.some((item) => isPlatformOrganization(item.organization))
      const self = !canSelfBlock(actorUserId, membership.user.id)
      const lastOwner = membership.role === 'OWNER' && activeOwnerCount <= 1
      const roleAllowsBlock = centralAdministrator || Boolean(
        actorMembership && canManageTenantAccount(actorMembership.role, membership.role, 'BLOCK'),
      )
      const roleAllowsUnblock = centralAdministrator || Boolean(
        actorMembership && canManageTenantAccount(actorMembership.role, membership.role, 'UNBLOCK'),
      )
      const canBlock =
        membership.user.status === 'ACTIVE' &&
        membership.status === 'ACTIVE' &&
        roleAllowsBlock &&
        !protectedAccount &&
        !self &&
        !lastOwner
      const canUnblock =
        membership.user.status === 'BLOCKED' &&
        membership.status === 'ACTIVE' &&
        roleAllowsUnblock &&
        !protectedAccount
      const canResendInvitation =
        membership.user.status === 'INVITED' &&
        membership.status === 'INVITED' &&
        membership.role !== 'OWNER' &&
        membership.user.createdByUserId === actorUserId &&
        Boolean(actorMembership && canManageTenantAccount(
          actorMembership.role,
          membership.role,
          membership.role === 'ADMIN' ? 'INVITE_ADMIN' : 'INVITE_MEMBER',
        ))
      const latestDelivery = membership.user.provisioningEventsAsSubject.find((event) =>
        event.reasonCode === 'ORGANIZATION_INVITATION_DELIVERY_ACCEPTED' ||
        event.reasonCode === 'ORGANIZATION_INVITATION_DELIVERY_FAILED')?.reasonCode
      const invitationDeliveryStatus = membership.user.status !== 'INVITED'
        ? null
        : latestDelivery === 'ORGANIZATION_INVITATION_DELIVERY_ACCEPTED'
          ? 'ACCEPTED'
          : latestDelivery === 'ORGANIZATION_INVITATION_DELIVERY_FAILED'
            ? 'FAILED'
            : 'UNKNOWN'
      const canChangeRole =
        actorMembership?.role === 'OWNER' &&
        membership.user.status === 'ACTIVE' &&
        membership.status === 'ACTIVE' &&
        membership.role !== 'OWNER' &&
        !self &&
        !protectedAccount
      const latestRoleNotification = membership.user.provisioningEventsAsSubject.find((event) =>
        event.reasonCode === 'ORGANIZATION_ROLE_NOTIFICATION_ACCEPTED' ||
        event.reasonCode === 'ORGANIZATION_ROLE_NOTIFICATION_FAILED')?.reasonCode
      const roleNotificationStatus = membership.historyEvents.length === 0
        ? null
        : latestRoleNotification === 'ORGANIZATION_ROLE_NOTIFICATION_ACCEPTED'
        ? 'ACCEPTED'
        : latestRoleNotification === 'ORGANIZATION_ROLE_NOTIFICATION_FAILED'
          ? 'FAILED'
          : 'UNKNOWN'
      const canResendRoleNotification = canChangeRole && (
        roleNotificationStatus === 'FAILED' || roleNotificationStatus === 'UNKNOWN'
      )

      let actionExplanation: string | null = null
      if (self) actionExplanation = 'U kunt uw eigen account niet blokkeren.'
      else if (lastOwner) actionExplanation = 'De laatste actieve eigenaar is beschermd. Voeg eerst een andere eigenaar toe.'
      else if (protectedAccount) actionExplanation = 'Dit beschermde platformaccount wordt niet via tenantbeheer gewijzigd.'
      else if (!roleAllowsBlock && !roleAllowsUnblock) actionExplanation = 'Uw organisatierol staat geen wijzigingen aan dit account toe.'

      return {
        userId: membership.user.id,
        displayName: membership.user.displayName?.trim() || 'Gebruiker',
        email: membership.user.email,
        role: membership.role,
        membershipStatus: membership.status,
        accountStatus: membership.user.status,
        canBlock,
        canUnblock,
        canResendInvitation,
        invitationDeliveryStatus,
        canChangeRole,
        roleNotificationStatus,
        canResendRoleNotification,
        actionExplanation,
      }
    })

  const canInviteMember = Boolean(
    actorMembership && canManageTenantAccount(actorMembership.role, 'MEMBER', 'INVITE_MEMBER'),
  )
  const canInviteAdmin = Boolean(
    actorMembership && canManageTenantAccount(actorMembership.role, 'ADMIN', 'INVITE_ADMIN'),
  )

  return {
    organization,
    accounts,
    actorRole: actorMembership?.role ?? null,
    centralAdministrator,
    canInviteMember,
    canInviteAdmin,
  }
}
