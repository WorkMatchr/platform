import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MollieGateway } from '@/lib/finance/mollie-gateway'
const state=vi.hoisted(()=>({db:null as unknown}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/finance/financial-transaction',()=>({runSerializableFinancialTransaction:async(fn:(db:unknown)=>unknown)=>fn(state.db)}))
vi.mock('./academy-commerce-environment',()=>({assertAcademyCommerceSandbox:vi.fn()}))
vi.mock('@/lib/finance/invoice-service',()=>({issueInvoiceForPaidPurchase:vi.fn().mockResolvedValue({id:'invoice'})}))
vi.mock('@/lib/finance/mollie-gateway',async original=>({...await original<typeof import('@/lib/finance/mollie-gateway')>(),getMollieUrls:()=>({redirectBaseUrl:'http://127.0.0.1:3002',webhookBaseUrl:'https://test.example.invalid'}),createMollieGateway:()=>{throw new Error('NO_REAL_PROVIDER')}}))
import { createAcademyOrder, startAcademyOrderPayment, processAcademyMolliePayment, inviteAcademySeat, acceptAcademySeat } from './academy-commerce-service'
import { activateAcademySeatInTransaction } from './academy-commerce-access'
import { issueInvoiceForPaidPurchase } from '@/lib/finance/invoice-service'
import { ACADEMY_LEGAL_VERSION } from './academy-commerce-policy'
const userId='10000000-0000-4000-8000-000000000001'
const orgId='10000000-0000-4000-8000-000000000002'
const user={id:userId,email:'buyer@example.invalid',status:'ACTIVE',emailVerified:true}
const version={id:'version',courseId:'course',status:'PUBLISHED',course:{id:'course',code:'WL-001',title:'RI&E in de praktijk',status:'PUBLISHED'}}
let purchase: Record<string,unknown>, order: Record<string,unknown>|null
let db: ReturnType<typeof fixture>
function fixture(){return {
 learningAcademySeatTransfer:{findFirst:vi.fn().mockResolvedValue(null)},
 $queryRaw:vi.fn().mockResolvedValue([]),
 learningAcademyPriceVersion:{findFirst:vi.fn().mockResolvedValue(null)},learningAcademyPromotion:{findMany:vi.fn().mockResolvedValue([])},learningAcademyPromotionUse:{create:vi.fn(),findUnique:vi.fn().mockResolvedValue(null),updateMany:vi.fn().mockResolvedValue({count:0})},
 user:{findUnique:vi.fn().mockResolvedValue(user)},organizationMembership:{findFirst:vi.fn().mockResolvedValue({role:'OWNER'})},
 learningCourseVersion:{findFirst:vi.fn().mockResolvedValue(version)},learningChapterProgress:{count:vi.fn().mockResolvedValue(10)},learningChapter:{count:vi.fn().mockResolvedValue(10)},learningExamAttempt:{findMany:vi.fn().mockResolvedValue([])},
 learningEnrollment:{findFirst:vi.fn().mockResolvedValue(null),upsert:vi.fn().mockResolvedValue({id:'enrollment',accessRevokedAt:null}),update:vi.fn()},
 financialPurchase:{create:vi.fn(async({data}:{data:Record<string,unknown>})=>{purchase={...data,id:'purchase',status:'CREATED',molliePaymentId:null,mollieCheckoutUrl:null};return purchase}),findUnique:vi.fn(async()=>({...purchase,academyOrder:order})),findUniqueOrThrow:vi.fn(async()=>purchase),update:vi.fn(async({data}:{data:Record<string,unknown>})=>{purchase={...purchase,...data};return purchase})},
 learningAcademyOrder:{findFirst:vi.fn(async({where}:{where:Record<string,unknown>})=>where.purchase&&order?order:null),create:vi.fn(async({data}:{data:Record<string,unknown>})=>{order={...data,id:'order',purchase,courseVersion:version,seats:[]};return order}),findUnique:vi.fn(async()=>order?{...order,purchase}:null)},
 learningAcademySeat:{findMany:vi.fn().mockResolvedValue([{status:"ACTIVE",order:{purchase:{status:"PAID",amountInclVatCents:14900,molliePaymentId:"tr_previous",refunds:[]}}}]),findUnique:vi.fn(),findUniqueOrThrow:vi.fn(),findFirst:vi.fn().mockResolvedValue(null),update:vi.fn(async({data}:{data:Record<string,unknown>})=>({id:'seat',...data}))},learningAcademySeatEvent:{create:vi.fn().mockResolvedValue({id:'event'})},
 financialEvent:{upsert:vi.fn().mockResolvedValue({}),findUnique:vi.fn().mockResolvedValue(null)},financialPaymentEvent:{upsert:vi.fn()},notificationOutbox:{upsert:vi.fn(),create:vi.fn()},
}}
const input=(quantity:1|5=1)=>({courseCode:'WL-001',quantity,buyerType:quantity===1?'CONSUMER':'BUSINESS',...(quantity===5?{organizationId:orgId}:{}),billing:{name:'Fictieve koper',address:'Teststraat 1',postalCode:'1000AA',city:'Teststad',country:'NL'},platformTermsAccepted:true,academyTermsAccepted:true,legalVersion:ACADEMY_LEGAL_VERSION,idempotencyKey:'fixture-order-0001'})
const snapshot=(status:'open'|'pending'|'paid'|'failed'|'canceled'|'expired'='paid')=>({id:'tr_fixture',status,amountValue:'595.00',currency:'EUR',metadata:{purchaseId:'purchase',organizationId:orgId},paidAt:'2026-10-26T10:00:00Z',createdAt:null,checkoutUrl:'https://www.mollie.com/checkout/test',subscriptionId:null,mandateId:null,method:null})
beforeEach(()=>{vi.clearAllMocks();db=fixture();state.db=db;purchase={};order=null})
describe('Academy checkout en seats, bestaande financebron',()=>{
 it('maakt een persoonlijke offerte zonder organisatie, betaling of entitlement',async()=>{
  expect(await createAcademyOrder(userId,input())).toEqual({orderId:'order'})
  expect(db.financialPurchase.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({organizationId:null,kind:'ACADEMY_COURSE',credits:0,pricingMode:'ACADEMY_SANDBOX',amountInclVatCents:14900})}))
  expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
  expect(db.learningAcademyOrder.create.mock.calls[0][0].data).toMatchObject({legalAgreement:{withdrawalRightWaived:false,platformTermsAccepted:true,academyTermsAccepted:true}})
 })
 it('maakt precies vijf afzonderlijke beschikbare plaatsen in een normale organisatiebestelling',async()=>{
  await createAcademyOrder(userId,input(5))
  const seats=db.learningAcademyOrder.create.mock.calls[0][0].data.seats as {create:Array<{position:number}>}
  expect(seats.create.map(s=>s.position)).toEqual([1,2,3,4,5]);expect(purchase.amountInclVatCents).toBe(59500)
 })
 it('controleert een gemengd pakket per deelnemer, bewaart bewijs en geeft één alumnus €6 voordeel',async()=>{
  db.learningExamAttempt.findMany.mockImplementation(async(raw:unknown)=>{
   const q=raw as {where:{user:{email:string}}};return q.where.user.email==='alumnus@example.invalid'?[{id:'pass',userId:'alumnus',enrollmentId:'old-enrollment',courseVersionId:'old-version'}]:[]
  })
  await createAcademyOrder(userId,{...input(5),followUp:true,participantEmails:['alumnus@example.invalid','b@example.invalid','c@example.invalid','d@example.invalid','e@example.invalid']})
  expect(purchase.amountInclVatCents).toBe(58900)
  const proof=order!.benefitProof as {participants:Array<{discountCents:number;attemptId:string|null}>}
  expect(proof.participants.filter(p=>p.attemptId)).toHaveLength(1)
  expect(proof.participants.reduce((n,p)=>n+p.discountCents,0)).toBe(600)
  expect(db.learningExamAttempt.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({status:'SUBMITTED',passed:true,examVersion:expect.objectContaining({courseId:{not:'course'}})})}))
 })
 it('weigert onbekend individueel alumni-recht en geeft onbekende 5-packhistorie geen korting',async()=>{
  await expect(createAcademyOrder(userId,{...input(),followUp:true})).rejects.toThrow('BENEFIT_NOT_ESTABLISHED')
  expect(db.financialPurchase.create).not.toHaveBeenCalled()
 })
 it('weigert een onbevoegde organisatiekoper vóór replay of financiële mutatie',async()=>{
  db.organizationMembership.findFirst.mockResolvedValue(null)
  await expect(createAcademyOrder(userId,input(5))).rejects.toThrow('ORGANIZATION_NOT_AUTHORIZED')
  expect(db.financialPurchase.create).not.toHaveBeenCalled()
 })
 it('verkoopt geen DRAFT-opleiding',async()=>{
  db.learningCourseVersion.findFirst.mockResolvedValue(null)
  await expect(createAcademyOrder(userId,{...input(),courseCode:'WL-002'})).rejects.toThrow('COURSE_NOT_AVAILABLE')
 })
 it('is idempotent maar weigert gewijzigde deelnemers/billing onder dezelfde sleutel',async()=>{
  await createAcademyOrder(userId,input());await createAcademyOrder(userId,input())
  expect(db.financialPurchase.create).toHaveBeenCalledTimes(1)
  await expect(createAcademyOrder(userId,{...input(),billing:{...input().billing,name:'Andere koper'}})).rejects.toThrow('IDEMPOTENCY_CONFLICT')
 })
 it('vereist expliciete definitieve bevestiging vóór providercontact',async()=>{
  await createAcademyOrder(userId,input(5))
  const create=vi.fn().mockResolvedValue(snapshot('open')),gateway={createPayment:create} as unknown as MollieGateway
  await expect(startAcademyOrderPayment(userId,'order',false,gateway)).rejects.toThrow('CONFIRMATION_REQUIRED');expect(create).not.toHaveBeenCalled()
  await startAcademyOrderPayment(userId,'order',true,gateway)
  expect(create).toHaveBeenCalledWith(expect.objectContaining({amountValue:'595.00',idempotencyKey:'academy-payment:purchase'}))
 })
 it.each(['open','pending','failed','canceled','expired'] as const)('geeft bij %s geen toegang of factuur',async status=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture'
  await processAcademyMolliePayment(snapshot(status))
  expect(issueInvoiceForPaidPurchase).not.toHaveBeenCalled();expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
 })
 it('maakt pas na server-opgehaalde paid-status een factuur en stabiele outboxintentie',async()=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture'
  await processAcademyMolliePayment(snapshot());await processAcademyMolliePayment(snapshot())
  expect(purchase.status).toBe('PAID')
  expect(db.notificationOutbox.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{idempotencyKey:'academy-order-confirmed:purchase'}}))
  expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
 })
 it('weigert verkeerd bedrag voordat een factuur of seat wordt uitgegeven',async()=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture'
  await expect(processAcademyMolliePayment({...snapshot(),amountValue:'1.00'})).rejects.toThrow('PAYMENT_MISMATCH')
  expect(issueInvoiceForPaidPurchase).not.toHaveBeenCalled()
 })
 it.each(['REFUND_REVIEW_REQUIRED','PARTIALLY_REFUNDED','REFUNDED'])('heractiveert geen toegang door een late paid-observatie na %s',async status=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture';purchase.status=status
  expect(await processAcademyMolliePayment(snapshot())).toEqual({status})
  expect(purchase.status).toBe(status)
  expect(issueInvoiceForPaidPurchase).not.toHaveBeenCalled()
  expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
  expect(db.notificationOutbox.upsert).not.toHaveBeenCalled()
 })
 it('weigert activatie van een onbetaalde plaats en een uitnodiging aan de verkeerde geverifieerde gebruiker',async()=>{
  db.learningAcademySeat.findUnique.mockResolvedValue({id:'seat',status:'INVITED',invitedEmail:'other@example.invalid',order:{quantity:5,buyerUserId:userId,purchase:{status:'PAYMENT_PENDING'},courseVersion:version}})
  await expect(activateAcademySeatInTransaction(db as never,'seat',userId,ACADEMY_LEGAL_VERSION,new Date())).rejects.toThrow('SEAT_NOT_AVAILABLE')
  db.learningAcademySeat.findUnique.mockResolvedValue({id:'seat',status:'INVITED',invitedEmail:'other@example.invalid',order:{quantity:5,buyerUserId:userId,purchase:{status:'PAID'},courseVersion:version}})
  await expect(activateAcademySeatInTransaction(db as never,'seat',userId,ACADEMY_LEGAL_VERSION,new Date())).rejects.toThrow('SEAT_NOT_AVAILABLE')
  expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
 })
 it('leidt uit een uitnodigingslink geen aanvaarding af',async()=>{
  await expect(acceptAcademySeat(userId,'seat',false,ACADEMY_LEGAL_VERSION)).rejects.toThrow('TERMS_REQUIRED')
  expect(db.learningEnrollment.upsert).not.toHaveBeenCalled()
 })
 it('laat geen invite-mutatie toe vóór betaalbevestiging',async()=>{
  await createAcademyOrder(userId,input(5));db.learningAcademySeat.findUnique.mockResolvedValue({id:'seat',orderId:'order',status:'AVAILABLE'})
  await expect(inviteAcademySeat(userId,'seat','participant@example.invalid')).rejects.toThrow('SEAT_NOT_AVAILABLE')
  expect(db.notificationOutbox.create).not.toHaveBeenCalled()
 })
})

