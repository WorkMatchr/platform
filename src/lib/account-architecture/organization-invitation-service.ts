import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import type { OrganizationMembershipRole } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from './account-history-service'
import { canManageTenantAccount } from './account-management-policy'
import { hashInvitationCredential, sendOrganizationInvitationVerification } from './better-auth-invitation-service'
import { normalTenantOrganizationWhere } from './platform-organization-governance'
import { assertCanCreateTenantMembership } from './tenant-membership-policy'
import { AuthEmailDeliveryError, type AuthEmailDeliveryResult } from '@/lib/email'

const POLICY_VERSION = 'ADR013_PHASE2B_INVITATION_V1'

export class OrganizationInvitationServiceError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'INVALID_TENANT' | 'CONFLICT' | 'DELIVERY_FAILED',
    message: string,
    public readonly technicalCode?: string,
  ) {
    super(message)
    this.name = 'OrganizationInvitationServiceError'
  }
}

export type InviteOrganizationUserInput = {
  actorUserId: string
  organizationId: string
  displayName: string
  email: string
  role: Extract<OrganizationMembershipRole, 'ADMIN' | 'MEMBER'>
  idempotencyKey: string
}

type InvitationResult = {
  status: 'CREATED' | 'RESENT'
  userId: string
  membershipId: string
}

export type ResendOrganizationInvitationInput = {
  actorUserId: string
  organizationId: string
  subjectUserId: string
  idempotencyKey: string
}

async function requireInviter(
  transaction: Prisma.TransactionClient,
  input: Pick<InviteOrganizationUserInput, 'actorUserId' | 'organizationId' | 'role'>,
) {
  const actor = await transaction.user.findUnique({
    where: { id: input.actorUserId },
    select: {
      status: true,
      memberships: {
        where: { organizationId: input.organizationId, status: 'ACTIVE' },
        select: {
          role: true,
          organization: { select: { status: true, organizationType: true, systemKey: true } },
        },
        take: 1,
      },
    },
  })
  const membership = actor?.memberships[0]
  const action = input.role === 'ADMIN' ? 'INVITE_ADMIN' : 'INVITE_MEMBER'
  if (
    actor?.status !== 'ACTIVE' ||
    !membership ||
    membership.organization.status !== 'ACTIVE' ||
    membership.organization.organizationType === 'PLATFORM_OPERATOR' ||
    membership.organization.systemKey !== null ||
    !canManageTenantAccount(membership.role, input.role, action)
  ) {
    throw new OrganizationInvitationServiceError('FORBIDDEN', 'U mag deze gebruiker niet met deze rol uitnodigen.')
  }
  return membership
}

async function findRetryableInvitation(
  transaction: Prisma.TransactionClient,
  input: Pick<InviteOrganizationUserInput, 'actorUserId' | 'organizationId' | 'email' | 'role'>,
) {
  const user = await transaction.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      status: true,
      platformRole: true,
      migrationClassification: true,
      createdByUserId: true,
      memberships: {
        where: { status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] } },
        select: { id: true, organizationId: true, role: true, status: true },
      },
    },
  })
  if (!user) return null
  const membership = user.memberships[0]
  const retryable =
    user.status === 'INVITED' &&
    user.platformRole === 'USER' &&
    user.migrationClassification === null &&
    user.createdByUserId === input.actorUserId &&
    user.memberships.length === 1 &&
    membership?.organizationId === input.organizationId &&
    membership.role === input.role &&
    membership.status === 'INVITED'
  if (!retryable || !membership) {
    throw new OrganizationInvitationServiceError('CONFLICT', 'Dit e-mailadres kan niet voor deze organisatie worden uitgenodigd.')
  }
  return { userId: user.id, membershipId: membership.id }
}

