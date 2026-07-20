import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin, requireProviderMarketplaceAccess } from './marketplace-authorization'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

type Transaction = Prisma.TransactionClient

async function loadAccount(transaction: Transaction, organizationId: string) {
  const account = await transaction.creditAccount.findUnique({ where: { organizationId } })
  if (!account) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  return account
}

export async function reserveCreditsInTransaction(
  transaction: Transaction,
  input: { organizationId: string; participationId: string; amount: number; idempotencyKey: string; actorUserId: string },
) {
  const repeated = await transaction.creditReservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) return repeated
  const account = await loadAccount(transaction, input.organizationId)
  const updated = await transaction.creditAccount.updateMany({
    where: { id: account.id, version: account.version, availableBalance: { gte: input.amount } },
    data: {
      availableBalance: { decrement: input.amount },
      balance: { decrement: input.amount },
      reservedBalance: { increment: input.amount },
      version: { increment: 1 },
    },
  })
  if (updated.count !== 1) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  const reservation = await transaction.creditReservation.create({
    data: {
      creditAccountId: account.id,
      participationId: input.participationId,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
    },
  })
  const totals = await transaction.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
  await transaction.creditTransaction.create({
    data: {
      creditAccountId: account.id,
      type: 'RESERVATION',
      amount: -input.amount,
      balanceAfter: totals.availableBalance,
      availableAfter: totals.availableBalance,
      reservedAfter: totals.reservedBalance,
      spentAfter: totals.spentBalance,
      reservationId: reservation.id,
      referenceType: 'ProviderParticipation',
      referenceId: input.participationId,
      reason: 'Credits gereserveerd voor deelname.',
      idempotencyKey: `LEDGER:${input.idempotencyKey}`,
      createdByUserId: input.actorUserId,
    },
  })
  return reservation
}

export async function consumeCreditReservationInTransaction(
  transaction: Transaction,
  input: { reservationId: string; actorUserId: string; idempotencyKey: string },
) {
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: `LEDGER:${input.idempotencyKey}` } })
  if (repeated) return repeated
  const reservation = await transaction.creditReservation.findUnique({
    where: { id: input.reservationId },
    include: { creditAccount: true },
  })
  if (!reservation || reservation.status !== 'ACTIVE') throw new MarketplaceServiceError('INVALID_STATE')
  const updated = await transaction.creditReservation.updateMany({
    where: { id: reservation.id, status: 'ACTIVE' },
    data: { status: 'CONSUMED', consumedAt: new Date() },
  })
  if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
  const accountUpdate = await transaction.creditAccount.updateMany({
    where: { id: reservation.creditAccountId, version: reservation.creditAccount.version, reservedBalance: { gte: reservation.amount } },
    data: { reservedBalance: { decrement: reservation.amount }, spentBalance: { increment: reservation.amount }, version: { increment: 1 } },
  })
  if (accountUpdate.count !== 1) throw new MarketplaceServiceError('CONFLICT')
  const totals = await transaction.creditAccount.findUniqueOrThrow({ where: { id: reservation.creditAccountId } })
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: reservation.creditAccountId,
      type: 'CONSUMPTION',
      amount: -reservation.amount,
      balanceAfter: totals.availableBalance,
      availableAfter: totals.availableBalance,
      reservedAfter: totals.reservedBalance,
      spentAfter: totals.spentBalance,
      reservationId: reservation.id,
      referenceType: 'ProviderParticipation',
      referenceId: reservation.participationId,
      reason: 'Credits definitief besteed bij geldige offerte-indiening.',
      idempotencyKey: `LEDGER:${input.idempotencyKey}`,
      createdByUserId: input.actorUserId,
    },
  })
}

export async function releaseCreditReservationInTransaction(
  transaction: Transaction,
  input: { reservationId: string; actorUserId: string; reason: string; idempotencyKey: string },
) {
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: `LEDGER:${input.idempotencyKey}` } })
  if (repeated) return repeated
  const reservation = await transaction.creditReservation.findUnique({ where: { id: input.reservationId }, include: { creditAccount: true } })
  if (!reservation || reservation.status !== 'ACTIVE') throw new MarketplaceServiceError('INVALID_STATE')
  const updated = await transaction.creditReservation.updateMany({
    where: { id: reservation.id, status: 'ACTIVE' },
    data: { status: 'RELEASED', releasedAt: new Date(), releaseReason: input.reason },
  })
  if (updated.count !== 1) throw new MarketplaceServiceError('CONFLICT')
  const accountUpdate = await transaction.creditAccount.updateMany({
    where: { id: reservation.creditAccountId, version: reservation.creditAccount.version, reservedBalance: { gte: reservation.amount } },
    data: {
      availableBalance: { increment: reservation.amount },
      balance: { increment: reservation.amount },
      reservedBalance: { decrement: reservation.amount },
      version: { increment: 1 },
    },
  })
  if (accountUpdate.count !== 1) throw new MarketplaceServiceError('CONFLICT')
  const totals = await transaction.creditAccount.findUniqueOrThrow({ where: { id: reservation.creditAccountId } })
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: reservation.creditAccountId,
      type: 'RESERVATION_RELEASE',
      amount: reservation.amount,
      balanceAfter: totals.availableBalance,
      availableAfter: totals.availableBalance,
      reservedAfter: totals.reservedBalance,
      spentAfter: totals.spentBalance,
      reservationId: reservation.id,
      referenceType: 'ProviderParticipation',
      referenceId: reservation.participationId,
      reason: input.reason,
      idempotencyKey: `LEDGER:${input.idempotencyKey}`,
      createdByUserId: input.actorUserId,
    },
  })
}

