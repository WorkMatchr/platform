import { z } from 'zod'
import type { MarketplaceWithdrawalReason } from '@/generated/prisma/client'

export const withdrawalReasonLabels: Record<MarketplaceWithdrawalReason, string> = {
  RESOLVED_INTERNALLY: 'Intern opgelost',
  NO_LONGER_NEEDED: 'Opdracht is niet meer nodig',
  BUDGET_CANCELLED: 'Budget is vervallen',
  PLANNING_CHANGED: 'Planning is gewijzigd',
  PLACED_INCORRECTLY: 'Opdracht is verkeerd geplaatst',
  OTHER: 'Andere reden',
}

export const withdrawPublishedRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    reason: z.enum([
      'RESOLVED_INTERNALLY',
      'NO_LONGER_NEEDED',
      'BUDGET_CANCELLED',
      'PLANNING_CHANGED',
      'PLACED_INCORRECTLY',
      'OTHER',
    ]),
    explanation: z.string().trim().max(1000).optional(),
    confirmed: z.literal(true),
  })
  .superRefine((value, context) => {
    if (value.reason === 'OTHER' && (value.explanation?.length ?? 0) < 10) {
      context.addIssue({
        code: 'custom',
        path: ['explanation'],
        message: 'Licht de andere reden toe in minimaal 10 tekens.',
      })
    }
  })

export const marketplaceContactDecisionSchema = z.object({
  contactRequestId: z.string().uuid(),
  decision: z.enum([
    'APPROVED',
    'REJECTED',
    'ADDITIONAL_INFORMATION_REQUIRED',
    'CLOSED',
  ]),
  reason: z.string().trim().min(10).max(1000),
  validUntil: z.date().nullable().optional(),
})
