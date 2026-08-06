import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  createMarketplaceNotification,
  enqueueMarketplaceEmail,
} from '@/lib/marketplace/marketplace-events'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from './account-history-service'
import { normalTenantOrganizationWhere } from './platform-organization-governance'

const PLATFORM_ORGANIZATION_SYSTEM_KEY = 'WORKMATCHR_PLATFORM'

export async function activateVerifiedInvitation(userId: string): Promise<'ACTIVATED' | 'NOT_APPLICABLE'> {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`)
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        emailVerified: true,
        migrationClassification: true,
        memberships: {
          where: {
            status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
            organization: { status: 'ACTIVE', ...normalTenantOrganizationWhere },
          },
          select: { id: true, organizationId: true, role: true, status: true },
        },
      },
    })
    if (!user || user.status !== 'INVITED' || !user.emailVerified || user.migrationClassification !== null) {
      return 'NOT_APPLICABLE'
    }
    if (user.memberships.length !== 0) return 'NOT_APPLICABLE'
    await transaction.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } })
    return 'ACTIVATED'
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}

export async function isPendingOrganizationInvitation(
  userId: string,
  organizationId?: string,
): Promise<boolean> {
  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: {
      status: true,
      migrationClassification: true,
      memberships: {
        where: {
          status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
        },
        select: {
          organizationId: true,
          status: true,
          organization: {
            select: { status: true, organizationType: true, systemKey: true },
          },
        },
      },
      receivedPlatformAdminInvitations: {
        where: { status: 'PENDING', expiresAt: { gt: new Date() } },
        select: { platformOrganizationId: true },
      },
    },
  })
  if (
    !user ||
    !['INVITED', 'ACTIVE'].includes(user.status) ||
    user.migrationClassification !== null ||
    user.memberships.length !== 1
  ) {
    return false
  }
  const membership = user.memberships[0]
  const isNormalTenantInvitation = Boolean(
    membership &&
    user.status === 'INVITED' &&
    membership.status === 'INVITED' &&
    (!organizationId || membership.organizationId === organizationId) &&
    membership.organization.status === 'ACTIVE' &&
    membership.organization.organizationType !== 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === null,
  )
  const isPlatformInvitation = Boolean(
    membership &&
    membership.status === 'INVITED' &&
    (!organizationId || membership.organizationId === organizationId) &&
    membership.organization.status === 'ACTIVE' &&
    membership.organization.organizationType === 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === PLATFORM_ORGANIZATION_SYSTEM_KEY &&
    user.receivedPlatformAdminInvitations.some(
      (invitation) => invitation.platformOrganizationId === membership.organizationId,
    ),
  )
  return isNormalTenantInvitation || isPlatformInvitation
}

export async function activateInvitationAfterPasswordReset(
  userId: string,
): Promise<'ACTIVATED' | 'NOT_APPLICABLE'> {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`)
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        migrationClassification: true,
        memberships: {
          where: {
            status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
            organization: { status: 'ACTIVE' },
          },
          select: {
            id: true,
            organizationId: true,
            role: true,
            status: true,
            organization: {
              select: { organizationType: true, systemKey: true },
            },
          },
        },
        receivedPlatformAdminInvitations: {
          where: { status: 'PENDING', expiresAt: { gt: new Date() } },
          select: { id: true, platformOrganizationId: true },
        },
      },
    })
    if (
      !user ||
      !['INVITED', 'ACTIVE'].includes(user.status) ||
      user.migrationClassification !== null ||
      user.memberships.length !== 1
    ) {
      return 'NOT_APPLICABLE'
    }
    const membership = user.memberships[0]
    if (!membership || membership.status !== 'INVITED') return 'NOT_APPLICABLE'

    const isNormalTenantInvitation =
      user.status === 'INVITED' &&
      membership.organization.organizationType !== 'PLATFORM_OPERATOR' &&
      membership.organization.systemKey === null
    const platformInvitation = user.receivedPlatformAdminInvitations.find(
      (invitation) => invitation.platformOrganizationId === membership.organizationId,
    )
    const isPlatformInvitation =
      membership.organization.organizationType === 'PLATFORM_OPERATOR' &&
      membership.organization.systemKey === PLATFORM_ORGANIZATION_SYSTEM_KEY &&
      Boolean(platformInvitation)

    if (!isNormalTenantInvitation && !isPlatformInvitation) return 'NOT_APPLICABLE'

    await transaction.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        emailVerified: true,
        ...(isPlatformInvitation ? { platformRole: 'ADMIN' as const } : {}),
      },
    })
    await transaction.organizationMembership.update({
      where: { id: membership.id },
      data: { status: 'ACTIVE' },
    })
    if (platformInvitation) {
      await transaction.platformAdminInvitation.update({
        where: { id: platformInvitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedByUserId: userId,
          acceptedAt: new Date(),
        },
      })
    }
    const correlationId = `invitation-accepted:${membership.id}`
    const reasonCode = isPlatformInvitation
      ? 'PLATFORM_ADMIN_INVITATION_ACCEPTED'
      : 'ORGANIZATION_INVITATION_ACCEPTED'
    const policyVersion = isPlatformInvitation
      ? 'MARKETPLACE_PLATFORM_ADMIN_INVITATION_V1'
      : 'ADR013_PHASE2B_INVITATION_V1'
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'INVITATION_ACCEPTED', subjectUserId: userId, actorUserId: userId,
      organizationId: membership.organizationId, membershipId: membership.id,
      reasonCode, correlationId,
      idempotencyKey: `${correlationId}:account`,
      metadata: { policyVersion },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'INVITATION_ACCEPTED', membershipId: membership.id, userId,
      organizationId: membership.organizationId, actorUserId: userId,
      previousRole: membership.role, newRole: membership.role,
      previousStatus: 'INVITED', newStatus: 'ACTIVE',
      reasonCode, correlationId,
      idempotencyKey: `${correlationId}:membership`,
      metadata: { policyVersion },
    })
    if (isPlatformInvitation && platformInvitation) {
      const owners = await transaction.organizationMembership.findMany({
        where: {
          organizationId: membership.organizationId,
          status: 'ACTIVE',
          role: 'OWNER',
          user: { status: 'ACTIVE', platformRole: 'ADMIN' },
        },
        select: { userId: true },
      })
      for (const owner of owners) {
        await createMarketplaceNotification(transaction, {
          recipientUserId: owner.userId,
          eventId: `PLATFORM_ADMIN_INVITATION_ACCEPTED:${platformInvitation.id}`,
          type: 'PLATFORM_ADMIN_INVITATION_ACCEPTED',
          title: 'Platformuitnodiging geaccepteerd',
          body: 'Een nieuwe platformbeheerder heeft de uitnodiging geaccepteerd.',
          targetRoute: '/platformbeheer/platformbeheerders',
        })
        await enqueueMarketplaceEmail(transaction, {
          eventId: `PLATFORM_ADMIN_INVITATION_ACCEPTED:${platformInvitation.id}`,
          recipientUserId: owner.userId,
          templateKey: 'PLATFORM_ADMIN_INVITATION_ACCEPTED',
          payload: { invitationId: platformInvitation.id },
        })
      }
    }
    return 'ACTIVATED'
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}
