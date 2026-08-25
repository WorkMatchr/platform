import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { createJorttGateway } from '@/lib/finance/jortt-api-gateway'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { getPrisma } from '@/lib/prisma'

const BRANCH = 'codex/jortt-operationalization'
const INVOICE_ID = '6db08177-7661-4ea2-990f-9fd19a2fba07'
const INVOICE_NUMBER = 'WM-26085003'
const API_BASE = 'https://api.jortt.nl/v3'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'
type RecordValue = Record<string, unknown>

function authorized(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== BRANCH || process.env.JORTT_SYNC_ENVIRONMENT !== 'acceptance') return false
  const expected = process.env.JORTT_FIRST_BOOKING_SECRET
  const supplied = request.headers.get('x-jortt-first-booking-secret')
  return Boolean(expected && supplied && expected.length === supplied.length && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
}

async function accessToken() {
  const clientId = process.env.JORTT_CLIENT_ID
  const clientSecret = process.env.JORTT_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('JORTT_ACCEPTANCE_CONFIGURATION_MISSING')
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'customers:read customers:write invoices:read invoices:write' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error('JORTT_AUTHENTICATION_FAILED')
  const body = await response.json() as { access_token?: string }
  if (!body.access_token) throw new Error('JORTT_ACCESS_TOKEN_MISSING')
  return body.access_token
}

async function get(path: string, token: string) {
  const response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error('JORTT_ACCEPTANCE_READ_FAILED')
  return response.json() as Promise<{ data: RecordValue | RecordValue[] }>
}

function exact(data: RecordValue | RecordValue[], reference: string) {
  return Array.isArray(data) ? data.filter((item) => item.reference === reference) : []
}

function amount(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) && typeof (value as RecordValue).amount === 'string'
    ? (value as RecordValue).amount
    : null
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findUniqueOrThrow({ where: { id: INVOICE_ID }, include: { jorttSync: { include: { attempts: true } } } })
    if (!invoice.jorttSync || invoice.invoiceNumber !== INVOICE_NUMBER) throw new Error('JORTT_READ_PRECONDITION_FAILED')
    const token = await accessToken()
    const matches = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, token)).data, INVOICE_NUMBER)
    const detail = matches.length === 1 && typeof matches[0].id === 'string' ? await get(`/invoices/${encodeURIComponent(matches[0].id)}`, token) : null
    const remote = detail ? (Array.isArray(detail.data) ? detail.data[0] : detail.data) : null
    return NextResponse.json({
      syncStatus: invoice.jorttSync.status,
      attemptCount: invoice.jorttSync.attemptCount,
      remoteInvoiceCount: matches.length,
      remoteId: remote?.id ?? null,
      remoteInvoiceNumber: remote?.invoice_number ?? null,
      remoteStatus: remote?.invoice_status ?? null,
      sendMethod: remote?.send_method ?? null,
      possibleActions: detail && Array.isArray((detail as unknown as RecordValue).possible_actions) ? (detail as unknown as RecordValue).possible_actions : [],
    })
  } catch (error) {
    const safeErrorCode = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message) ? error.message : 'JORTT_READ_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findUnique({
      where: { id: INVOICE_ID },
      include: { lines: { orderBy: { position: 'asc' } }, vatSummaries: true, jorttSync: { include: { attempts: true } } },
    })
    if (!invoice?.jorttSync || invoice.invoiceNumber !== INVOICE_NUMBER || invoice.snapshotVersion !== 2 || invoice.credits !== 50
      || invoice.amountExclVatCents !== 5_000 || invoice.vatAmountCents !== 1_050 || invoice.amountInclVatCents !== 6_050
      || invoice.jorttSync.status !== 'RETRY_REQUIRED' || invoice.jorttSync.attemptCount !== 5
      || invoice.jorttSync.attempts.length !== 5 || invoice.jorttSync.attempts.some((item) => item.status !== 'FAILED')) {
      throw new Error('JORTT_RETRY_PRECONDITION_FAILED')
    }

    const token = await accessToken()
    const customerReference = `workmatchr-org:${invoice.organizationId}`
    const customersBefore = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, token)).data, customerReference)
    const invoicesBefore = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, token)).data, INVOICE_NUMBER)
    if (customersBefore.length !== 1 || invoicesBefore.length !== 1) throw new Error('JORTT_REMOTE_PRECONDITION_FAILED')

    const first = await syncFinancialInvoiceToJortt(INVOICE_ID, createJorttGateway())
    const replay = await syncFinancialInvoiceToJortt(INVOICE_ID, createJorttGateway())
    const stored = await prisma.financialJorttSync.findUniqueOrThrow({ where: { invoiceId: INVOICE_ID }, include: { attempts: { orderBy: { attemptNumber: 'asc' } } } })
    if (stored.status !== 'SYNCED' || !stored.externalReference || !stored.remoteInvoiceNumber) throw new Error('JORTT_RETRY_NOT_SYNCED')

    const customersAfter = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, token)).data, customerReference)
    const invoicesAfter = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, token)).data, INVOICE_NUMBER)
    const result = await get(`/invoices/${encodeURIComponent(stored.externalReference)}`, token)
    const remote = (Array.isArray(result.data) ? result.data[0] : result.data) ?? {}
    const lines = Array.isArray(remote.line_items) ? remote.line_items as RecordValue[] : []

    return NextResponse.json({
      workmatchrInvoiceNumber: invoice.invoiceNumber,
      jorttInvoiceNumber: stored.remoteInvoiceNumber,
      jorttRemoteId: stored.externalReference,
      jorttCustomerId: customersAfter[0]?.id ?? null,
      customerCountBefore: customersBefore.length,
      customerCountAfter: customersAfter.length,
      invoiceCountBefore: invoicesBefore.length,
      invoiceCountAfter: invoicesAfter.length,
      reference: remote.reference ?? null,
      sendMethod: remote.send_method ?? null,
      peppolStatus: remote.peppol_status ?? null,
      amountExclVat: amount(remote.invoice_total),
      amountInclVat: amount(remote.invoice_total_incl_vat),
      vatAmount: amount(remote.invoice_total) && amount(remote.invoice_total_incl_vat)
        ? (Number(amount(remote.invoice_total_incl_vat)) - Number(amount(remote.invoice_total))).toFixed(2)
        : null,
      vatValues: lines.map((line) => (line.vat as RecordValue | undefined)?.value ?? null),
      tradenameId: remote.tradename_id ?? null,
      ledgerAccountIds: [...new Set(lines.map((line) => line.ledger_account_id).filter(Boolean))],
      syncStatus: stored.status,
      attemptCount: stored.attemptCount,
      attemptStatuses: stored.attempts.map((item) => item.status),
      firstStatus: first.status,
      replayStatus: replay.status,
      replayIdempotent: stored.attemptCount === 6 && stored.attempts.length === 6,
    })
  } catch (error) {
    const safeErrorCode = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message) ? error.message : 'JORTT_RETRY_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode }, { status: 500 })
  }
}
