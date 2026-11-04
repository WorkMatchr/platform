import { commerceAssert } from './academy-commerce-policy'

export type RefundAmounts = { amountInclVatCents: number; amountExclVatCents: number; vatAmountCents: number }
export const LEGAL_REFUND_ALLOCATION = 'ORIGINAL_REMAINING_HALF_UP_V1'
/** Technical proposal only; an authorized human approves the exact amounts and seats. */
export function allocateLegalRefund(original: RefundAmounts, reserved: RefundAmounts, gross: number): RefundAmounts {
  const remaining = { amountInclVatCents: original.amountInclVatCents - reserved.amountInclVatCents,
    amountExclVatCents: original.amountExclVatCents - reserved.amountExclVatCents,
    vatAmountCents: original.vatAmountCents - reserved.vatAmountCents }
  commerceAssert([original.amountInclVatCents, original.amountExclVatCents, original.vatAmountCents, reserved.amountInclVatCents, reserved.amountExclVatCents, reserved.vatAmountCents, ...Object.values(remaining), gross].every(n => Number.isSafeInteger(n) && n >= 0)
    && original.amountInclVatCents === original.amountExclVatCents + original.vatAmountCents
    && reserved.amountInclVatCents === reserved.amountExclVatCents + reserved.vatAmountCents
    && gross > 0 && gross <= remaining.amountInclVatCents, 'ACADEMY_REFUND_CAP_EXCEEDED')
  const numerator = BigInt(gross) * BigInt(remaining.amountExclVatCents), denominator = BigInt(remaining.amountInclVatCents)
  const net = Number((BigInt(2) * numerator + denominator) / (BigInt(2) * denominator))
  return { amountInclVatCents: gross, amountExclVatCents: net, vatAmountCents: gross - net }
}
