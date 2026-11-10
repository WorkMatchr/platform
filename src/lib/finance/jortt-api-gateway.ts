import 'server-only'

import type { JorttPaymentEvidence, JorttPaymentGateway } from './jortt-payment-service'
import type { JorttGateway, JorttInvoicePayload, JorttCreditCheckpoint } from './jortt-sync-service'
import { jorttFetch, jorttJson, jorttOperation } from './jortt-provider-diagnostics'

type Fetcher = typeof fetch
type JorttRecord = { id: string; reference?: string | null; remarks?: string | null; invoice_number?: string | null; invoice_status?: string | null; send_method?: string | null }

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

export class JorttApiGateway implements JorttGateway, JorttPaymentGateway {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  private async token() {
    const config = configuration()
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: 'customers:read customers:write invoices:read invoices:write organizations:read' })
    const response = await jorttFetch(this.fetcher, 'AUTH', TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(10_000) })
    const result = await jorttJson<{ access_token?: string }>(response, 'AUTH')
    if (!result.access_token) throw new Error('JORTT_AUTHENTICATION_FAILED')
    return { accessToken: result.access_token, config }
  }

  private async request<T>(path: string, accessToken: string, init: RequestInit = {}) {
    const operation = jorttOperation(path, init.method)
    return jorttJson<T>(await jorttFetch(this.fetcher, operation, `${API_BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, signal: AbortSignal.timeout(15_000) }), operation)
  }

  private async findExact(path: 'customers', reference: string, accessToken: string) {
    const result = await this.request<{ data: JorttRecord[] }>(`/${path}?query=${encodeURIComponent(reference)}`, accessToken)
    const matches = result.data.filter((item) => item.reference === reference)
    if (matches.length > 1) throw new Error('JORTT_REFERENCE_CONFLICT')
    return matches[0] ?? null
  }

  private async findTechnicalInvoice(technicalReference: string, accessToken: string) {
    const result = await this.request<{ data: JorttRecord[] }>(`/invoices?query=${encodeURIComponent(technicalReference)}`, accessToken)
    const matches = [...new Map(result.data
      .filter((item) => item.remarks?.includes(technicalReference))
      .map((item) => [item.id, item])).values()]
    if (matches.length > 1) throw new Error('JORTT_TECHNICAL_IDENTITY_CONFLICT')
    return matches[0] ?? null
  }

  private async findByHumanReferenceFallback(payload: JorttInvoicePayload, accessToken: string) {
    const result = await this.request<{ data: JorttRecord[] }>(`/invoices?query=${encodeURIComponent(payload.invoiceNumber)}`, accessToken)
    const matches = [...new Map(result.data
      .filter((item) => item.reference === payload.invoiceNumber)
      .map((item) => [item.id, item])).values()]
    const technicalMatches = matches.filter((item) => item.remarks?.includes(payload.technicalReference))
    if (technicalMatches.length > 1) throw new Error('JORTT_TECHNICAL_IDENTITY_CONFLICT')
    if (technicalMatches.length === 1) return technicalMatches[0]
    if (matches.some((item) => !item.remarks?.includes('workmatchr-invoice:'))) {
      throw new Error('JORTT_LEGACY_IDENTITY_AMBIGUOUS')
    }
    return null
  }

  private validateIdentity(remote: JorttRecord, payload: JorttInvoicePayload, allowLegacyWithoutMarker = false) {
    if (remote.reference !== payload.invoiceNumber) throw new Error('JORTT_REFERENCE_CONFLICT')
    const hasMarker = remote.remarks?.includes(payload.technicalReference) ?? false
    if (!hasMarker && !allowLegacyWithoutMarker) throw new Error('JORTT_TECHNICAL_IDENTITY_CONFLICT')
  }

  private async sendSelf(invoiceId: string, accessToken: string) {
    await jorttFetch(this.fetcher, 'INVOICE_FINALIZE', `${API_BASE}/invoices/${invoiceId}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ send_method: 'self' }),
      signal: AbortSignal.timeout(15_000),
    })
  }

  private async waitForFinalInvoice(invoiceId: string, payload: JorttInvoicePayload, accessToken: string) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const remote = await this.request<{ data: JorttRecord }>(`/invoices/${invoiceId}`, accessToken)
      this.validateIdentity(remote.data, payload)
      if (remote.data.invoice_number) return remote.data
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    throw new Error('JORTT_REMOTE_INVOICE_PENDING')
  }



  private async submitProCredit(payload: JorttInvoicePayload, token: string, checkpoint?: JorttCreditCheckpoint) {
    if (process.env.PRO_FINANCIAL_CORRECTIONS_ENABLED !== 'true' || !checkpoint) throw new Error('PRO_FINANCIAL_CORRECTIONS_DISABLED')
    if (!payload.originalInvoiceExternalReference || payload.documentType !== 'CREDIT_NOTE') throw new Error('JORTT_ORIGINAL_INVOICE_NOT_SYNCED')
    type CreditRecord = JorttRecord & { credited_invoice_id: string; invoice_total_incl_vat: { amount: string; currency: string }; invoice_total: { amount: string; currency: string } }
    let id = payload.knownExternalReference ?? (await this.findTechnicalInvoice(payload.technicalReference, token))?.id
    if (!id) {
      await checkpoint.claimCreation()
      const draft = await this.request<{ data: { id: string } }>(`/invoices/${payload.originalInvoiceExternalReference}/credit`, token, { method: 'POST', body: '{}' })
      id = draft.data.id
      await checkpoint.saveDraftId(id)
    }
    let remote = (await this.request<{ data: CreditRecord }>(`/invoices/${id}`, token)).data
    if (remote.credited_invoice_id !== payload.originalInvoiceExternalReference) throw new Error('JORTT_CREDIT_SOURCE_MISMATCH')
    if (remote.invoice_status === 'draft') {
      await this.request(`/invoices/${id}`, token, { method: 'PUT', body: JSON.stringify({ reference: payload.invoiceNumber,
        invoice_date: date(payload.issuedAt), net_amounts: false, remarks: payload.technicalReference,
        line_items: payload.lines.map(line => ({ description: line.description, quantity: String(line.quantity),
          amount: { amount: money(line.unitPriceExclVatCents), currency: payload.currency }, vat: { value: String(line.vatRateBps / 10000), category: null } })),
      }) })
      remote = (await this.request<{ data: CreditRecord }>(`/invoices/${id}`, token)).data
    }
    this.validateIdentity(remote, payload)
    if (remote.credited_invoice_id !== payload.originalInvoiceExternalReference
      || remote.invoice_total_incl_vat.amount !== money(payload.amountInclVatCents)
      || remote.invoice_total.amount !== money(payload.amountExclVatCents)
      || remote.invoice_total_incl_vat.currency !== payload.currency || remote.invoice_total.currency !== payload.currency) throw new Error('JORTT_CREDIT_TOTAL_MISMATCH')
    if (!remote.invoice_number && remote.invoice_status === 'draft') await this.sendSelf(id, token)
    const finalized = remote.invoice_number ? remote : await this.waitForFinalInvoice(id, payload, token)
    return { externalReference: id, remoteInvoiceNumber: finalized.invoice_number! }
  }

  async inspectPayment(invoiceId: string): Promise<JorttPaymentEvidence> {
    if (process.env.JORTT_PAYMENT_RECONCILIATION_ENABLED !== 'true') throw new Error('JORTT_PAYMENT_RECONCILIATION_DISABLED')
    const { accessToken } = await this.token()
    const invoice = await this.request<{ data: { id: string; reference: string; invoice_total_incl_vat: { amount: string; currency: string }; invoice_due_amount: { amount: string; currency: string } } }>(`/invoices/${invoiceId}`, accessToken)
    const payments = await this.request<{ data: Array<{ booking_id: string; description: string; amount: { amount: string; currency: string }; ledger_account_id: string | null; book_date: string }> }>(`/payments/${invoiceId}`, accessToken)
    const accounts = await this.request<{ data: Array<{ ledger_account_id: string }> }>(`/invoices/${invoiceId}/payment_methods/ledger_accounts`, accessToken)
    const cents = (value: string) => {
      if (!/^-?\d+\.\d{2}$/.test(value)) throw new Error('JORTT_PAYMENT_AMOUNT_INVALID')
      const result = Math.round(Number(value) * 100)
      if (!Number.isSafeInteger(result)) throw new Error('JORTT_PAYMENT_AMOUNT_INVALID')
      return result
    }
    const currency = invoice.data.invoice_total_incl_vat.currency
    if (invoice.data.invoice_due_amount.currency !== currency || payments.data.some(p => p.amount.currency !== currency)) throw new Error('JORTT_PAYMENT_CURRENCY_MISMATCH')
    return { id: invoice.data.id, reference: invoice.data.reference, totalCents: cents(invoice.data.invoice_total_incl_vat.amount),
      dueCents: cents(invoice.data.invoice_due_amount.amount), currency,
      bookings: payments.data.map(p => ({ id: p.booking_id, description: p.description, amountCents: cents(p.amount.amount), ledgerAccountId: p.ledger_account_id, bookDate: p.book_date })),
      allowedLedgerAccounts: accounts.data.map(a => a.ledger_account_id) }
  }

  async registerPayment(input: { invoiceId: string; amountCents: number; ledgerAccountId: string; bookDate: string; reference: string }) {
    if (process.env.JORTT_PAYMENT_RECONCILIATION_ENABLED !== 'true') throw new Error('JORTT_PAYMENT_RECONCILIATION_DISABLED')
    const { accessToken } = await this.token()
    const result = await this.request<{ data: { booking_id: string } }>('/payments/register', accessToken, { method: 'POST', body: JSON.stringify({
      sink_id: input.invoiceId, amount: { amount: money(input.amountCents), currency: 'EUR' }, ledger_account_id: input.ledgerAccountId,
      book_date: input.bookDate, description: input.reference,
    }) })
    if (!result.data.booking_id) throw new Error('JORTT_PAYMENT_CONFIRMATION_MISSING')
    return { bookingId: result.data.booking_id }
  }

  async submitInvoice(payload: JorttInvoicePayload, _idempotencyKey: string, checkpoint?: JorttCreditCheckpoint) {
    void _idempotencyKey
    if (payload.documentType === 'INVOICE') {
      const lineExclVat = payload.lines.reduce((total, line) => total + line.netAmountExclVatCents, 0)
      const lineVat = payload.lines.reduce((total, line) => total + line.vatAmountCents, 0)
      if (lineExclVat !== payload.amountExclVatCents || lineVat !== payload.vatAmountCents || lineExclVat + lineVat !== payload.amountInclVatCents) {
        throw new Error('JORTT_INVOICE_TOTAL_MISMATCH')
      }
    }
    const { accessToken, config } = await this.token()
    if (payload.proCredit) return this.submitProCredit(payload, accessToken, checkpoint)
    if (payload.knownExternalReference) {
      const known = await this.request<{ data: JorttRecord }>(`/invoices/${payload.knownExternalReference}`, accessToken)
      this.validateIdentity(known.data, payload, true)
      if (known.data.invoice_number) return { externalReference: known.data.id, remoteInvoiceNumber: known.data.invoice_number }
      if (known.data.invoice_status === 'draft') {
        const remarks = [known.data.remarks, payload.technicalReference].filter(Boolean).join('; ')
        await this.request(`/invoices/${known.data.id}`, accessToken, { method: 'PUT', body: JSON.stringify({ reference: payload.invoiceNumber, remarks }) })
        await this.sendSelf(known.data.id, accessToken)
      }
      const finalized = await this.waitForFinalInvoice(known.data.id, payload, accessToken)
      return { externalReference: finalized.id, remoteInvoiceNumber: finalized.invoice_number! }
    }
    const existing = await this.findTechnicalInvoice(payload.technicalReference, accessToken)
      ?? await this.findByHumanReferenceFallback(payload, accessToken)
    if (existing) {
      const remote = await this.request<{ data: JorttRecord }>(`/invoices/${existing.id}`, accessToken)
      this.validateIdentity(remote.data, payload)
      if (remote.data.invoice_number) return { externalReference: remote.data.id, remoteInvoiceNumber: remote.data.invoice_number }
      if (remote.data.invoice_status === 'draft') await this.sendSelf(remote.data.id, accessToken)
      const finalized = await this.waitForFinalInvoice(remote.data.id, payload, accessToken)
      return { externalReference: finalized.id, remoteInvoiceNumber: finalized.invoice_number! }
    }
    const invoiceDate = payload.academyTaxTreatment ? (iso:string) => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso)) : date
    let remoteId: string
    if (payload.documentType === 'CREDIT_NOTE') {
      if (!payload.originalInvoiceExternalReference) throw new Error('JORTT_ORIGINAL_INVOICE_NOT_SYNCED')
      const created = await this.request<{ data: { id: string } }>(`/invoices/${payload.originalInvoiceExternalReference}/credit`, accessToken, { method: 'POST', body: JSON.stringify({}) })
      remoteId = created.data.id
      await this.request(`/invoices/${remoteId}`, accessToken, { method: 'PUT', body: JSON.stringify({ reference: payload.invoiceNumber, remarks: `WorkMatchr creditnota ${payload.invoiceNumber}; ${payload.technicalReference}` }) })
      await this.sendSelf(remoteId, accessToken)
    } else {
      const customerReference = !payload.organizationId ? 'workmatchr-private-invoice:' + payload.invoiceId : `workmatchr-org:${payload.organizationId}`
      let customer = await this.findExact('customers', customerReference, accessToken)
      if (!customer) {
        const created = await this.request<{ data: { id: string } }>('/customers', accessToken, { method: 'POST', body: JSON.stringify({ is_private: !payload.organizationId, customer_name: payload.customer.organizationName, address_street: payload.customer.addressLine, address_postal_code: payload.customer.postalCode, address_city: payload.customer.city, address_country_code: payload.customer.countryCode, shift_vat: false, vat_number: payload.customer.vatId ?? undefined, coc_number: payload.customer.kvkNumber ?? undefined, payment_method_invoice: 'already_paid', reference: customerReference, default_ledger_account_id: config.ledgerAccountId }) })
        customer = { id: created.data.id, reference: customerReference }
      }
      const lineItems = payload.lines.flatMap((line) => [
        { description: `${line.description} (${line.unit})`, quantity: String(line.quantity), amount: { amount: money(line.unitPriceExclVatCents), currency: payload.currency }, vat: { value: String(line.vatRateBps / 10_000), category: payload.academyTaxTreatment === "NL_KOR" ? "exempt" : null }, ledger_account_id: config.ledgerAccountId },
        ...(line.discountAmountCents > 0 ? [{ description: `Korting op ${line.description}`, quantity: '1', amount: { amount: money(-line.discountAmountCents), currency: payload.currency }, vat: { value: String(line.vatRateBps / 10_000), category: payload.academyTaxTreatment === "NL_KOR" ? "exempt" : null }, ledger_account_id: config.ledgerAccountId }] : []),
      ])
      const created = await this.request<{ data: { id: string } }>('/invoices', accessToken, { method: 'POST', body: JSON.stringify({ customer_id: customer.id, invoice_date: invoiceDate(payload.issuedAt), delivery_period: payload.servicePeriodStart ? date(payload.servicePeriodStart) : payload.supplyDate ? invoiceDate(payload.supplyDate) : invoiceDate(payload.issuedAt), delivery_period_end: payload.servicePeriodEnd ? date(payload.servicePeriodEnd) : undefined, tradename_id: config.tradenameId, net_amounts: false, payment_method: 'already_paid', reference: payload.invoiceNumber, ...(payload.academyTaxTreatment === 'NL_KOR' ? { introduction: 'Feenstra Safety Consulting past de kleineondernemersregeling (KOR) toe.' } : {}), remarks: payload.paymentReference ? `WorkMatchr ${payload.invoiceNumber}; ${payload.technicalReference}; Mollie ${payload.paymentReference}` : `WorkMatchr ${payload.invoiceNumber}; ${payload.technicalReference}`, line_items: lineItems }) })
      remoteId = created.data.id
      await this.sendSelf(remoteId, accessToken)
    }
    const remote = await this.waitForFinalInvoice(remoteId, payload, accessToken)
    return { externalReference: remote.id, remoteInvoiceNumber: remote.invoice_number! }
  }
}

export function createJorttGateway(): JorttGateway {
  return new JorttApiGateway()
}
