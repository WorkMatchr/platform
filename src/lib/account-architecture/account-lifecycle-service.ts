import { Prisma } from '@/generated/prisma/client'
import type { OrganizationMembershipRole } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { appendAccountProvisioningEvent } from './account-history-service'
import {
  canManageTenantAccount,
  canSelfBlock,
  isCentralPlatformAdministrator,
} from './account-management-policy'
import { assertAccountStatusTransition } from './account-lifecycle'
import { isPlatformOrganization } from './platform-organization-governance'
import { isApprovedLegacyMultiMembership } from './tenant-membership-policy'

const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,79}$/
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9:_-]{12,160}$/

export type AccountLifecycleOutcome = 'BLOCKED' | 'UNBLOCKED' | 'ALREADY_BLOCKED' | 'ALREADY_ACTIVE'

export class AccountLifecycleServiceError extends Error {
  constructor(
    public readonly code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'SELF_BLOCK_FORBIDDEN'
      | 'LAST_OWNER'
      | 'INVALID_STATUS'
      | 'PROTECTED_ACCOUNT'
      | 'MIGRATION_TEMP'
      | 'INVALID_INPUT'
      | 'INVALID_TENANT'
      | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'AccountLifecycleServiceError'
  }
}

type LifecycleInput = {
  actorUserId: string
  organizationId: string
  subjectUserId: string
  reasonCode: string
  reasonNote?: string | null
  idempotencyKey: string
}

const actorSelect = {
  id: true,
  status: true,
  platformRole: true,
  memberships: {
    where: { status: 'ACTIVE' as const },
    select: {
      id: true,
      role: true,
      status: true,
      organizationId: true,
      organization: {
        select: { status: true, organizationType: true, systemKey: true },
      },
    },
  },
}

function validateInput(input: LifecycleInput): void {
  if (!REASON_CODE_PATTERN.test(input.reasonCode) || !IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey)) {
    throw new AccountLifecycleServiceError('INVALID_INPUT', 'De opgegeven reden of aanvraagreferentie is ongeldig.')
  }
  if (input.reasonNote && input.reasonNote.trim().length > 500) {
    throw new AccountLifecycleServiceError('INVALID_INPUT', 'De toelichting is te lang.')
  }
}

async function lockLifecycleRows(transaction: Prisma.TransactionClient, organizationId: string, subjectUserId: string) {
  await transaction.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${organizationId}::uuid FOR UPDATE`)
  await transaction.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${subjectUserId}::uuid FOR UPDATE`)
  await transaction.$queryRaw(
    Prisma.sql`SELECT id FROM "OrganizationMembership" WHERE "organizationId" = ${organizationId}::uuid ORDER BY id FOR UPDATE`,
  )
}

