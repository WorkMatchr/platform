import { z } from 'zod'

export const INITIAL_MARKETPLACE_RULES = Object.freeze({
  participationPriceCredits: 30,
  minimumParticipationPrice: 30,
  withdrawalRefundPercentage: 75,
  roundRefundUp: true,
  unawardedQuoteRefundCredits: 5,
  maximumParticipants: 3,
  withdrawalThreshold: 3,
  withdrawalWindowMonths: 12,
  reliabilitySignalsEnabled: true,
})

export const marketplaceRuleSetInputSchema = z
  .object({
    version: z.string().trim().min(3).max(40).regex(/^[0-9A-Za-z._-]+$/),
    validFrom: z.coerce.date(),
    participationPriceCredits: z.number().int().min(30).max(100_000),
    minimumParticipationPrice: z.number().int().min(30).max(100_000),
    withdrawalRefundPercentage: z.number().int().min(0).max(100),
    roundRefundUp: z.boolean(),
    unawardedQuoteRefundCredits: z.number().int().min(0).max(100_000),
    maximumParticipants: z.number().int().min(1).max(100),
    withdrawalThreshold: z.number().int().min(1).max(100),
    withdrawalWindowMonths: z.number().int().min(1).max(120),
    reliabilitySignalsEnabled: z.boolean(),
    changeReason: z.string().trim().min(10).max(500),
    confirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.participationPriceCredits < value.minimumParticipationPrice) {
      context.addIssue({
        code: 'custom',
        path: ['participationPriceCredits'],
        message: 'De deelnameprijs mag niet lager zijn dan de minimumprijs.',
      })
    }
  })

export type MarketplaceRuleSetInput = z.infer<typeof marketplaceRuleSetInputSchema>

export function calculateWithdrawalRefund(
  paidCredits: number,
  percentage: number,
  roundUp: boolean,
) {
  if (!Number.isSafeInteger(paidCredits) || paidCredits < 0) {
    throw new Error('Het creditbedrag is ongeldig.')
  }
  const raw = (paidCredits * percentage) / 100
  return roundUp ? Math.ceil(raw) : Math.round(raw)
}
