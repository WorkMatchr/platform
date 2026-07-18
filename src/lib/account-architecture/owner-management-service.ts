import { Prisma } from '@/generated/prisma/client'
import type { OrganizationMembershipRole } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import {
  AuthEmailDeliveryError,
  roleChangeNotificationEmail,
  sendAuthEmail,
  type AuthEmailDeliveryResult,
} from '@/lib/email'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from './account-history-service'
import { canManageTenantAccount, isCentralPlatformAdministrator } from './account-management-policy'
import { isPlatformOrganization } from './platform-organization-governance'

const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_-]{12,160}$/

export class OwnerManagementServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'INVALID_INPUT'
      | 'INVALID_STATUS'
      | 'INVALID_TENANT'
      | 'PROTECTED_ACCOUNT'
      | 'MIGRATION_TEMP'
      | 'LIFECYCLE_NOT_AVAILABLE'
      | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'OwnerManagementServiceError'
  }
}

type OwnerActionBase = {
  actorUserId: string
  organizationId: string
  successorUserId: string
  reasonCode: string
  idempotencyKey: string
}

export type ChangeOrganizationRoleInput = OwnerActionBase & {
  expectedRole: 'ADMIN' | 'MEMBER'
  newRole: 'ADMIN' | 'MEMBER'
}

export type RoleChangeNotificationStatus = 'ACCEPTED' | 'DEVELOPMENT_ONLY' | 'FAILED'

export type ChangeOrganizationRoleResult = {
  outcome: 'ROLE_CHANGED' | 'ALREADY_ASSIGNED'
  previousRole: 'ADMIN' | 'MEMBER'
  newRole: 'ADMIN' | 'MEMBER'
  changedAt: Date
  notificationStatus: RoleChangeNotificationStatus
  notificationMessageId: string | null
  notificationErrorCode: string | null
}

type RoleNotificationSender = (email: ReturnType<typeof roleChangeNotificationEmail>) => Promise<AuthEmailDeliveryResult>

function validateInput(input: OwnerActionBase): void {
  if (!/^[A-Z][A-Z0-9_]{2,79}$/.test(input.reasonCode) || !IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)) {
    throw new OwnerManagementServiceError('INVALID_INPUT', 'De reden of aanvraagreferentie is ongeldig.')
  }
}

