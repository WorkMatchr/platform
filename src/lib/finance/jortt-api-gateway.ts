import 'server-only'

import type { JorttGateway, JorttInvoicePayload } from './jortt-sync-service'

type Fetcher = typeof fetch
type JorttRecord = { id: string; reference?: string | null; invoice_number?: string | null }

const API_BASE = 'https://api.jortt.nl/v3'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'
const money = (cents: number) => (cents / 100).toFixed(2)
const date = (iso: string) => iso.slice(0, 10)

function configuration() {
  const clientId = process.env.JORTT_CLIENT_ID
  const clientSecret = process.env.JORTT_CLIENT_SECRET
  const environment = process.env.JORTT_SYNC_ENVIRONMENT
  const expected = process.env.VERCEL_ENV === 'production' ? 'production' : 'acceptance'
  if (!clientId || !clientSecret || environment !== expected) throw new Error('JORTT_EXTERNAL_CONNECTOR_NOT_CONFIGURED')
  if (expected === 'production' && process.env.JORTT_PRODUCTION_WRITES_ENABLED !== 'true') throw new Error('JORTT_PRODUCTION_WRITES_DISABLED')
  return { clientId, clientSecret, tradenameId: process.env.JORTT_TRADENAME_ID || undefined, ledgerAccountId: process.env.JORTT_REVENUE_LEDGER_ACCOUNT_ID || undefined }
}

export function isJorttSyncConfigured() {
  try {
    configuration()
    return true
  } catch {
    return false
  }
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(response.status === 429 || response.status >= 500 ? 'JORTT_TEMPORARY_PROVIDER_ERROR' : 'JORTT_PROVIDER_REJECTED')
  return response.json() as Promise<T>
}

export class JorttApiGateway implements JorttGateway {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  private async token() {
    const config = configuration()
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'customers:read customers:write invoices:read invoices:write' })
    const response = await this.fetcher(TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(10_000) })
    const result = await json<{ access_token?: string }>(response)
    if (!result.access_token) throw new Error('JORTT_AUTHENTICATION_FAILED')
    return { accessToken: result.access_token, config }
  }

  private async request<T>(path: string, accessToken: string, init: RequestInit = {}) {
    return json<T>(await this.fetcher(`${API_BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(15_000) }))
  }

  private async findExact(path: 'customers' | 'invoices', reference: string, accessToken: string) {
    const result = await this.request<{ data: JorttRecord[] }>(`/${path}?query=${encodeURIComponent(reference)}`, accessToken)
    const matches = result.data.filter((item) => item.reference === reference)
    if (matches.length > 1) throw new Error('JORTT_REFERENCE_CONFLICT')
    return matches[0] ?? null
  }

  async submitInvoice(payload: JorttInvoicePayload, _idempotencyKey: string) {
    void _idempotencyKey
    if (payload.documentType === 'INVOICE') {
      const lineExclVat = payload.lines.reduce((total, line) => total + line.netAmountExclVatCents, 0)
      const lineVat = payload.lines.reduce((total, line) => total + line.vatAmountCents, 0)
      if (lineExclVat !== payload.amountExclVatCents || lineVat !== payload.vatAmountCents || lineExclVat + lineVat !== payload.amountInclVatCents) {
        throw new Error('JORTT_INVOICE_TOTAL_MISMATCH')
      }
    }
    const { accessToken, config } = await this.token()
    const existing = await this.findExact('invoices', payload.invoiceNumber, accessToken)
    if (existing) {
      const remote = await this.request<{ data: JorttRecord }>(`/invoices/${existing.id}`, accessToken)
      if (remote.data.reference !== payload.invoiceNumber) throw new Error('JORTT_REFERENCE_CONFLICT')
      if (!remote.data.invoice_number) throw new Error('JORTT_REMOTE_INVOICE_PENDING')
      return { externalReference: remote.data.id, remoteInvoiceNumber: remote.data.invoice_number }
    }

    let remoteId: string
    if (payload.documentType === 'CREDIT_NOTE') {
      if (!payload.originalInvoiceExternalReference) throw new Error('JORTT_ORIGINAL_INVOICE_NOT_SYNCED')
      const created = await this.request<{ data: { id: string } }>(`/invoices/${payload.originalInvoiceExternalReference}/credit`, accessToken, { method: 'POST', body: JSON.stringify({}) })
      remoteId = created.data.id
      await this.request(`/invoices/${remoteId}`, accessToken, { method: 'PUT', body: JSON.stringify({ reference: payload.invoiceNumber, remarks: `WorkMatchr creditnota ${payload.invoiceNumber}` }) })
      await this.request(`/invoices/${remoteId}/send`, accessToken, { method: 'POST', body: JSON.stringify({ send_method: 'self' }) })
    } else {
      const customerReference = `workmatchr-org:${payload.organizationId}`
      let customer = await this.findExact('customers', customerReference, accessToken)
      if (!customer) {
        const created = await this.request<{ data: { id: string } }>('/customers', accessToken, { method: 'POST', body: JSON.stringify({ is_private: false, customer_name: payload.customer.organizationName, address_street: payload.customer.addressLine, address_postal_code: payload.customer.postalCode, address_city: payload.customer.city, address_country_code: payload.customer.countryCode, shift_vat: false, vat_number: payload.customer.vatId ?? undefined, coc_number: payload.customer.kvkNumber ?? undefined, payment_method_invoice: 'already_paid', reference: customerReference, default_ledger_account_id: config.ledgerAccountId }) })
        customer = { id: created.data.id, reference: customerReference }
      }
      const lineItems = payload.lines.flatMap((line) => [
        { description: `${line.description} (${line.unit})`, quantity: String(line.quantity), amount: { amount: money(line.unitPriceExclVatCents), currency: payload.currency }, vat: { value: line.vatRateBps / 10_000, category: null }, ledger_account_id: config.ledgerAccountId },
        ...(line.discountAmountCents > 0 ? [{ description: `Korting op ${line.description}`, quantity: '1', amount: { amount: money(-line.discountAmountCents), currency: payload.currency }, vat: { value: line.vatRateBps / 10_000, category: null }, ledger_account_id: config.ledgerAccountId }] : []),
      ])
      const created = await this.request<{ data: { id: string } }>('/invoices', accessToken, { method: 'POST', body: JSON.stringify({ customer_id: customer.id, invoice_date: date(payload.issuedAt), delivery_period: payload.servicePeriodStart ? date(payload.servicePeriodStart) : payload.supplyDate ? date(payload.supplyDate) : date(payload.issuedAt), delivery_period_end: payload.servicePeriodEnd ? date(payload.servicePeriodEnd) : undefined, tradename_id: config.tradenameId, net_amounts: true, send_method: 'self', payment_method: 'already_paid', reference: payload.invoiceNumber, remarks: payload.paymentReference ? `WorkMatchr ${payload.invoiceNumber}; Mollie ${payload.paymentReference}` : `WorkMatchr ${payload.invoiceNumber}`, line_items: lineItems }) })
      remoteId = created.data.id
    }
    const remote = await this.request<{ data: JorttRecord }>(`/invoices/${remoteId}`, accessToken)
    if (!remote.data.invoice_number || remote.data.reference !== payload.invoiceNumber) throw new Error('JORTT_REMOTE_INVOICE_NOT_FINAL')
    return { externalReference: remote.data.id, remoteInvoiceNumber: remote.data.invoice_number }
  }
}

export function createJorttGateway(): JorttGateway {
  return new JorttApiGateway()
}
