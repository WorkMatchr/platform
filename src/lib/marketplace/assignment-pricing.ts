import { z } from 'zod'
import { expertiseSpecialismSlugs } from '@/lib/requests/expertise-specialism-reference'
import { requestedExpertiseOptions } from '@/lib/requests/simple-advice-contract'

export const pricingExpertises = requestedExpertiseOptions.map(option => ({
  code: expertiseSpecialismSlugs[option.value], label: option.label,
}))
export const expertiseCodeSchema = z.enum(Object.values(expertiseSpecialismSlugs))
export const expertiseAdjustmentsSchema = z.record(expertiseCodeSchema, z.number().int().min(-100_000).max(100_000))
export const zeroExpertiseAdjustments = Object.fromEntries(pricingExpertises.map(({ code }) => [code, 0]))
export const priceSnapshotSchema = z.object({
  marketplaceRuleSetId: z.uuid(), ruleSetVersion: z.string().min(1),
  basePrice: z.number().int().positive(), minimumPrice: z.number().int().positive(),
  primaryExpertiseCode: expertiseCodeSchema, expertiseAdjustment: z.number().int(),
  resolvedPrice: z.number().int().positive(), resolvedAt: z.iso.datetime(),
}).refine(p => p.resolvedPrice === Math.max(p.minimumPrice, p.basePrice + p.expertiseAdjustment))
export type AssignmentPriceSnapshot = z.infer<typeof priceSnapshotSchema>

export function resolveAssignmentPrice(rule: {
  id: string; version: string; participationPriceCredits: number; minimumParticipationPrice: number;
  expertiseAdjustments: unknown;
}, primaryExpertiseCode: string, now: Date): AssignmentPriceSnapshot {
  const code = expertiseCodeSchema.parse(primaryExpertiseCode)
  // Historic rules have no adjustments. They retain their original base/minimum.
  const stored = z.record(z.string(), z.unknown()).parse(rule.expertiseAdjustments)
  const adjustments = expertiseAdjustmentsSchema.parse({ ...zeroExpertiseAdjustments, ...stored })
  return priceSnapshotSchema.parse({
    marketplaceRuleSetId: rule.id, ruleSetVersion: rule.version,
    basePrice: rule.participationPriceCredits, minimumPrice: rule.minimumParticipationPrice,
    primaryExpertiseCode: code, expertiseAdjustment: adjustments[code],
    resolvedPrice: Math.max(rule.minimumParticipationPrice, rule.participationPriceCredits + adjustments[code]),
    resolvedAt: now.toISOString(),
  })
}

export function readInvitationPrice(invitation: { snapshot: unknown; creditCost: number }) {
  const record = z.record(z.string(), z.unknown()).parse(invitation.snapshot)
  if ('priceSnapshot' in record) {
    const price = priceSnapshotSchema.parse(record.priceSnapshot)
    if (price.resolvedPrice !== invitation.creditCost) throw new Error('INVITATION_PRICE_MISMATCH')
    return { credits: price.resolvedPrice, marketplaceRuleSetId: price.marketplaceRuleSetId, priceSnapshot: price }
  }
  // Explicit legacy policy: honour the invitation's stored amount, never today's rules.
  const credits = z.number().int().positive().parse(invitation.creditCost)
  return { credits, marketplaceRuleSetId: null, priceSnapshot: null }
}
