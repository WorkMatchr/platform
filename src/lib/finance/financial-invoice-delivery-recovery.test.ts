import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const state = vi.hoisted(() => ({ events: new Map<string, Record<string, unknown>>(), invoice: {} as Record<string, unknown> }))
const tx = {
  $queryRaw: vi.fn().mockResolvedValue([]),
  financialInvoice: { findUnique: vi.fn(async () => state.invoice) },
  financialEvent: {
    findUnique: vi.fn(async ({ where }: { where: { idempotencyKey: string } }) => state.events.get(where.idempotencyKey) ?? null),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { const event = { ...data, createdAt: new Date() }; state.events.set(String(data.idempotencyKey), event); return event }),
  },
}
vi.mock('./financial-transaction', () => ({ runSerializableFinancialTransaction: (operation: (transaction: typeof tx) => unknown) => operation(tx) }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: (operation: (transaction: typeof tx) => unknown) => operation(tx) }) }))
import { deliverFinancialInvoiceEmail } from './financial-invoice-delivery-service'
const id = '60000000-0000-4000-8000-000000000019'
const started = new Date('2026-11-05T10:00:00Z')
const sender = () => vi.fn().mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'synthetic-provider-id' })
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(started); vi.clearAllMocks(); state.events.clear()
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://example.invalid'); vi.stubEnv('AUTH_EMAIL_FROM', 'sender@example.invalid')
  state.invoice = { id, invoiceNumber: 'SYNTHETIC-19', amountInclVatCents: 3025, issuedAt: started,
    purchaseId: '50000000-0000-4000-8000-000000000019', purchase: { status: 'PAID', paidAt: started,
      createdByUserId: '40000000-0000-4000-8000-000000000019', createdByUser: { email: 'buyer@example.invalid', displayName: 'Synthetic' } } }
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs() })
describe('durable invoice delivery acceptance boundaries', () => {
  it('blocks an uncertain replay at the exact 23-hour boundary', async () => {
    const send = sender().mockRejectedValueOnce(new Error('synthetic timeout'))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('synthetic timeout')
    vi.setSystemTime(new Date(started.getTime() + 23 * 3600000))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('replays identical content with the same key inside the provider window', async () => {
    const send = sender().mockRejectedValueOnce(new Error('synthetic timeout'))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow()
    vi.setSystemTime(new Date(started.getTime() + 23 * 3600000 - 1))
    await deliverFinancialInvoiceEmail(id, send)
    expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0])
    await deliverFinancialInvoiceEmail(id, send); expect(send).toHaveBeenCalledTimes(2)
  })
  it('refuses a changed sender instead of reusing a key with different content', async () => {
    const send = sender().mockRejectedValueOnce(new Error('synthetic timeout'))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow()
    vi.stubEnv('AUTH_EMAIL_FROM', 'changed@example.invalid')
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).toHaveBeenCalledTimes(1)
  })
  it('does not assign a fresh window to historical unresolved failures', async () => {
    state.events.set(`invoice-email-failed:${id}`, { createdAt: started })
    const send = sender()
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).not.toHaveBeenCalled()
  })
  it('does not assume an old unrecorded invoice has never reached its provider', async () => {
    state.invoice.issuedAt = new Date(started.getTime() - 23 * 3600000)
    const send = sender()
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).not.toHaveBeenCalled()
  })
  it('refuses a changed recipient without storing the address in the attempt', async () => {
    const send = sender().mockRejectedValueOnce(new Error('synthetic timeout'))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow()
    const purchase = state.invoice.purchase as { createdByUser: { email: string } }
    purchase.createdByUser.email = 'different@example.invalid'
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).toHaveBeenCalledTimes(1)
    const evidence = state.events.get(`invoice-email-started:${id}`)!
    expect(Object.keys(evidence.metadata as object).sort()).toEqual(['fingerprint', 'version'])
    expect(JSON.stringify(evidence)).not.toContain('@')
  })
  it('requires a provider message ID before recording SENT', async () => {
    const send = sender().mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: '' })
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_NOT_ACCEPTED')
    expect(state.events.has(`invoice-email-sent:${id}`)).toBe(false)
    expect(state.events.has(`invoice-email-started:${id}`)).toBe(true)
  })
  it('preserves historical delivered replays beyond the window', async () => {
    state.events.set(`invoice-email-sent:${id}`, { createdAt: started })
    vi.setSystemTime(new Date(started.getTime() + 30 * 86400000))
    const send = sender()
    expect(await deliverFinancialInvoiceEmail(id, send)).toEqual({ delivered: true, idempotent: true })
    expect(send).not.toHaveBeenCalled()
  })
  it('blocks missing evidence fields and future clocks', async () => {
    const send = sender()
    state.events.set(`invoice-email-started:${id}`, { createdAt: new Date(started.getTime() + 1000), metadata: {} })
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).not.toHaveBeenCalled()
  })

  it('never extends an unrecorded pre-upgrade attempt beyond the invoice-age window', async () => {
    state.invoice.issuedAt = new Date(started.getTime() - 3600000)
    const send = sender().mockRejectedValueOnce(new Error('synthetic timeout'))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow()
    vi.setSystemTime(new Date(started.getTime() + 22 * 3600000))
    await expect(deliverFinancialInvoiceEmail(id, send)).rejects.toThrow('INVOICE_EMAIL_RECONCILIATION_REQUIRED')
    expect(send).toHaveBeenCalledTimes(1)
  })

})
