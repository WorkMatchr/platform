import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getProfessionalCreditWallet } from '@/lib/credits/credit-wallet-service'
import { requireMarketplacePlatformAdmin } from './marketplace-authorization'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

type Transaction = Prisma.TransactionClient

async function loadAccount(transaction: Transaction, organizationId: string) {
  const account = await transaction.creditAccount.findUnique({ where: { organizationId } })
  if (!account) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${account.id}::uuid FOR UPDATE`
  return transaction.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
}

export async function reserveCreditsInTransaction(
  transaction: Transaction,
  input: { organizationId: string; participationId: string; amount: number; idempotencyKey: string; actorUserId: string },
) {
  const repeated = await transaction.creditReservation.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) return repeated
  const account = await loadAccount(transaction, input.organizationId)
  if (account.availableBalance < input.amount) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  const reservation = await transaction.creditReservation.create({
    data: {
      creditAccountId: account.id,
      participationId: input.participationId,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
    },
  })
  await transaction.creditTransaction.create({
    data: {
      creditAccountId: account.id,
      type: 'RESERVATION',
      amount: -input.amount,
      totalDelta: 0,
      reservedDelta: input.amount,
      balanceBefore: account.availableBalance,
      balanceAfter: account.availableBalance - input.amount,
      availableBefore: account.availableBalance,
      availableAfter: account.availableBalance - input.amount,
      reservedBefore: account.reservedBalance,
      reservedAfter: account.reservedBalance + input.amount,
      spentBefore: account.spentBalance,
      spentAfter: account.spentBalance,
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

export async function purchaseAssignmentInTransaction(
  transaction: Transaction,
  input: { organizationId: string; participationId: string; amount: number; actorUserId: string },
) {
  const idempotencyKey = `ASSIGNMENT_PURCHASE:${input.participationId}`
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey } })
  if (repeated) return repeated
  const account = await loadAccount(transaction, input.organizationId)
  if (account.availableBalance < input.amount) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: account.id,
      type: 'PARTICIPATION_PAYMENT',
      amount: -input.amount,
      totalDelta: -input.amount,
      reservedDelta: 0,
      balanceBefore: account.availableBalance,
      balanceAfter: account.availableBalance - input.amount,
      availableBefore: account.availableBalance,
      availableAfter: account.availableBalance - input.amount,
      reservedBefore: account.reservedBalance,
      reservedAfter: account.reservedBalance,
      spentBefore: account.spentBalance,
      spentAfter: account.spentBalance + input.amount,
      referenceType: 'ProviderParticipation',
      referenceId: input.participationId,
      reason: '25 credits definitief afgeschreven voor aankoop van een opdracht.',
      idempotencyKey,
      createdByUserId: input.actorUserId,
    },
  })
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
  await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${reservation.creditAccountId}::uuid FOR UPDATE`
  const account = await transaction.creditAccount.findUniqueOrThrow({ where: { id: reservation.creditAccountId } })
  if (account.reservedBalance < reservation.amount) throw new MarketplaceServiceError('CONFLICT')
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: reservation.creditAccountId,
      type: 'CONSUMPTION',
      amount: -reservation.amount,
      totalDelta: -reservation.amount,
      reservedDelta: -reservation.amount,
      balanceBefore: account.availableBalance,
      balanceAfter: account.availableBalance,
      availableBefore: account.availableBalance,
      availableAfter: account.availableBalance,
      reservedBefore: account.reservedBalance,
      reservedAfter: account.reservedBalance - reservation.amount,
      spentBefore: account.spentBalance,
      spentAfter: account.spentBalance + reservation.amount,
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
  await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${reservation.creditAccountId}::uuid FOR UPDATE`
  const account = await transaction.creditAccount.findUniqueOrThrow({ where: { id: reservation.creditAccountId } })
  if (account.reservedBalance < reservation.amount) throw new MarketplaceServiceError('CONFLICT')
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: reservation.creditAccountId,
      type: 'RESERVATION_RELEASE',
      amount: reservation.amount,
      totalDelta: 0,
      reservedDelta: -reservation.amount,
      balanceBefore: account.availableBalance,
      balanceAfter: account.availableBalance + reservation.amount,
      availableBefore: account.availableBalance,
      availableAfter: account.availableBalance + reservation.amount,
      reservedBefore: account.reservedBalance,
      reservedAfter: account.reservedBalance - reservation.amount,
      spentBefore: account.spentBalance,
      spentAfter: account.spentBalance,
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
      where: {
        id: input.providerOrganizationId,
        status: 'ACTIVE',
        organizationType: { in: ['PROVIDER', 'BOTH'] },
        systemKey: null,
        memberships: {
          some: {
            status: 'ACTIVE',
            user: { status: 'ACTIVE', accountType: 'PROFESSIONAL' },
          },
        },
      },
      select: { id: true },
    })
    if (!organization) throw new MarketplaceServiceError('NOT_FOUND')
    const account = await transaction.creditAccount.upsert({
      where: { organizationId: organization.id },
      create: { organizationId: organization.id },
      update: {},
    })
    await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${account.id}::uuid FOR UPDATE`
    const current = await transaction.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
    const ledger = await transaction.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        type: 'ADMIN_GRANT',
        amount: input.amount,
        totalDelta: input.amount,
        reservedDelta: 0,
        balanceBefore: current.availableBalance,
        balanceAfter: current.availableBalance + input.amount,
        availableBefore: current.availableBalance,
        availableAfter: current.availableBalance + input.amount,
        reservedBefore: current.reservedBalance,
        reservedAfter: current.reservedBalance,
        spentBefore: current.spentBalance,
        spentAfter: current.spentBalance,
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
      metadata: { amount: input.amount, availableAfter: current.availableBalance + input.amount },
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
    await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${account.id}::uuid FOR UPDATE`
    const totals = await transaction.creditAccount.findUniqueOrThrow({ where: { id: account.id } })
    if (input.amount < 0 && totals.availableBalance < Math.abs(input.amount)) {
      throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
    }
    const ledger = await transaction.creditTransaction.create({
      data: {
        creditAccountId: account.id,
        type: 'ADMIN_CORRECTION',
        amount: input.amount,
        totalDelta: input.amount,
        reservedDelta: 0,
        balanceBefore: totals.availableBalance,
        balanceAfter: totals.availableBalance + input.amount,
        availableBefore: totals.availableBalance,
        availableAfter: totals.availableBalance + input.amount,
        reservedBefore: totals.reservedBalance,
        reservedAfter: totals.reservedBalance,
        spentBefore: totals.spentBalance,
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
      metadata: { amount: input.amount, availableAfter: totals.availableBalance + input.amount },
    })
    return ledger
  }, { isolationLevel: 'Serializable' })
}

export async function getProviderCreditOverview(userId: string, providerOrganizationId: string) {
  return getProfessionalCreditWallet({
    actorUserId: userId,
    organizationId: providerOrganizationId,
  })
}
