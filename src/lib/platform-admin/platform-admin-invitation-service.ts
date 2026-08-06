import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import type { OrganizationMembershipRole } from '@/generated/prisma/enums'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { hashInvitationCredential, sendOrganizationInvitationActivation } from '@/lib/account-architecture/better-auth-invitation-service'
import { AuthEmailDeliveryError } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { getPlatformAdministratorContext } from './platform-admin-authorization'
import { platformAdminInvitationSchema } from './platform-admin-invitation-contract'

export { platformAdminInvitationSchema } from './platform-admin-invitation-contract'

const POLICY_VERSION = 'MARKETPLACE_PLATFORM_ADMIN_INVITATION_V1'
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

export class PlatformAdminInvitationError extends Error {
  constructor(
    public readonly code:
      | 'ACCESS_DENIED'
      | 'CONFLICT'
      | 'NOT_FOUND'
      | 'DELIVERY_FAILED'
      | 'LAST_OWNER'
      | 'VALIDATION_ERROR',
    message: string,
  ) {
    super(message)
    this.name = 'PlatformAdminInvitationError'
  }
}

async function requirePlatformOwner(actorUserId: string) {
  const context = await getPlatformAdministratorContext(actorUserId)
  if (context.platformMembership.role !== 'OWNER') {
    throw new PlatformAdminInvitationError(
      'ACCESS_DENIED',
      'Alleen een platformeigenaar mag platformbeheerders beheren.',
    )
  }
  return context
}

async function sendInvitation(input: {
  actorUserId: string
  invitationId: string
  subjectUserId: string
  email: string
  platformOrganizationId: string
  platformOrganizationName: string
  requestHeaders?: Headers
}) {
  try {
    const delivery = await sendOrganizationInvitationActivation({
      email: input.email,
      organizationId: input.platformOrganizationId,
      organizationName: input.platformOrganizationName,
      requestHeaders: input.requestHeaders,
    })
    await getPrisma().marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: input.platformOrganizationId,
        action: 'PLATFORM_ADMIN_INVITATION_DELIVERY_ACCEPTED',
        entityType: 'PlatformAdminInvitation',
        entityId: input.invitationId,
        correlationKey: `platform-admin-invitation:${input.invitationId}:delivery:${delivery.messageId}`,
        metadata: {
          transport: delivery.transport,
          status: delivery.status,
          providerMessageId: delivery.messageId,
        },
      },
    })
  } catch (error) {
    const technicalCode =
      error instanceof AuthEmailDeliveryError
        ? error.code
        : 'EMAIL_DELIVERY_UNKNOWN'
    await getPrisma().marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: input.platformOrganizationId,
        action: 'PLATFORM_ADMIN_INVITATION_DELIVERY_FAILED',
        entityType: 'PlatformAdminInvitation',
        entityId: input.invitationId,
        correlationKey: `platform-admin-invitation:${input.invitationId}:delivery-failed:${randomUUID()}`,
        metadata: { technicalCode },
      },
    })
    throw new PlatformAdminInvitationError(
      'DELIVERY_FAILED',
      'De uitnodiging is aangemaakt, maar de e-mail kon niet worden verzonden. Probeer het later opnieuw.',
    )
  }
}

