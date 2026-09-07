import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ deliver: vi.fn(), failure: vi.fn() }))
vi.mock('./financial-invoice-delivery-service', () => ({ deliverFinancialInvoiceEmail: mocks.deliver, recordFinancialInvoiceEmailFailure: mocks.failure }))
import { deliverCompletedRefundCreditNote } from './credit-note-delivery'
const result = { refund: { status: 'REFUNDED', purchaseId: 'purchase', approvedByUserId: 'actor' }, creditNote: { id: 'note' } }
describe('creditnota downstream foutisolatie', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.deliver.mockResolvedValue({ delivered: true }); mocks.failure.mockResolvedValue(undefined) })
  it.each(['PENDING', 'FAILED', 'CANCELED'])('geen delivery vóór completed refund: %s', async status => {
    await deliverCompletedRefundCreditNote({ ...result, refund: { ...result.refund, status } })
    expect(mocks.deliver).not.toHaveBeenCalled()
  })
  it('beperkt zich tot de bestaande idempotente deliveryservice', async () => {
    await deliverCompletedRefundCreditNote(result)
    expect(mocks.deliver).toHaveBeenCalledExactlyOnceWith('note')
  })
  it('laat refund intact bij mailfailure en staat veilige recovery toe', async () => {
    mocks.deliver.mockRejectedValueOnce(new Error('provider failure'))
    await expect(deliverCompletedRefundCreditNote(result)).resolves.toBeUndefined()
    expect(mocks.failure).toHaveBeenCalledWith('note', 'purchase', 'actor')
    await deliverCompletedRefundCreditNote(result)
    expect(mocks.deliver).toHaveBeenCalledTimes(2)
  })
})
