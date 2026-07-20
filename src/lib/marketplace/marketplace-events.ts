import type { Prisma } from '@/generated/prisma/client'

type Transaction = Prisma.TransactionClient

type AuditInput = {
  actorUserId?: string
  actorRole: string
  organizationId?: string
  action: string
  entityType: string
  entityId: string
  previousState?: string
  nextState?: string
  reason?: string
  correlationKey?: string
  metadata?: Prisma.InputJsonValue
}

export async function writeMarketplaceAudit(transaction: Transaction, input: AuditInput) {
  return transaction.marketplaceAuditEvent.create({ data: input, select: { id: true } })
}

type NotificationInput = {
  recipientUserId: string
  eventId: string
  type: string
  title: string
  body: string
  targetRoute: string
}

export async function createMarketplaceNotification(transaction: Transaction, input: NotificationInput) {
  return transaction.marketplaceNotification.upsert({
    where: { recipientUserId_eventId: { recipientUserId: input.recipientUserId, eventId: input.eventId } },
    create: { ...input, idempotencyKey: `${input.recipientUserId}:${input.eventId}` },
    update: {},
    select: { id: true, createdAt: true },
  })
}

export async function enqueueMarketplaceEmail(
  transaction: Transaction,
  input: { eventId: string; recipientUserId: string; templateKey: string; payload: Prisma.InputJsonValue },
) {
  return transaction.notificationOutbox.upsert({
    where: { idempotencyKey: `EMAIL:${input.recipientUserId}:${input.eventId}` },
    create: {
      ...input,
      channel: 'EMAIL',
      idempotencyKey: `EMAIL:${input.recipientUserId}:${input.eventId}`,
    },
    update: {},
    select: { id: true, status: true },
  })
}

export async function activeOrganizationRecipients(transaction: Transaction, organizationId: string) {
  const memberships = await transaction.organizationMembership.findMany({
    where: { organizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
    select: { userId: true },
  })
  return memberships.map((membership) => membership.userId)
}
