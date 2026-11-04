import { processAcademySeatTransferPayment } from './academy-seat-transfer-service'
import { ACADEMY_ACCESS_POLICY_VERSION, academyUnusedSeatAvailable } from './academy-access-policy'
import 'server-only'
import { academyLegalDrafts } from '@/content/academy-legal-drafts'
import { createHash } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { centsToMollieValue, createMollieGateway, getMollieUrls, type MollieGateway, type MolliePaymentSnapshot } from '@/lib/finance/mollie-gateway'
import { issueInvoiceForPaidPurchase } from '@/lib/finance/invoice-service'
import { academyOrderInput, commerceAssert, normalizedAcademyEmail, ACADEMY_LEGAL_VERSION, verifiedAcademyPayment } from './academy-commerce-policy'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { activateAcademySeatInTransaction, lockAcademyCommerce, ownedAcademyOrder, qualifyingAcademyPass, requireAcademyBuyer, requireAcademyOrganizationBuyer } from './academy-commerce-access'

import { readAcademyPrices,quoteAcademyPrice,settleAcademyPromotionUse } from './academy-pricing-store'
import { academyAlumniGross,academyTaxDecision } from './academy-pricing-policy'

export async function createAcademyOrder(actorId: string, raw: unknown) {
  assertAcademyCommerceSandbox()
  const input = academyOrderInput.parse(raw)
  const requestFingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  const order = await runSerializableFinancialTransaction(async tx => {
    const buyer = await requireAcademyBuyer(tx, actorId)
    commerceAssert(input.buyerType === 'BUSINESS' ? input.organizationId : !input.organizationId && input.quantity === 1, 'ACADEMY_BILLING_CONTEXT_INVALID')
    if (input.organizationId) await requireAcademyOrganizationBuyer(tx, actorId, input.organizationId)
    await lockAcademyCommerce(tx, `checkout:${actorId}:${input.courseCode}`)
    const key = `academy:${actorId}:${input.idempotencyKey}`
    const previous = await tx.learningAcademyOrder.findFirst({ where: { purchase: { idempotencyKey: key } }, include: { purchase: true, courseVersion: { include: { course: true } } } })
    if (previous) {
      commerceAssert((previous.legalAgreement as { requestFingerprint?: string }).requestFingerprint === requestFingerprint && previous.buyerUserId === actorId && previous.quantity === input.quantity && previous.buyerType === input.buyerType && previous.courseVersion.course.code === input.courseCode && previous.purchase.organizationId === (input.organizationId ?? null), 'ACADEMY_IDEMPOTENCY_CONFLICT')
      return previous
    }
    const version = await tx.learningCourseVersion.findFirst({ where: { status: 'PUBLISHED', course: { code: input.courseCode, status: 'PUBLISHED' } }, orderBy: { publishedAt: 'desc' }, include: { course: true } })
    commerceAssert(version, 'ACADEMY_COURSE_NOT_AVAILABLE')
    if (input.quantity === 1) {
      commerceAssert(!await tx.learningEnrollment.findFirst({ where: { userId: actorId, accessRevokedAt: null, courseVersion: { courseId: version.courseId } } }), 'ACADEMY_PARTICIPANT_ALREADY_HAS_ACCESS')
      commerceAssert(!await tx.learningAcademyOrder.findFirst({ where: { buyerUserId: actorId, quantity: 1, courseVersion: { courseId: version.courseId }, purchase: { status: { in: ['CREATED', 'PAYMENT_PENDING'] } } } }), 'ACADEMY_PAYMENT_ALREADY_PENDING')
    }
    const emails = input.participantEmails.map(normalizedAcademyEmail)
    commerceAssert(new Set(emails).size === emails.length, 'ACADEMY_DUPLICATE_PARTICIPANT')
    commerceAssert(input.quantity === 1 ? emails.length === 0 || (emails.length === 1 && emails[0] === normalizedAcademyEmail(buyer.email)) : emails.length === 0 || emails.length === 5, 'ACADEMY_PARTICIPANTS_INVALID')
    const participants = input.quantity === 1 ? [normalizedAcademyEmail(buyer.email)] : emails
    const proof: Array<{ position: number; email: string; userId: string | null; attemptId: string | null; discountCents: number; identityLocked:boolean }> = []
    await lockAcademyCommerce(tx,'pricing')
    const prices=await readAcademyPrices(tx,version.courseId)
    commerceAssert(!input.followUp||participants.length===input.quantity,'ACADEMY_BENEFIT_NOT_ESTABLISHED')
    let qualified=0
    for(const [index,email] of participants.entries()) {
      const pass=await qualifyingAcademyPass(tx,email,version.courseId)
      if(input.quantity===1&&input.followUp)commerceAssert(pass,'ACADEMY_BENEFIT_NOT_ESTABLISHED')
      const before=qualified
      if(pass)qualified++
      const prior=academyAlumniGross(prices,input.quantity,before)??(input.quantity===1?prices.individualCents:prices.fiveCents)
      const next=academyAlumniGross(prices,input.quantity,qualified)??prior
      proof.push({position:index+1,email,userId:pass?.userId??null,attemptId:pass?.id??null,discountCents:prior-next,identityLocked:Boolean(pass)})
    }
    const now = new Date()
    const quoted=await quoteAcademyPrice(tx,{buyerUserId:actorId,organizationId:input.organizationId??null,courseId:version.courseId,quantity:input.quantity,code:input.promotionCode,now},academyAlumniGross(prices,input.quantity,qualified))
    const price=quoted.financial,decision=academyTaxDecision(prices),alumniApplied=quoted.chosen.kind==='ALUMNI'
    const pricingSnapshot={formatVersion:1,courseId:version.courseId,courseCode:input.courseCode,courseVersionId:version.id,quantity:input.quantity,priceVersionId:prices.id,priceRevision:prices.revision,priceScope:prices.scopeKey,prices:{...prices},calculatedAt:now.toISOString(),originalGrossCents:quoted.originalGrossCents,discountGrossCents:quoted.discountGrossCents,finalGrossCents:price.amountInclVatCents,scheme:quoted.chosen,tax:decision}
    const purchase = await tx.financialPurchase.create({ data: {
      organizationId: input.organizationId ?? null, createdByUserId: actorId, kind: 'ACADEMY_COURSE', pricingMode: 'ACADEMY_SANDBOX',
      packageSku: `ACADEMY_${input.courseCode.replace('-', '')}_${input.quantity}`, packageLabel: `${version.course.title} (${input.quantity})`.slice(0,120), credits: 0, ...price,
      billingOrganizationName: input.billing.name, billingAddressLine: input.billing.address, billingPostalCode: input.billing.postalCode, billingCity: input.billing.city, billingCountryCode: input.billing.country,
      idempotencyKey: key,
    } })
    const created = await tx.learningAcademyOrder.create({ data: {
      accessPolicyVersion: ACADEMY_ACCESS_POLICY_VERSION, purchaseId: purchase.id, buyerUserId: actorId, courseVersionId: version.id, buyerType: input.buyerType, quantity: input.quantity, pricingPolicyVersion: decision.version, priceVersionId:prices.id, pricingSnapshot,
      benefitProof: { applied: alumniApplied, rule: alumniApplied ? decision.followUpRule : 'NONE', participants: alumniApplied?proof:[] },
      legalAgreement: { requestFingerprint, documents: academyLegalDrafts.map(document => ({ ...document, version: ACADEMY_LEGAL_VERSION, status: 'DRAFT', sha256: createHash('sha256').update(document.text).digest('hex') })), version: ACADEMY_LEGAL_VERSION, status: 'DRAFT_TEST_ONLY', taxDecision: decision, platformTermsAccepted: input.platformTermsAccepted, academyTermsAccepted: input.academyTermsAccepted, privacyNotice: 'INFORMATION_ONLY', withdrawalRightWaived: false }, agreedAt: now,
      seats: { create: Array.from({ length: input.quantity }, (_, index) => ({ position: index + 1, invitedEmail: proof[index]?.email ?? null })) },
    }, include: { purchase: true, courseVersion: { include: { course: true } } } })
    if(quoted.chosen.id)await tx.learningAcademyPromotionUse.create({data:{promotionId:quoted.chosen.id,orderId:created.id,buyerUserId:actorId}})
    await tx.financialEvent.upsert({where:{idempotencyKey:`academy-price:${purchase.id}`},create:{actorUserId:actorId,purchaseId:purchase.id,eventType:'ACADEMY_PRICE_SNAPSHOT',result:quoted.chosen.kind,metadata:pricingSnapshot,idempotencyKey:`academy-price:${purchase.id}`},update:{}})
    return created

  })
  return { orderId: order.id }
}

