import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { createJorttGateway } from '@/lib/finance/jortt-api-gateway'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { getPrisma } from '@/lib/prisma'

const EXPECTED_BRANCH = 'codex/jortt-operationalization'
const INVOICE_ID = '6db08177-7661-4ea2-990f-9fd19a2fba07'
const INVOICE_NUMBER = 'WM-26085003'
const API_BASE = 'https://api.jortt.nl/v3'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'

type JorttRecord = Record<string, unknown>

function unavailable() {
  return new NextResponse(null, { status: 404 })
}

function authorized(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) return false
  if (process.env.JORTT_SYNC_ENVIRONMENT !== 'acceptance') return false
  const expected = process.env.JORTT_FIRST_BOOKING_SECRET
  const supplied = request.headers.get('x-jortt-first-booking-secret')
  if (!expected || !supplied || expected.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

async function token() {
  const clientId = process.env.JORTT_CLIENT_ID
  const clientSecret = process.env.JORTT_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('JORTT_ACCEPTANCE_CONFIGURATION_MISSING')
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'customers:read customers:write invoices:read invoices:write' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error('JORTT_AUTHENTICATION_FAILED')
  const body = await response.json() as { access_token?: string }
  if (!body.access_token) throw new Error('JORTT_ACCESS_TOKEN_MISSING')
  return body.access_token
}

async function get(path: string, accessToken: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error('JORTT_ACCEPTANCE_READ_FAILED')
  return response.json() as Promise<{ data: JorttRecord | JorttRecord[] }>
}

function exact(data: JorttRecord | JorttRecord[], reference: string) {
  return Array.isArray(data) ? data.filter((item) => item.reference === reference) : []
}

function value(record: JorttRecord, ...keys: string[]) {
  for (const key of keys) {
    const current = record[key]
    if (typeof current === 'string' || typeof current === 'number' || typeof current === 'boolean') return current
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const nested = current as JorttRecord
      for (const nestedKey of ['name', 'label', 'id', 'number']) {
        if (typeof nested[nestedKey] === 'string') return nested[nestedKey]
      }
    }
  }
  return null
}

