import 'server-only'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { issueInvoiceForPaidPurchase } from '@/lib/finance/invoice-service'
import { centsToMollieValue, createMollieGateway, getMollieUrls, type MollieGateway, type MolliePaymentSnapshot } from '@/lib/finance/mollie-gateway'
import { lockAcademyCommerce, ownedAcademyOrder, qualifyingAcademyPass } from './academy-commerce-access'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { academyUnusedSeatAvailable } from './academy-access-policy'
import { commerceAssert, normalizedAcademyEmail, verifiedAcademyPayment } from './academy-commerce-policy'
import { academyTransferPrice } from './academy-seat-transfer-policy'
const inputSchema=z.object({seatId:z.uuid(),email:z.email().max(320),requestKey:z.uuid()}).strict()
export async function prepareAcademySeatTransfer(actorId:string,raw:unknown) {
  assertAcademyCommerceSandbox()
  const input=inputSchema.parse(raw),email=normalizedAcademyEmail(input.email)
  return runSerializableFinancialTransaction(async tx=>{
    await lockAcademyCommerce(tx,`seat:${input.seatId}`)
    const seat=await tx.learningAcademySeat.findUnique({where:{id:input.seatId}})
    commerceAssert(seat,'ACADEMY_SEAT_NOT_AVAILABLE')
    const order=await ownedAcademyOrder(tx,actorId,seat.orderId)
    const key=`academy-transfer:${actorId}:${input.requestKey}`
    const previous=await tx.learningAcademySeatTransfer.findUnique({where:{requestKey:key},include:{purchase:true}})
    if(previous){commerceAssert(previous.seatId===seat.id&&previous.targetEmail===email,'ACADEMY_IDEMPOTENCY_CONFLICT');return {transferId:previous.id,amountInclVatCents:previous.purchase.amountInclVatCents,applied:Boolean(previous.appliedAt)}}
    commerceAssert(order.quantity===5&&order.purchase.status==='PAID'&&['AVAILABLE','INVITED'].includes(seat.status)&&!seat.acceptedAt&&academyUnusedSeatAvailable(order,new Date()),'ACADEMY_SEAT_NOT_AVAILABLE')
    commerceAssert(!order.seats.some(s=>s.id!==seat.id&&s.invitedEmail===email&&s.status!=='REVOKED'),'ACADEMY_DUPLICATE_PARTICIPANT')
    const target=await tx.user.findUnique({where:{email},select:{id:true,status:true,emailVerified:true}})
    commerceAssert(target?.status==='ACTIVE'&&target.emailVerified,'ACADEMY_TRANSFER_VERIFIED_PARTICIPANT_REQUIRED')
    const pending=await tx.learningAcademySeatTransfer.findFirst({where:{seatId:seat.id,appliedAt:null,purchase:{status:{notIn:['FAILED','CANCELED','EXPIRED']}}},include:{purchase:true}})
    if(pending){commerceAssert(pending.targetEmail===email,'ACADEMY_TRANSFER_PENDING');return {transferId:pending.id,amountInclVatCents:pending.purchase.amountInclVatCents,applied:false}}
    const proof=order.benefitProof as {applied?:boolean;participants?:Array<{position:number;discountCents:number;userId:string|null}>}
    const benefit=proof.applied?proof.participants?.find(p=>p.position===seat.position):null
    const prior=await tx.learningAcademySeatTransfer.findMany({where:{seatId:seat.id,appliedAt:{not:null},purchase:{status:'PAID'}},include:{purchase:true}})
    const alreadyPaid=prior.reduce((n,t)=>n+t.purchase.amountInclVatCents,0)
    const pass=await qualifyingAcademyPass(tx,email,order.courseVersion.courseId)
    const price=academyTransferPrice(benefit?.discountCents??0,alreadyPaid,Boolean(pass)||benefit?.userId===target.id,order.purchase.vatRateBps)
    const original=order.purchase
    const purchase=await tx.financialPurchase.create({data:{organizationId:original.organizationId,createdByUserId:actorId,kind:'ACADEMY_COURSE',pricingMode:'ACADEMY_SANDBOX',packageSku:'ACADEMY_SEAT_TRANSFER',packageLabel:'Bijbetaling overdracht opleidingsplaats',credits:0,baseAmountCents:price.amountExclVatCents,packageDiscountCents:0,proDiscountCents:0,discountCodeDiscountCents:0,...price,currency:'EUR',billingOrganizationName:original.billingOrganizationName,billingAddressLine:original.billingAddressLine,billingPostalCode:original.billingPostalCode,billingCity:original.billingCity,billingCountryCode:original.billingCountryCode,billingKvKNumber:original.billingKvKNumber,billingVatId:original.billingVatId,idempotencyKey:key}})
    const transfer=await tx.learningAcademySeatTransfer.create({data:{seatId:seat.id,purchaseId:purchase.id,targetUserId:target.id,targetEmail:email,requestKey:key,snapshot:{version:'ACADEMY-SEAT-TRANSFER-1.0',originalOrderId:order.id,originalPurchaseId:original.id,originalPricingSnapshot:order.pricingSnapshot,originalBenefitProof:order.benefitProof,originalDiscountCents:benefit?.discountCents??0,alreadyPaidCents:alreadyPaid,qualifyingAttemptId:pass?.id??null,...price,taxStatus:'TAX_REVIEW_REQUIRED'}}})
    await tx.financialEvent.create({data:{actorUserId:actorId,purchaseId:purchase.id,eventType:'ACADEMY_SEAT_TRANSFER_PREPARED',result:'AWAITING_CONFIRMATION',metadata:{transferId:transfer.id,originalPurchaseId:original.id,seatId:seat.id,taxStatus:'TAX_REVIEW_REQUIRED'},idempotencyKey:key}})
    return {transferId:transfer.id,amountInclVatCents:price.amountInclVatCents,applied:false}
  })
}
async function ownedTransfer(actorId:string,id:string){
 const db=getPrisma(),transfer=await db.learningAcademySeatTransfer.findUnique({where:{id:z.uuid().parse(id)},include:{purchase:true,seat:true}})
 commerceAssert(transfer,'ACADEMY_TRANSFER_NOT_FOUND');await ownedAcademyOrder(db,actorId,transfer.seat.orderId);return transfer
}
export async function startAcademySeatTransferPayment(actorId:string,id:string,confirmed:boolean,gateway?:MollieGateway){
 assertAcademyCommerceSandbox();commerceAssert(confirmed===true,'ACADEMY_PAYMENT_CONFIRMATION_REQUIRED')
 const transfer=await ownedTransfer(actorId,id),p=transfer.purchase
 if(transfer.appliedAt)return {checkoutUrl:`/e-learnings/aankopen/${transfer.seat.orderId}`}
 commerceAssert(['CREATED','PAYMENT_PENDING'].includes(p.status),'ACADEMY_TRANSFER_PAYMENT_NOT_AVAILABLE')
 if(p.amountInclVatCents===0){await completeAcademySeatTransfer(transfer.id,null);return {checkoutUrl:`/e-learnings/aankopen/${transfer.seat.orderId}`}}
 if(p.molliePaymentId&&p.mollieCheckoutUrl)return {checkoutUrl:p.mollieCheckoutUrl}
 const urls=getMollieUrls(),provider=gateway??createMollieGateway()
 const payment=await provider.createPayment({amountValue:centsToMollieValue(p.amountInclVatCents),currency:'EUR',description:'WorkMatchr Academy testbijbetaling',redirectUrl:new URL(`/e-learnings/aankopen/${transfer.seat.orderId}`,urls.redirectBaseUrl).toString(),webhookUrl:new URL('/api/payments/mollie/webhook',urls.webhookBaseUrl).toString(),metadata:{purchaseId:p.id,...(p.organizationId?{organizationId:p.organizationId}:{})},idempotencyKey:`academy-transfer-payment:${p.id}`})
 commerceAssert(verifiedAcademyPayment({...p,molliePaymentId:payment.id},payment),'ACADEMY_PAYMENT_MISMATCH')
 const url=payment.checkoutUrl?new URL(payment.checkoutUrl):null
 commerceAssert(url?.protocol==='https:'&&(url.hostname==='mollie.com'||url.hostname.endsWith('.mollie.com')),'ACADEMY_CHECKOUT_URL_INVALID')
 await runSerializableFinancialTransaction(async tx=>{
  await lockAcademyCommerce(tx,`seat:${transfer.seatId}`)
  const current=await tx.financialPurchase.findUniqueOrThrow({where:{id:p.id}})
  commerceAssert(!current.molliePaymentId||current.molliePaymentId===payment.id,'ACADEMY_DUPLICATE_PAYMENT')
  await tx.financialPurchase.update({where:{id:p.id},data:{molliePaymentId:payment.id,mollieCheckoutUrl:url!.href,paymentCreatedAt:new Date(),...(current.status==='CREATED'?{status:'PAYMENT_PENDING' as const}:{})}})
 });return {checkoutUrl:url!.href}
}
/** Called only with the provider-fetched snapshot, never a client asserted paid flag. */
export async function processAcademySeatTransferPayment(payment:MolliePaymentSnapshot){
 assertAcademyCommerceSandbox()
 const transfer=await getPrisma().learningAcademySeatTransfer.findFirst({where:{purchase:{molliePaymentId:payment.id}}})
 commerceAssert(transfer,'ACADEMY_TRANSFER_NOT_FOUND')
 return completeAcademySeatTransfer(transfer.id,payment)
}
async function completeAcademySeatTransfer(id:string,payment:MolliePaymentSnapshot|null){
 return runSerializableFinancialTransaction(async tx=>{
  const initial=await tx.learningAcademySeatTransfer.findUniqueOrThrow({where:{id}})
  await lockAcademyCommerce(tx,`seat:${initial.seatId}`)
  const transfer=await tx.learningAcademySeatTransfer.findUniqueOrThrow({where:{id},include:{purchase:true,seat:{include:{order:{include:{purchase:true,seats:true}}}}}})
  const p=transfer.purchase,seat=transfer.seat,now=new Date()
  commerceAssert(payment?verifiedAcademyPayment(p,payment):p.amountInclVatCents===0&&!p.molliePaymentId,'ACADEMY_PAYMENT_MISMATCH')
  if(transfer.appliedAt)return {status:p.status}
  commerceAssert(!['REFUNDED','PARTIALLY_REFUNDED','REFUND_REVIEW_REQUIRED'].includes(p.status),'ACADEMY_TRANSFER_REVIEW_REQUIRED')
  const status=!payment||payment.status==='paid'?'PAID':payment.status==='failed'?'FAILED':payment.status==='canceled'?'CANCELED':payment.status==='expired'?'EXPIRED':'PAYMENT_PENDING'
  if(p.status==='PAID'&&status!=='PAID')return {status:p.status}
  await tx.financialPurchase.update({where:{id:p.id},data:{status,...(status==='PAID'?{paidAt:payment?.paidAt?new Date(payment.paidAt):now}:{})}})
  await tx.financialEvent.upsert({where:{idempotencyKey:`academy-transfer-state:${id}:${status}`},create:{purchaseId:p.id,eventType:'ACADEMY_SEAT_TRANSFER_PAYMENT',result:status,idempotencyKey:`academy-transfer-state:${id}:${status}`},update:{}})
  if(status!=='PAID')return {status}
  const target=await tx.user.findUnique({where:{id:transfer.targetUserId},select:{email:true,status:true,emailVerified:true}})
  const safe=seat.order.purchase.status==='PAID'&&['AVAILABLE','INVITED'].includes(seat.status)&&!seat.acceptedAt&&academyUnusedSeatAvailable(seat.order,now)&&!await tx.learningAcademySeatTransfer.findFirst({where:{seatId:seat.id,id:{not:id},appliedAt:null,purchase:{status:{notIn:['FAILED','CANCELED','EXPIRED']}}}})&&target?.status==='ACTIVE'&&target.emailVerified&&normalizedAcademyEmail(target.email)===transfer.targetEmail&&!seat.order.seats.some(s=>s.id!==seat.id&&s.invitedEmail===transfer.targetEmail&&s.status!=='REVOKED')
  if(!safe){await tx.financialPurchase.update({where:{id:p.id},data:{status:'REFUND_REVIEW_REQUIRED'}});return {status:'REFUND_REVIEW_REQUIRED'}}
  const invoice=await issueInvoiceForPaidPurchase(tx,p.id)
  await tx.learningAcademySeatTransfer.update({where:{id},data:{appliedAt:now}})
  await tx.learningAcademySeat.update({where:{id:seat.id},data:{status:'INVITED',invitedEmail:transfer.targetEmail,invitedAt:now,inviteExpiresAt:new Date(now.getTime()+30*86400000)}})
  await tx.learningAcademySeatEvent.create({data:{seatId:seat.id,actorUserId:p.createdByUserId,action:'TRANSFERRED',metadata:{transferId:id,purchaseId:p.id,invoiceId:invoice.id}}})
  await tx.notificationOutbox.upsert({where:{idempotencyKey:`academy-seat-transfer:${id}`},create:{eventId:`ACADEMY_SEAT_INVITED:${id}`,channel:'EMAIL',templateKey:'ACADEMY_SEAT_INVITED',payload:{seatId:seat.id,email:transfer.targetEmail},idempotencyKey:`academy-seat-transfer:${id}`},update:{}})
  return {status:'PAID'}
 })
}