export async function invitePlatformAdministrator(input: {
  actorUserId: string
  values: unknown
  requestHeaders?: Headers
}) {
  const parsed = platformAdminInvitationSchema.safeParse(input.values)
  if (!parsed.success) {
    throw new PlatformAdminInvitationError('VALIDATION_ERROR', 'Controleer de uitnodiging.')
  }
  const owner = await requirePlatformOwner(input.actorUserId)
  const passwordHash = await hashInvitationCredential()

  const result = await getPrisma().$transaction(
    async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`
        SELECT "id" FROM "Organization"
        WHERE "id" = ${owner.platformMembership.organization.id}::uuid
        FOR UPDATE
      `)
      const repeated = await transaction.platformAdminInvitation.findUnique({
        where: { idempotencyKey: parsed.data.idempotencyKey },
        include: { subjectUser: true, platformOrganization: true },
      })
      if (repeated) return repeated
      const existing = await transaction.user.findUnique({
        where: { email: parsed.data.email },
        include: { memberships: true },
      })
      if (existing && (existing.status === 'BLOCKED' || existing.status === 'ARCHIVED' || existing.memberships.length > 0)) {
        throw new PlatformAdminInvitationError(
          'CONFLICT',
          'Dit e-mailadres kan niet als nieuwe platformbeheerder worden uitgenodigd.',
        )
      }
      const subjectUser = existing ?? await transaction.user.create({
        data: {
          id: randomUUID(),
          email: parsed.data.email,
          displayName: parsed.data.displayName,
          emailVerified: false,
          platformRole: 'USER',
          status: 'INVITED',
          createdByUserId: input.actorUserId,
          accounts: {
            create: {
              id: randomUUID(),
              accountId: randomUUID(),
              providerId: 'credential',
              password: passwordHash,
            },
          },
        },
      })
      const membership = await transaction.organizationMembership.create({
        data: {
          id: randomUUID(),
          userId: subjectUser.id,
          organizationId: owner.platformMembership.organization.id,
          role: parsed.data.role,
          status: 'INVITED',
        },
      })
      const invitation = await transaction.platformAdminInvitation.create({
        data: {
          platformOrganizationId: owner.platformMembership.organization.id,
          subjectUserId: subjectUser.id,
          email: subjectUser.email,
          role: parsed.data.role,
          invitedByUserId: input.actorUserId,
          idempotencyKey: parsed.data.idempotencyKey,
          expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
        },
        include: { subjectUser: true, platformOrganization: true },
      })
      const correlationId = `platform-admin-invitation:${invitation.id}`
      await appendAccountProvisioningEvent(transaction, {
        eventType: 'ACCOUNT_INVITED',
        subjectUserId: subjectUser.id,
        actorUserId: input.actorUserId,
        organizationId: owner.platformMembership.organization.id,
        membershipId: membership.id,
        reasonCode: 'PLATFORM_ADMIN_INVITED',
        correlationId,
        idempotencyKey: `${correlationId}:account`,
        metadata: { policyVersion: POLICY_VERSION, role: parsed.data.role },
      })
      await appendOrganizationMembershipEvent(transaction, {
        eventType: 'MEMBERSHIP_CREATED',
        membershipId: membership.id,
        userId: subjectUser.id,
        organizationId: owner.platformMembership.organization.id,
        actorUserId: input.actorUserId,
        previousRole: null,
        newRole: parsed.data.role,
        previousStatus: null,
        newStatus: 'INVITED',
        reasonCode: 'PLATFORM_ADMIN_INVITED',
        correlationId,
        idempotencyKey: `${correlationId}:membership`,
        metadata: { policyVersion: POLICY_VERSION },
      })
      await transaction.marketplaceAuditEvent.create({
        data: {
          actorUserId: input.actorUserId,
          actorRole: 'PLATFORM_OWNER',
          organizationId: owner.platformMembership.organization.id,
          action: 'PLATFORM_ADMIN_INVITED',
          entityType: 'PlatformAdminInvitation',
          entityId: invitation.id,
          correlationKey: `${correlationId}:audit`,
          metadata: { role: parsed.data.role },
        },
      })
      return invitation
    },
    { isolationLevel: 'Serializable' },
  )

  await sendInvitation({
    actorUserId: input.actorUserId,
    invitationId: result.id,
    subjectUserId: result.subjectUserId,
    email: result.email,
    platformOrganizationId: result.platformOrganizationId,
    platformOrganizationName: result.platformOrganization.name,
    requestHeaders: input.requestHeaders,
  })
  return result
}

export async function resendPlatformAdminInvitation(input: {
  actorUserId: string
  invitationId: string
  requestHeaders?: Headers
}) {
  await requirePlatformOwner(input.actorUserId)
  const invitation = await getPrisma().platformAdminInvitation.findFirst({
    where: { id: input.invitationId, status: 'PENDING' },
    include: { subjectUser: true, platformOrganization: true },
  })
  if (!invitation) throw new PlatformAdminInvitationError('NOT_FOUND', 'De uitnodiging is niet beschikbaar.')
  await getPrisma().platformAdminInvitation.update({
    where: { id: invitation.id },
    data: { expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS) },
  })
  await sendInvitation({
    actorUserId: input.actorUserId,
    invitationId: invitation.id,
    subjectUserId: invitation.subjectUserId,
    email: invitation.email,
    platformOrganizationId: invitation.platformOrganizationId,
    platformOrganizationName: invitation.platformOrganization.name,
    requestHeaders: input.requestHeaders,
  })
  return invitation
}

