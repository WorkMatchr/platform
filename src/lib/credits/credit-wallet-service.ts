import { Prisma } from '@/generated/prisma/client'
import type { CreditTransactionType } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  requireMarketplacePlatformAdmin,
  requireProviderMarketplaceAccess,
} from '@/lib/marketplace/marketplace-authorization'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'
import { writeMarketplaceAudit } from '@/lib/marketplace/marketplace-events'
import {
  creditMutationInputSchema,
  deriveCreditBalance,
  getCreditLedgerDelta,
  type CreditLedgerMutationType,
  type CreditMutationInput,
} from './credit-ledger-contract'

type Transaction = Prisma.TransactionClient

const platformMutationTypes = new Set<CreditLedgerMutationType>([
  'PURCHASE',
  'REFUND',
  'CONTRIBUTION_BONUS',
  'ADMIN_CORRECTION',
])

async function requireProfessionalOrganization(
  transaction: Transaction,
  organizationId: string,
) {
  const organization = await transaction.organization.findFirst({
    where: {
      id: organizationId,
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
  if (!organization) throw new MarketplaceServiceError('ACCESS_DENIED')
  return organization
}

async function lockIdempotencyKey(
  transaction: Transaction,
  idempotencyKey: string,
) {
  await transaction.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`credit:${idempotencyKey}`}, 0))::text AS "lock"`,
  )
}

async function ensureAndLockWallet(
  transaction: Transaction,
  organizationId: string,
) {
  await transaction.$queryRaw(
    Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`wallet:${organizationId}`}, 0))::text AS "lock"`,
  )
  await requireProfessionalOrganization(transaction, organizationId)
  const existing = await transaction.creditAccount.findUnique({ where: { organizationId } })
  const wallet = existing ?? await transaction.creditAccount.create({ data: { organizationId } })
  await transaction.$queryRaw(
    Prisma.sql`SELECT "id" FROM "CreditAccount" WHERE "id" = ${wallet.id}::uuid FOR UPDATE`,
  )
  return wallet
}

