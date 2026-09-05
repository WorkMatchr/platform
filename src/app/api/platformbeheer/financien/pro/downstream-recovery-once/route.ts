import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const runtime = 'nodejs'

const subscriptionId = '56f0fa14-ca6d-4851-a8be-942e44d99d39'
const purchaseId = '4ef12193-9a6e-4e76-bf9d-1f7cecc5353e'
const invoiceId = '83eeffbb-380d-440f-a368-69b1aa652b19'
const invoiceNumber = 'WM-26095005'

async function requireExactAcceptanceTarget() {
  const invoice = await getPrisma().financialInvoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      snapshotVersion: true,
      amountExclVatCents: true,
      vatAmountCents: true,
      amountInclVatCents: true,
      customerOrganizationName: true,
      customerAddressLine: true,
      customerPostalCode: true,
      customerCity: true,
      purchase: {
        select: {
          id: true,
          status: true,
          kind: true,
          subscriptionFirstPayment: { select: { id: true, status: true } },
          subscriptionFirstPaymentAttempts: { select: { subscription: { select: { id: true, status: true } } } },
        },
      },
    },
  })
  const linkedSubscriptionIds = new Set([
    invoice?.purchase?.subscriptionFirstPayment?.id,
    ...(invoice?.purchase?.subscriptionFirstPaymentAttempts.map(({ subscription }) => subscription.id) ?? []),
  ].filter((id): id is string => Boolean(id)))
  if (
    invoice?.invoiceNumber !== invoiceNumber
    || invoice.snapshotVersion !== 2
    || invoice.purchase?.id !== purchaseId
    || invoice.purchase.status !== 'PAID'
    || invoice.purchase.kind !== 'PRO_SUBSCRIPTION'
    || !linkedSubscriptionIds.has(subscriptionId)
    || invoice.amountExclVatCents !== 4_900
    || invoice.vatAmountCents !== 1_029
    || invoice.amountInclVatCents !== 5_929
  ) throw new Error('PRO_DOWNSTREAM_ACCEPTANCE_TARGET_MISMATCH')
  return invoice
}

export async function GET() {
  await requirePlatformAdministrator('/platformbeheer/financien')
  const invoice = await requireExactAcceptanceTarget()
  const [emailEvents, sync, invoiceCount, purchaseCount] = await Promise.all([
    getPrisma().financialEvent.findMany({
      where: { invoiceId, eventType: { in: ['INVOICE_EMAIL_SENT', 'INVOICE_EMAIL_FAILED'] } },
      select: { eventType: true, result: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    getPrisma().financialJorttSync.findUnique({
      where: { invoiceId },
      select: {
        status: true,
        technicalReference: true,
        externalReference: true,
        remoteInvoiceNumber: true,
        attemptCount: true,
        lastErrorCode: true,
        attempts: { select: { status: true, errorCode: true, externalReference: true }, orderBy: { attemptNumber: 'asc' } },
      },
    }),
    getPrisma().financialInvoice.count({ where: { invoiceNumber } }),
    getPrisma().financialPurchase.count({ where: { id: purchaseId } }),
  ])
  let remoteCheck: unknown = { status: 'NOT_CHECKED' }
  if (sync?.externalReference === '1cf7fe45-52bb-4e32-a5f8-4c99f5209b4a') {
    const tokenResponse = await fetch('https://app.jortt.nl/oauth-provider/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${process.env.JORTT_CLIENT_ID}:${process.env.JORTT_CLIENT_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'customers:read invoices:read organizations:read' }),
      signal: AbortSignal.timeout(10000),
    })
    if (!tokenResponse.ok) throw new Error('READ_ONLY_JORTT_AUTH_FAILED')
    const token = await tokenResponse.json()
    const read = async (path: string) => {
      const response = await fetch(`https://api.jortt.nl/v3${path}`, { headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error('READ_ONLY_JORTT_RESOURCE_FAILED')
      return response.json()
    }
    const remote = (await read(`/invoices/${sync.externalReference}`)).data
    const matches = (await read(`/invoices?query=${encodeURIComponent(invoiceNumber)}`)).data
    const customer = (await read(`/customers/${remote.customer_id}`)).data
    remoteCheck = {
      exactTechnicalMatches: new Set(matches.filter((item: { remarks?: string; id: string }) => item.remarks?.includes(sync.technicalReference!)).map((item: { id: string }) => item.id)).size,
      id: remote.id,
      invoiceNumber: remote.invoice_number,
      reference: remote.reference,
      technicalIdentityMatches: remote.remarks?.includes(sync.technicalReference!),
      status: remote.invoice_status,
      sendMethod: remote.send_method,
      amounts: Object.fromEntries(Object.entries(remote).filter(([key]) => /amount|total|vat/.test(key))),
      lineItems: remote.line_items?.map((item: { quantity?: unknown; amount?: unknown; vat?: unknown }) => ({ quantity: item.quantity, amount: item.amount, vat: item.vat })),
      customer: { name: customer.customer_name, address: customer.address_street, postalCode: customer.address_postal_code, city: customer.address_city },
      customerId: remote.customer_id,
    }
  }
  return NextResponse.json({
    targetValid: true,
    invoiceCount,
    purchaseCount,
    emailEvents,
    sync,
    invoiceSnapshot: { name: invoice.customerOrganizationName, address: invoice.customerAddressLine, postalCode: invoice.customerPostalCode, city: invoice.customerCity, excl: invoice.amountExclVatCents, vat: invoice.vatAmountCents, incl: invoice.amountInclVatCents },
    remoteCheck,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