export async function revokePlatformAdminInvitation(input: {
  actorUserId: string
  invitationId: string
  reason: string
}) {
  const owner = await requirePlatformOwner(input.actorUserId)
  const reason = z.string().trim().min(10).max(500).parse(input.reason)
  return getPrisma().$transaction(async (transaction) => {
    const invitation = await transaction.platformAdminInvitation.findFirst({
      where: { id: input.invitationId, platformOrganizationId: owner.platformMembership.organization.id, status: 'PENDING' },
    })
    if (!invitation) throw new PlatformAdminInvitationError('NOT_FOUND', 'De uitnodiging is niet beschikbaar.')
    await transaction.platformAdminInvitation.update({
      where: { id: invitation.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    })
    const membership = await transaction.organizationMembership.findFirstOrThrow({
      where: { userId: invitation.subjectUserId, organizationId: invitation.platformOrganizationId, status: 'INVITED' },
    })
    await transaction.organizationMembership.update({
      where: { id: membership.id },
      data: { status: 'REMOVED' },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_TERMINATED', membershipId: membership.id,
      userId: membership.userId, organizationId: membership.organizationId,
      actorUserId: input.actorUserId, previousRole: membership.role, newRole: membership.role,
      previousStatus: 'INVITED', newStatus: 'REMOVED', reasonCode: 'PLATFORM_ADMIN_INVITATION_REVOKED',
      correlationId: `platform-admin-invitation:${invitation.id}`,
      idempotencyKey: `platform-admin-invitation:${invitation.id}:revoked`,
      metadata: { policyVersion: POLICY_VERSION, reason },
    })
    await transaction.marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: invitation.platformOrganizationId,
        action: 'PLATFORM_ADMIN_INVITATION_REVOKED',
        entityType: 'PlatformAdminInvitation',
        entityId: invitation.id,
        reason,
        correlationKey: `platform-admin-invitation:${invitation.id}:revoked:audit`,
      },
    })
    return invitation
  }, { isolationLevel: 'Serializable' })
}

async function activeOwnerCount(transaction: Prisma.TransactionClient, platformOrganizationId: string) {
  return transaction.organizationMembership.count({
    where: {
      organizationId: platformOrganizationId,
      status: 'ACTIVE',
      role: 'OWNER',
      user: { status: 'ACTIVE', platformRole: 'ADMIN' },
    },
  })
}

export async function changePlatformAdministratorRole(input: {
  actorUserId: string
  subjectUserId: string
  role: OrganizationMembershipRole
  reason: string
}) {
  const owner = await requirePlatformOwner(input.actorUserId)
  const reason = z.string().trim().min(10).max(500).parse(input.reason)
  if (!['OWNER', 'ADMIN', 'MEMBER'].includes(input.role)) throw new PlatformAdminInvitationError('VALIDATION_ERROR', 'De rol is ongeldig.')
  return getPrisma().$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: {
        userId: input.subjectUserId,
        organizationId: owner.platformMembership.organization.id,
        status: 'ACTIVE',
        user: { status: 'ACTIVE', platformRole: 'ADMIN' },
      },
    })
    if (!membership) throw new PlatformAdminInvitationError('NOT_FOUND', 'De platformbeheerder is niet beschikbaar.')
    if (membership.role === 'OWNER' && input.role !== 'OWNER' && await activeOwnerCount(transaction, membership.organizationId) <= 1) {
      throw new PlatformAdminInvitationError('LAST_OWNER', 'De laatste platformeigenaar kan niet worden gedegradeerd.')
    }
    if (membership.role === input.role) return membership
    const updated = await transaction.organizationMembership.update({ where: { id: membership.id }, data: { role: input.role } })
    await transaction.session.deleteMany({ where: { userId: input.subjectUserId } })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'ROLE_CHANGED', membershipId: membership.id,
      userId: membership.userId, organizationId: membership.organizationId,
      actorUserId: input.actorUserId, previousRole: membership.role, newRole: input.role,
      previousStatus: membership.status, newStatus: membership.status,
      reasonCode: 'PLATFORM_ADMIN_ROLE_CHANGED',
      correlationId: `platform-admin-role:${membership.id}`,
      idempotencyKey: `platform-admin-role:${membership.id}:${updated.updatedAt.toISOString()}`,
      metadata: { policyVersion: POLICY_VERSION, reason },
    })
    await transaction.marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: membership.organizationId,
        action: 'PLATFORM_ADMIN_ROLE_CHANGED',
        entityType: 'OrganizationMembership',
        entityId: membership.id,
        previousState: membership.role,
        nextState: input.role,
        reason,
        correlationKey: `platform-admin-role:${membership.id}:${updated.updatedAt.toISOString()}`,
      },
    })
    return updated
  }, { isolationLevel: 'Serializable' })
}

