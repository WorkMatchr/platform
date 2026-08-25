import { timingSafeEqual } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { AuthEmailDeliveryError } from '@/lib/email'
import { createCreditPurchase, processMolliePayment } from '@/lib/finance/financial-purchase-service'
import type { MollieGateway, MolliePaymentSnapshot } from '@/lib/finance/mollie-gateway'
import { getPrisma } from '@/lib/prisma'

const EXPECTED_BRANCH = 'codex/jortt-operationalization'
const IDEMPOTENCY_KEY = 'jortt-amount-mapping-acceptance-paid-credit-purchase-v2'

function unavailable() {
  return new NextResponse(null, { status: 404 })
}

function authorized(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) return false
  const expected = process.env.JORTT_PAID_INVOICE_TEST_SECRET
  const supplied = request.headers.get('x-jortt-paid-invoice-secret')
  if (!expected || !supplied || expected.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
}

function paymentSnapshot(input: {
  id: string
  status: 'open' | 'paid'
  amountValue: string
  organizationId: string
  purchaseId: string
  paidAt?: string | null
}): MolliePaymentSnapshot {
  return Object.freeze({
    id: input.id,
    status: input.status,
    amountValue: input.amountValue,
    currency: 'EUR',
    metadata: Object.freeze({ purchaseId: input.purchaseId, organizationId: input.organizationId }),
    paidAt: input.paidAt ?? null,
    createdAt: new Date().toISOString(),
    checkoutUrl: `https://platform-git-codex-jortt-operationa-b220f9-workmatchrs-projects.vercel.app/credits/test-checkout/${input.id}`,
    subscriptionId: null,
    mandateId: null,
    method: 'ideal',
  })
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return unavailable()
  const purchase = await getPrisma().financialPurchase.findUnique({
    where: { idempotencyKey: IDEMPOTENCY_KEY },
    include: { invoice: { include: { jorttSync: true } }, creditedTransaction: true, paymentEvents: true },
  })
  return NextResponse.json({
    purchaseExists: Boolean(purchase),
    purchaseId: purchase?.id ?? null,
    purchaseStatus: purchase?.status ?? null,
    molliePaymentIdPresent: Boolean(purchase?.molliePaymentId),
    creditTransactionCount: purchase?.creditedTransaction ? 1 : 0,
    invoiceCount: purchase?.invoice ? 1 : 0,
    invoiceId: purchase?.invoice?.id ?? null,
    invoiceNumber: purchase?.invoice?.invoiceNumber ?? null,
    snapshotVersion: purchase?.invoice?.snapshotVersion ?? null,
    jorttSyncStatus: purchase?.invoice?.jorttSync?.status ?? null,
    paymentEventCount: purchase?.paymentEvents.length ?? 0,
  })
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return unavailable()
  try {
    const prisma = getPrisma()
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
        user: { status: 'ACTIVE', accountType: 'PROFESSIONAL', email: { endsWith: '.example.invalid' } },
        organization: {
          status: 'ACTIVE',
          organizationType: { in: ['PROVIDER', 'BOTH'] },
          systemKey: null,
          providerProfile: { isNot: null },
        },
      },
      include: {
        user: { select: { id: true } },
        organization: {
          include: { locations: { where: { archivedAt: null }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 } },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    if (!membership) throw new Error('PREVIEW_FINANCIAL_FIXTURE_NOT_FOUND')
    const location = membership.organization.locations[0] ?? {
      addressLine: 'Teststraat 1',
      postalCode: '1234 AB',
      city: 'Teststad',
      countryCode: 'NL',
    }

    let createdPayment: MolliePaymentSnapshot | null = null
    const gateway = {
      async createPayment(input) {
        const id = `tr_jortt_acceptance_${input.metadata.purchaseId.replaceAll('-', '').slice(0, 24)}`
        createdPayment = paymentSnapshot({
          id,
          status: 'open',
          amountValue: input.amountValue,
          organizationId: input.metadata.organizationId,
          purchaseId: input.metadata.purchaseId,
        })
        return createdPayment
      },
      async getPayment(paymentId) {
        if (!createdPayment || createdPayment.id !== paymentId) {
          const storedPurchase = await prisma.financialPurchase.findFirst({ where: { molliePaymentId: paymentId } })
          if (!storedPurchase || storedPurchase.idempotencyKey !== IDEMPOTENCY_KEY) throw new Error('PREVIEW_PAYMENT_FIXTURE_MISMATCH')
          createdPayment = paymentSnapshot({
            id: paymentId,
            status: 'open',
            amountValue: (storedPurchase.amountInclVatCents / 100).toFixed(2),
            organizationId: storedPurchase.organizationId,
            purchaseId: storedPurchase.id,
          })
        }
        return paymentSnapshot({
          id: createdPayment.id,
          status: 'paid',
          amountValue: createdPayment.amountValue,
          organizationId: createdPayment.metadata.organizationId ?? '',
          purchaseId: createdPayment.metadata.purchaseId ?? '',
          paidAt: new Date().toISOString(),
        })
      },
    } satisfies Pick<MollieGateway, 'createPayment' | 'getPayment'>

    const purchase = await createCreditPurchase({
      actorUserId: membership.user.id,
      organizationId: membership.organization.id,
      packageSku: 'CREDITS_50',
      billingAddress: {
        organizationName: membership.organization.tradeName?.trim() || membership.organization.name,
        addressLine: location.addressLine,
        postalCode: location.postalCode,
        city: location.city,
        countryCode: location.countryCode,
        chamberOfCommerceNumber: membership.organization.chamberOfCommerceNumber ?? undefined,
      },
      idempotencyKey: IDEMPOTENCY_KEY,
    }, gateway as MollieGateway)

    let mailSuppressedByMissingPreviewProvider = false
    for (let replay = 0; replay < 2; replay += 1) {
      try {
        await processMolliePayment(purchase.molliePaymentId!, gateway as MollieGateway)
      } catch (error) {
        if (error instanceof AuthEmailDeliveryError && error.code === 'EMAIL_DELIVERY_NOT_CONFIGURED') {
          mailSuppressedByMissingPreviewProvider = true
          continue
        }
        throw error
      }
    }

    const result = await prisma.financialPurchase.findUniqueOrThrow({
      where: { id: purchase.id },
      include: {
        invoice: { include: { lines: true, vatSummaries: true, jorttSync: true } },
        creditedTransaction: true,
        paymentEvents: true,
      },
    })
    if (!result.invoice || !result.creditedTransaction) throw new Error('PAID_PREVIEW_INVOICE_INCOMPLETE')
    const duplicateInvoiceCount = await prisma.financialInvoice.count({ where: { purchaseId: result.id } })
    const linkedCreditCount = await prisma.creditTransaction.count({ where: { id: result.creditedTransaction.id } })

    return NextResponse.json({
      purchaseId: result.id,
      purchaseStatus: result.status,
      invoiceId: result.invoice.id,
      invoiceNumber: result.invoice.invoiceNumber,
      snapshotVersion: result.invoice.snapshotVersion,
      amountExclVatCents: result.invoice.amountExclVatCents,
      vatRateBps: result.invoice.vatRateBps,
      vatAmountCents: result.invoice.vatAmountCents,
      amountInclVatCents: result.invoice.amountInclVatCents,
      credits: result.credits,
      creditTransactionCount: linkedCreditCount,
      invoiceCount: duplicateInvoiceCount,
      paymentEventCount: result.paymentEvents.length,
      lineCount: result.invoice.lines.length,
      vatSummaryCount: result.invoice.vatSummaries.length,
      jorttSyncStatus: result.invoice.jorttSync?.status ?? null,
      jorttAttemptCount: result.invoice.jorttSync?.attemptCount ?? null,
      paymentReplayIdempotent: linkedCreditCount === 1 && duplicateInvoiceCount === 1,
      externalInvoiceEmailSent: false,
      mailSuppressedByMissingPreviewProvider,
    })
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'PAID_PREVIEW_INVOICE_PREPARATION_FAILED'
    return NextResponse.json({ status: 'FAILED', safeErrorCode: code }, { status: 500 })
  }
}