async function loadAuthorizationContext(
  transaction: Prisma.TransactionClient,
  actorUserId: string,
  organizationId: string,
  subjectUserId: string,
) {
  const actor = await transaction.user.findUnique({ where: { id: actorUserId }, select: actorSelect })
  const subject = await transaction.user.findUnique({
    where: { id: subjectUserId },
    select: {
      id: true,
      status: true,
      migrationClassification: true,
      platformRole: true,
      memberships: {
        where: { status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] } },
        select: {
          id: true,
          role: true,
          status: true,
          organizationId: true,
          organization: { select: { status: true, organizationType: true, systemKey: true } },
        },
      },
      providerPermissionSubjects: {
        where: { revocation: null },
        select: { id: true },
        take: 1,
      },
    },
  })
  if (!actor || !subject) throw new AccountLifecycleServiceError('NOT_FOUND', 'Het account is niet beschikbaar.')

  const platformMembership = actor.memberships.find((membership) => membership.organization.systemKey === 'WORKMATCHR_PLATFORM') ?? null
  const centralAdministrator = isCentralPlatformAdministrator({
    status: actor.status,
    platformRole: actor.platformRole,
    platformMembership,
  })
  const actorMembership = actor.memberships.find((membership) => membership.organizationId === organizationId) ?? null
  const subjectMembership = subject.memberships.find((membership) => membership.organizationId === organizationId) ?? null
  if (!subjectMembership || subjectMembership.organization.status !== 'ACTIVE' || isPlatformOrganization(subjectMembership.organization)) {
    throw new AccountLifecycleServiceError('INVALID_TENANT', 'Het account hoort niet bij een beheerbare organisatie.')
  }
  if (!centralAdministrator && (!actorMembership || actorMembership.organization.status !== 'ACTIVE')) {
    throw new AccountLifecycleServiceError('FORBIDDEN', 'U heeft geen toegang tot deze accountactie.')
  }

  const subjectHasPlatformIdentity =
    subject.platformRole === 'ADMIN' ||
    subject.providerPermissionSubjects.length > 0 ||
    subject.memberships.some((membership) => isPlatformOrganization(membership.organization))
  if (subjectHasPlatformIdentity) {
    throw new AccountLifecycleServiceError('PROTECTED_ACCOUNT', 'Dit beschermde platformaccount kan hier niet worden beheerd.')
  }
  if (subject.migrationClassification === 'MIGRATION_TEMP') {
    throw new AccountLifecycleServiceError('MIGRATION_TEMP', 'Dit tijdelijke migratieaccount kan hier niet worden beheerd.')
  }

  return { actor, subject, actorMembership, subjectMembership, centralAdministrator }
}

function assertRolePermission(
  centralAdministrator: boolean,
  actorRole: OrganizationMembershipRole | undefined,
  subjectRole: OrganizationMembershipRole,
  action: 'BLOCK' | 'UNBLOCK',
) {
  if (centralAdministrator) return
  if (!actorRole || !canManageTenantAccount(actorRole, subjectRole, action)) {
    throw new AccountLifecycleServiceError('FORBIDDEN', 'U heeft geen toegang tot deze accountactie.')
  }
}

async function assertNotLastOwner(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  subjectRole: OrganizationMembershipRole,
) {
  if (subjectRole !== 'OWNER') return
  const activeOwners = await transaction.organizationMembership.count({
    where: {
      organizationId,
      role: 'OWNER',
      status: 'ACTIVE',
      user: { status: 'ACTIVE' },
    },
  })
  if (activeOwners <= 1) {
    throw new AccountLifecycleServiceError(
      'LAST_OWNER',
      'De laatste actieve eigenaar kan niet worden geblokkeerd. Voeg eerst een andere eigenaar toe.',
    )
  }
}

async function assertValidUnblockMemberships(
  transaction: Prisma.TransactionClient,
  subjectUserId: string,
  currentMembershipStatus: string,
) {
  if (currentMembershipStatus !== 'ACTIVE') {
    throw new AccountLifecycleServiceError('INVALID_TENANT', 'Dit account heeft geen actief organisatielidmaatschap.')
  }
  const tenantMembershipCount = await transaction.organizationMembership.count({
    where: {
      userId: subjectUserId,
      status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
      organization: { organizationType: { not: 'PLATFORM_OPERATOR' }, systemKey: null },
    },
  })
  if (tenantMembershipCount !== 1 && !isApprovedLegacyMultiMembership(subjectUserId)) {
    throw new AccountLifecycleServiceError('CONFLICT', 'De organisatiebinding van dit account is niet eenduidig.')
  }
}

