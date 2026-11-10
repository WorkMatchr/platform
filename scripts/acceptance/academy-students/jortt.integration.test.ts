import { randomUUID } from 'node:crypto'
import { expect, it, vi } from 'vitest'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'

it.skipIf(!process.env.ACADEMY_SYNTHETIC_INVOICE)('verwerkt de originele pilotfactuur van de browser precies eenmaal via fake Jortt', async () => {
  const url = new URL(process.env.DATABASE_URL!)
  expect(url.hostname).toBe('127.0.0.1')
  expect(url.pathname).toMatch(/^\/workmatchr_learning_\d+_\d+$/)
  expect(url.username).toBe('academy_content_editor')
  const id = process.env.ACADEMY_SYNTHETIC_INVOICE!
  const submitInvoice = vi.fn(async () => ({ externalReference: randomUUID(), remoteInvoiceNumber: 'SYN-001' }))
  for (let i = 0; i < 2; i++) {
    const sync = await syncFinancialInvoiceToJortt(id, { submitInvoice })
    expect(sync.status).toBe('SYNCED')
  }
  expect(submitInvoice).toHaveBeenCalledTimes(1)
  expect(submitInvoice.mock.calls[0]).toEqual([expect.objectContaining({
    invoiceId: id, amountInclVatCents: 149, vatRateBps: 0, academyTaxTreatment: 'NL_KOR',
  }), expect.anything(), expect.anything()])
})
