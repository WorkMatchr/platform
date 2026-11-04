import { commerceAssert } from './academy-commerce-policy'
/** Original per-seat allocation; current catalogue prices never enter this calculation. */
export function academyTransferPrice(originalDiscountCents: number, alreadyPaidCents: number, equivalentBenefit: boolean, vatRateBps: number) {
  commerceAssert([originalDiscountCents,alreadyPaidCents,vatRateBps].every(Number.isSafeInteger) && originalDiscountCents >= 0 && alreadyPaidCents >= 0 && alreadyPaidCents <= originalDiscountCents && [0,900,2100].includes(vatRateBps), 'ACADEMY_TRANSFER_SNAPSHOT_INVALID')
  const amountInclVatCents = equivalentBenefit ? 0 : originalDiscountCents - alreadyPaidCents
  const amountExclVatCents = Math.round(amountInclVatCents * 10000 / (10000 + vatRateBps))
  return { amountInclVatCents, amountExclVatCents, vatAmountCents: amountInclVatCents - amountExclVatCents, vatRateBps }
}
