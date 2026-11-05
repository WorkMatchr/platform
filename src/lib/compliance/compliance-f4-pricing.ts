/** Product Owner decision, 2026-11-05. Publication/checkout authorization is separate. */
export const F4_PRICE_CONTRACT_VERSION = '2026-11-05.1' as const
export type F4PriceProduct = 'FIRST_SCAN' | 'FOLLOW_UP_SCAN'
export function f4Price(product: F4PriceProduct) {
  const amountExclVatCents = product === 'FIRST_SCAN' ? 2495 : product === 'FOLLOW_UP_SCAN' ? 1495 : null
  if (amountExclVatCents === null) throw new Error('UNKNOWN_COMPLIANCE_PRODUCT')
  const vatRateBps = 2100
  const vatAmountCents = Math.round(amountExclVatCents * vatRateBps / 10000)
  return Object.freeze({ contractVersion: F4_PRICE_CONTRACT_VERSION, product, packageSku: product === 'FIRST_SCAN' ? 'COMPLIANCE_FIRST_SCAN_V1' : 'COMPLIANCE_FOLLOW_UP_V1',
    packageLabel: product === 'FIRST_SCAN' ? 'Compliance Scan - eerste scan' : 'Compliance Scan - opvolgscan', amountExclVatCents, vatRateBps, vatAmountCents,
    amountInclVatCents: amountExclVatCents + vatAmountCents, currency: 'EUR' as const })
}
export function selectF4Price(product: F4PriceProduct) {
  if (product !== 'FIRST_SCAN') throw new Error('FOLLOW_UP_ELIGIBILITY_NOT_APPROVED')
  return f4Price(product)
}
// No automatic subscription exemption, follow-up eligibility or international VAT assumption.
export const F4_PRO_ENTITLEMENT_APPROVED = false
export function formatF4Cents(cents: number) { return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(cents / 100) }