async function provisionInvitation(input: InviteOrganizationUserInput, passwordHash: string): Promise<InvitationResult> {
  const prisma = getPrisma()
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${input.organizationId}::uuid FOR UPDATE`)
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${input.actorUserId}::uuid FOR UPDATE`)
    await requireInviter(transaction, input)
    const organization = await transaction.organization.findFirst({
      where: { id: input.organizationId, status: 'ACTIVE', ...normalTenantOrganizationWhere },
      select: { id: true },
    })
    if (!organization) throw new OrganizationInvitationServiceError('INVALID_TENANT', 'De organisatie is niet beschikbaar.')

    const existing = await findRetryableInvitation(transaction, input)
    if (existing) return { status: 'RESENT', ...existing }

    const userId = randomUUID()
    const membershipId = randomUUID()
    await transaction.user.create({
      data: {
        id: userId,
        email: input.email,
        displayName: input.displayName,
        emailVerified: false,
        platformRole: 'USER',
        status: 'INVITED',
        createdByUserId: input.actorUserId,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: userId,
            providerId: 'credential',
            password: passwordHash,
          },
        },
      },
    })
    await assertCanCreateTenantMembership(transaction, userId, input.organizationId)
    await transaction.organizationMembership.create({
      data: { id: membershipId, userId, organizationId: input.organizationId, role: input.role, status: 'INVITED' },
    })

    const correlationId = `organization-invitation:${input.idempotencyKey}`
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_INVITED', subjectUserId: userId, actorUserId: input.actorUserId,
      organizationId: input.organizationId, membershipId, reasonCode: 'ORGANIZATION_USER_INVITED',
      correlationId, idempotencyKey: `${input.idempotencyKey}:account`,
      metadata: { policyVersion: POLICY_VERSION, invitedRole: input.role },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ORGANIZATION_LINKED', subjectUserId: userId, actorUserId: input.actorUserId,
      organizationId: input.organizationId, membershipId, reasonCode: 'ORGANIZATION_INVITATION_LINKED',
      correlationId, idempotencyKey: `${input.idempotencyKey}:linked`,
      metadata: { policyVersion: POLICY_VERSION },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ROLE_GRANTED', subjectUserId: userId, actorUserId: input.actorUserId,
      organizationId: input.organizationId, membershipId, reasonCode: 'ORGANIZATION_INVITATION_ROLE_GRANTED',
      correlationId, idempotencyKey: `${input.idempotencyKey}:role`,
      metadata: { policyVersion: POLICY_VERSION, grantedRole: input.role },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED', membershipId, userId, organizationId: input.organizationId,
      actorUserId: input.actorUserId, previousRole: null, newRole: input.role,
      previousStatus: null, newStatus: 'INVITED', reasonCode: 'ORGANIZATION_USER_INVITED',
      correlationId, idempotencyKey: `${input.idempotencyKey}:membership`,
      metadata: { policyVersion: POLICY_VERSION },
    })
    return { status: 'CREATED', userId, membershipId }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}

async function recordDeliveryAttempt(input: InviteOrganizationUserInput, result: InvitationResult): Promise<void> {
  await getPrisma().$transaction((transaction) => appendAccountProvisioningEvent(transaction, {
    eventType: 'ACCOUNT_INVITED', subjectUserId: result.userId, actorUserId: input.actorUserId,
    organizationId: input.organizationId, membershipId: result.membershipId,
    reasonCode: 'ORGANIZATION_INVITATION_DELIVERY_ATTEMPTED',
    correlationId: `organization-invitation:${input.idempotencyKey}`,
    idempotencyKey: `${input.idempotencyKey}:delivery-attempt`,
    metadata: { policyVersion: POLICY_VERSION, deliveryAttempt: result.status },
  }))
}

async function recordInvitationSent(
  input: InviteOrganizationUserInput,
  result: InvitationResult,
  delivery: AuthEmailDeliveryResult,
): Promise<void> {
  await getPrisma().$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: {
        id: result.membershipId,
        userId: result.userId,
        organizationId: input.organizationId,
        status: 'INVITED',
      },
      select: { id: true },
    })
    if (!membership) throw new OrganizationInvitationServiceError('CONFLICT', 'De uitnodiging is niet meer actief.')
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'INVITATION_SENT', membershipId: result.membershipId, userId: result.userId,
      organizationId: input.organizationId, actorUserId: input.actorUserId,
      previousRole: input.role, newRole: input.role, previousStatus: 'INVITED', newStatus: 'INVITED',
      reasonCode: result.status === 'CREATED' ? 'ORGANIZATION_INVITATION_SENT' : 'ORGANIZATION_INVITATION_RESENT',
      correlationId: `organization-invitation:${input.idempotencyKey}`,
      idempotencyKey: `${input.idempotencyKey}:sent`,
      metadata: {
        policyVersion: POLICY_VERSION,
        deliveryAttempt: result.status,
        deliveryStatus: delivery.status,
        deliveryTransport: delivery.transport,
        providerMessageId: delivery.messageId,
      },
    })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_INVITED', subjectUserId: result.userId, actorUserId: input.actorUserId,
      organizationId: input.organizationId, membershipId: result.membershipId,
      reasonCode: 'ORGANIZATION_INVITATION_DELIVERY_ACCEPTED',
      correlationId: `organization-invitation:${input.idempotencyKey}`,
      idempotencyKey: `${input.idempotencyKey}:delivery-accepted`,
      metadata: {
        policyVersion: POLICY_VERSION,
        deliveryStatus: delivery.status,
        deliveryTransport: delivery.transport,
        providerMessageId: delivery.messageId,
      },
    })
  })
}