export async function startAcademyOrderPayment(actorId: string, orderId: string, confirmed: boolean, gateway?: MollieGateway) {
  assertAcademyCommerceSandbox()
  const order = await ownedAcademyOrder(getPrisma(), actorId, orderId)
  commerceAssert(confirmed === true, 'ACADEMY_PAYMENT_CONFIRMATION_REQUIRED')
  if(order.purchase.amountInclVatCents===0) {
    await runSerializableFinancialTransaction(async tx=>{
      await lockAcademyCommerce(tx,`purchase:${order.purchaseId}`)
      const owned=await ownedAcademyOrder(tx,actorId,orderId)
      commerceAssert(['CREATED','PAID'].includes(owned.purchase.status)&&owned.purchase.amountInclVatCents===0&&owned.purchase.amountExclVatCents===0&&owned.purchase.vatAmountCents===0,'ACADEMY_FREE_ORDER_INVALID')
      commerceAssert((owned.pricingSnapshot as {finalGrossCents?:number}|null)?.finalGrossCents===0,'ACADEMY_FREE_ORDER_INVALID')
      if(owned.purchase.status!=='PAID')await tx.financialPurchase.update({where:{id:order.purchaseId},data:{status:'PAID',paidAt:new Date()}})
      await tx.financialEvent.upsert({where:{idempotencyKey:`academy-free:${order.purchaseId}`},create:{actorUserId:actorId,purchaseId:order.purchaseId,eventType:'ACADEMY_FREE_ORDER_CONFIRMED',result:'CONFIRMED',idempotencyKey:`academy-free:${order.purchaseId}`},update:{}})
      await finalizeAcademyPaidOrder(tx,{...owned.purchase,status:'PAID'},owned)
    })
    return {orderId:order.id,checkoutUrl:`/e-learnings/aankopen/${order.id}`}
  }
  await runSerializableFinancialTransaction(async tx=>{
    await lockAcademyCommerce(tx,`purchase:${order.purchaseId}`)
    const owned=await ownedAcademyOrder(tx,actorId,orderId)
    commerceAssert(['CREATED','PAYMENT_PENDING'].includes(owned.purchase.status),'ACADEMY_PAYMENT_NOT_AVAILABLE')
    await tx.financialEvent.upsert({where:{idempotencyKey:`academy-contract-confirmed:${order.purchaseId}`},create:{actorUserId:actorId,purchaseId:order.purchaseId,eventType:'ACADEMY_CHECKOUT_CONFIRMED',result:'CONFIRMED',metadata:{legalVersion:(order.legalAgreement as {version:string}).version,amountInclVatCents:order.purchase.amountInclVatCents},idempotencyKey:`academy-contract-confirmed:${order.purchaseId}`},update:{}})
  })
  if (order.purchase.molliePaymentId && order.purchase.mollieCheckoutUrl) return { orderId: order.id, checkoutUrl: order.purchase.mollieCheckoutUrl }
  const provider=gateway??createMollieGateway()
  const { redirectBaseUrl, webhookBaseUrl } = getMollieUrls()
  const payment = await provider.createPayment({ amountValue: centsToMollieValue(order.purchase.amountInclVatCents), currency: 'EUR', description: `WorkMatchr Academy test — ${order.purchase.packageLabel}`,
    redirectUrl: new URL(`/e-learnings/aankopen/${order.id}`, redirectBaseUrl).toString(), webhookUrl: new URL('/api/payments/mollie/webhook', webhookBaseUrl).toString(),
    metadata: { purchaseId: order.purchaseId, ...(order.purchase.organizationId ? { organizationId: order.purchase.organizationId } : {}) }, idempotencyKey: `academy-payment:${order.purchaseId}`,
  })
  commerceAssert(verifiedAcademyPayment({ ...order.purchase, molliePaymentId: payment.id }, payment), 'ACADEMY_PAYMENT_MISMATCH')
  const checkout = payment.checkoutUrl ? new URL(payment.checkoutUrl) : null
  commerceAssert(checkout?.protocol === 'https:' && (checkout.hostname === 'mollie.com' || checkout.hostname.endsWith('.mollie.com')), 'ACADEMY_CHECKOUT_URL_INVALID')
  await runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, `purchase:${order.purchaseId}`)
    const current = await tx.financialPurchase.findUniqueOrThrow({ where: { id: order.purchaseId } })
    commerceAssert(!current.molliePaymentId || current.molliePaymentId === payment.id, 'ACADEMY_DUPLICATE_PAYMENT')
    await tx.financialPurchase.update({ where: { id: current.id }, data: { molliePaymentId: payment.id, mollieCheckoutUrl: checkout!.toString(), paymentCreatedAt: new Date(), ...(current.status === 'CREATED' ? { status: 'PAYMENT_PENDING' as const } : {}) } })
  })
  return { orderId: order.id, checkoutUrl: checkout!.toString() }
}

