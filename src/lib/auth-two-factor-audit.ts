import type { Prisma } from '@/generated/prisma/client'
import { appendAccountProvisioningEvent } from '@/lib/account-architecture/account-history-service'

export type TwoFactorAuditEventType =
  | 'TWO_FACTOR_ENROLLED'
  | 'TWO_FACTOR_RESET'
  | 'TWO_FACTOR_RESET_NOTIFICATION_SENT'
  | 'TWO_FACTOR_RESET_NOTIFICATION_FAILED'

type TwoFactorAuditTransaction = Pick<Prisma.TransactionClient, 'accountProvisioningEvent'>

export async function appendTwoFactorAuditEvent(
  transaction: TwoFactorAuditTransaction,
  input: {
    eventType: TwoFactorAuditEventType
    subjectUserId: string
    actorUserId?: string | null
    reasonCode: string
    correlationId: string
    idempotencyKey: string
    metadata?: Prisma.InputJsonObject
  },
) {
  return appendAccountProvisioningEvent(transaction, {
    eventType: input.eventType,
    subjectUserId: input.subjectUserId,
    actorUserId: input.actorUserId,
    reasonCode: input.reasonCode,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    metadata: { policyVersion: 'TWO_FACTOR_AUDIT_V1', ...input.metadata },
  })
}