async function deriveWalletBalance(
  transaction: Transaction,
  creditAccountId: string,
) {
  const entries = await transaction.creditTransaction.findMany({
    where: { creditAccountId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { totalDelta: true, reservedDelta: true },
  })
  return deriveCreditBalance(entries)
}

function isEquivalentReplay(
  existing: {
    creditAccountId: string
    type: CreditTransactionType
    totalDelta: number
    reservedDelta: number
    referenceType: string | null
    referenceId: string | null
  },
  expected: {
    creditAccountId: string
    type: CreditLedgerMutationType
    totalDelta: number
    reservedDelta: number
    referenceType?: string
    referenceId?: string
  },
) {
  return existing.creditAccountId === expected.creditAccountId
    && existing.type === expected.type
    && existing.totalDelta === expected.totalDelta
    && existing.reservedDelta === expected.reservedDelta
    && existing.referenceType === (expected.referenceType ?? null)
    && existing.referenceId === (expected.referenceId ?? null)
}

async function authorizeMutation(
  transaction: Transaction,
  values: CreditMutationInput,
) {
  if (platformMutationTypes.has(values.type)) {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    return 'PLATFORM_CREDIT_MANAGER'
  }
  await requireProviderMarketplaceAccess(
    transaction,
    values.actorUserId,
    values.organizationId,
    true,
  )
  return 'PROFESSIONAL_CREDIT_ACTOR'
}

export async function recordProfessionalCreditMutation(input: unknown) {
  const parsed = creditMutationInputSchema.safeParse(input)
  if (!parsed.success) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const values = parsed.data
  const delta = getCreditLedgerDelta(values.type, values.amount)

  return getPrisma().$transaction(async (transaction) => {
    await lockIdempotencyKey(transaction, values.idempotencyKey)
    const actorRole = await authorizeMutation(transaction, values)
    const wallet = await ensureAndLockWallet(transaction, values.organizationId)
    const repeated = await transaction.creditTransaction.findUnique({
      where: { idempotencyKey: values.idempotencyKey },
      select: {
        id: true,
        creditAccountId: true,
        type: true,
        totalDelta: true,
        reservedDelta: true,
        referenceType: true,
        referenceId: true,
      },
    })
    if (repeated) {
      if (!isEquivalentReplay(repeated, {
        creditAccountId: wallet.id,
        type: values.type,
        ...delta,
        referenceType: values.referenceType,
        referenceId: values.referenceId,
      })) throw new MarketplaceServiceError('CONFLICT')
      return { transaction: repeated, balance: await deriveWalletBalance(transaction, wallet.id), idempotent: true }
    }

    const before = await deriveWalletBalance(transaction, wallet.id)
    const after = deriveCreditBalance([
      { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
      delta,
    ])
    const ledger = await transaction.creditTransaction.create({
      data: {
        creditAccountId: wallet.id,
        type: values.type,
        amount: delta.ledgerAmount,
        totalDelta: delta.totalDelta,
        reservedDelta: delta.reservedDelta,
        balanceBefore: before.availableBalance,
        balanceAfter: after.availableBalance,
        availableBefore: before.availableBalance,
        availableAfter: after.availableBalance,
        reservedBefore: before.reservedBalance,
        reservedAfter: after.reservedBalance,
        reason: values.reason,
        referenceType: values.referenceType,
        referenceId: values.referenceId,
        idempotencyKey: values.idempotencyKey,
        createdByUserId: values.actorUserId,
        auditMetadata: {
          schemaVersion: 1,
          ...(values.auditMetadata ?? {}),
        },
      },
    })
    await writeMarketplaceAudit(transaction, {
      actorUserId: values.actorUserId,
      actorRole,
      organizationId: values.organizationId,
      action: 'CREDIT_LEDGER_MUTATION_RECORDED',
      entityType: 'CreditTransaction',
      entityId: ledger.id,
      reason: values.reason,
      correlationKey: `credit-ledger:${values.idempotencyKey}`,
      metadata: {
        type: values.type,
        totalDelta: delta.totalDelta,
        reservedDelta: delta.reservedDelta,
        referenceType: values.referenceType ?? null,
        referenceId: values.referenceId ?? null,
        totalAfter: after.totalBalance,
        reservedAfter: after.reservedBalance,
        availableAfter: after.availableBalance,
      },
    })
    return { transaction: ledger, balance: after, idempotent: false }
  }, { isolationLevel: 'Serializable' })
}

export async function getProfessionalCreditWallet(input: {
  actorUserId: string
  organizationId: string
}) {
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderMarketplaceAccess(
      transaction,
      input.actorUserId,
      input.organizationId,
    )
    const wallet = await transaction.creditAccount.findUnique({
      where: { organizationId: input.organizationId },
      select: {
        id: true,
        transactions: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
          select: {
            id: true,
            type: true,
            amount: true,
            totalDelta: true,
            reservedDelta: true,
            reason: true,
            referenceType: true,
            referenceId: true,
            createdAt: true,
          },
        },
      },
    })
    if (!wallet) return {
      walletId: null,
      totalBalance: 0,
      reservedBalance: 0,
      availableBalance: 0,
      transactions: [],
    }
    const balance = await deriveWalletBalance(transaction, wallet.id)
    return { walletId: wallet.id, ...balance, transactions: wallet.transactions }
  })
}

