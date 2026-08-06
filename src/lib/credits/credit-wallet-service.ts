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
