import 'server-only'

import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { creditPackageCatalog } from './financial-contract'

const packageSkus = creditPackageCatalog.map((item) => item.sku)

export const discountCodeInputSchema = z.object({
  actorUserId: z.string().uuid(),
  code: z.string().trim().toUpperCase().min(2).max(40).regex(/^[A-Z0-9_-]+$/),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  maximumUses: z.number().int().positive().optional(),
  oncePerOrganization: z.boolean().default(false),
  newCustomersOnly: z.boolean().default(false),
  applicablePackageSkus: z.array(z.enum(packageSkus as [typeof packageSkus[number], ...typeof packageSkus])).default([]),
  minimumAmountCents: z.number().int().nonnegative().optional(),
  percentageBps: z.number().int().min(1).max(10_000).optional(),
  fixedAmountCents: z.number().int().positive().optional(),
  bonusCredits: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (value.validUntil && value.validUntil <= value.validFrom) context.addIssue({ code: 'custom', path: ['validUntil'], message: 'De einddatum moet na de startdatum liggen.' })
  if ([value.percentageBps !== undefined, value.fixedAmountCents !== undefined, value.bonusCredits !== undefined].filter(Boolean).length !== 1) {
    context.addIssue({ code: 'custom', path: ['percentageBps'], message: 'Kies precies één kortingsvorm.' })
  }
})

export async function createDiscountCode(input: unknown) {
  const values = discountCodeInputSchema.parse(input)
  return getPrisma().$transaction(async (transaction) => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    const code = await transaction.discountCode.create({
      data: {
        code: values.code,
        validFrom: values.validFrom,
        validUntil: values.validUntil,
        maximumUses: values.maximumUses,
        oncePerOrganization: values.oncePerOrganization,
        newCustomersOnly: values.newCustomersOnly,
        applicablePackageSkus: values.applicablePackageSkus,
        minimumAmountCents: values.minimumAmountCents,
        percentageBps: values.percentageBps,
        fixedAmountCents: values.fixedAmountCents,
        bonusCredits: values.bonusCredits ?? 0,
        createdByUserId: values.actorUserId,
      },
    })
    await transaction.financialEvent.create({
      data: {
        actorUserId: values.actorUserId,
        eventType: 'DISCOUNT_CODE_CREATED',
        result: 'SUCCEEDED',
        idempotencyKey: `discount-code-created:${code.id}`,
        metadata: { discountCodeId: code.id, code: code.code },
      },
    })
    return code
  })
}

export async function setDiscountCodeStatus(input: {
  actorUserId: string
  discountCodeId: string
  status: 'ACTIVE' | 'BLOCKED' | 'EXPIRED'
  reason: string
}) {
  return getPrisma().$transaction(async (transaction) => {
    await requireMarketplacePlatformAdmin(transaction, input.actorUserId)
    const current = await transaction.discountCode.findUniqueOrThrow({ where: { id: input.discountCodeId } })
    const updated = await transaction.discountCode.update({ where: { id: current.id }, data: { status: input.status } })
    await transaction.financialEvent.create({
      data: {
        actorUserId: input.actorUserId,
        eventType: 'DISCOUNT_CODE_STATUS_CHANGED',
        result: 'SUCCEEDED',
        reason: input.reason.trim().slice(0, 500),
        idempotencyKey: `discount-code-status:${current.id}:${current.status}:${input.status}`,
        metadata: { discountCodeId: current.id, previousStatus: current.status, nextStatus: input.status },
      },
    })
    return updated
  })
}