export async function recordVerifiedPurchaseCreditsInTransaction(
  transaction: Transaction,
  input: { purchaseId: string; idempotencyKey: string },
) {
  await lockIdempotencyKey(transaction, input.idempotencyKey)
  const purchase = await transaction.financialPurchase.findUnique({
    where: { id: input.purchaseId },
    select: {
      id: true,
      status: true,
      organizationId: true,
      credits: true,
      createdByUserId: true,
      creditedTransactionId: true,
    },
  })
  if (!purchase || purchase.status !== 'PAID') throw new MarketplaceServiceError('CONFLICT')
  if (purchase.creditedTransactionId) {
    return transaction.creditTransaction.findUniqueOrThrow({ where: { id: purchase.creditedTransactionId } })
  }
  const wallet = await ensureAndLockWallet(transaction, purchase.organizationId)
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) {
    if (repeated.referenceType !== 'FinancialPurchase' || repeated.referenceId !== purchase.id || repeated.totalDelta !== purchase.credits) {
      throw new MarketplaceServiceError('CONFLICT')
    }
    await transaction.financialPurchase.update({ where: { id: purchase.id }, data: { creditedTransactionId: repeated.id } })
    return repeated
  }
  const before = await deriveWalletBalance(transaction, wallet.id)
  const after = deriveCreditBalance([
    { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
    { totalDelta: purchase.credits, reservedDelta: 0 },
  ])
  const ledger = await transaction.creditTransaction.create({
    data: {
      creditAccountId: wallet.id,
      type: 'PURCHASE',
      amount: purchase.credits,
      totalDelta: purchase.credits,
      reservedDelta: 0,
      balanceBefore: before.availableBalance,
      balanceAfter: after.availableBalance,
      availableBefore: before.availableBalance,
      availableAfter: after.availableBalance,
      reservedBefore: before.reservedBalance,
      reservedAfter: after.reservedBalance,
      reason: 'Credits gekocht via een bevestigde Mollie-betaling.',
      referenceType: 'FinancialPurchase',
      referenceId: purchase.id,
      idempotencyKey: input.idempotencyKey,
      createdByUserId: purchase.createdByUserId,
      auditMetadata: { schemaVersion: 1, paymentVerifiedServerSide: true },
    },
  })
  await transaction.financialPurchase.update({ where: { id: purchase.id }, data: { creditedTransactionId: ledger.id } })
  await writeMarketplaceAudit(transaction, {
    actorUserId: purchase.createdByUserId,
    actorRole: 'VERIFIED_PAYMENT',
    organizationId: purchase.organizationId,
    action: 'CREDIT_PURCHASE_RECORDED',
    entityType: 'CreditTransaction',
    entityId: ledger.id,
    reason: 'Mollie-betaling server-side bevestigd.',
    correlationKey: `credit-ledger:${input.idempotencyKey}`,
    metadata: { purchaseId: purchase.id, credits: purchase.credits, availableAfter: after.availableBalance },
  })
  return ledger
}

export async function recordFinancialCreditReductionInTransaction(
  transaction: Transaction,
  input: {
    refundId: string
    organizationId: string
    actorUserId: string
    credits: number
    reason: string
    idempotencyKey: string
  },
) {
  await lockIdempotencyKey(transaction, input.idempotencyKey)
  const wallet = await ensureAndLockWallet(transaction, input.organizationId)
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) return repeated
  const before = await deriveWalletBalance(transaction, wallet.id)
  if (before.availableBalance < input.credits) throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  const after = deriveCreditBalance([
    { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
    { totalDelta: -input.credits, reservedDelta: 0 },
  ])
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: wallet.id,
      type: 'REVERSAL',
      amount: -input.credits,
      totalDelta: -input.credits,
      reservedDelta: 0,
      balanceBefore: before.availableBalance,
      balanceAfter: after.availableBalance,
      availableBefore: before.availableBalance,
      availableAfter: after.availableBalance,
      reservedBefore: before.reservedBalance,
      reservedAfter: after.reservedBalance,
      reason: input.reason,
      referenceType: 'FinancialRefund',
      referenceId: input.refundId,
      idempotencyKey: input.idempotencyKey,
      createdByUserId: input.actorUserId,
      auditMetadata: { schemaVersion: 1, financialRefund: true },
    },
  })
}

export async function recordAuthorizedBonusCreditsInTransaction(
  transaction: Transaction,
  input: {
    organizationId: string
    actorUserId: string
    credits: number
    reason: string
    referenceType: 'StarterBenefitGrant' | 'DiscountRedemption'
    referenceId: string
    idempotencyKey: string
  },
) {
  if (!Number.isSafeInteger(input.credits) || input.credits < 1) throw new MarketplaceServiceError('VALIDATION_ERROR')
  await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
  await lockIdempotencyKey(transaction, input.idempotencyKey)
  const wallet = await ensureAndLockWallet(transaction, input.organizationId)
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) {
    if (repeated.referenceType !== input.referenceType || repeated.referenceId !== input.referenceId || repeated.totalDelta !== input.credits) {
      throw new MarketplaceServiceError('CONFLICT')
    }
    return repeated
  }
  const before = await deriveWalletBalance(transaction, wallet.id)
  const after = deriveCreditBalance([
    { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
    { totalDelta: input.credits, reservedDelta: 0 },
  ])
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: wallet.id,
      type: 'CONTRIBUTION_BONUS',
      amount: input.credits,
      totalDelta: input.credits,
      reservedDelta: 0,
      balanceBefore: before.availableBalance,
      balanceAfter: after.availableBalance,
      availableBefore: before.availableBalance,
      availableAfter: after.availableBalance,
      reservedBefore: before.reservedBalance,
      reservedAfter: after.reservedBalance,
      reason: input.reason,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      idempotencyKey: input.idempotencyKey,
      createdByUserId: input.actorUserId,
      auditMetadata: { schemaVersion: 1, bonus: true },
    },
  })
}