export async function blockAccount(input: LifecycleInput): Promise<{ outcome: AccountLifecycleOutcome }> {
  validateInput(input)
  if (!canSelfBlock(input.actorUserId, input.subjectUserId)) {
    throw new AccountLifecycleServiceError('SELF_BLOCK_FORBIDDEN', 'U kunt uw eigen account niet blokkeren.')
  }

  return getPrisma().$transaction(async (transaction) => {
    await lockLifecycleRows(transaction, input.organizationId, input.subjectUserId)
    const context = await loadAuthorizationContext(transaction, input.actorUserId, input.organizationId, input.subjectUserId)
    assertRolePermission(context.centralAdministrator, context.actorMembership?.role, context.subjectMembership.role, 'BLOCK')

    if (context.subject.status === 'BLOCKED') return { outcome: 'ALREADY_BLOCKED' }
    if (context.subject.status !== 'ACTIVE') {
      throw new AccountLifecycleServiceError('INVALID_STATUS', 'Alleen een actief account kan worden geblokkeerd.')
    }
    await assertNotLastOwner(transaction, input.organizationId, context.subjectMembership.role)
    assertAccountStatusTransition(context.subject.status, 'BLOCKED')

    const now = new Date()
    const correlationId = `account-block:${input.idempotencyKey}`
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_BLOCKED',
      subjectUserId: input.subjectUserId,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      membershipId: context.subjectMembership.id,
      occurredAt: now,
      reasonCode: input.reasonCode,
      correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: { policyVersion: 'ADR013_PHASE2B_V1', activeAccessRevoked: true },
    })
    const updated = await transaction.user.updateMany({
      where: { id: input.subjectUserId, status: 'ACTIVE' },
      data: {
        status: 'BLOCKED',
        blockedAt: now,
        blockedByUserId: input.actorUserId,
        lifecycleReasonCode: input.reasonCode,
        lifecycleReasonNote: input.reasonNote?.trim() || null,
      },
    })
    if (updated.count !== 1) throw new AccountLifecycleServiceError('CONFLICT', 'De accountstatus is gelijktijdig gewijzigd.')
    await transaction.session.deleteMany({ where: { userId: input.subjectUserId } })
    await transaction.verification.deleteMany({
      where: { value: input.subjectUserId, identifier: { startsWith: 'reset-password:' } },
    })
    return { outcome: 'BLOCKED' }
  }, { isolationLevel: 'Serializable' })
}

export async function unblockAccount(input: LifecycleInput): Promise<{ outcome: AccountLifecycleOutcome }> {
  validateInput(input)
  return getPrisma().$transaction(async (transaction) => {
    await lockLifecycleRows(transaction, input.organizationId, input.subjectUserId)
    const context = await loadAuthorizationContext(transaction, input.actorUserId, input.organizationId, input.subjectUserId)
    assertRolePermission(context.centralAdministrator, context.actorMembership?.role, context.subjectMembership.role, 'UNBLOCK')

    if (context.subject.status === 'ACTIVE') return { outcome: 'ALREADY_ACTIVE' }
    if (context.subject.status !== 'BLOCKED') {
      throw new AccountLifecycleServiceError('INVALID_STATUS', 'Alleen een geblokkeerd account kan worden gedeblokkeerd.')
    }
    await assertValidUnblockMemberships(transaction, input.subjectUserId, context.subjectMembership.status)
    assertAccountStatusTransition(context.subject.status, 'ACTIVE')

    const now = new Date()
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_UNBLOCKED',
      subjectUserId: input.subjectUserId,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      membershipId: context.subjectMembership.id,
      occurredAt: now,
      reasonCode: input.reasonCode,
      correlationId: `account-unblock:${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
      metadata: { policyVersion: 'ADR013_PHASE2B_V1', previousAccessRestored: false },
    })
    const updated = await transaction.user.updateMany({
      where: { id: input.subjectUserId, status: 'BLOCKED' },
      data: {
        status: 'ACTIVE',
        blockedAt: null,
        blockedByUserId: null,
        lifecycleReasonCode: null,
        lifecycleReasonNote: null,
      },
    })
    if (updated.count !== 1) throw new AccountLifecycleServiceError('CONFLICT', 'De accountstatus is gelijktijdig gewijzigd.')
    return { outcome: 'UNBLOCKED' }
  }, { isolationLevel: 'Serializable' })
}
