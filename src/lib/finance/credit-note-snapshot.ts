import type { Prisma } from '@/generated/prisma/client'

type Source = Prisma.FinancialInvoiceGetPayload<{ include: { lines: true; vatSummaries: true } }>

/** No v1 inference: fiscal fields must already exist in the immutable source. */
export function mirrorCreditNoteSnapshot(original: Source) {
  if (original.snapshotVersion !== 2 || original.documentType !== 'INVOICE') throw new Error('CREDIT_NOTE_V2_SOURCE_REQUIRED')
  const fail = () => { throw new Error('CREDIT_NOTE_SOURCE_INCONSISTENT') }
  if (!original.supplyDate || original.currency !== 'EUR' || !original.lines.length || !original.vatSummaries.length) fail()
  const amounts = [original.baseAmountCents, original.packageDiscountCents, original.proDiscountCents,
    original.discountCodeDiscountCents, original.amountExclVatCents, original.vatAmountCents, original.amountInclVatCents]
  if (amounts.some(value => !Number.isSafeInteger(value) || value < 0)
    || original.amountExclVatCents + original.vatAmountCents !== original.amountInclVatCents) fail()
  const totals = { net: 0, vat: 0, total: 0, discount: 0, gross: 0 }
  const groups = new Map<number, { net: number; vat: number; total: number }>()
  const positions = new Set<number>()
  const lines = original.lines.map(line => {
    if (positions.has(line.position) || line.position < 1 || !line.description.trim() || !line.unit.trim()
      || !Number.isSafeInteger(line.quantity) || line.quantity < 1
      || [line.unitPriceExclVatCents, line.grossAmountExclVatCents, line.discountAmountCents,
        line.netAmountExclVatCents, line.vatAmountCents, line.amountInclVatCents, line.vatRateBps].some(value => !Number.isSafeInteger(value) || value < 0)
      || line.vatRateBps > 10000 || line.grossAmountExclVatCents !== line.quantity * line.unitPriceExclVatCents
      || line.netAmountExclVatCents !== line.grossAmountExclVatCents - line.discountAmountCents
      || line.amountInclVatCents !== line.netAmountExclVatCents + line.vatAmountCents) fail()
    positions.add(line.position)
    totals.net += line.netAmountExclVatCents; totals.vat += line.vatAmountCents
    totals.total += line.amountInclVatCents; totals.discount += line.discountAmountCents; totals.gross += line.grossAmountExclVatCents
    const group = groups.get(line.vatRateBps) ?? { net: 0, vat: 0, total: 0 }
    group.net += line.netAmountExclVatCents; group.vat += line.vatAmountCents; group.total += line.amountInclVatCents
    groups.set(line.vatRateBps, group)
    return { position: line.position, description: line.description, quantity: line.quantity, unit: line.unit,
      unitPriceExclVatCents: -line.unitPriceExclVatCents, grossAmountExclVatCents: -line.grossAmountExclVatCents,
      discountAmountCents: -line.discountAmountCents, netAmountExclVatCents: -line.netAmountExclVatCents,
      vatRateBps: line.vatRateBps, vatAmountCents: -line.vatAmountCents, amountInclVatCents: -line.amountInclVatCents,
      servicePeriodStart: line.servicePeriodStart, servicePeriodEnd: line.servicePeriodEnd }
  })
  if (totals.net !== original.amountExclVatCents || totals.vat !== original.vatAmountCents
    || totals.total !== original.amountInclVatCents || totals.gross !== original.baseAmountCents
    || totals.discount !== original.packageDiscountCents + original.proDiscountCents + original.discountCodeDiscountCents
    || groups.size !== original.vatSummaries.length) fail()
  const vatSummaries = original.vatSummaries.map(summary => {
    const group = groups.get(summary.vatRateBps)
    if (!group || group.net !== summary.taxableAmountExclVatCents || group.vat !== summary.vatAmountCents || group.total !== summary.amountInclVatCents) fail()
    groups.delete(summary.vatRateBps)
    return { vatRateBps: summary.vatRateBps, taxableAmountExclVatCents: -summary.taxableAmountExclVatCents,
      vatAmountCents: -summary.vatAmountCents, amountInclVatCents: -summary.amountInclVatCents }
  })
  return { lines, vatSummaries }
}