export async function recordVerifiedDiscountBonusInTransaction(
  transaction: Transaction,
  input: { purchaseId: string; idempotencyKey: string },
) {
  await lockIdempotencyKey(transaction, input.idempotencyKey)
  const purchase = await transaction.financialPurchase.findUnique({
    where: { id: input.purchaseId },
    include: { discountRedemption: true },
  })
  const redemption = purchase?.discountRedemption
  if (!purchase || purchase.status !== 'PAID' || !redemption || redemption.bonusCredits < 1) return null
  const wallet = await ensureAndLockWallet(transaction, purchase.organizationId)
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
  if (repeated) return repeated
  const before = await deriveWalletBalance(transaction, wallet.id)
  const after = deriveCreditBalance([
    { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
    { totalDelta: redemption.bonusCredits, reservedDelta: 0 },
  ])
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: wallet.id,
      type: 'CONTRIBUTION_BONUS',
      amount: redemption.bonusCredits,
      totalDelta: redemption.bonusCredits,
      reservedDelta: 0,
      balanceBefore: before.availableBalance,
      balanceAfter: after.availableBalance,
      availableBefore: before.availableBalance,
      availableAfter: after.availableBalance,
      reservedBefore: before.reservedBalance,
      reservedAfter: after.reservedBalance,
      reason: 'Bonuscredits uit een bevestigde kortingscode.',
      referenceType: 'DiscountRedemption',
      referenceId: redemption.id,
      idempotencyKey: input.idempotencyKey,
      createdByUserId: purchase.createdByUserId,
      auditMetadata: { schemaVersion: 1, paymentVerifiedServerSide: true },
    },
  })
}

export async function recordFinancialRefundCreditPhaseInTransaction(
  transaction: Transaction,
  input: {
    refundId: string
    organizationId: string
    actorUserId: string
    credits: number
    phase: 'RESERVE' | 'COMPLETE' | 'RELEASE'
    reason: string
  },
) {
  const idempotencyKey = `financial-refund:${input.phase.toLowerCase()}:${input.refundId}`
  await lockIdempotencyKey(transaction, idempotencyKey)
  const wallet = await ensureAndLockWallet(transaction, input.organizationId)
  const repeated = await transaction.creditTransaction.findUnique({ where: { idempotencyKey } })
  if (repeated) return repeated
  const before = await deriveWalletBalance(transaction, wallet.id)
  const delta = input.phase === 'RESERVE'
    ? { totalDelta: 0, reservedDelta: input.credits, amount: -input.credits, type: 'RESERVATION' as const }
    : input.phase === 'COMPLETE'
      ? { totalDelta: -input.credits, reservedDelta: -input.credits, amount: -input.credits, type: 'CONSUMPTION' as const }
      : { totalDelta: 0, reservedDelta: -input.credits, amount: input.credits, type: 'RESERVATION_RELEASE' as const }
  const after = deriveCreditBalance([
    { totalDelta: before.totalBalance, reservedDelta: before.reservedBalance },
    delta,
  ])
  return transaction.creditTransaction.create({
    data: {
      creditAccountId: wallet.id,
      type: delta.type,
      amount: delta.amount,
      totalDelta: delta.totalDelta,
      reservedDelta: delta.reservedDelta,
      balanceBefore: before.availableBalance,
      balanceAfter: after.availableBalance,
      availableBefore: before.availableBalance,
      availableAfter: after.availableBalance,
      reservedBefore: before.reservedBalance,
      reservedAfter: after.reservedBalance,
      reason: input.reason,
      referenceType: 'FinancialRefund',
      referenceId: input.refundId,
      idempotencyKey,
      createdByUserId: input.actorUserId,
      auditMetadata: { schemaVersion: 1, financialRefundPhase: input.phase },
    },
  })
}