function lines(record: JorttRecord) {
  const current = record.line_items ?? record.lines ?? record.invoice_lines
  return Array.isArray(current) ? current.filter((item): item is JorttRecord => Boolean(item) && typeof item === 'object') : []
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return unavailable()
  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findUniqueOrThrow({
      where: { id: INVOICE_ID },
      include: { jorttSync: { include: { attempts: { orderBy: { attemptNumber: 'asc' } } } } },
    })
    if (!invoice.jorttSync || invoice.invoiceNumber !== INVOICE_NUMBER) {
      throw new Error('JORTT_FIRST_BOOKING_INVOICE_PRECONDITION_FAILED')
    }
    const accessToken = await token()
    const customerReference = `workmatchr-org:${invoice.organizationId}`
    const customers = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, accessToken)).data, customerReference)
    const invoices = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, accessToken)).data, INVOICE_NUMBER)
    return NextResponse.json({
      syncStatus: invoice.jorttSync.status,
      syncAttemptCount: invoice.jorttSync.attemptCount,
      attemptHistoryCount: invoice.jorttSync.attempts.length,
      attemptStatuses: invoice.jorttSync.attempts.map((attempt) => attempt.status),
      safeErrorCodes: invoice.jorttSync.attempts.map((attempt) => attempt.errorCode),
      customerCount: customers.length,
      invoiceCount: invoices.length,
    })
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'JORTT_FIRST_BOOKING_DIAGNOSTIC_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode: code }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return unavailable()
  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findUnique({
      where: { id: INVOICE_ID },
      include: { lines: { orderBy: { position: 'asc' } }, vatSummaries: true, jorttSync: { include: { attempts: true } } },
    })
    if (!invoice?.jorttSync
      || invoice.invoiceNumber !== INVOICE_NUMBER
      || invoice.snapshotVersion !== 2
      || invoice.documentType !== 'INVOICE'
      || invoice.credits !== 50
      || invoice.amountExclVatCents !== 5_000
      || invoice.vatRateBps !== 2_100
      || invoice.vatAmountCents !== 1_050
      || invoice.amountInclVatCents !== 6_050
      || invoice.jorttSync.status !== 'PENDING'
      || invoice.jorttSync.attempts.length !== 0) {
      throw new Error('JORTT_FIRST_BOOKING_INVOICE_PRECONDITION_FAILED')
    }

    const accessToken = await token()
    const customerReference = `workmatchr-org:${invoice.organizationId}`
    const customersBefore = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, accessToken)).data, customerReference)
    const invoicesBefore = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, accessToken)).data, INVOICE_NUMBER)
    if (customersBefore.length > 1 || invoicesBefore.length > 0) throw new Error('JORTT_FIRST_BOOKING_REMOTE_PRECONDITION_FAILED')

    const first = await syncFinancialInvoiceToJortt(INVOICE_ID, createJorttGateway())
    const replay = await syncFinancialInvoiceToJortt(INVOICE_ID, createJorttGateway())

    const stored = await prisma.financialJorttSync.findUniqueOrThrow({
      where: { invoiceId: INVOICE_ID },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    })
    if (stored.status !== 'SYNCED' || !stored.externalReference || !stored.remoteInvoiceNumber) {
      throw new Error('JORTT_FIRST_BOOKING_NOT_SYNCED')
    }

    const customersAfter = exact((await get(`/customers?query=${encodeURIComponent(customerReference)}`, accessToken)).data, customerReference)
    const invoicesAfter = exact((await get(`/invoices?query=${encodeURIComponent(INVOICE_NUMBER)}`, accessToken)).data, INVOICE_NUMBER)
    const remoteResult = await get(`/invoices/${encodeURIComponent(stored.externalReference)}`, accessToken)
    const remote = Array.isArray(remoteResult.data) ? remoteResult.data[0] : remoteResult.data
    const remoteLines = lines(remote)
    const ledgerAccounts = [...new Set(remoteLines.flatMap((line) => [
      value(line, 'ledger_account_name', 'ledger_account'),
      value(line, 'ledger_account_id'),
    ]).filter((item): item is string | number | boolean => item !== null))]

    return NextResponse.json({
      workmatchrInvoiceNumber: invoice.invoiceNumber,
      jorttInvoiceNumber: stored.remoteInvoiceNumber,
      jorttRemoteId: stored.externalReference,
      jorttCustomerId: customersAfter.length === 1 ? value(customersAfter[0], 'id') : null,
      customerCountBefore: customersBefore.length,
      customerCountAfter: customersAfter.length,
      invoiceCountBefore: invoicesBefore.length,
      invoiceCountAfter: invoicesAfter.length,
      referenceMatches: remote.reference === invoice.invoiceNumber,
      remoteInvoiceNumberMatches: remote.invoice_number === stored.remoteInvoiceNumber,
      sendMethod: value(remote, 'send_method', 'sendMethod'),
      emailRequested: false,
      peppolRequested: false,
      snapshotVersion: invoice.snapshotVersion,
      invoiceDate: invoice.issuedAt.toISOString(),
      remoteInvoiceDate: value(remote, 'invoice_date', 'date'),
      amountExclVatCents: invoice.amountExclVatCents,
      vatRateBps: invoice.vatRateBps,
      vatAmountCents: invoice.vatAmountCents,
      amountInclVatCents: invoice.amountInclVatCents,
      lineCount: invoice.lines.length,
      vatSummaryCount: invoice.vatSummaries.length,
      remoteLineCount: remoteLines.length,
      tradename: value(remote, 'tradename_name', 'tradename', 'tradename_id'),
      ledgerAccounts,
      remoteFieldNames: Object.keys(remote).sort(),
      remoteLineFieldNames: remoteLines.length ? Object.keys(remoteLines[0]).sort() : [],
      syncStatus: stored.status,
      syncAttemptCount: stored.attemptCount,
      attemptHistoryCount: stored.attempts.length,
      attemptStatuses: stored.attempts.map((attempt) => attempt.status),
      firstStatus: first.status,
      replayStatus: replay.status,
      replayIdempotent: stored.attemptCount === 1 && stored.attempts.length === 1,
    })
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'JORTT_FIRST_BOOKING_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode: code }, { status: 500 })
  }
}