export async function processAcademyMolliePayment(payment: MolliePaymentSnapshot) {
  assertAcademyCommerceSandbox()
  const db = getPrisma()
  const purchase = await db.financialPurchase.findUnique({ where: { molliePaymentId: payment.id }, include: { academyOrder: true } })
  if (purchase?.kind === 'ACADEMY_COURSE' && !purchase.academyOrder && purchase.packageSku === 'ACADEMY_SEAT_TRANSFER') return processAcademySeatTransferPayment(payment)
  commerceAssert(purchase?.kind === 'ACADEMY_COURSE' && purchase.academyOrder && verifiedAcademyPayment(purchase, payment), 'ACADEMY_PAYMENT_MISMATCH')
  const fingerprint = createHash('sha256').update(JSON.stringify({ id: payment.id, status: payment.status, paidAt: payment.paidAt, amount: payment.amountValue, currency: payment.currency })).digest('hex')
  return runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, `purchase:${purchase.id}`)
    const current = await tx.financialPurchase.findUniqueOrThrow({ where: { id: purchase.id } })
    const status = payment.status === 'paid' ? 'PAID' : payment.status === 'canceled' ? 'CANCELED' : payment.status === 'failed' ? 'FAILED' : payment.status === 'expired' ? 'EXPIRED' : 'PENDING'
    await tx.financialPaymentEvent.upsert({ where: { idempotencyKey: `academy-payment-state:${fingerprint}` }, create: { purchaseId: current.id, molliePaymentId: payment.id, status, amountCents: current.amountInclVatCents, currency: current.currency, payloadFingerprint: fingerprint, idempotencyKey: `academy-payment-state:${fingerprint}`, providerOccurredAt: payment.paidAt ? new Date(payment.paidAt) : null }, update: {} })
    if (['REFUND_REVIEW_REQUIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(current.status) || (current.status === 'PAID' && status !== 'PAID')) return { status: current.status }
    if (status !== 'PAID') {
      await tx.financialPurchase.update({ where: { id: current.id }, data: { status: status === 'PENDING' ? 'PAYMENT_PENDING' : status } })
      if(['CANCELED','FAILED','EXPIRED'].includes(status)) await settleAcademyPromotionUse(tx,purchase.academyOrder!.id,status as 'CANCELED'|'FAILED'|'EXPIRED')
      return { status }
    }
    if (current.status !== 'PAID') await tx.financialPurchase.update({ where: { id: current.id }, data: { status: 'PAID', paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date() } })
    return finalizeAcademyPaidOrder(tx,{...current,status:'PAID'},purchase.academyOrder!)
  })
}

