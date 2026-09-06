import 'server-only'
import { deliverFinancialInvoiceEmail, recordFinancialInvoiceEmailFailure } from './financial-invoice-delivery-service'

/** Always after commit; delivery failure cannot roll back a valid refund. */
export async function deliverCompletedRefundCreditNote(result: {
  refund: { status: string; purchaseId: string; approvedByUserId: string | null }
  creditNote?: { id: string } | null
}) {
  if (result.refund.status !== 'REFUNDED' || !result.creditNote) return
  try {
    await deliverFinancialInvoiceEmail(result.creditNote.id)
  } catch {
    try {
      await recordFinancialInvoiceEmailFailure(result.creditNote.id, result.refund.purchaseId, result.refund.approvedByUserId)
    } catch {
      // Never expose provider data or make a committed refund appear rolled back.
      console.error('CREDIT_NOTE_DELIVERY_AUDIT_FAILED')
    }
  }
}
