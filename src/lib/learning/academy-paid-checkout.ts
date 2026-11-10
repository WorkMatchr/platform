import 'server-only'
import { z } from 'zod'
import type { Prisma, FinancialPurchase } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { billingAddressSchema } from '@/lib/finance/financial-contract'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import {
  centsToMollieValue,
  createMollieGateway,
  getMollieUrls,
  type MollieGateway,
  type MolliePaymentSnapshot,
} from '@/lib/finance/mollie-gateway'
import { allowsAssignedPilot, isLocalPilot, paidPilotEnabled } from './learning-exam-runtime-version'
import { pilotQuote } from './academy-paid-price'

const inputSchema = z.object({
  versionId: z.uuid(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PILOT-[0-9A-F]{20}$/),
  organizationId: z.uuid().nullable(),
  billing: billingAddressSchema,
  confirmed: z.literal(true),
})
type Transaction = Prisma.TransactionClient
export async function startPaidPilot(
  userId: string,
  raw: unknown,
  injected?: Pick<MollieGateway, 'createPayment'>,
) {
  if (!paidPilotEnabled()) throw Error('PILOT_DISABLED')
  const input = inputSchema.parse(raw)
  if (input.billing.countryCode !== 'NL') throw Error('PILOT_TAX_REVIEW_REQUIRED')
  const result = await runSerializableFinancialTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "DiscountCode" WHERE code=${input.code} FOR UPDATE`
    const grant = await tx.learningPilotAssignment.findFirstOrThrow({
      where: {
        userId,
        courseVersionId: input.versionId,
        paidSlot: { not: null },
        user: { status: 'ACTIVE', emailVerified: true },
        discountCode: { code: input.code },
      },
      include: { discountCode: true, user: true, courseVersion: { include: { course: true } } },
    })
    const version = grant.courseVersion,
      discount = grant.discountCode
    if (
      !allowsAssignedPilot(version.course.code, version.version) ||
      version.status !== 'PUBLISHED' ||
      version.course.status !== 'PUBLISHED' ||
      !grant.regularGrossCents ||
      discount.percentageBps !== 9900 ||
      discount.maximumUses !== 1 ||
      discount.applicablePackageSkus.join() !== 'ACADEMY_PAID_PILOT' ||
      discount.status !== 'ACTIVE' ||
      discount.validFrom > new Date() ||
      !discount.validUntil ||
      discount.validUntil <= new Date() ||
      (isLocalPilot() && !grant.user.email.endsWith('@example.invalid'))
    )
      throw Error('PILOT_CODE_INVALID')
    let customer = input.billing.organizationName
    if (input.organizationId) {
      const member = await tx.organizationMembership.findFirstOrThrow({
        where: {
          organizationId: input.organizationId,
          userId,
          status: 'ACTIVE',
          role: { in: ['OWNER', 'ADMIN'] },
          organization: { status: 'ACTIVE', systemKey: null },
        },
        include: { organization: true },
      })
      customer = member.organization.name
    }
    const key = 'academy-paid-pilot:' + grant.id
    const prior = await tx.financialPurchase.findUnique({ where: { idempotencyKey: key } })
    if (prior) {
      if (prior.organizationId !== input.organizationId || prior.createdByUserId !== userId)
        throw Error('PILOT_BUYER_MISMATCH')
      return { purchase: prior, fresh: false }
    }
    if (
      grant.enrollmentId ||
      (await tx.learningEnrollment.count({
        where: { userId, courseVersion: { courseId: version.courseId } },
      }))
    )
      throw Error('PILOT_ALREADY_ENROLLED')
    const price = pilotQuote(grant.regularGrossCents, new Date())
    const purchase = await tx.financialPurchase.create({
      data: {
        organizationId: input.organizationId,
        createdByUserId: userId,
        kind: 'ACADEMY_COURSE',
        credits: 0,
        idempotencyKey: key,
        packageSku: 'ACADEMY_' + version.course.code.replace('-', '') + '_R07',
        packageLabel: version.course.title + ' · ' + version.version,
        ...price,
        discountCodeId: discount.id,
        discountCodeSnapshot: {
          percentageBps: 9900,
          assignmentId: grant.id,
          versionId: version.id,
          regularGrossCents: grant.regularGrossCents,
          buyer: input.organizationId ? 'BUSINESS' : 'CONSUMER',
          quotedTax: price.vatRateBps === 0 ? 'NL_KOR' : 'NL_STANDARD',
        },
        billingOrganizationName: customer,
        billingAddressLine: input.billing.addressLine,
        billingPostalCode: input.billing.postalCode,
        billingCity: input.billing.city,
        billingCountryCode: 'NL',
      },
    })
    await tx.financialEvent.create({
      data: {
        purchaseId: purchase.id,
        actorUserId: userId,
        eventType: 'ACADEMY_PILOT_CHECKOUT_INTENT',
        result: 'PENDING',
        idempotencyKey: key,
        metadata: {
          assignmentId: grant.id,
          versionId: version.id,
          discountBps: 9900,
          grossCents: price.amountInclVatCents,
        },
      },
    })
    return { purchase, fresh: true }
  })
  const { purchase, fresh } = result
  if (!fresh) {
    if (purchase.status === 'PAYMENT_PENDING' && purchase.mollieCheckoutUrl) return purchase.mollieCheckoutUrl
    throw Error('PILOT_CHECK_PAYMENT_STATUS')
  }
  // A lost response leaves one durable intent. Never create a second payment on retry.
  const urls = getMollieUrls()
  const gateway = injected ?? createMollieGateway()
  const payment = await gateway.createPayment({
    amountValue: centsToMollieValue(purchase.amountInclVatCents),
    currency: 'EUR',
    description: purchase.packageLabel,
    redirectUrl: new URL('/e-learnings/pilot', urls.redirectBaseUrl).href,
    webhookUrl: new URL('/api/payments/mollie/webhook', urls.webhookBaseUrl).href,
    metadata: {
      purchaseId: purchase.id,
      ...(purchase.organizationId ? { organizationId: purchase.organizationId } : {}),
    },
    idempotencyKey: 'mollie-purchase-' + purchase.id,
    sequenceType: 'oneoff',
  })
  if (
    !payment.checkoutUrl ||
    payment.amountValue !== centsToMollieValue(purchase.amountInclVatCents) ||
    payment.currency !== 'EUR' ||
    payment.metadata.purchaseId !== purchase.id ||
    (payment.metadata.organizationId ?? null) !== purchase.organizationId
  )
    throw Error('PILOT_CHECK_PAYMENT_STATUS')
  await getPrisma().financialPurchase.update({
    where: { id: purchase.id },
    data: {
      status: 'PAYMENT_PENDING',
      molliePaymentId: payment.id,
      mollieCheckoutUrl: payment.checkoutUrl,
      paymentCreatedAt: new Date(),
    },
  })
  return payment.checkoutUrl
}

export async function settlePaidPilot(
  tx: Transaction,
  purchase: FinancialPurchase,
  payment: MolliePaymentSnapshot,
) {
  if (!purchase.discountCodeId) throw Error('PILOT_GRANT_REQUIRED')
  const grant = await tx.learningPilotAssignment.findFirstOrThrow({
    where: {
      discountCodeId: purchase.discountCodeId,
      userId: purchase.createdByUserId,
      paidSlot: { not: null },
    },
    include: {
      user: { select: { status: true, emailVerified: true } },
      discountCode: true,
      courseVersion: { include: { course: true } },
    },
  })
  if (
    purchase.idempotencyKey !== 'academy-paid-pilot:' + grant.id ||
    purchase.amountInclVatCents !== 149 ||
    purchase.packageSku !== 'ACADEMY_' + grant.courseVersion.course.code.replace('-', '') + '_R07'
  )
    throw Error('PILOT_PURCHASE_MISMATCH')
  const reversal = [payment.amountRefunded, payment.amountChargedBack].some(
    (amount) => amount && (amount.currency !== purchase.currency || !/^0\.00$/.test(amount.value)),
  )
  if (reversal) {
    await tx.financialPurchase.update({
      where: { id: purchase.id },
      data: { status: 'REFUND_REVIEW_REQUIRED' },
    })
    if (grant.enrollmentId)
      await tx.learningEnrollment.updateMany({
        where: { id: grant.enrollmentId, accessRevokedAt: null },
        data: { accessRevokedAt: new Date() },
      })
    await tx.financialEvent.upsert({
      where: { idempotencyKey: 'academy-reversal:' + purchase.id },
      create: {
        idempotencyKey: 'academy-reversal:' + purchase.id,
        purchaseId: purchase.id,
        eventType: 'ACADEMY_RETURN_REVIEW_REQUIRED',
        result: 'REVIEW_REQUIRED',
      },
      update: {},
    })
    return 'REFUND_REVIEW_REQUIRED' as const
  }
  if (!grant.enrollmentId) {
    const paidAt = payment.paidAt ? new Date(payment.paidAt) : null
    if (
      !paidAt ||
      grant.user.status !== 'ACTIVE' ||
      !grant.user.emailVerified ||
      grant.discountCode.status !== 'ACTIVE' ||
      paidAt < grant.discountCode.validFrom ||
      !grant.discountCode.validUntil ||
      paidAt >= grant.discountCode.validUntil ||
      grant.courseVersion.status !== 'PUBLISHED' ||
      grant.courseVersion.course.status !== 'PUBLISHED'
    ) {
      await tx.financialEvent.upsert({
        where: { idempotencyKey: 'academy-access-review:' + purchase.id },
        create: {
          purchaseId: purchase.id,
          idempotencyKey: 'academy-access-review:' + purchase.id,
          eventType: 'ACADEMY_ENROLLMENT_REVIEW_REQUIRED',
          result: 'REVIEW_REQUIRED',
        },
        update: {},
      })
      return 'PAID' as const
    }
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${purchase.createdByUserId}::uuid FOR UPDATE`
    const enrollment = await tx.learningEnrollment.create({
      data: { userId: purchase.createdByUserId, courseVersionId: grant.courseVersionId },
    })
    await tx.learningPilotAssignment.update({
      where: { id: grant.id },
      data: { enrollmentId: enrollment.id, redeemedAt: new Date() },
    })
    await tx.financialEvent.create({
      data: {
        idempotencyKey: 'academy-enrolled:' + purchase.id,
        purchaseId: purchase.id,
        eventType: 'ACADEMY_PILOT_ENROLLED',
        result: 'SUCCEEDED',
        metadata: { enrollmentId: enrollment.id, versionId: grant.courseVersionId },
      },
    })
  }
  return 'PAID' as const
}