async function lockOrganizationMemberships(transaction: Prisma.TransactionClient, organizationId: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`)
  await transaction.$queryRaw(
    Prisma.sql`SELECT id FROM "OrganizationMembership" WHERE "organizationId" = ${organizationId}::uuid ORDER BY id FOR UPDATE`,
  )
}

async function loadOwnerContext(transaction: Prisma.TransactionClient, input: OwnerActionBase) {
  const actor = await transaction.user.findUnique({
    where: { id: input.actorUserId },
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
  const successor = await transaction.user.findUnique({
    where: { id: input.successorUserId },
    select: {
      status: true,
      email: true,
      displayName: true,
      migrationClassification: true,
      platformRole: true,
      providerPermissionSubjects: { where: { revocation: null }, select: { id: true }, take: 1 },
      memberships: {
        where: { organizationId: input.organizationId },
        select: {
          id: true,
          role: true,
          status: true,
          organizationId: true,
          organization: { select: { name: true, status: true, organizationType: true, systemKey: true } },
        },
      },
    },
  })
  if (!actor || !successor) throw new OwnerManagementServiceError('NOT_FOUND', 'Het account is niet beschikbaar.')
  const platformMembership = actor.memberships.find((item) => item.organization.systemKey === 'WORKMATCHR_PLATFORM') ?? null
  const centralAdministrator = isCentralPlatformAdministrator({
    status: actor.status,
    platformRole: actor.platformRole,
    platformMembership,
  })
  const actorMembership = actor.memberships.find((item) => item.organizationId === input.organizationId) ?? null
  const successorMembership = successor.memberships[0] ?? null
  if (
    !successorMembership ||
    successorMembership.status !== 'ACTIVE' ||
    successorMembership.organization.status !== 'ACTIVE' ||
    isPlatformOrganization(successorMembership.organization)
  ) {
    throw new OwnerManagementServiceError('INVALID_TENANT', 'De opvolger heeft geen actief lidmaatschap bij deze organisatie.')
  }
  if (
    successor.status !== 'ACTIVE' ||
    successor.platformRole === 'ADMIN' ||
    successor.providerPermissionSubjects.length > 0
  ) {
    throw new OwnerManagementServiceError('PROTECTED_ACCOUNT', 'Dit account kan niet als organisatie-eigenaar worden aangewezen.')
  }
  if (successor.migrationClassification === 'MIGRATION_TEMP') {
    throw new OwnerManagementServiceError('MIGRATION_TEMP', 'Het tijdelijke migratieaccount kan geen organisatie-eigenaar worden.')
  }
  if (!centralAdministrator) {
    if (
      !actorMembership ||
      actorMembership.status !== 'ACTIVE' ||
      !canManageTenantAccount(actorMembership.role, successorMembership.role, 'ADD_OWNER')
    ) {
      throw new OwnerManagementServiceError('FORBIDDEN', 'Alleen een actieve eigenaar kan deze actie uitvoeren.')
    }
  }
  return { actorMembership, successor, successorMembership, centralAdministrator }
}

async function appendRoleChangedEvents(
  transaction: Prisma.TransactionClient,
  input: {
    membershipId: string
    userId: string
    organizationId: string
    actorUserId: string
    previousRole: OrganizationMembershipRole
    newRole: OrganizationMembershipRole
    reasonCode: string
    correlationId: string
    idempotencyKey: string
    occurredAt?: Date
  },
) {
  await appendOrganizationMembershipEvent(transaction, {
    eventType: 'ROLE_CHANGED',
    membershipId: input.membershipId,
    userId: input.userId,
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    previousRole: input.previousRole,
    newRole: input.newRole,
    reasonCode: input.reasonCode,
    occurredAt: input.occurredAt,
    correlationId: input.correlationId,
    idempotencyKey: `${input.idempotencyKey}:membership`,
    metadata: { policyVersion: 'ADR013_PHASE2B_V1' },
  })
  await appendAccountProvisioningEvent(transaction, {
    eventType: 'ROLE_CHANGED',
    subjectUserId: input.userId,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    membershipId: input.membershipId,
    reasonCode: input.reasonCode,
    occurredAt: input.occurredAt,
    correlationId: input.correlationId,
    idempotencyKey: `${input.idempotencyKey}:account`,
    metadata: { policyVersion: 'ADR013_PHASE2B_V1', previousRole: input.previousRole, newRole: input.newRole },
  })
}

export async function addOrganizationOwner(input: OwnerActionBase): Promise<{ outcome: 'OWNER_ADDED' | 'ALREADY_OWNER' }> {
  validateInput(input)
  return getPrisma().$transaction(async (transaction) => {
    await lockOrganizationMemberships(transaction, input.organizationId)
    const { successorMembership } = await loadOwnerContext(transaction, input)
    if (successorMembership.role === 'OWNER') return { outcome: 'ALREADY_OWNER' }

    const previousRole = successorMembership.role
    const correlationId = `owner-add:${input.idempotencyKey}`
    await appendRoleChangedEvents(transaction, {
      membershipId: successorMembership.id,
      userId: input.successorUserId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousRole,
      newRole: 'OWNER',
      reasonCode: input.reasonCode,
      correlationId,
      idempotencyKey: input.idempotencyKey,
    })
    const updated = await transaction.organizationMembership.updateMany({
      where: { id: successorMembership.id, role: previousRole, status: 'ACTIVE' },
      data: { role: 'OWNER' },
    })
    if (updated.count !== 1) throw new OwnerManagementServiceError('CONFLICT', 'De rol is gelijktijdig gewijzigd.')
    return { outcome: 'OWNER_ADDED' }
  }, { isolationLevel: 'Serializable' })
}

export async function changeNonOwnerOrganizationRole(
  input: ChangeOrganizationRoleInput,
): Promise<Omit<ChangeOrganizationRoleResult, 'notificationStatus' | 'notificationMessageId' | 'notificationErrorCode'>> {
  validateInput(input)
  if (input.actorUserId === input.successorUserId) {
    throw new OwnerManagementServiceError('FORBIDDEN', 'U kunt uw eigen organisatierol niet wijzigen.')
  }
  return getPrisma().$transaction(async (transaction) => {
    await lockOrganizationMemberships(transaction, input.organizationId)
    const { successorMembership, actorMembership } = await loadOwnerContext(transaction, input)
    if (
      actorMembership?.role !== 'OWNER' ||
      !canManageTenantAccount(actorMembership.role, successorMembership.role, 'CHANGE_NON_OWNER_ROLE')
    ) {
      throw new OwnerManagementServiceError('FORBIDDEN', 'Alleen een actieve eigenaar kan deze rol wijzigen.')
    }
    if (successorMembership.role === 'OWNER') {
      throw new OwnerManagementServiceError('FORBIDDEN', 'Een eigenaar kan alleen via de afzonderlijke overdrachtsflow worden gewijzigd.')
    }
    if (successorMembership.role === input.newRole) {
      const existing = await transaction.organizationMembershipEvent.findUnique({
        where: { idempotencyKey: `${input.idempotencyKey}:membership` },
        select: { previousRole: true, newRole: true, occurredAt: true, userId: true },
      })
      if (
        !existing ||
        existing.userId !== input.successorUserId ||
        existing.previousRole !== input.expectedRole ||
        existing.newRole !== input.newRole
      ) {
        throw new OwnerManagementServiceError('CONFLICT', 'De rol is al door een andere aanvraag gewijzigd.')
      }
      return {
        outcome: 'ALREADY_ASSIGNED',
        previousRole: input.expectedRole,
        newRole: input.newRole,
        changedAt: existing.occurredAt,
      }
    }
    if (successorMembership.role !== input.expectedRole) {
      throw new OwnerManagementServiceError('CONFLICT', 'De rol is gelijktijdig gewijzigd. Vernieuw de pagina en probeer opnieuw.')
    }

    const changedAt = new Date()
    await appendRoleChangedEvents(transaction, {
      membershipId: successorMembership.id,
      userId: input.successorUserId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousRole: successorMembership.role,
      newRole: input.newRole,
      reasonCode: input.reasonCode,
      correlationId: `role-change:${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
      occurredAt: changedAt,
    })
    const updated = await transaction.organizationMembership.updateMany({
      where: { id: successorMembership.id, role: input.expectedRole, status: 'ACTIVE' },
      data: { role: input.newRole },
    })
    if (updated.count !== 1) throw new OwnerManagementServiceError('CONFLICT', 'De rol is gelijktijdig gewijzigd.')
    await transaction.session.deleteMany({ where: { userId: input.successorUserId } })
    return {
      outcome: 'ROLE_CHANGED',
      previousRole: input.expectedRole,
      newRole: input.newRole,
      changedAt,
    }
  }, { isolationLevel: 'Serializable' })
}