async function finalizeAcademyPaidOrder(tx:import('@/generated/prisma/client').Prisma.TransactionClient,current:import('@/generated/prisma/client').FinancialPurchase,order:{id:string;quantity:number;agreedAt:Date}) {
    const invoice = await issueInvoiceForPaidPurchase(tx, current.id)
    const use=await tx.learningAcademyPromotionUse.findUnique({where:{orderId:order.id}})
    if(use?.status==='RELEASED') {
      await tx.financialPurchase.update({where:{id:current.id},data:{status:'REFUND_REVIEW_REQUIRED'}})
      return {status:'REFUND_REVIEW_REQUIRED'}
    }
    await settleAcademyPromotionUse(tx,order.id,'PAID')
    const withdrawal = await tx.financialEvent.findUnique({ where: { idempotencyKey: `academy-withdrawal:${current.id}` } })
    if (withdrawal) {
      await tx.financialPurchase.update({ where: { id: current.id }, data: { status: 'REFUND_REVIEW_REQUIRED' } })
      return { status: 'REFUND_REVIEW_REQUIRED' }
    }
    if (order.quantity === 1) {
      const seat = await tx.learningAcademySeat.findUniqueOrThrow({ where: { orderId_position: { orderId: order.id, position: 1 } } })
      await activateAcademySeatInTransaction(tx, seat.id, current.createdByUserId, ACADEMY_LEGAL_VERSION, new Date())
    }
    await tx.notificationOutbox.upsert({ where: { idempotencyKey: `academy-order-confirmed:${current.id}` }, create: { eventId: `ACADEMY_ORDER_CONFIRMED:${current.id}`, channel: 'EMAIL', recipientUserId: current.createdByUserId, templateKey: 'ACADEMY_ORDER_CONFIRMED', payload: { orderId: order.id, invoiceId: invoice.id }, idempotencyKey: `academy-order-confirmed:${current.id}` }, update: {} })
    return { status: 'PAID', invoiceId: invoice.id }
}

