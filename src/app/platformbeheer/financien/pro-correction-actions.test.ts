import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), credit: vi.fn(), refund: vi.fn(), reconcile: vi.fn(), revalidate: vi.fn(), proPayments: vi.fn(), invoice: vi.fn(), subscription: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAdministrator: mocks.authorize }))
vi.mock('@/lib/finance/pro-credit-service', () => ({ issueProCredit: mocks.credit }))
vi.mock('@/lib/finance/pro-refund-service', () => ({ requestProRefund: mocks.refund }))
vi.mock('@/lib/finance/jortt-payment-service', () => ({ reconcileJorttPayment: mocks.reconcile }))
vi.mock('@/lib/finance/pro-payment-reconciliation', () => ({ reconcileProPayments: mocks.proPayments }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ financialInvoice: { findUniqueOrThrow: mocks.invoice }, professionalSubscription: { findUniqueOrThrow: mocks.subscription } }) }))
import { proFinancialCorrectionAction } from './actions'
const invoiceId = '10000000-0000-4000-8000-000000000001'
function form(operation = 'credit') {
  const data = new FormData()
  Object.entries({ invoiceId, operation, reason: 'Synthetic authorized correction only', confirmed: 'on', amount: '10,00',
    idempotencyKey: 'synthetic-stable-form-key', actorUserId: 'FORGED_ACTOR' }).forEach(([k, v]) => data.set(k, v))
  return data
}
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('PRO_FINANCIAL_CORRECTIONS_ENABLED', 'true'); mocks.authorize.mockResolvedValue({ id: 'verified-operator' }); mocks.refund.mockResolvedValue({ reviewRequired: false }) })
afterEach(() => vi.unstubAllEnvs())
it('authorizes on the server and ignores a forged operator field', async () => {
  await expect(proFinancialCorrectionAction(form())).rejects.toThrow('resultaat=vastgelegd')
  expect(mocks.credit).toHaveBeenCalledExactlyOnceWith({ actorUserId: 'verified-operator', invoiceId, reason: 'Synthetic authorized correction only', amountInclVatCents: 1000, idempotencyKey: 'synthetic-stable-form-key' })
  expect(mocks.refund).not.toHaveBeenCalled()
})
it('keeps the default gate closed without provider or credit calls', async () => {
  vi.stubEnv('PRO_FINANCIAL_CORRECTIONS_ENABLED', '')
  await expect(proFinancialCorrectionAction(form())).rejects.toThrow('niet-vrijgegeven')
  expect(mocks.credit).not.toHaveBeenCalled(); expect(mocks.refund).not.toHaveBeenCalled()
})
it('rejects unauthorized operators before a financial service call', async () => {
  mocks.authorize.mockRejectedValueOnce(new Error('ACCESS_DENIED'))
  await expect(proFinancialCorrectionAction(form())).rejects.toThrow('ACCESS_DENIED')
  expect(mocks.credit).not.toHaveBeenCalled()
})
it.each(['NaN', '10.001', '-10.00', '1e2', '100'])('rejects invalid money %s without rounding silently', async amount => {
  const data = form(); data.set('amount', amount)
  await expect(proFinancialCorrectionAction(data)).rejects.toThrow('controle-nodig')
  expect(mocks.credit).not.toHaveBeenCalled()
})
it('requires a separately confirmed cash operation', async () => {
  await expect(proFinancialCorrectionAction(form('refund'))).rejects.toThrow('resultaat=vastgelegd')
  expect(mocks.refund).toHaveBeenCalledOnce(); expect(mocks.credit).not.toHaveBeenCalled()
})
it('does not expose provider details in a failed action', async () => {
  mocks.refund.mockRejectedValueOnce(new Error('PRIVATE_PROVIDER_DETAIL'))
  await expect(proFinancialCorrectionAction(form('refund'))).rejects.toThrow(`REDIRECT:/platformbeheer/financien/facturen/${invoiceId}?fout=controle-nodig`)
})

it('passes only the exact recovery target and the server-authenticated operator', async () => {
  mocks.invoice.mockResolvedValue({ organizationId: 'synthetic-org' })
  mocks.subscription.mockResolvedValue({ id: 'synthetic-subscription' })
  mocks.proPayments.mockResolvedValue({ inspected: 1, processed: 1, failed: 0 })
  const data = form('pro-payments'); data.set('paymentId', 'tr_syntheticOctober'); data.set('after', '2026-09-01')
  await expect(proFinancialCorrectionAction(data)).rejects.toThrow('resultaat=vastgelegd')
  expect(mocks.proPayments).toHaveBeenCalledExactlyOnceWith({ actorUserId: 'verified-operator', invoiceId, reason: 'Synthetic authorized correction only', subscriptionId: 'synthetic-subscription', paymentId: 'tr_syntheticOctober' })
})

it('keeps exact historical recovery behind the existing closed gate', async () => {
  vi.stubEnv('PRO_FINANCIAL_CORRECTIONS_ENABLED', '')
  const data = form('pro-payments'); data.set('paymentId', 'tr_syntheticOctober')
  await expect(proFinancialCorrectionAction(data)).rejects.toThrow('niet-vrijgegeven')
  expect(mocks.proPayments).not.toHaveBeenCalled(); expect(mocks.invoice).not.toHaveBeenCalled()
})
