import { z } from 'zod'
import type { CreditTransactionType, Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { deriveCreditBalance } from '@/lib/credits/credit-ledger-contract'
import { getPlatformAdministratorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { requireMarketplacePlatformAdmin } from './marketplace-authorization'
import { MarketplaceServiceError } from './marketplace-errors'
import { writeMarketplaceAudit } from './marketplace-events'

type Transaction = Prisma.TransactionClient

export const manualCreditReasonCodes = [
  'TECHNICAL_COMPENSATION',
  'CUSTOMER_SERVICE_CORRECTION',
  'COMMERCIAL_GESTURE',
  'SPONSORSHIP',
  'PROMOTION',
  'CORRECTION_OF_PREVIOUS_TRANSACTION',
  'CONTRIBUTION_BONUS',
  'OTHER',
] as const

export type ManualCreditReasonCode = (typeof manualCreditReasonCodes)[number]

export const manualCreditMutationSchema = z
  .object({
    providerOrganizationId: z.string().uuid(),
    amount: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0),
    reasonCode: z.enum(manualCreditReasonCodes),
    explanation: z.string().trim().min(10).max(1000),
    reference: z.string().trim().max(200).optional(),
    reversalOfTransactionId: z.string().uuid().optional(),
    idempotencyKey: z.string().min(12).max(120).regex(/^[A-Za-z0-9:_-]+$/),
    confirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    const reversal = value.reasonCode === 'CORRECTION_OF_PREVIOUS_TRANSACTION'
    if (reversal !== Boolean(value.reversalOfTransactionId)) {
      context.addIssue({
        code: 'custom',
        path: ['reversalOfTransactionId'],
        message: 'Kies de oorspronkelijke transactie die u wilt tegenboeken.',
      })
    }
    if (value.reasonCode === 'OTHER' && value.explanation.trim().length < 20) {
      context.addIssue({
        code: 'custom',
        path: ['explanation'],
        message: 'Licht deze andere reden toe in minimaal 20 tekens.',
      })
    }
  })

const transactionTypeByReason: Record<
  Exclude<ManualCreditReasonCode, 'CORRECTION_OF_PREVIOUS_TRANSACTION'>,
  CreditTransactionType
> = {
  TECHNICAL_COMPENSATION: 'MANUAL_COMPENSATION',
  CUSTOMER_SERVICE_CORRECTION: 'ADMIN_CORRECTION',
  COMMERCIAL_GESTURE: 'COMMERCIAL_GESTURE',
  SPONSORSHIP: 'SPONSORSHIP',
  PROMOTION: 'PROMOTION',
  CONTRIBUTION_BONUS: 'CONTRIBUTION_BONUS',
  OTHER: 'OTHER',
}

async function requireProviderOrganization(
  transaction: Transaction,
  organizationId: string,
) {
  const organization = await transaction.organization.findFirst({
    where: {
      id: organizationId,
      organizationType: { in: ['PROVIDER', 'BOTH'] },
      systemKey: null,
      memberships: {
        some: {
          status: 'ACTIVE',
          user: { status: 'ACTIVE', accountType: 'PROFESSIONAL' },
        },
      },
    },
    select: { id: true, name: true },
  })
  if (!organization) throw new MarketplaceServiceError('NOT_FOUND')
  return organization
}

async function lockAndValidateAvailableBalanceMutation(
  transaction: Transaction,
  input: {
    account: {
      id: string
      version: number
      balance: number
      availableBalance: number
      reservedBalance: number
      spentBalance: number
    }
    amount: number
  },
) {
  await transaction.$queryRaw`SELECT "id" FROM "CreditAccount" WHERE "id" = ${input.account.id}::uuid FOR UPDATE`
  const current = await transaction.creditAccount.findUniqueOrThrow({
    where: { id: input.account.id },
  })
  if (input.amount < 0 && current.availableBalance < Math.abs(input.amount)) {
    throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
  }
  return current
}

export async function mutateMarketplaceCredits(input: {
  actorUserId: string
  values: unknown
}) {
  const parsed = manualCreditMutationSchema.safeParse(input.values)
  if (!parsed.success) throw new MarketplaceServiceError('VALIDATION_ERROR')
  const values = parsed.data

  return getPrisma().$transaction(
    async (transaction) => {
      const repeated = await transaction.creditTransaction.findUnique({
        where: { idempotencyKey: values.idempotencyKey },
      })
      if (repeated) return repeated

      await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
      await requireProviderOrganization(transaction, values.providerOrganizationId)
      let account = await transaction.creditAccount.findUnique({
        where: { organizationId: values.providerOrganizationId },
      })
      if (!account) {
        if (values.amount < 0 || values.reversalOfTransactionId) {
          throw new MarketplaceServiceError('INSUFFICIENT_CREDITS')
        }
        account = await transaction.creditAccount.create({
          data: { organizationId: values.providerOrganizationId },
        })
      }

      let amount = values.amount
      let type: CreditTransactionType
      let reversalOfTransactionId: string | undefined
      if (values.reasonCode === 'CORRECTION_OF_PREVIOUS_TRANSACTION') {
        const original = await transaction.creditTransaction.findFirst({
          where: {
            id: values.reversalOfTransactionId,
            creditAccountId: account.id,
            reversedBy: null,
            type: {
              in: [
                'ADMIN_GRANT',
                'ADMIN_CORRECTION',
                'MANUAL_COMPENSATION',
                'COMMERCIAL_GESTURE',
                'SPONSORSHIP',
                'PROMOTION',
                'CONTRIBUTION_BONUS',
                'OTHER',
              ],
            },
          },
          select: { id: true, amount: true },
        })
        if (!original) throw new MarketplaceServiceError('INVALID_STATE')
        amount = -original.amount
        type = 'REVERSAL'
        reversalOfTransactionId = original.id
      } else {
        type = transactionTypeByReason[values.reasonCode]
      }

      const totals = await lockAndValidateAvailableBalanceMutation(transaction, {
        account,
        amount,
      })
      const ledger = await transaction.creditTransaction.create({
        data: {
          creditAccountId: account.id,
          type,
          amount,
          totalDelta: amount,
          reservedDelta: 0,
          balanceBefore: totals.availableBalance,
          balanceAfter: totals.availableBalance + amount,
          availableBefore: totals.availableBalance,
          availableAfter: totals.availableBalance + amount,
          reservedBefore: account.reservedBalance,
          reservedAfter: totals.reservedBalance,
          spentBefore: account.spentBalance,
          spentAfter: totals.spentBalance,
          reason: values.reasonCode,
          description: values.explanation,
          referenceType: values.reference ? 'ADMIN_REFERENCE' : null,
          referenceId: null,
          reversalOfTransactionId,
          idempotencyKey: values.idempotencyKey,
          createdByUserId: input.actorUserId,
        },
      })
      await writeMarketplaceAudit(transaction, {
        actorUserId: input.actorUserId,
        actorRole: 'PLATFORM_CREDIT_MANAGER',
        organizationId: values.providerOrganizationId,
        action: type === 'REVERSAL' ? 'CREDIT_TRANSACTION_REVERSED' : 'CREDITS_MANUALLY_MUTATED',
        entityType: 'CreditTransaction',
        entityId: ledger.id,
        reason: values.explanation,
        correlationKey: `manual-credit:${values.idempotencyKey}`,
        metadata: {
          reasonCode: values.reasonCode,
          amount,
          availableBefore: totals.availableBalance,
          availableAfter: totals.availableBalance + amount,
          reference: values.reference ?? null,
          reversalOfTransactionId: reversalOfTransactionId ?? null,
        },
      })
      return ledger
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function getPlatformProviderCreditOverview(input: {
  actorUserId: string
  providerOrganizationId: string
}) {
  await getPlatformAdministratorContext(input.actorUserId)
  const organization = await getPrisma().organization.findFirst({
    where: {
      id: input.providerOrganizationId,
      organizationType: { in: ['PROVIDER', 'BOTH'] },
      systemKey: null,
    },
    select: {
      id: true,
      name: true,
      creditAccount: {
        select: {
          id: true,
          availableBalance: true,
          reservedBalance: true,
          spentBalance: true,
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
              createdByUser: { select: { displayName: true, email: true } },
            },
          },
        },
      },
    },
  })
  if (!organization?.creditAccount) return organization
  const balance = deriveCreditBalance(organization.creditAccount.transactions)
  return {
    ...organization,
    creditAccount: {
      ...organization.creditAccount,
      ...balance,
    },
  }
}