export async function inviteAcademySeat(actorId: string, seatId: string, rawEmail: string) {
  assertAcademyCommerceSandbox()
  const email = normalizedAcademyEmail(rawEmail), now = new Date()
  return runSerializableFinancialTransaction(async tx => {
    await lockAcademyCommerce(tx, `seat:${seatId}`)
    const seat = await tx.learningAcademySeat.findUnique({ where: { id: seatId } })
    commerceAssert(seat, 'ACADEMY_SEAT_NOT_AVAILABLE')
    const order = await ownedAcademyOrder(tx, actorId, seat.orderId)
    commerceAssert(order.quantity === 5 && order.purchase.status === 'PAID' && ['AVAILABLE', 'INVITED'].includes(seat.status), 'ACADEMY_SEAT_NOT_AVAILABLE')
    commerceAssert(academyUnusedSeatAvailable(order, now), 'ACADEMY_UNUSED_SEAT_EXPIRED')
    const proof = order.benefitProof as { applied?: boolean; participants?: Array<{ position: number; email: string; discountCents: number; identityLocked?:boolean }> }
    const entitlement = proof.participants?.find(p => p.position === seat.position)
    const transferred = proof.applied && entitlement?.email !== email ? await tx.learningAcademySeatTransfer.findFirst({where:{seatId:seat.id,targetEmail:email,appliedAt:{not:null},purchase:{status:'PAID'}}}) : null
    commerceAssert(!proof.applied || (!entitlement?.discountCents&&!entitlement?.identityLocked) || entitlement!.email === email || transferred, 'ACADEMY_BENEFIT_PARTICIPANT_LOCKED')
    commerceAssert(!order.seats.some(s => s.id !== seatId && s.invitedEmail === email && s.status !== 'REVOKED'), 'ACADEMY_DUPLICATE_PARTICIPANT')
    if (seat.status === 'INVITED' && seat.invitedEmail === email && seat.inviteExpiresAt && seat.inviteExpiresAt > now) return { invited: true }
    const event = await tx.learningAcademySeatEvent.create({ data: { seatId, actorUserId: actorId, action: 'INVITED', metadata: { email } } })
    await tx.learningAcademySeat.update({ where: { id: seatId }, data: { status: 'INVITED', invitedEmail: email, invitedAt: now, inviteExpiresAt: new Date(now.getTime() + 30 * 86400000) } })
    await tx.notificationOutbox.create({ data: { eventId: `ACADEMY_SEAT_INVITED:${event.id}`, channel: 'EMAIL', templateKey: 'ACADEMY_SEAT_INVITED', payload: { seatId, email }, idempotencyKey: `academy-seat-invited:${event.id}` } })
    return { invited: true }
  })
}
export async function acceptAcademySeat(actorId: string, seatId: string, accepted: boolean, version: string) {
  assertAcademyCommerceSandbox()
  commerceAssert(accepted === true, 'ACADEMY_TERMS_REQUIRED')
  return runSerializableFinancialTransaction(tx => activateAcademySeatInTransaction(tx, seatId, actorId, version, new Date()))
}
export async function getAcademyOrderView(actorId: string, orderId: string) {
  assertAcademyCommerceSandbox()
  const order = await ownedAcademyOrder(getPrisma(), actorId, orderId)
  return { id: order.id, courseTitle: order.courseVersion.course.title, quantity: order.quantity, status: order.purchase.status,
    amountInclVatCents: order.purchase.amountInclVatCents, vatAmountCents: order.purchase.vatAmountCents, checkoutUrl: order.purchase.mollieCheckoutUrl,
    seats: order.seats.map(s => ({ id: s.id, position: s.position, status: s.status, invitedEmail: s.invitedEmail })),
    pricing:order.pricingSnapshot?{scheme:(order.pricingSnapshot as {scheme:{label:string}}).scheme.label,originalGrossCents:(order.pricingSnapshot as {originalGrossCents:number}).originalGrossCents,discountGrossCents:(order.pricingSnapshot as {discountGrossCents:number}).discountGrossCents}:null,
    buyerType: order.buyerType, legalVersion: (order.legalAgreement as { version: string }).version,
    invoice: await getPrisma().financialInvoice.findUnique({ where: { purchaseId: order.purchaseId }, select: { id: true, invoiceNumber: true } }),
  }
}
export async function recordAcademyWithdrawal(actorId: string, orderId: string) {
  assertAcademyCommerceSandbox()
  return runSerializableFinancialTransaction(async tx => {
    const order = await ownedAcademyOrder(tx, actorId, orderId)
    await lockAcademyCommerce(tx, `purchase:${order.purchaseId}`)
    const receipt = await tx.financialEvent.upsert({ where: { idempotencyKey: `academy-withdrawal:${order.purchaseId}` }, create: { actorUserId: actorId, purchaseId: order.purchaseId, eventType: 'ACADEMY_WITHDRAWAL_RECEIVED', result: 'RECEIVED', idempotencyKey: `academy-withdrawal:${order.purchaseId}` }, update: {} })
    await tx.notificationOutbox.upsert({ where: { idempotencyKey: `academy-withdrawal-receipt:${order.purchaseId}` }, create: { eventId: `ACADEMY_WITHDRAWAL_RECEIVED:${order.purchaseId}`, channel: 'EMAIL', recipientUserId: actorId, templateKey: 'ACADEMY_WITHDRAWAL_RECEIVED', payload: { orderId, receivedAt: receipt.createdAt.toISOString() }, idempotencyKey: `academy-withdrawal-receipt:${order.purchaseId}` }, update: {} })
    return { receivedAt: receipt.createdAt }
  })
}

