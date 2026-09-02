import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { JorttApiGateway, isJorttSyncConfigured } from './jortt-api-gateway'
import type { JorttInvoicePayload } from './jortt-sync-service'

const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

function payload(overrides: Partial<JorttInvoicePayload> = {}): JorttInvoicePayload {
  return {
    invoiceId: '10000000-0000-4000-8000-000000000001',
    technicalReference: 'workmatchr-invoice:10000000-0000-4000-8000-000000000001',
    knownExternalReference: null,
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

  it('vraagt uitsluitend de noodzakelijke klant-, factuur- en administratiescopes aan', async () => {
    let requestedScope: string | null = null
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/oauth/token')) {
        requestedScope = new URLSearchParams(String(init?.body)).get('scope')
        return response({ access_token: 'token' })
      }
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-1', reference: payload().invoiceNumber, remarks: payload().technicalReference, invoice_number: 'J2026-42' }] })
      if (url.endsWith('/invoices/invoice-1')) return response({ data: { id: 'invoice-1', reference: payload().invoiceNumber, remarks: payload().technicalReference, invoice_number: 'J2026-42' } })
      return response({}, 404)
    })

    await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'scope-check')

    expect(requestedScope).toBe('customers:read customers:write invoices:read invoices:write organizations:read')
  })

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
      if (url.endsWith('/invoices/invoice-1')) return response({ data: { id: 'invoice-1', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_number: 'J2026-42' } })
      return response({}, 404)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'jortt:WM-2026-000001')
    expect(result).toEqual({ externalReference: 'invoice-1', remoteInvoiceNumber: 'J2026-42' })
    const invoiceBody = calls.find((call) => call.url.endsWith('/invoices'))?.body as Record<string, unknown>
    expect(invoiceBody).toMatchObject({ reference: 'WM-2026-000001', payment_method: 'already_paid', net_amounts: false })
    expect(invoiceBody).not.toHaveProperty('send_method')
    expect(calls.find((call) => call.url.endsWith('/invoices/invoice-1/send'))?.body).toEqual({ send_method: 'self' })
    expect(JSON.stringify(invoiceBody)).not.toMatch(/email|peppol/i)
    expect(invoiceBody.line_items).toEqual(expect.arrayContaining([
      expect.objectContaining({ quantity: '100', amount: { amount: '1.00', currency: 'EUR' }, vat: { value: '0.21', category: null } }),
      expect.objectContaining({ quantity: '1', amount: { amount: '-5.00', currency: 'EUR' }, vat: { value: '0.21', category: null } }),
    ]))
  })

  it('stuurt € 50,00 exclusief btw als netto prijs zodat Jortt € 60,50 inclusief btw boekt', async () => {
    let invoiceBody: Record<string, unknown> | null = null
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?') || url.includes('/customers?')) return response({ data: [] })
      if (url.endsWith('/customers')) return response({ data: { id: 'customer-50' } }, 201)
      if (url.endsWith('/invoices')) {
        invoiceBody = JSON.parse(String(init?.body)) as Record<string, unknown>
        return response({ data: { id: 'invoice-50' } }, 201)
      }
      if (url.endsWith('/invoices/invoice-50/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/invoice-50')) return response({ data: { id: 'invoice-50', reference: 'WM-2026-000050', remarks: payload().technicalReference, invoice_number: 'J2026-50' } })
      return response({}, 404)
    })
    const fiftyCredits = payload({
      invoiceNumber: 'WM-2026-000050', amountExclVatCents: 5_000, vatAmountCents: 1_050, amountInclVatCents: 6_050,
      lines: [{ description: '50 WorkMatchr-credits', quantity: 50, unit: 'credit', unitPriceExclVatCents: 100, discountAmountCents: 0, netAmountExclVatCents: 5_000, vatRateBps: 2_100, vatAmountCents: 1_050 }],
    })
    await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(fiftyCredits, 'fifty-credits')
    expect(invoiceBody).toMatchObject({
      net_amounts: false,
      line_items: [{ quantity: '50', amount: { amount: '1.00', currency: 'EUR' }, vat: { value: '0.21', category: null } }],
    })
    expect(fiftyCredits.amountExclVatCents + fiftyCredits.vatAmountCents).toBe(fiftyCredits.amountInclVatCents)
  })

  it('gebruikt voor Pro dezelfde netto-bedragsemantiek en de immutable serviceperiode', async () => {
    let invoiceBody: Record<string, unknown> | null = null
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?') || url.includes('/customers?')) return response({ data: [] })
      if (url.endsWith('/customers')) return response({ data: { id: 'customer-pro' } }, 201)
      if (url.endsWith('/invoices')) { invoiceBody = JSON.parse(String(init?.body)) as Record<string, unknown>; return response({ data: { id: 'invoice-pro' } }, 201) }
      if (url.endsWith('/invoices/invoice-pro/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/invoice-pro')) return response({ data: { id: 'invoice-pro', reference: 'WM-PRO-2026-1', remarks: payload().technicalReference, invoice_number: 'JPRO-1' } })
      return response({}, 404)
    })
    await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload({
      invoiceNumber: 'WM-PRO-2026-1', servicePeriodStart: '2026-09-01T00:00:00.000Z', servicePeriodEnd: '2026-09-30T00:00:00.000Z',
      amountExclVatCents: 4_900, vatAmountCents: 1_029, amountInclVatCents: 5_929,
      lines: [{ description: 'WorkMatchr Pro', quantity: 1, unit: 'maand', unitPriceExclVatCents: 4_900, discountAmountCents: 0, netAmountExclVatCents: 4_900, vatRateBps: 2_100, vatAmountCents: 1_029 }],
    }), 'pro-invoice')
    expect(invoiceBody).toMatchObject({ net_amounts: false, delivery_period: '2026-09-01', delivery_period_end: '2026-09-30' })
  })

  it('hergebruikt een bestaande debiteur en factuur bij replay', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-1', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_number: 'J2026-42' }] })
      if (url.endsWith('/invoices/invoice-1')) return response({ data: { id: 'invoice-1', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_number: 'J2026-42' } })
      return response({}, 500)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'same-replay')
    expect(result.remoteInvoiceNumber).toBe('J2026-42')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('hergebruikt dezelfde technische factuur via de menselijke fallback als Jortt remarks niet rechtstreeks doorzoekt', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes(encodeURIComponent(payload().technicalReference))) return response({ data: [] })
      if (url.includes(encodeURIComponent(payload().invoiceNumber))) {
        return response({ data: [{ id: 'invoice-fallback', reference: payload().invoiceNumber, remarks: payload().technicalReference, invoice_number: 'J-FALLBACK' }] })
      }
      if (url.endsWith('/invoices/invoice-fallback')) {
        return response({ data: { id: 'invoice-fallback', reference: payload().invoiceNumber, remarks: payload().technicalReference, invoice_number: 'J-FALLBACK' } })
      }
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'fallback-replay')).resolves.toEqual({ externalReference: 'invoice-fallback', remoteInvoiceNumber: 'J-FALLBACK' })
    expect(fetcher.mock.calls.some(([input], index) => index > 0 && String(input).endsWith('/invoices'))).toBe(false)
  })

  it('finaliseert een bestaande draft via self zonder een tweede factuur te maken', async () => {
    let detailCalls = 0
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-pending', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_number: null }] })
      if (url.endsWith('/invoices/invoice-pending/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/invoice-pending')) {
        detailCalls += 1
        return response({ data: { id: 'invoice-pending', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_status: detailCalls === 1 ? 'draft' : 'sent', invoice_number: detailCalls === 1 ? null : 'J2026-43' } })
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
      if (url.endsWith('/invoices/credit-1')) return response({ data: { id: 'credit-1', reference: 'WM-CN-2026-000001', remarks: creditPayload.technicalReference, invoice_number: 'J2026-C42' } })
      return response({}, 404)
    })
    const result = await new JorttApiGateway(fetcher as typeof fetch).submitInvoice(creditPayload, 'credit-replay')
    expect(result.remoteInvoiceNumber).toBe('J2026-C42')
    expect(calls.find((call) => call.url.endsWith('/credit-1/send'))?.body).toEqual({ send_method: 'self' })
    expect(JSON.stringify(calls)).not.toMatch(/peppol|send_method":"email/i)
    expect(calls.some((call) => call.url.endsWith('/invoices') && call.body !== null)).toBe(false)
  })

  it('onderscheidt originele factuur en creditfactuur met dezelfde menselijke referentie via hun invoice-ID', async () => {
    const creditPayload = payload({
      invoiceId: '30000000-0000-4000-8000-000000000003',
      technicalReference: 'workmatchr-invoice:30000000-0000-4000-8000-000000000003',
      documentType: 'CREDIT_NOTE',
      originalInvoiceExternalReference: 'invoice-original',
    })
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'invoice-original', reference: creditPayload.invoiceNumber, remarks: payload().technicalReference, invoice_number: 'J-ORIGINAL' }] })
      if (url.endsWith('/invoices/invoice-original/credit')) return response({ data: { id: 'credit-distinct' } }, 201)
      if (url.endsWith('/invoices/credit-distinct') && init?.method === 'PUT') return response({ data: { id: 'credit-distinct' } })
      if (url.endsWith('/invoices/credit-distinct/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/credit-distinct')) return response({ data: { id: 'credit-distinct', reference: creditPayload.invoiceNumber, remarks: creditPayload.technicalReference, invoice_number: 'J-CREDIT' } })
      return response({}, 404)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(creditPayload, 'credit-technical-id')).resolves.toEqual({ externalReference: 'credit-distinct', remoteInvoiceNumber: 'J-CREDIT' })
  })

  it('beschouwt dezelfde menselijke referentie met een andere technische invoice-ID niet als dezelfde factuur', async () => {
    let created = false
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'historical-credit', reference: 'WM-2026-000001', remarks: 'workmatchr-invoice:20000000-0000-4000-8000-000000000002', invoice_number: 'J-CREDIT' }] })
      if (url.includes('/customers?')) return response({ data: [{ id: 'customer-1', reference: 'workmatchr-org:20000000-0000-4000-8000-000000000001' }] })
      if (url.endsWith('/invoices')) { created = true; return response({ data: { id: 'new-invoice' } }, 201) }
      if (url.endsWith('/invoices/new-invoice/send')) return new Response(null, { status: 200 })
      if (url.endsWith('/invoices/new-invoice')) return response({ data: { id: 'new-invoice', reference: 'WM-2026-000001', remarks: payload().technicalReference, invoice_number: 'J-NEW' } })
      return response({}, 404)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'technical-id')).resolves.toMatchObject({ externalReference: 'new-invoice' })
    expect(created).toBe(true)
  })

  it('gebruikt de bekende lokale remote ID als leidende identiteit, ook voor een historisch document zonder marker', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.endsWith('/invoices/known-remote')) return response({ data: { id: 'known-remote', reference: 'WM-2026-000001', invoice_number: 'J-LEGACY' } })
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload({ knownExternalReference: 'known-remote' }), 'known')).resolves.toEqual({ externalReference: 'known-remote', remoteInvoiceNumber: 'J-LEGACY' })
    expect(fetcher.mock.calls.some(([input]) => String(input).includes('/invoices?'))).toBe(false)
  })

  it('faalt gesloten wanneer meerdere remote documenten dezelfde technische identiteit dragen', async () => {
    const marker = payload().technicalReference
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [
        { id: 'invoice-a', reference: 'WM-2026-000001', remarks: marker },
        { id: 'invoice-b', reference: 'WM-2026-000001', remarks: marker },
      ] })
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'ambiguous')).rejects.toThrow('JORTT_TECHNICAL_IDENTITY_CONFLICT')
  })

  it('dedupliceert hetzelfde remote object wanneer Jortt het meermaals teruggeeft', async () => {
    const marker = payload().technicalReference
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes('/invoices?')) return response({ data: [
        { id: 'invoice-same', reference: 'WM-2026-000001', remarks: marker, invoice_number: 'J-SAME' },
        { id: 'invoice-same', reference: 'WM-2026-000001', remarks: marker, invoice_number: 'J-SAME' },
      ] })
      if (url.endsWith('/invoices/invoice-same')) return response({ data: { id: 'invoice-same', reference: 'WM-2026-000001', remarks: marker, invoice_number: 'J-SAME' } })
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'duplicate-result')).resolves.toEqual({ externalReference: 'invoice-same', remoteInvoiceNumber: 'J-SAME' })
  })

  it('faalt gesloten bij een markerloze historische botsing in plaats van een derde document te maken', async () => {
    let invoiceCreates = 0
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/oauth/token')) return response({ access_token: 'token' })
      if (url.includes(encodeURIComponent(payload().technicalReference))) return response({ data: [] })
      if (url.includes('/invoices?')) return response({ data: [{ id: 'legacy-sent', reference: payload().invoiceNumber, remarks: 'Historische factuur', invoice_number: 'J-LEGACY' }] })
      if (url.endsWith('/invoices')) invoiceCreates += 1
      return response({}, 500)
    })
    await expect(new JorttApiGateway(fetcher as typeof fetch).submitInvoice(payload(), 'legacy-ambiguity')).rejects.toThrow('JORTT_LEGACY_IDENTITY_AMBIGUOUS')
    expect(invoiceCreates).toBe(0)
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
