import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { marketplaceRuleSetInputSchema } from './marketplace-rules-contract'

export {
  calculateWithdrawalRefund,
  INITIAL_MARKETPLACE_RULES,
  marketplaceRuleSetInputSchema,
} from './marketplace-rules-contract'
export type { MarketplaceRuleSetInput } from './marketplace-rules-contract'

type Transaction = Prisma.TransactionClient

export class MarketplaceRuleSetError extends Error {
  constructor(
    public readonly code:
      | 'NOT_CONFIGURED'
      | 'ACCESS_DENIED'
      | 'VALIDATION_ERROR'
      | 'CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'MarketplaceRuleSetError'
  }
}

export async function getApplicableMarketplaceRuleSet(
  transaction: Transaction,
  at: Date,
) {
  const ruleSet = await transaction.marketplaceRuleSet.findFirst({
    where: {
      status: 'PUBLISHED',
      validFrom: { lte: at },
      OR: [{ validUntil: null }, { validUntil: { gt: at } }],
    },
    orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
  })
  if (!ruleSet) {
    throw new MarketplaceRuleSetError(
      'NOT_CONFIGURED',
      'De bedrijfsregels voor de marktplaats zijn niet beschikbaar.',
    )
  }
  return ruleSet
}

export async function getCurrentMarketplaceRuleSet(at = new Date()) {
  return getPrisma().$transaction((transaction) =>
    getApplicableMarketplaceRuleSet(transaction, at),
  )
}

export async function listMarketplaceRuleSets(actorUserId: string) {
  const { getPlatformAdministratorContext } = await import(
    '@/lib/platform-admin/platform-admin-authorization'
  )
  await getPlatformAdministratorContext(actorUserId)
  return getPrisma().marketplaceRuleSet.findMany({
    orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    include: {
      createdByUser: { select: { displayName: true, email: true } },
    },
  })
}

async function requireRuleManager(actorUserId: string) {
  const { getPlatformAdministratorContext } = await import(
    '@/lib/platform-admin/platform-admin-authorization'
  )
  const context = await getPlatformAdministratorContext(actorUserId)
  if (!['OWNER', 'ADMIN'].includes(context.platformMembership.role)) {
    throw new MarketplaceRuleSetError(
      'ACCESS_DENIED',
      'U mag de bedrijfsregels alleen bekijken.',
    )
  }
  return context
}

export async function createMarketplaceRuleSet(input: {
  actorUserId: string
  values: unknown
}) {
  await requireRuleManager(input.actorUserId)
  const parsed = marketplaceRuleSetInputSchema.safeParse(input.values)
  if (!parsed.success) {
    throw new MarketplaceRuleSetError(
      'VALIDATION_ERROR',
      'Controleer de nieuwe bedrijfsregels.',
    )
  }

  try {
    return await getPrisma().$transaction(
      async (transaction) => {
        const existing = await transaction.marketplaceRuleSet.findFirst({
          where: {
            OR: [
              { version: parsed.data.version },
              { status: 'PUBLISHED', validFrom: parsed.data.validFrom },
            ],
          },
          select: { id: true },
        })
        if (existing) {
          throw new MarketplaceRuleSetError(
            'CONFLICT',
            'Voor deze versie of ingangsdatum bestaat al een regelset.',
          )
        }

        const created = await transaction.marketplaceRuleSet.create({
          data: {
            version: parsed.data.version,
            validFrom: parsed.data.validFrom,
            participationPriceCredits: parsed.data.participationPriceCredits,
            minimumParticipationPrice: parsed.data.minimumParticipationPrice,
            withdrawalRefundPercentage: parsed.data.withdrawalRefundPercentage,
            roundRefundUp: parsed.data.roundRefundUp,
            unawardedQuoteRefundCredits: parsed.data.unawardedQuoteRefundCredits,
            maximumParticipants: parsed.data.maximumParticipants,
            withdrawalThreshold: parsed.data.withdrawalThreshold,
            withdrawalWindowMonths: parsed.data.withdrawalWindowMonths,
            reliabilitySignalsEnabled: parsed.data.reliabilitySignalsEnabled,
            changeReason: parsed.data.changeReason,
            status: 'PUBLISHED',
            createdByUserId: input.actorUserId,
          },
        })
        await transaction.marketplaceAuditEvent.create({
          data: {
            actorUserId: input.actorUserId,
            actorRole: 'PLATFORM_RULE_MANAGER',
            action: 'MARKETPLACE_RULE_SET_PUBLISHED',
            entityType: 'MarketplaceRuleSet',
            entityId: created.id,
            reason: created.changeReason,
            correlationKey: `marketplace-rules:${created.id}`,
            metadata: {
              version: created.version,
              validFrom: created.validFrom.toISOString(),
            },
          },
        })
        return created
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (error) {
    if (error instanceof MarketplaceRuleSetError) throw error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      throw new MarketplaceRuleSetError(
        'CONFLICT',
        'De regelset is intussen al toegevoegd.',
      )
    }
    throw error
  }
}