export async function revokePlatformAdministratorAccess(input: {
  actorUserId: string
  subjectUserId: string
  reason: string
}) {
  const owner = await requirePlatformOwner(input.actorUserId)
  const reason = z.string().trim().min(10).max(500).parse(input.reason)
  if (input.actorUserId === input.subjectUserId) throw new PlatformAdminInvitationError('ACCESS_DENIED', 'U kunt uw eigen toegang niet intrekken.')
  return getPrisma().$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: { userId: input.subjectUserId, organizationId: owner.platformMembership.organization.id, status: 'ACTIVE' },
    })
    if (!membership) throw new PlatformAdminInvitationError('NOT_FOUND', 'De platformbeheerder is niet beschikbaar.')
    if (membership.role === 'OWNER' && await activeOwnerCount(transaction, membership.organizationId) <= 1) {
      throw new PlatformAdminInvitationError('LAST_OWNER', 'De laatste platformeigenaar kan niet worden verwijderd.')
    }
    await transaction.organizationMembership.update({ where: { id: membership.id }, data: { status: 'REMOVED' } })
    await transaction.user.update({ where: { id: membership.userId }, data: { platformRole: 'USER' } })
    await transaction.session.deleteMany({ where: { userId: membership.userId } })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_TERMINATED', membershipId: membership.id,
      userId: membership.userId, organizationId: membership.organizationId,
      actorUserId: input.actorUserId, previousRole: membership.role, newRole: membership.role,
      previousStatus: 'ACTIVE', newStatus: 'REMOVED', reasonCode: 'PLATFORM_ADMIN_ACCESS_REVOKED',
      correlationId: `platform-admin-access:${membership.id}`,
      idempotencyKey: `platform-admin-access:${membership.id}:revoked`,
      metadata: { policyVersion: POLICY_VERSION, reason },
    })
    await transaction.marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: membership.organizationId,
        action: 'PLATFORM_ADMIN_ACCESS_REVOKED',
        entityType: 'OrganizationMembership',
        entityId: membership.id,
        previousState: membership.status,
        nextState: 'REMOVED',
        reason,
        correlationKey: `platform-admin-access:${membership.id}:revoked:audit`,
      },
    })
    return membership
  }, { isolationLevel: 'Serializable' })
}

export async function setPlatformAdministratorBlocked(input: {
  actorUserId: string
  subjectUserId: string
  blocked: boolean
  reason: string
}) {
  const owner = await requirePlatformOwner(input.actorUserId)
  const reason = z.string().trim().min(10).max(500).parse(input.reason)
  if (input.actorUserId === input.subjectUserId) {
    throw new PlatformAdminInvitationError(
      'ACCESS_DENIED',
      'U kunt uw eigen platformtoegang niet blokkeren.',
    )
  }

  return getPrisma().$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: {
        userId: input.subjectUserId,
        organizationId: owner.platformMembership.organization.id,
        status: input.blocked ? 'ACTIVE' : 'SUSPENDED',
      },
    })
    if (!membership) {
      throw new PlatformAdminInvitationError(
        'NOT_FOUND',
        'De platformbeheerder is niet beschikbaar.',
      )
    }
    if (
      input.blocked &&
      membership.role === 'OWNER' &&
      (await activeOwnerCount(transaction, membership.organizationId)) <= 1
    ) {
      throw new PlatformAdminInvitationError(
        'LAST_OWNER',
        'De laatste platformeigenaar kan niet worden geblokkeerd.',
      )
    }

    const nextStatus = input.blocked ? 'SUSPENDED' : 'ACTIVE'
    await transaction.organizationMembership.update({
      where: { id: membership.id },
      data: { status: nextStatus },
    })
    await transaction.user.update({
      where: { id: membership.userId },
      data: { platformRole: input.blocked ? 'USER' : 'ADMIN' },
    })
    await transaction.session.deleteMany({ where: { userId: membership.userId } })
    const operation = input.blocked ? 'BLOCKED' : 'UNBLOCKED'
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'STATUS_CHANGED',
      membershipId: membership.id,
      userId: membership.userId,
      organizationId: membership.organizationId,
      actorUserId: input.actorUserId,
      previousRole: membership.role,
      newRole: membership.role,
      previousStatus: membership.status,
      newStatus: nextStatus,
      reasonCode: `PLATFORM_ADMIN_ACCESS_${operation}`,
      correlationId: `platform-admin-access:${membership.id}:${operation.toLowerCase()}`,
      idempotencyKey: `platform-admin-access:${membership.id}:${operation.toLowerCase()}:${randomUUID()}`,
      metadata: { policyVersion: POLICY_VERSION, reason },
    })
    await transaction.marketplaceAuditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_OWNER',
        organizationId: membership.organizationId,
        action: `PLATFORM_ADMIN_ACCESS_${operation}`,
        entityType: 'OrganizationMembership',
        entityId: membership.id,
        reason,
        correlationKey: `platform-admin-access:${membership.id}:${operation.toLowerCase()}:${randomUUID()}`,
      },
    })
    return membership
  }, { isolationLevel: 'Serializable' })
}

export async function listPlatformAdministrators(actorUserId: string) {
  const context = await getPlatformAdministratorContext(actorUserId)
  const [memberships, invitations] = await Promise.all([
    getPrisma().organizationMembership.findMany({
      where: {
        organizationId: context.platformMembership.organization.id,
        status: { in: ['ACTIVE', 'INVITED', 'SUSPENDED'] },
      },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, displayName: true, email: true, status: true, sessions: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } } } } },
    }),
    getPrisma().platformAdminInvitation.findMany({
      where: { platformOrganizationId: context.platformMembership.organization.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])
  return { context, memberships, invitations }
}
