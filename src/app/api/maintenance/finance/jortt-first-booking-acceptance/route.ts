import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { createJorttGateway } from '@/lib/finance/jortt-api-gateway'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { getPrisma } from '@/lib/prisma'

const EXPECTED_BRANCH = 'codex/jortt-operationalization'
const API_BASE = 'https://api.jortt.nl/v3'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'

type JorttRecord = Record<string, unknown>

function unavailable() {
  return new NextResponse(null, { status: 404 })
}

function authorized(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) return false
  if (process.env.JORTT_SYNC_ENVIRONMENT !== 'acceptance') return false
  const expected = process.env.JORTT_ACCEPTANCE_TEST_SECRET
  const supplied = request.headers.get('x-jortt-acceptance-secret')
  if (!expected || !supplied || expected.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

async function jorttToken() {
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

async function jorttGet(path: string, token: string) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error('JORTT_ACCEPTANCE_READ_FAILED')
  return response.json() as Promise<{ data: JorttRecord | JorttRecord[] }>
}

function stringField(record: JorttRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (value && typeof value === 'object') {
      const nested = value as JorttRecord
      for (const nestedKey of ['name', 'label', 'id', 'number']) {
        if (typeof nested[nestedKey] === 'string' && nested[nestedKey]) return nested[nestedKey] as string
      }
    }
  }
  return null
}

function lineRecords(record: JorttRecord) {
  const value = record.line_items ?? record.lines ?? record.invoice_lines
  return Array.isArray(value) ? value.filter((item): item is JorttRecord => Boolean(item) && typeof item === 'object') : []
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return unavailable()

  try {
    const prisma = getPrisma()
    const invoice = await prisma.financialInvoice.findFirst({
      where: {
        snapshotVersion: 2,
        documentType: 'INVOICE',
        pricingMode: 'MOLLIE_TEST_ACCEPTANCE',
        purchase: { is: { kind: 'CREDIT_PACKAGE', status: 'PAID' } },
        jorttSync: { is: { status: 'PENDING' } },
      },
      include: {
        lines: { orderBy: { position: 'asc' } },
        vatSummaries: true,
        jorttSync: true,
      },
      orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
    })
    if (!invoice?.jorttSync) throw new Error('JORTT_ACCEPTANCE_INVOICE_NOT_FOUND')

    const token = await jorttToken()
    const customerReference = `workmatchr-org:${invoice.organizationId}`
    const customersBefore = await jorttGet(`/customers?query=${encodeURIComponent(customerReference)}`, token)
    const exactCustomersBefore = Array.isArray(customersBefore.data)
      ? customersBefore.data.filter((item) => item.reference === customerReference)
      : []
    const invoicesBefore = await jorttGet(`/invoices?query=${encodeURIComponent(invoice.invoiceNumber)}`, token)
    const exactInvoicesBefore = Array.isArray(invoicesBefore.data)
      ? invoicesBefore.data.filter((item) => item.reference === invoice.invoiceNumber)
      : []
    if (exactCustomersBefore.length > 1 || exactInvoicesBefore.length > 0) throw new Error('JORTT_ACCEPTANCE_PREEXISTING_REMOTE_CONFLICT')

    const first = await syncFinancialInvoiceToJortt(invoice.id, createJorttGateway())
    const replay = await syncFinancialInvoiceToJortt(invoice.id, createJorttGateway())

    const stored = await prisma.financialJorttSync.findUniqueOrThrow({
      where: { invoiceId: invoice.id },
      include: { attempts: { orderBy: { attemptNumber: 'asc' } } },
    })
    if (!stored.externalReference || !stored.remoteInvoiceNumber) throw new Error('JORTT_ACCEPTANCE_REMOTE_IDENTITY_MISSING')

    const customersAfter = await jorttGet(`/customers?query=${encodeURIComponent(customerReference)}`, token)
    const exactCustomersAfter = Array.isArray(customersAfter.data)
      ? customersAfter.data.filter((item) => item.reference === customerReference)
      : []
    const invoicesAfter = await jorttGet(`/invoices?query=${encodeURIComponent(invoice.invoiceNumber)}`, token)
    const exactInvoicesAfter = Array.isArray(invoicesAfter.data)
      ? invoicesAfter.data.filter((item) => item.reference === invoice.invoiceNumber)
      : []
    const remoteResult = await jorttGet(`/invoices/${encodeURIComponent(stored.externalReference)}`, token)
    const remote = Array.isArray(remoteResult.data) ? remoteResult.data[0] : remoteResult.data
    const remoteLines = lineRecords(remote)
    const ledgerValues = [...new Set(remoteLines.map((line) => stringField(line, 'ledger_account', 'ledger_account_id', 'ledger')).filter(Boolean))]

    return NextResponse.json({
      status: stored.status,
      workmatchrInvoiceNumber: invoice.invoiceNumber,
      jorttInvoiceNumber: stored.remoteInvoiceNumber,
      jorttRemoteId: stored.externalReference,
      customerCountBefore: exactCustomersBefore.length,
      customerCountAfter: exactCustomersAfter.length,
      customerResult: exactCustomersBefore.length === 0 ? 'CREATED' : 'REUSED',
      invoiceCountBefore: exactInvoicesBefore.length,
      invoiceCountAfter: exactInvoicesAfter.length,
      referenceMatches: remote.reference === invoice.invoiceNumber,
      remoteInvoiceNumberMatches: remote.invoice_number === stored.remoteInvoiceNumber,
      sendMethod: stringField(remote, 'send_method', 'sendMethod'),
      emailDeliveryRequested: false,
      peppolDeliveryRequested: false,
      issuedAt: invoice.issuedAt.toISOString(),
      remoteInvoiceDate: stringField(remote, 'invoice_date', 'date'),
      snapshotVersion: invoice.snapshotVersion,
      amountExclVatCents: invoice.amountExclVatCents,
      vatRateBps: invoice.vatRateBps,
      vatAmountCents: invoice.vatAmountCents,
      amountInclVatCents: invoice.amountInclVatCents,
      vatSummaries: invoice.vatSummaries.map((item) => ({
        vatRateBps: item.vatRateBps,
        taxableAmountExclVatCents: item.taxableAmountExclVatCents,
        vatAmountCents: item.vatAmountCents,
        amountInclVatCents: item.amountInclVatCents,
      })),
      lineCount: invoice.lines.length,
      attemptCount: stored.attemptCount,
      storedAttemptCount: stored.attempts.length,
      firstResultStatus: first.status,
      replayResultStatus: replay.status,
      replayWasIdempotent: stored.attempts.length === 1 && stored.attemptCount === 1,
      tradename: stringField(remote, 'tradename', 'tradename_name', 'tradename_id'),
      ledgerAccounts: ledgerValues,
      configuredTradename: Boolean(process.env.JORTT_TRADENAME_ID),
      configuredLedgerAccount: Boolean(process.env.JORTT_REVENUE_LEDGER_ACCOUNT_ID),
    })
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'JORTT_ACCEPTANCE_BOOKING_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode: code }, { status: 500 })
  }
}
