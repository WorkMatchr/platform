export type AcademyRefundEvidence = { id: string; status: string; amountCents: number }
export type AcademyRefundState = 'NONE' | 'PARTIAL' | 'FULL' | 'INVALID'

/** Only distinct, definitively processed refunds count; never payment events or current prices. */
export function academyAlumniRefundState(originalGrossCents: number, refunds: readonly AcademyRefundEvidence[]): AcademyRefundState {
  if (!Number.isSafeInteger(originalGrossCents) || originalGrossCents <= 0) return 'INVALID'
  const seen = new Map<string, AcademyRefundEvidence>()
  let confirmed = 0
  for (const refund of refunds) {
    if (!refund.id) return 'INVALID'
    const previous = seen.get(refund.id)
    if (previous) {
      if (previous.amountCents !== refund.amountCents || previous.status !== refund.status) return 'INVALID'
      continue
    }
    seen.set(refund.id, refund)
    if (refund.status !== 'REFUNDED') continue
    if (!Number.isSafeInteger(refund.amountCents) || refund.amountCents <= 0) return 'INVALID'
    confirmed += refund.amountCents
    if (!Number.isSafeInteger(confirmed) || confirmed > originalGrossCents) return 'INVALID'
  }
  return confirmed === originalGrossCents ? 'FULL' : confirmed > 0 ? 'PARTIAL' : 'NONE'
}