type RoleNotificationContext = {
  actorUserId: string
  organizationId: string
  subjectUserId: string
  membershipId: string
  subjectEmail: string
  subjectName: string
  organizationName: string
  previousRole: 'ADMIN' | 'MEMBER'
  newRole: 'ADMIN' | 'MEMBER'
  changedAt: Date
  idempotencyKey: string
}

async function recordRoleNotificationEvent(
  context: RoleNotificationContext,
  outcome: 'ATTEMPTED' | 'ACCEPTED' | 'FAILED',
  metadata: Prisma.InputJsonValue,
): Promise<void> {
  await getPrisma().$transaction((transaction) => appendAccountProvisioningEvent(transaction, {
    eventType: 'ROLE_CHANGED',
    subjectUserId: context.subjectUserId,
    actorUserId: context.actorUserId,
    organizationId: context.organizationId,
    membershipId: context.membershipId,
    occurredAt: new Date(),
    reasonCode: `ORGANIZATION_ROLE_NOTIFICATION_${outcome}`,
    correlationId: `role-change-notification:${context.idempotencyKey}`,
    idempotencyKey: `${context.idempotencyKey}:notification-${outcome.toLowerCase()}`,
    metadata,
  }))
}

async function deliverRoleChangeNotification(
  context: RoleNotificationContext,
  sender: RoleNotificationSender,
): Promise<Pick<ChangeOrganizationRoleResult, 'notificationStatus' | 'notificationMessageId' | 'notificationErrorCode'>> {
  const existing = await getPrisma().accountProvisioningEvent.findMany({
    where: {
      subjectUserId: context.subjectUserId,
      idempotencyKey: {
        in: [
          `${context.idempotencyKey}:notification-accepted`,
          `${context.idempotencyKey}:notification-failed`,
        ],
      },
    },
    select: { reasonCode: true, metadata: true },
  })
  const accepted = existing.find((event) => event.reasonCode === 'ORGANIZATION_ROLE_NOTIFICATION_ACCEPTED')
  if (accepted) {
    const metadata = accepted.metadata as { deliveryStatus?: RoleChangeNotificationStatus; providerMessageId?: string }
    return {
      notificationStatus: metadata.deliveryStatus ?? 'ACCEPTED',
      notificationMessageId: metadata.providerMessageId ?? null,
      notificationErrorCode: null,
    }
  }
  const failed = existing.find((event) => event.reasonCode === 'ORGANIZATION_ROLE_NOTIFICATION_FAILED')
  if (failed) {
    const metadata = failed.metadata as { failureCode?: string }
    return { notificationStatus: 'FAILED', notificationMessageId: null, notificationErrorCode: metadata.failureCode ?? null }
  }

  const baseMetadata = {
    policyVersion: 'ADR013_PHASE2B_ROLE_NOTIFICATION_V1',
    previousRole: context.previousRole,
    newRole: context.newRole,
    roleChangedAt: context.changedAt.toISOString(),
  }
  await recordRoleNotificationEvent(context, 'ATTEMPTED', { ...baseMetadata, deliveryStatus: 'ATTEMPTED' })
  try {
    const delivery = await sender(roleChangeNotificationEmail({
      to: context.subjectEmail,
      name: context.subjectName,
      organizationName: context.organizationName,
      previousRole: context.previousRole,
      newRole: context.newRole,
      changedAt: context.changedAt,
    }))
    await recordRoleNotificationEvent(context, 'ACCEPTED', {
      ...baseMetadata,
      deliveryStatus: delivery.status,
      deliveryTransport: delivery.transport,
      providerMessageId: delivery.messageId,
    })
    return {
      notificationStatus: delivery.status,
      notificationMessageId: delivery.messageId,
      notificationErrorCode: null,
    }
  } catch (error) {
    const failureCode = error instanceof AuthEmailDeliveryError ? error.code : 'EMAIL_DELIVERY_UNKNOWN'
    await recordRoleNotificationEvent(context, 'FAILED', {
      ...baseMetadata,
      deliveryStatus: 'FAILED',
      failureCode,
      providerStatusCode: error instanceof AuthEmailDeliveryError ? error.providerStatusCode : null,
    })
    return { notificationStatus: 'FAILED', notificationMessageId: null, notificationErrorCode: failureCode }
  }
}