export async function grantMarketplaceCredits(input: {
  actorUserId: string
  providerOrganizationId: string
  amount: number
  reason: string
  idempotencyKey: string
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.reason.trim().length < 10) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (repeated) return repeated
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
    const organization = await transaction.organization.findFirst({
      where: { id: input.providerOrganizationId, status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] }, systemKey: null },
      select: { id: true },
    })
    if (!organization) throw new MarketplaceServiceError('NOT_FOUND')
    const account = await transaction.creditAccount.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id },
      update: {},
    })
    const updated = await transaction.creditAccount.update({
      where: { id: account.id },
      data: { availableBalance: { increment: input.amount }, balance: { increment: input.amount }, version: { increment: 1 } },
    })
    const ledger = await transaction.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        type: 'ADMIN_GRANT',
        amount: input.amount,
        balanceAfter: updated.availableBalance,
        availableAfter: updated.availableBalance,
        reservedAfter: updated.reservedBalance,
        spentAfter: updated.spentBalance,
        reason: input.reason.trim(),
        description: 'Gratis credits toegekend door WorkMatchr-beheer.',
        idempotencyKey: input.idempotencyKey,
        createdByUserId: input.actorUserId,
      },
    })
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: 'PLATFORM_ADMIN',
      organizationId: organization.id,
      action: 'CREDITS_GRANTED',
      entityType: 'CreditTransaction',
      entityId: ledger.id,
      reason: input.reason.trim(),
      correlationKey: input.idempotencyKey,
      metadata: { amount: input.amount, availableAfter: updated.availableBalance },
    })
    const recipients = await activeOrganizationRecipients(transaction, organization.id)
    for (const recipientUserId of recipients) {
      await createMarketplaceNotification(transaction, {
        recipientUserId,
        eventId: `CREDIT_GRANT:${ledger.id}`,
        type: 'CREDITS_GRANTED',
        title: 'Credits toegekend',
        body: 'WorkMatchr-beheer heeft credits aan uw organisatie toegekend.',
        targetRoute: '/credits',
      })
    }
    return ledger
  }, { isolationLevel: 'Serializable' })
}

export async function correctMarketplaceCredits(input: {
  actorUserId: string
  providerOrganizationId: string
  amount: number
  reason: string
  idempotencyKey: string
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0 || input.reason.trim().length < 10) {
    throw new MarketplaceServiceError('VALIDATION_ERROR')
  }
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (repeated) return repeated
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
    const account = await transaction.creditAccount.findUnique({ where: { organizationId: input.providerOrganizationId } })
    if (!account) throw new MarketplaceServiceError('NOT_FOUND')
    const updated = await transaction.creditAccount.updateMany({
      where: {
        id: account.id,
        version: account.version,
        ...(input.amount < 0 ? { availableBalance: { gte: Math.abs(input.amount) } } : {}),
      },
      data: {
        availableBalance: { increment: input.amount },
        balance: { increment: input.amount },
        version: { increment: 1 },
      },
    })
    if (updated.count !== 1) throw new MarketplaceServiceError(input.amount < 0 ? 'INSUFFICIENT_CREDITS' : 'CONFLICT')
    const totals = await transaction.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
    const ledger = await transaction.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        type: 'ADMIN_CORRECTION',
        amount: input.amount,
        balanceAfter: totals.availableBalance,
        availableAfter: totals.availableBalance,
        reservedAfter: totals.reservedBalance,
        spentAfter: totals.spentBalance,
        reason: input.reason.trim(),
        description: 'Controleerbare creditcorrectie door WorkMatchr-beheer.',
        idempotencyKey: input.idempotencyKey,
        createdByUserId: input.actorUserId,
      },
    })
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: 'PLATFORM_ADMIN',
      organizationId: input.providerOrganizationId,
      action: 'CREDITS_CORRECTED',
      entityType: 'CreditTransaction',
      entityId: ledger.id,
      reason: input.reason.trim(),
      correlationKey: input.idempotencyKey,
      metadata: { amount: input.amount, availableAfter: totals.availableBalance },
    })
    return ledger
  }, { isolationLevel: 'Serializable' })
}

export async function getProviderCreditOverview(userId: string, providerOrganizationId: string) {
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderMarketplaceAccess(transaction, userId, providerOrganizationId)
    const account = await transaction.creditAccount.findUnique({
      where: { organizationId: providerOrganizationId },
      select: {
        availableBalance: true,
        reservedBalance: true,
        spentBalance: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: { id: true, type: true, amount: true, reason: true, referenceType: true, referenceId: true, createdAt: true },
        },
        reservations: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          select: { id: true, amount: true, status: true, participationId: true, createdAt: true },
        },
      },
    })
    return account ?? { availableBalance: 0, reservedBalance: 0, spentBalance: 0, transactions: [], reservations: [] }
  })
}
