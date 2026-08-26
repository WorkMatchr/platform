import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { JorttApiGateway } from '@/lib/finance/jortt-api-gateway'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { getPrisma } from '@/lib/prisma'

const BRANCH = 'codex/jortt-operationalization'
const INVOICE_ID = '40d48ea1-b1ec-415f-be93-4c9959514077'
const INVOICE_NUMBER = 'WM-26085004'
const API_BASE = 'https://api.jortt.nl/v3'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'
type JorttRecord = Record<string, unknown>

function authorized(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== BRANCH
    || process.env.JORTT_SYNC_ENVIRONMENT !== 'acceptance') return false
  const expected = process.env.JORTT_FIRST_BOOKING_SECRET
  const supplied = request.headers.get('x-jortt-first-booking-secret')
  return Boolean(expected && supplied && expected.length === supplied.length
    && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
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
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error('JORTT_ACCEPTANCE_READ_FAILED')
  return response.json() as Promise<{ data: JorttRecord | JorttRecord[] }>
}

function exact(data: JorttRecord | JorttRecord[], reference: string) {
  return Array.isArray(data) ? data.filter((item) => item.reference === reference) : []
}

function amount(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && typeof (value as JorttRecord).amount === 'string' ? (value as JorttRecord).amount : null
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findUnique({
      where: { id: INVOICE_ID },
      include: { lines: true, vatSummaries: true, jorttSync: { include: { attempts: true } } },
    })
    if (!invoice?.jorttSync || invoice.invoiceNumber !== INVOICE_NUMBER || invoice.snapshotVersion !== 2
      || invoice.amountExclVatCents !== 5_000 || invoice.vatAmountCents !== 1_050
      || invoice.amountInclVatCents !== 6_050 || invoice.credits !== 50
      || invoice.lines.length !== 1 || invoice.vatSummaries.length !== 1
      || invoice.jorttSync.status !== 'PENDING' || invoice.jorttSync.attemptCount !== 0
      || invoice.jorttSync.attempts.length !== 0) throw new Error('JORTT_CORRECTED_ACCEPTANCE_PRECONDITION_FAILED')

    const token = await accessToken()
    const customerReference = `workmatchr-org:${invoice.organizationId}`
    const customersBefore = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, token)).data, customerReference)
    const invoicesBefore = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, token)).data, INVOICE_NUMBER)
    if (customersBefore.length !== 1 || invoicesBefore.length !== 0) throw new Error('JORTT_CORRECTED_REMOTE_PRECONDITION_FAILED')

    const first = await syncFinancialInvoiceToJortt(INVOICE_ID, new JorttApiGateway())
    const replay = await syncFinancialInvoiceToJortt(INVOICE_ID, new JorttApiGateway())
    const stored = await prisma.financialJorttSync.findUniqueOrThrow({
      where: { invoiceId: INVOICE_ID },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    })
    const customersAfter = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, token)).data, customerReference)
    const invoicesAfter = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, token)).data, INVOICE_NUMBER)
    if (!stored.externalReference) throw new Error('JORTT_CORRECTED_REMOTE_ID_MISSING')
    const remoteResult = await get(`/invoices/${stored.externalReference}`, token)
    const remote = Array.isArray(remoteResult.data) ? remoteResult.data[0] : remoteResult.data
    const lines = Array.isArray(remote.line_items) ? remote.line_items as JorttRecord[] : []

    return NextResponse.json({
      workmatchrInvoiceNumber: invoice.invoiceNumber,
      jorttInvoiceNumber: stored.remoteInvoiceNumber,
      jorttRemoteId: stored.externalReference,
      customerCountBefore: customersBefore.length,
      customerCountAfter: customersAfter.length,
      invoiceCountBefore: invoicesBefore.length,
      invoiceCountAfter: invoicesAfter.length,
      reference: remote.reference ?? null,
      remoteStatus: remote.invoice_status ?? null,
      sendMethod: remote.send_method ?? null,
      peppolStatus: remote.peppol_status ?? null,
      amountExclVat: amount(remote.invoice_total),
      amountInclVat: amount(remote.invoice_total_incl_vat),
      vatValues: lines.map((line) => (line.vat as JorttRecord | undefined)?.value ?? null),
      tradenameId: remote.tradename_id ?? null,
      ledgerAccountIds: [...new Set(lines.map((line) => line.ledger_account_id).filter(Boolean))],
      syncStatus: stored.status,
      attemptCount: stored.attemptCount,
      attemptStatuses: stored.attempts.map((item) => item.status),
      firstStatus: first.status,
      replayStatus: replay.status,
      replayIdempotent: customersAfter.length === customersBefore.length && invoicesAfter.length === 1
        && stored.attemptCount === 1 && stored.attempts.length === 1,
    })
  } catch (error) {
    const safeErrorCode = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'JORTT_CORRECTED_ACCEPTANCE_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode }, { status: 500 })
  }
}
