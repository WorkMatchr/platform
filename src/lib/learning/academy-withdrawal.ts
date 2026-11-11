import 'server-only'
import { z } from 'zod'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { createMollieGateway, type MollieGateway } from '@/lib/finance/mollie-gateway'
import { mirrorCreditNoteSnapshot } from '@/lib/finance/credit-note-snapshot'
import { submitPreparedRefund } from '@/lib/finance/refund-service'
import { getPrisma } from '@/lib/prisma'

export const withdrawalKey = (purchaseId: string) => 'academy-withdrawal:' + purchaseId

export async function requestWithdrawal(userId: string, purchaseId: string) {
  z.uuid().parse(purchaseId)
  return getPrisma().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "FinancialPurchase" WHERE id=${purchaseId}::uuid AND "createdByUserId"=${userId}::uuid FOR UPDATE`
    const purchase = await tx.financialPurchase.findFirstOrThrow({
      where: { id: purchaseId, createdByUserId: userId, kind: 'ACADEMY_COURSE', organizationId: null, paidAt: { not: null } },
      select: { id: true },
    })
    const key = withdrawalKey(purchase.id)
    const existing = await tx.financialEvent.findUnique({ where: { idempotencyKey: key } })
    if (existing) return existing
    return tx.financialEvent.create({ data: {
      actorUserId: userId, purchaseId, eventType: 'ACADEMY_WITHDRAWAL_RECEIVED', result: 'RECEIVED', idempotencyKey: key,
    } })
  })
}

/** The reviewer establishes timeliness, including any extended period, before authorizing payment. */
export async function approveWithdrawal(actorUserId: string, purchaseId: string, gateway?: MollieGateway) {
  const prepared = await getPrisma().$transaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorUserId)
    await tx.$queryRaw`SELECT id FROM "FinancialPurchase" WHERE id=${purchaseId}::uuid FOR UPDATE`
    const event = await tx.financialEvent.findUniqueOrThrow({ where: { idempotencyKey: withdrawalKey(purchaseId) } })
    const purchase = await tx.financialPurchase.findFirstOrThrow({ where: {
      id: purchaseId, kind: 'ACADEMY_COURSE', organizationId: null, createdByUserId: event.actorUserId ?? '',
      amountInclVatCents: 149, currency: 'EUR', credits: 0,
    }, include: { invoice: { include: { lines: true, vatSummaries: true } }, refunds: true } })
    const paymentId = purchase.molliePaymentId
    if (!paymentId || !purchase.invoice || !purchase.discountCodeId) throw Error('ACADEMY_REFUND_SOURCE_REQUIRED')
    const known = purchase.refunds.find(r => r.academyWithdrawalEventId === event.id)
    if (known) return { refund: known, paymentId }
    if (purchase.status !== 'PAID' || purchase.refunds.length || purchase.invoice.molliePaymentId !== paymentId
      || purchase.invoice.amountInclVatCents !== 149) throw Error('ACADEMY_REFUND_REVIEW_REQUIRED')
    mirrorCreditNoteSnapshot(purchase.invoice)
    const grant = await tx.learningPilotAssignment.findFirstOrThrow({ where: {
      discountCodeId: purchase.discountCodeId, userId: purchase.createdByUserId, paidSlot: { not: null }, regularGrossCents: 14900,
    } })
    const refund = await tx.financialRefund.create({ data: {
      purchaseId, academyWithdrawalEventId: event.id, approvedByUserId: actorUserId,
      reason: 'Tijdige herroeping particuliere pilot gecontroleerd', amountCents: 149, credits: 0,
      idempotencyKey: 'academy-refund:' + purchaseId,
    } })
    if (grant.enrollmentId) await tx.learningEnrollment.updateMany({ where: {
      id: grant.enrollmentId, accessRevokedAt: null,
    }, data: { accessRevokedAt: new Date() } })
    await tx.financialEvent.create({ data: { purchaseId, refundId: refund.id, invoiceId: purchase.invoice.id,
      actorUserId, eventType: 'ACADEMY_WITHDRAWAL_APPROVED', result: 'APPROVED', idempotencyKey: 'academy-approved:' + purchaseId } })
    return { refund, paymentId }
  })
  const { refund, paymentId } = prepared
  if (refund.status !== 'PENDING') return refund.status
  const mollie = gateway ?? createMollieGateway()
  if (!refund.providerAttemptedAt) {
    const payment = await mollie.getPayment(paymentId)
    if (payment.id !== paymentId || payment.status !== 'paid' || payment.metadata.purchaseId !== purchaseId
      || payment.metadata.organizationId || payment.amountValue !== '1.49' || payment.currency !== 'EUR'
      || [payment.amountRefunded, payment.amountChargedBack].some(amount => amount && (amount.currency !== 'EUR' || amount.value !== '0.00'))) {
      throw Error('ACADEMY_REFUND_PROVIDER_REVIEW_REQUIRED')
    }
  }
  const result = await submitPreparedRefund(refund.id, paymentId, refund.amountCents, { purchaseId }, mollie, actorUserId)
  return result.refund.status
}

export async function withdrawalReceipt(userId: string, purchaseId: string) {
  const event = await getPrisma().financialEvent.findFirst({ where: {
    idempotencyKey: withdrawalKey(purchaseId), actorUserId: userId,
    purchase: { kind: 'ACADEMY_COURSE', organizationId: null, createdByUserId: userId },
  }, include: { purchase: { select: { billingOrganizationName: true, packageLabel: true } } } })
  if (!event?.purchase) return null
  return ['WorkMatchr Academy · Feenstra Safety Consulting', 'Ontvangstbewijs herroeping',
    'Naam: ' + event.purchase.billingOrganizationName, 'Opleiding: ' + event.purchase.packageLabel,
    'Aankoop: ' + purchaseId, 'Ontvangen (UTC): ' + event.createdAt.toISOString(),
    'Verklaring: ik herroep mijn aankoop van deze opleiding.', 'Uw verklaring is ontvangen. De terugbetaling wordt afzonderlijk behandeld.',
  ].join('\r\n')
}