describe('Academy-prijssnapshot en gratis orderafhandeling',()=>{
 it('past accountkorting automatisch toe en reserveert eenmaal bij herhaald checkoutverzoek',async()=>{
  db.learningAcademyPromotion.findMany.mockResolvedValue([{id:'promotion',revision:1,kind:'ACCOUNT',label:'Persoonlijk voordeel',code:null,userId,organizationId:null,percentage:10,courseIds:[],active:true,validFrom:null,validUntil:null,maximumUses:null,maximumPerAccount:null,quantity:null}] as never)
  Object.assign(db.learningAcademyPromotionUse,{count:vi.fn().mockResolvedValue(0)})
  await createAcademyOrder(userId,input());await createAcademyOrder(userId,input());expect(purchase.amountInclVatCents).toBe(13410);expect(db.learningAcademyPromotionUse.create).toHaveBeenCalledOnce();expect(order!.pricingSnapshot).toMatchObject({originalGrossCents:14900,discountGrossCents:1490,finalGrossCents:13410,scheme:{kind:'ACCOUNT'}})
 })
 it('100%-5-pack gebruikt geen provider en finaliseert dezelfde order idempotent',async()=>{
  db.learningAcademyPromotion.findMany.mockResolvedValue([{id:'promotion',revision:1,kind:'ACCOUNT',label:'Testvrijstelling prijs',code:null,userId,organizationId:null,percentage:100,courseIds:[],active:true,validFrom:null,validUntil:null,maximumUses:null,maximumPerAccount:null,quantity:null}] as never)
  Object.assign(db.learningAcademyPromotionUse,{count:vi.fn().mockResolvedValue(0)})
  const made=await createAcademyOrder(userId,input(5));expect(purchase.amountInclVatCents).toBe(0)
  const provider={createPayment:vi.fn()} as unknown as MollieGateway
  await startAcademyOrderPayment(userId,made.orderId,true,provider);await startAcademyOrderPayment(userId,made.orderId,true,provider)
  expect(provider.createPayment).not.toHaveBeenCalled();expect(purchase.status).toBe('PAID');expect(db.financialPurchase.create).toHaveBeenCalledOnce();expect(db.learningAcademyPromotionUse.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:'COMMITTED'})}))
 })
 it('onzekere betaalstatus geeft geen gereserveerde capaciteit vrij',async()=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture';await processAcademyMolliePayment(snapshot('pending'));expect(db.learningAcademyPromotionUse.updateMany).not.toHaveBeenCalled()
 })
 it('late paid-status na vrijgegeven korting vraagt review en geeft geen toegang',async()=>{
  await createAcademyOrder(userId,input(5));purchase.molliePaymentId='tr_fixture';db.learningAcademyPromotionUse.findUnique.mockResolvedValue({status:'RELEASED'} as never)
  expect(await processAcademyMolliePayment(snapshot())).toEqual({status:'REFUND_REVIEW_REQUIRED'});expect(db.learningEnrollment.upsert).not.toHaveBeenCalled();expect(db.learningAcademyPromotionUse.updateMany).not.toHaveBeenCalled()
 })
})
