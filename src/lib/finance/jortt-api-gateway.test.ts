import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { JorttApiGateway, isJorttSyncConfigured } from './jortt-api-gateway'
import type { JorttInvoicePayload } from './jortt-sync-service'

const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function payload(overrides: Partial<JorttInvoicePayload> = {}): JorttInvoicePayload {
  return {
    organizationId: '20000000-0000-4000-8000-000000000001', invoiceNumber: 'WM-2026-000001', documentType: 'INVOICE', pricingMode: 'STANDARD',
    issuedAt: '2026-08-25T10:00:00.000Z', supplyDate: '2026-08-25T10:00:00.000Z', servicePeriodStart: null, servicePeriodEnd: null,
    seller: { legalName: 'WorkMatchr', kvkNumber: '12345678', vatId: 'NL123456789B01' },
    customer: { organizationName: 'Voorbeeld B.V.', addressLine: 'Teststraat 1', postalCode: '1234 AB', city: 'Utrecht', countryCode: 'NL', kvkNumber: '87654321', vatId: 'NL987654321B01' },
    amountExclVatCents: 9_500, vatRateBps: 2_100, vatAmountCents: 1_995, amountInclVatCents: 11_495, currency: 'EUR', paymentReference: 'tr_test', originalInvoiceExternalReference: null,
    lines: [{ description: '100 WorkMatchr-credits', quantity: 100, unit: 'credit', unitPriceExclVatCents: 100, discountAmountCents: 500, netAmountExclVatCents: 9_500, vatRateBps: 2_100, vatAmountCents: 1_995 }],
    ...overrides,
  }
}

describe('Jortt API gateway', () => {
  beforeEach(() => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('JORTT_SYNC_ENVIRONMENT', 'acceptance')
    vi.stubEnv('JORTT_CLIENT_ID', 'acceptance-client')
    vi.stubEnv('JORTT_CLIENT_SECRET', 'acceptance-secret')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('boekt een factuur met WorkMatchr-reference, Jortt-nummer en uitsluitend self', async () => {
    const calls: Array<{ url: string; body: unknown }> = []
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const body = typeof init?.body === 'string' && init.headers && String((init.headers as Record<string, string>)['Content-Type']).includes('json') ? JSON.parse(init.body) : null
      calls.push({ url, body })
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [] })
      if (url.includes('/customers?')) return response({ data: [] })
      if (url.endsWith('/customers')) return response({ data: { id: 'customer-1' } }, 201)
      if (url.endsWith('/invoices')) return response({ data: { id: 'invoice-1' } }, 201)
      if (url.endsWith('/invoices/invoice-1/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/invoice-1')) return response({ data: { id: 'invoice-1', reference: 'WM-2026-000001', invoice_number: 'J2026-42' } })
      return response({}, 404)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'jortt:WM-2026-000001')
    expect(result).toEqual({ externalReference: 'invoice-1', remoteInvoiceNumber: 'J2026-42' })
    const invoiceBody = calls.find((call) => call.url.endsWith('/invoices'))?.body as Record<string, unknown>
    expect(invoiceBody).toMatchObject({ reference: 'WM-2026-000001', payment_method: 'already_paid', net_amounts: true })
    expect(invoiceBody).not.toHaveProperty('send_method')
    expect(calls.find((call) => call.url.endsWith('/invoices/invoice-1/send'))?.body).toEqual({ send_method: 'self' })
    expect(JSON.stringify(invoiceBody)).not.toMatch(/email|peppol/i)
    expect(invoiceBody.line_items).toEqual(expect.arrayContaining([
      expect.objectContaining({ quantity: '100', amount: { amount: '1.00', currency: 'EUR' }, vat: { value: '0.21', category: null } }),
      expect.objectContaining({ quantity: '1', amount: { amount: '-5.00', currency: 'EUR' }, vat: { value: '0.21', category: null } }),
    ]))
  })

  it('hergebruikt een bestaande debiteur en factuur bij replay', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-1', reference: 'WM-2026-000001', invoice_number: 'J2026-42' }] })
      if (url.endsWith('/invoices/invoice-1')) return response({ data: { id: 'invoice-1', reference: 'WM-2026-000001', invoice_number: 'J2026-42' } })
      return response({}, 500)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'same-replay')
    expect(result.remoteInvoiceNumber).toBe('J2026-42')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('finaliseert een bestaande draft via self zonder een tweede factuur te maken', async () => {
    let detailCalls = 0
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-pending', reference: 'WM-2026-000001', invoice_number: null }] })
      if (url.endsWith('/invoices/invoice-pending/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/invoice-pending')) {
        detailCalls += 1
        return response({ data: { id: 'invoice-pending', reference: 'WM-2026-000001', invoice_status: detailCalls === 1 ? 'draft' : 'sent', invoice_number: detailCalls === 1 ? null : 'J2026-43' } })
      }
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'retry')).resolves.toEqual({ externalReference: 'invoice-pending', remoteInvoiceNumber: 'J2026-43' })
    expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/invoices'))).toBe(false)
  })

  it('maakt een creditnota tegen de oorspronkelijke remote factuur en verzendt niet naar de klant', async () => {
    const calls: Array<{ url: string; body: unknown }> = []
    const creditPayload = payload({ invoiceNumber: 'WM-CN-2026-000001', documentType: 'CREDIT_NOTE', originalInvoiceExternalReference: 'invoice-original' })
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      calls.push({ url, body })
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [] })
      if (url.endsWith('/invoices/invoice-original/credit')) return response({ data: { id: 'credit-1' } }, 201)
      if (url.endsWith('/invoices/credit-1') && init?.method === 'PUT') return response({ data: { id: 'credit-1' } })
      if (url.endsWith('/invoices/credit-1/send')) return response({ data: { id: 'credit-1' } })
      if (url.endsWith('/invoices/credit-1')) return response({ data: { id: 'credit-1', reference: 'WM-CN-2026-000001', invoice_number: 'J2026-C42' } })
      return response({}, 404)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(creditPayload, 'credit-replay')
    expect(result.remoteInvoiceNumber).toBe('J2026-C42')
    expect(calls.find((call) => call.url.endsWith('/credit-1/send'))?.body).toEqual({ send_method: 'self' })
    expect(JSON.stringify(calls)).not.toMatch(/peppol|send_method":"email/i)
  })

  it('blijft fail-closed zonder acceptatieconfiguratie en in Production zonder write-gate', () => {
    vi.stubEnv('JORTT_SYNC_ENVIRONMENT', '')
    expect(isJorttSyncConfigured()).toBe(false)
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('JORTT_SYNC_ENVIRONMENT', 'production')
    vi.stubEnv('JORTT_PRODUCTION_WRITES_ENABLED', 'false')
    expect(isJorttSyncConfigured()).toBe(false)
  })

  it('weigert een factuur waarvan immutable regels en totalen niet aansluiten vóór de API-call', async () => {
    const fetcher = vi.fn()
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload({ amountInclVatCents: 11_496 }), 'mismatch')).rejects.toThrow('JORTT_INVOICE_TOTAL_MISMATCH')
    expect(fetcher).not.toHaveBeenCalled()
  })
})
