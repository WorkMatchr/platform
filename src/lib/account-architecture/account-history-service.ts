import { Prisma } from '@/generated/prisma/client'
import type {
  AccountProvisioningEventType,
  MembershipStatus,
  OrganizationProvisioningEventType,
  OrganizationMembershipEventType,
  OrganizationMembershipRole,
  ProvisioningActorType,
} from '@/generated/prisma/enums'

type AccountHistoryTransaction = Pick<
  Prisma.TransactionClient,
  'accountProvisioningEvent'
>

type MembershipHistoryTransaction = Pick<
  Prisma.TransactionClient,
  'organizationMembershipEvent'
>

type OrganizationProvisioningHistoryTransaction = Pick<
  Prisma.TransactionClient,
  'organizationProvisioningEvent'
>

const forbiddenMetadataKey =
  /(password|passphrase|token|secret|credential|authorization|cookie|session|private.?key|access.?key|email|phone|address)/i

export class AccountHistoryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AccountHistoryValidationError'
  }
}

function assertSafeMetadataValue(value: Prisma.InputJsonValue, path: string): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeMetadataValue(item, `${path}[${index}]`))
    return
  }

  if (typeof value !== 'object' || value === null) return
  for (const [key, nestedValue] of Object.entries(value)) {
    if (forbiddenMetadataKey.test(key)) {
      throw new AccountHistoryValidationError(`Niet-toegestane metadata op ${path}.${key}.`)
    }
    if (nestedValue !== null) assertSafeMetadataValue(nestedValue, `${path}.${key}`)
  }
}

export function assertSafeAccountHistoryMetadata(metadata: Prisma.InputJsonValue | undefined): void {
  if (metadata !== undefined) assertSafeMetadataValue(metadata, 'metadata')
}

export type AppendAccountProvisioningEventInput = {
  eventType: AccountProvisioningEventType
  subjectUserId: string
  actorUserId?: string | null
  organizationId?: string | null
  membershipId?: string | null
  occurredAt?: Date
  reasonCode?: string | null
  metadata?: Prisma.InputJsonValue
  correlationId?: string | null
  idempotencyKey?: string | null
  schemaVersion?: number
}

export type AppendOrganizationMembershipEventInput = {
  eventType: OrganizationMembershipEventType
  membershipId: string
  userId: string
  organizationId: string
  actorUserId?: string | null
  previousRole?: OrganizationMembershipRole | null
  newRole?: OrganizationMembershipRole | null
  previousStatus?: MembershipStatus | null
  newStatus?: MembershipStatus | null
  occurredAt?: Date
  reasonCode: string
  correlationId?: string | null
  idempotencyKey?: string | null
  metadata?: Prisma.InputJsonValue
  schemaVersion?: number
}

export type AppendOrganizationProvisioningEventInput = {
  eventType: OrganizationProvisioningEventType
  organizationId: string
  actorType: ProvisioningActorType
  actorUserId?: string | null
  occurredAt?: Date
  reasonCode: string
  metadata?: Prisma.InputJsonValue
  correlationId?: string | null
  idempotencyKey: string
  schemaVersion?: number
}

function assertIdempotencyKey(key: string | null | undefined): void {
  if (key !== undefined && key !== null && key.trim().length === 0) {
    throw new AccountHistoryValidationError('Een idempotency key mag niet leeg zijn.')
  }
}

function assertSchemaVersion(version: number | undefined): void {
  if (version !== undefined && (!Number.isInteger(version) || version < 1)) {
    throw new AccountHistoryValidationError('De schemaversie moet een positief geheel getal zijn.')
  }
}

export async function appendAccountProvisioningEvent(
  transaction: AccountHistoryTransaction,
  input: AppendAccountProvisioningEventInput,
) {
  assertSafeAccountHistoryMetadata(input.metadata)
  assertIdempotencyKey(input.idempotencyKey)
  assertSchemaVersion(input.schemaVersion)

  if (input.idempotencyKey) {
    const existing = await transaction.accountProvisioningEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    })
    if (existing) {
      if (existing.eventType !== input.eventType || existing.subjectUserId !== input.subjectUserId) {
        throw new AccountHistoryValidationError('De idempotency key hoort al bij een ander provisioningevent.')
      }
      return existing
    }
  }

  return transaction.accountProvisioningEvent.create({
    data: {
      eventType: input.eventType,
      subjectUserId: input.subjectUserId,
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      occurredAt: input.occurredAt,
      reasonCode: input.reasonCode,
      metadata: input.metadata,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      schemaVersion: input.schemaVersion,
    },
  })
}

export async function appendOrganizationMembershipEvent(
  transaction: MembershipHistoryTransaction,
  input: AppendOrganizationMembershipEventInput,
) {
  assertSafeAccountHistoryMetadata(input.metadata)
  assertIdempotencyKey(input.idempotencyKey)
  assertSchemaVersion(input.schemaVersion)
  if (!input.reasonCode.trim()) throw new AccountHistoryValidationError('Een membershipevent vereist een redenencode.')

  if (input.idempotencyKey) {
    const existing = await transaction.organizationMembershipEvent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    })
    if (existing) {
      if (existing.eventType !== input.eventType || existing.membershipId !== input.membershipId) {
        throw new AccountHistoryValidationError('De idempotency key hoort al bij een ander membershipevent.')
      }
      return existing
    }
  }

  return transaction.organizationMembershipEvent.create({
    data: {
      eventType: input.eventType,
      membershipId: input.membershipId,
      userId: input.userId,
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      previousRole: input.previousRole,
      newRole: input.newRole,
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      occurredAt: input.occurredAt,
      reasonCode: input.reasonCode,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      metadata: input.metadata,
      schemaVersion: input.schemaVersion,
    },
  })
}

export async function appendOrganizationProvisioningEvent(
  transaction: OrganizationProvisioningHistoryTransaction,
  input: AppendOrganizationProvisioningEventInput,
) {
  assertSafeAccountHistoryMetadata(input.metadata)
  assertIdempotencyKey(input.idempotencyKey)
  assertSchemaVersion(input.schemaVersion)
  if (!input.reasonCode.trim()) throw new AccountHistoryValidationError('Een organisatieprovisioningevent vereist een redenencode.')
  if (
    (input.actorType === 'SYSTEM' && input.actorUserId) ||
    (input.actorType === 'USER' && !input.actorUserId)
  ) {
    throw new AccountHistoryValidationError('Actorsoort en actor-User zijn niet consistent.')
  }

  const existing = await transaction.organizationProvisioningEvent.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  })
  if (existing) {
    if (existing.eventType !== input.eventType || existing.organizationId !== input.organizationId) {
      throw new AccountHistoryValidationError('De idempotency key hoort al bij een ander organisatieprovisioningevent.')
    }
    return existing
  }

  return transaction.organizationProvisioningEvent.create({
    data: {
      eventType: input.eventType,
      organizationId: input.organizationId,
      actorType: input.actorType,
      actorUserId: input.actorUserId,
      occurredAt: input.occurredAt,
      reasonCode: input.reasonCode,
      metadata: input.metadata,
      correlationId: input.correlationId,
      idempotencyKey: input.idempotencyKey,
      schemaVersion: input.schemaVersion,
    },
  })
}