export async function changeOrganizationUserRole(
  input: ChangeOrganizationRoleInput,
  dependencies: { sendNotification?: RoleNotificationSender } = {},
): Promise<ChangeOrganizationRoleResult> {
  const roleChange = await changeNonOwnerOrganizationRole(input)
  const context = await getPrisma().organizationMembership.findUniqueOrThrow({
    where: { userId_organizationId: { userId: input.successorUserId, organizationId: input.organizationId } },
    select: {
      id: true,
      user: { select: { email: true, displayName: true } },
      organization: { select: { name: true } },
    },
  })
  const notification = await deliverRoleChangeNotification({
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    subjectUserId: input.successorUserId,
    membershipId: context.id,
    subjectEmail: context.user.email,
    subjectName: context.user.displayName?.trim() || 'Gebruiker',
    organizationName: context.organization.name,
    previousRole: roleChange.previousRole,
    newRole: roleChange.newRole,
    changedAt: roleChange.changedAt,
    idempotencyKey: input.idempotencyKey,
  }, dependencies.sendNotification ?? sendAuthEmail)
  return { ...roleChange, ...notification }
}

export async function resendOrganizationRoleChangeNotification(
  input: Pick<OwnerActionBase, 'actorUserId' | 'organizationId' | 'idempotencyKey'> & { subjectUserId: string },
  dependencies: { sendNotification?: RoleNotificationSender } = {},
) {
  validateInput({ ...input, successorUserId: input.subjectUserId, reasonCode: 'TENANT_ROLE_CHANGED' })
  if (input.actorUserId === input.subjectUserId) {
    throw new OwnerManagementServiceError('FORBIDDEN', 'U kunt deze notificatie niet voor uw eigen account beheren.')
  }
  const context = await getPrisma().$transaction(async (transaction) => {
    const authorization = await loadOwnerContext(transaction, {
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      successorUserId: input.subjectUserId,
      reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: input.idempotencyKey,
    })
    if (authorization.actorMembership?.role !== 'OWNER') {
      throw new OwnerManagementServiceError('FORBIDDEN', 'Alleen een actieve eigenaar kan deze notificatie opnieuw versturen.')
    }
    const roleEvent = await transaction.organizationMembershipEvent.findFirst({
      where: {
        membershipId: authorization.successorMembership.id,
        eventType: 'ROLE_CHANGED',
        previousRole: { in: ['ADMIN', 'MEMBER'] },
        newRole: { in: ['ADMIN', 'MEMBER'] },
      },
      orderBy: { occurredAt: 'desc' },
      select: { previousRole: true, newRole: true, occurredAt: true },
    })
    if (
      !roleEvent ||
      (roleEvent.previousRole !== 'ADMIN' && roleEvent.previousRole !== 'MEMBER') ||
      (roleEvent.newRole !== 'ADMIN' && roleEvent.newRole !== 'MEMBER')
    ) {
      throw new OwnerManagementServiceError('NOT_FOUND', 'Er is geen rolwijzigingsnotificatie beschikbaar.')
    }
    return {
      membershipId: authorization.successorMembership.id,
      subjectEmail: authorization.successor.email,
      subjectName: authorization.successor.displayName?.trim() || 'Gebruiker',
      organizationName: authorization.successorMembership.organization.name,
      previousRole: roleEvent.previousRole,
      newRole: roleEvent.newRole,
      changedAt: roleEvent.occurredAt,
    }
  })
  return deliverRoleChangeNotification({
    ...context,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    subjectUserId: input.subjectUserId,
    idempotencyKey: input.idempotencyKey,
  }, dependencies.sendNotification ?? sendAuthEmail)
}

