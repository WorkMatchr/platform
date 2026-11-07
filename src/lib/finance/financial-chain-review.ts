import { createHash } from 'node:crypto'

export const financialReviewLabels = { OK: 'In orde', DEVIATION: 'Afwijking', INVESTIGATING: 'In onderzoek', RECOVERED: 'Hersteld' } as const
export type FinancialReviewStatus = keyof typeof financialReviewLabels
export type PaidProduct = 'PRO_SUBSCRIPTION' | 'CREDIT_PACKAGE' | 'ACADEMY_COURSE' | 'COMPLIANCE_SCAN'
type Amounts = { net: number; vat: number; gross: number; currency: string }
export type FinancialChainEvidence = {
  tenantKey: string; paymentId: string; product: PaidProduct; paidAt: string
  provider: { status: 'paid'; gross: number; currency: string }
  registrations: Array<Amounts & { id: string; paymentId: string; periodStart?: string; periodEnd?: string }>
  invoices: Array<Amounts & { id: string; paymentId: string; tenantKey: string; original: boolean; descriptionPresent: boolean; periodStart?: string; periodEnd?: string }>
  ledger: { applicable: boolean; checked: boolean; expectedCredits: number; actualCredits: number; entries: number }
  access: { customer: boolean | null; administrator: boolean | null; pdf: boolean | null; tenantIsolation: boolean | null }
  jortt: { checked: boolean; invoiceId: string | null; documentMatched: boolean; settled: boolean; confirmationRecorded?: boolean; dueCents: number | null }
  corrections: Array<{ id: string; originalInvoiceId: string | null; tenantKey: string; gross: number; net: number; vat: number }>
  refunds: Array<{ id: string; recorded: boolean; gross: number; registeredGross: number | null; currency: string; uncertain: boolean; ageMs: number }>
  complete: boolean; periodVerified?: boolean; subscriptionBehind?: boolean
}
export type FinancialChainReview = { key: string; status: FinancialReviewStatus; codes: string[]; evidenceHash: string }
const cents = (n: number) => Number.isSafeInteger(n)
const validAmounts = (a: Amounts) => [a.net, a.vat, a.gross].every(cents) && a.net + a.vat === a.gross
/** Deterministic comparison only. No provider mutation, payment creation or financial repair. */
export function reviewFinancialChain(e: FinancialChainEvidence, scope: string, previouslyDeviated = false): FinancialChainReview {
  if (!scope || e.tenantKey !== scope || !/^tr_[A-Za-z0-9]+$/.test(e.paymentId)) throw new Error('FINANCIAL_REVIEW_SCOPE_MISMATCH')
  const errors: string[] = [], unknown: string[] = []
  const originals = e.invoices.filter(i => i.original)
  if (e.product === 'PRO_SUBSCRIPTION' && e.subscriptionBehind) errors.push('SUBSCRIPTION_PERIOD_BEHIND')
  if (e.registrations.length !== 1) errors.push('PAYMENT_REGISTRATION_COUNT')
  if (originals.length !== 1) errors.push('ORIGINAL_INVOICE_COUNT')
  for (const registration of e.registrations) {
    if (registration.paymentId !== e.paymentId) errors.push('PAYMENT_LINK_MISMATCH')
    if (!validAmounts(registration) || registration.gross !== e.provider.gross || registration.currency !== e.provider.currency) errors.push('PAYMENT_AMOUNTS_MISMATCH')
  }
  for (const invoice of originals) {
    if (invoice.tenantKey !== scope || invoice.paymentId !== e.paymentId) errors.push('INVOICE_LINK_MISMATCH')
    if (!invoice.descriptionPresent) errors.push('INVOICE_DESCRIPTION_MISSING')
    if (!validAmounts(invoice) || invoice.gross !== e.provider.gross || invoice.currency !== e.provider.currency
      || e.registrations.some(r => r.net !== invoice.net || r.vat !== invoice.vat)) errors.push('INVOICE_AMOUNTS_MISMATCH')
    if (e.product === 'PRO_SUBSCRIPTION') {
      if (e.periodVerified === false) unknown.push('SUBSCRIPTION_PERIOD_SOURCE_NOT_VERIFIED')
      const start = Date.parse(invoice.periodStart ?? ''), end = Date.parse(invoice.periodEnd ?? ''), paid = Date.parse(e.paidAt)
      if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(paid) || start >= end
        || e.registrations.some(r => r.periodStart !== invoice.periodStart || r.periodEnd !== invoice.periodEnd)) errors.push('SUBSCRIPTION_PERIOD_MISMATCH')
      // Late collection is not automatically unlawful: requires explicit investigation.
      if (Number.isFinite(paid) && (paid < start || paid >= end)) unknown.push('COLLECTION_PERIOD_REVIEW')
    }
  }
  if (e.ledger.applicable && !e.ledger.checked) unknown.push('LEDGER_NOT_VERIFIED')
  if (e.ledger.applicable && e.ledger.checked && (e.ledger.expectedCredits !== e.ledger.actualCredits || e.ledger.entries !== 1)) errors.push('LEDGER_MISMATCH')
  for (const [name, value] of Object.entries(e.access)) {
    if (value === false) errors.push(`INVOICE_ACCESS_${name.toUpperCase()}`)
    if (value === null) unknown.push(`INVOICE_ACCESS_${name.toUpperCase()}_NOT_VERIFIED`)
  }
  if (!e.jortt.checked) unknown.push('JORTT_NOT_VERIFIED')
  else {
    if (!e.jortt.invoiceId || !e.jortt.documentMatched) errors.push('JORTT_DOCUMENT_MISMATCH')
    if (e.jortt.dueCents !== 0) errors.push('JORTT_PAYMENT_OPEN')
    else if (!e.jortt.settled) {
      if (e.jortt.confirmationRecorded === false) unknown.push('JORTT_SETTLEMENT_NOT_VERIFIED')
      else errors.push('JORTT_SETTLEMENT_MISMATCH')
    }
  }
  for (const credit of e.corrections) {
    if (!originals.some(i => i.id === credit.originalInvoiceId) || credit.tenantKey !== scope) errors.push('CREDIT_SOURCE_MISMATCH')
    if (![credit.gross, credit.net, credit.vat].every(cents) || credit.gross >= 0 || credit.net + credit.vat !== credit.gross) errors.push('CREDIT_AMOUNTS_MISMATCH')
  }
  if (-e.corrections.reduce((n, c) => n + c.gross, 0) > e.provider.gross) errors.push('CREDIT_TOTAL_EXCEEDED')
  if (new Set(e.refunds.map(r => r.id)).size !== e.refunds.length) errors.push('DUPLICATE_REFUND')
  for (const refund of e.refunds) {
    if (!refund.recorded || refund.gross !== refund.registeredGross || refund.currency !== e.provider.currency) errors.push('REFUND_REGISTRATION_MISMATCH')
    if (refund.uncertain) unknown.push('REFUND_ACCEPTANCE_UNKNOWN')
    if (refund.uncertain && refund.ageMs >= 2 * 60 * 60 * 1000) errors.push('REFUND_OVERDUE')
  }
  if (!e.complete) unknown.push('INCOMPLETE_PROVIDER_COVERAGE')
  const codes = [...new Set([...errors, ...unknown])].sort()
  return { key: createHash('sha256').update(`${scope}:${e.paymentId}`).digest('hex'),
    status: errors.length ? 'DEVIATION' : unknown.length ? 'INVESTIGATING' : previouslyDeviated ? 'RECOVERED' : 'OK', codes,
    evidenceHash: createHash('sha256').update(JSON.stringify(e)).digest('hex') }
}

/** Coverage failures must never silently yield a green empty daily report. */
export function validateFinancialReviewCoverage(input: { complete: boolean; expectedPaid: number; payments: FinancialChainEvidence[] }, tenant: string) {
  if (!input.complete || !Number.isSafeInteger(input.expectedPaid) || input.expectedPaid < 0 || input.expectedPaid !== input.payments.length) throw new Error('FINANCIAL_REVIEW_COVERAGE_INCOMPLETE')
  if (input.payments.some(p => p.tenantKey !== tenant)) throw new Error('FINANCIAL_REVIEW_SCOPE_MISMATCH')
  if (new Set(input.payments.map(p => p.paymentId)).size !== input.payments.length) throw new Error('FINANCIAL_REVIEW_DUPLICATE_PAYMENT')
}