export async function listAcademyOrders(actorId: string) {
  assertAcademyCommerceSandbox()
  const db = getPrisma()
  await requireAcademyBuyer(db, actorId)
  const membership = await db.organizationMembership.findFirst({ where: { userId: actorId, status: 'ACTIVE', role: { in: ['OWNER','ADMIN'] }, organization: { status: 'ACTIVE', systemKey: null } }, select: { organizationId: true } })
  return db.learningAcademyOrder.findMany({ where: { OR: [{ buyerUserId: actorId, purchase: { organizationId: null } }, ...(membership ? [{ purchase: { organizationId: membership.organizationId } }] : [])] }, select: { id: true, quantity: true, createdAt: true, courseVersion: { select: { course: { select: { title: true } } } }, purchase: { select: { status: true, amountInclVatCents: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
}

export async function cancelAcademyUnpaidOrder(actorId:string,orderId:string) {
  assertAcademyCommerceSandbox()
  return runSerializableFinancialTransaction(async tx=>{
    const order=await ownedAcademyOrder(tx,actorId,orderId)
    await lockAcademyCommerce(tx,`purchase:${order.purchaseId}`)
    const current=await tx.financialPurchase.findUniqueOrThrow({where:{id:order.purchaseId}})
    if(current.status==='CANCELED')return {canceled:true}
    const attempted=await tx.financialEvent.findUnique({where:{idempotencyKey:`academy-contract-confirmed:${current.id}`}})
    commerceAssert(current.status==='CREATED'&&!current.molliePaymentId&&!attempted,'ACADEMY_PAYMENT_RECONCILIATION_REQUIRED')
    await tx.financialPurchase.update({where:{id:current.id},data:{status:'CANCELED',terminalAt:new Date()}})
    await settleAcademyPromotionUse(tx,orderId,'CANCELED')
    await tx.financialEvent.upsert({where:{idempotencyKey:`academy-unpaid-cancel:${current.id}`},create:{actorUserId:actorId,purchaseId:current.id,eventType:'ACADEMY_UNPAID_ORDER_CANCELED',result:'CANCELED',idempotencyKey:`academy-unpaid-cancel:${current.id}`},update:{}})
    return {canceled:true}
  })
}