export async function transferOrganizationOwnership(
  input: OwnerActionBase & { currentOwnerUserId: string; previousOwnerNewRole: 'ADMIN' | 'MEMBER' },
): Promise<{ outcome: 'OWNERSHIP_TRANSFERRED' | 'ALREADY_TRANSFERRED' }> {
  validateInput(input)
  if (input.currentOwnerUserId === input.successorUserId) {
    throw new OwnerManagementServiceError('INVALID_INPUT', 'De huidige eigenaar en opvolger moeten verschillende accounts zijn.')
  }
  return getPrisma().$transaction(async (transaction) => {
    await lockOrganizationMemberships(transaction, input.organizationId)
    const { successorMembership, actorMembership, centralAdministrator } = await loadOwnerContext(transaction, input)
    if (!centralAdministrator && actorMembership?.role !== 'OWNER') {
      throw new OwnerManagementServiceError('FORBIDDEN', 'Alleen een actieve eigenaar kan eigendom overdragen.')
    }
    const currentOwnerMembership = await transaction.organizationMembership.findUnique({
      where: { userId_organizationId: { userId: input.currentOwnerUserId, organizationId: input.organizationId } },
      include: { user: { select: { status: true } } },
    })
    if (!currentOwnerMembership || currentOwnerMembership.status !== 'ACTIVE') {
      throw new OwnerManagementServiceError('INVALID_TENANT', 'De huidige eigenaar heeft geen actief lidmaatschap.')
    }
    if (
      successorMembership.role === 'OWNER' &&
      currentOwnerMembership.role === input.previousOwnerNewRole
    ) return { outcome: 'ALREADY_TRANSFERRED' }
    if (currentOwnerMembership.role !== 'OWNER' || currentOwnerMembership.user.status !== 'ACTIVE') {
      throw new OwnerManagementServiceError('INVALID_STATUS', 'Het over te dragen account is geen actieve eigenaar.')
    }

    const correlationId = `owner-transfer:${input.idempotencyKey}`
    if (successorMembership.role !== 'OWNER') {
      await appendRoleChangedEvents(transaction, {
        membershipId: successorMembership.id,
        userId: input.successorUserId,
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        previousRole: successorMembership.role,
        newRole: 'OWNER',
        reasonCode: input.reasonCode,
        correlationId,
        idempotencyKey: `${input.idempotencyKey}:successor`,
      })
      const promoted = await transaction.organizationMembership.updateMany({
        where: { id: successorMembership.id, role: successorMembership.role, status: 'ACTIVE' },
        data: { role: 'OWNER' },
      })
      if (promoted.count !== 1) throw new OwnerManagementServiceError('CONFLICT', 'De opvolger is gelijktijdig gewijzigd.')
    }

    await appendRoleChangedEvents(transaction, {
      membershipId: currentOwnerMembership.id,
      userId: input.currentOwnerUserId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousRole: 'OWNER',
      newRole: input.previousOwnerNewRole,
      reasonCode: input.reasonCode,
      correlationId,
      idempotencyKey: `${input.idempotencyKey}:previous-owner`,
    })
    const demoted = await transaction.organizationMembership.updateMany({
      where: { id: currentOwnerMembership.id, role: 'OWNER', status: 'ACTIVE' },
      data: { role: input.previousOwnerNewRole },
    })
    if (demoted.count !== 1) throw new OwnerManagementServiceError('CONFLICT', 'De huidige eigenaar is gelijktijdig gewijzigd.')
    return { outcome: 'OWNERSHIP_TRANSFERRED' }
  }, { isolationLevel: 'Serializable' })
}

export function endOrganizationMembership(): never {
  throw new OwnerManagementServiceError(
    'LIFECYCLE_NOT_AVAILABLE',
    'Een lidmaatschap kan pas worden beëindigd wanneer de volledige accountlifecycle atomair kan worden afgerond.',
  )
}