async function recordDeliveryFailure(
  input: InviteOrganizationUserInput,
  result: InvitationResult,
  technicalCode: string,
): Promise<void> {
  await getPrisma().$transaction((transaction) => appendAccountProvisioningEvent(transaction, {
    eventType: 'ACCOUNT_INVITED', subjectUserId: result.userId, actorUserId: input.actorUserId,
    organizationId: input.organizationId, membershipId: result.membershipId,
    reasonCode: 'ORGANIZATION_INVITATION_DELIVERY_FAILED',
    correlationId: `organization-invitation:${input.idempotencyKey}`,
    idempotencyKey: `${input.idempotencyKey}:delivery-failed`,
    metadata: { policyVersion: POLICY_VERSION, deliveryStatus: 'FAILED', failureCode: technicalCode },
  }))
}

function deliveryError(error: unknown): OrganizationInvitationServiceError {
  const technicalCode = error instanceof AuthEmailDeliveryError ? error.code : 'EMAIL_DELIVERY_UNKNOWN'
  const message = technicalCode === 'EMAIL_DELIVERY_NOT_CONFIGURED'
    ? 'De uitnodiging is opgeslagen, maar e-mailbezorging is niet geconfigureerd. Controleer de serverconfiguratie en probeer opnieuw.'
    : 'De uitnodiging is opgeslagen, maar de e-mailprovider heeft verzending niet geaccepteerd. Probeer opnieuw of controleer de e-mailconfiguratie.'
  return new OrganizationInvitationServiceError('DELIVERY_FAILED', message, technicalCode)
}

async function deliverInvitation(input: InviteOrganizationUserInput, result: InvitationResult): Promise<void> {
  await recordDeliveryAttempt(input, result)
  try {
    const delivery = await sendOrganizationInvitationVerification(input.email)
    await recordInvitationSent(input, result, delivery)
  } catch (error) {
    const safeError = deliveryError(error)
    try {
      await recordDeliveryFailure(input, result, safeError.technicalCode ?? 'EMAIL_DELIVERY_UNKNOWN')
    } catch (auditError) {
      console.error('[INVITATION_DELIVERY_AUDIT_FAILED]', {
        technicalCode: safeError.technicalCode,
        auditError: auditError instanceof Error ? auditError.name : 'UnknownError',
      })
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[INVITATION_DELIVERY_FAILED]', {
        technicalCode: safeError.technicalCode,
        providerStatusCode: error instanceof AuthEmailDeliveryError ? error.providerStatusCode : null,
      })
    }
    throw safeError
  }
}

export async function inviteOrganizationUser(input: InviteOrganizationUserInput): Promise<InvitationResult> {
  const prisma = getPrisma()
  await prisma.$transaction((transaction) => requireInviter(transaction, input))
  const existing = await prisma.$transaction((transaction) => findRetryableInvitation(transaction, input))
  let result: InvitationResult
  if (existing) {
    result = { status: 'RESENT', ...existing }
  } else {
    try {
      result = await provisionInvitation(input, await hashInvitationCredential())
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const concurrent = await prisma.$transaction((transaction) => findRetryableInvitation(transaction, input))
      if (!concurrent) throw error
      result = { status: 'RESENT', ...concurrent }
    }
  }

  await deliverInvitation(input, result)
  return result
}

export async function resendOrganizationInvitation(input: ResendOrganizationInvitationInput): Promise<InvitationResult> {
  const prisma = getPrisma()
  const target = await prisma.$transaction(async (transaction) => {
    const membership = await transaction.organizationMembership.findFirst({
      where: {
        userId: input.subjectUserId,
        organizationId: input.organizationId,
        status: 'INVITED',
        user: {
          status: 'INVITED', platformRole: 'USER', migrationClassification: null,
          createdByUserId: input.actorUserId,
        },
      },
      select: { id: true, role: true, user: { select: { email: true, displayName: true } } },
    })
    if (!membership || membership.role === 'OWNER') {
      throw new OrganizationInvitationServiceError('CONFLICT', 'Deze uitnodiging kan niet veilig opnieuw worden verzonden.')
    }
    const role: Extract<OrganizationMembershipRole, 'ADMIN' | 'MEMBER'> = membership.role
    await requireInviter(transaction, {
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      role,
    })
    return { ...membership, role }
  })
  const invitationInput: InviteOrganizationUserInput = {
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    displayName: target.user.displayName?.trim() || 'Gebruiker',
    email: target.user.email,
    role: target.role,
    idempotencyKey: input.idempotencyKey,
  }
  const result: InvitationResult = { status: 'RESENT', userId: input.subjectUserId, membershipId: target.id }
  await deliverInvitation(invitationInput, result)
  return result
}
