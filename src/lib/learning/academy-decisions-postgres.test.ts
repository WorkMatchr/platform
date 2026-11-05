import {randomUUID} from 'node:crypto'
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest'
import {PrismaPg} from '@prisma/adapter-pg'
import {PrismaClient,type Prisma} from '@/generated/prisma/client'
vi.mock('@/lib/finance/mollie-gateway',async original=>({...await original<typeof import('@/lib/finance/mollie-gateway')>(),getMollieUrls:()=>({redirectBaseUrl:'http://127.0.0.1:3006',webhookBaseUrl:'https://example.invalid'}),createMollieGateway:()=>{throw Error('REAL_PROVIDER_REFUSED')}}))
const state=vi.hoisted(()=>({db:null as Prisma.TransactionClient|null, concurrent:false}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/finance/financial-transaction',()=>({runSerializableFinancialTransaction:async(fn:(db:unknown)=>unknown)=>state.concurrent ? (await vi.importActual<typeof import('@/lib/finance/financial-transaction')>('@/lib/finance/financial-transaction')).runSerializableFinancialTransaction(fn as never) : fn(state.db)}))
import {receiveAcademyWithdrawal} from './academy-withdrawal-service'
import {requestAcademyReview,decideAcademyReview} from './academy-review-service'
import {createAcademyOrder,startAcademyOrderPayment,processAcademyMolliePayment,inviteAcademySeat,acceptAcademySeat} from './academy-commerce-service'
import {prepareAcademySeatTransfer,startAcademySeatTransferPayment,processAcademySeatTransferPayment} from './academy-seat-transfer-service'
import {ACADEMY_LEGAL_VERSION} from './academy-commerce-policy'
import type {MollieGateway,MolliePaymentSnapshot} from '@/lib/finance/mollie-gateway'
import {WITHDRAWAL_DECLARATION_VERSION} from './academy-withdrawal-policy'
import {approveAcademyLegalRefund,executeAcademyLegalRefund,type AcademyLegalRefundFakeGateway} from './academy-legal-refund-service'
import {qualifyingAcademyPass} from './academy-commerce-access'
import {allocateLegalRefund} from './academy-legal-refund-policy'
import {requestAcademyRefund} from './academy-commerce-refund'
import {registrationLegalEvidence} from '@/lib/registration-legal-evidence'
import {REGISTRATION_LEGAL_VERSION} from '@/content/legal-documents'
const enabled=process.env.ACADEMY_DECISIONS_RUNTIME==='1'
let db:PrismaClient
beforeAll(async()=>{
 if(!enabled)return
 const u=new URL(process.env.DATABASE_URL??'')
 if(process.env.NODE_ENV!=='test'||process.env.VERCEL_ENV==='production'||process.env.ACADEMY_TEST_PROJECT_ID!=='academy-synthetic-project'||!((process.env.ACADEMY_TEST_BRANCH_ID==='branch-fixture-small-frost'&&u.hostname==='fixture-161a49ea0e.example.invalid')||(process.env.ACADEMY_TEST_BRANCH_ID==='branch-fixture-blue-morning'&&u.hostname==='fixture-301797460c.example.invalid'))||u.pathname!=='/neondb'||u.search!=='?sslmode=verify-full'||!['postgres:','postgresql:'].includes(u.protocol)||!['','5432'].includes(u.port)||u.hash||decodeURIComponent(u.username)!=='neondb_owner'||!u.password||process.env.RESEND_API_KEY||process.env.JORTT_CLIENT_SECRET)throw Error('DECISIONS_RUNTIME_TARGET_REFUSED')
 db=new PrismaClient({adapter:new PrismaPg({connectionString:u.href})})
 const rows=await db.$queryRaw<Array<{database:string;major:number}>>`SELECT current_database() database,(current_setting('server_version_num')::int/10000)::int major`
 expect(rows).toEqual([{database:'neondb',major:17}])
},30000)
afterAll(async()=>{await db?.$disconnect()})
async function rolledBack(fn:(tx:Prisma.TransactionClient)=>Promise<void>){
 const sentinel=new Error('INTENTIONAL_FIXTURE_ROLLBACK')
 try{await db.$transaction(async tx=>{state.db=tx;await fn(tx);await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE');throw sentinel},{timeout:180000})}catch(e){if(e!==sentinel)throw e}
}
async function rejectsSql(tx:Prisma.TransactionClient,sql:Prisma.Sql){await tx.$executeRawUnsafe('SAVEPOINT expected_rejection');let rejected=false;try{await tx.$executeRaw(sql)}catch{rejected=true}finally{await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT expected_rejection')}expect(rejected).toBe(true)}
import {Prisma as Sql} from '@/generated/prisma/client'
describe.skipIf(!enabled)('D02/D08/D11/D15 actual PostgreSQL with all fixtures rolled back',()=>{
 it('atomically creates two legal evidence records for a synthetic user; no historical backfill',async()=>{
  const before=await db.legalAgreementEvidence.count()
  await rolledBack(async tx=>{
   const user=await tx.user.create({data:{id:randomUUID(),email:`legal-fixture-${randomUUID()}@example.invalid`,displayName:'Synthetische controlegebruiker',registrationLegalEvidence:registrationLegalEvidence({acceptedTerms:true,legalVersion:REGISTRATION_LEGAL_VERSION})}})
   const evidence=await tx.legalAgreementEvidence.findMany({where:{userId:user.id},orderBy:{documentId:'asc'}})
   expect(evidence).toHaveLength(2);expect(evidence.map(e=>e.evidenceKind).sort()).toEqual(['CONTRACT_ACCEPTANCE','INFORMATION_PRESENTED'])
   await rejectsSql(tx,Sql.sql`UPDATE "LegalAgreementEvidence" SET "documentVersion"='changed' WHERE "userId"=${user.id}::uuid`)
   await rejectsSql(tx,Sql.sql`UPDATE "User" SET "registrationLegalEvidence"=NULL WHERE id=${user.id}::uuid`)
  });expect(await db.legalAgreementEvidence.count()).toBe(before)
 },60000)
 it('enforces exact access pair, immutable activation and preserves legacy nulls',async()=>{
  await rolledBack(async tx=>{
   const enrollment=await tx.learningEnrollment.findFirstOrThrow({where:{accessActivatedAt:null}})
   await rejectsSql(tx,Sql.sql`UPDATE "LearningEnrollment" SET "accessActivatedAt"=now(),"accessExpiresAt"=NULL WHERE id=${enrollment.id}::uuid`)
   await tx.learningEnrollment.update({where:{id:enrollment.id},data:{accessActivatedAt:new Date('2026-10-30'),accessExpiresAt:new Date('2027-10-30')}})
   await rejectsSql(tx,Sql.sql`UPDATE "LearningEnrollment" SET "accessExpiresAt"='2028-01-01' WHERE id=${enrollment.id}::uuid`)
  })
 },60000)
 it('persists one account-independent receipt and one outbox intent across retries',async()=>{
  await rolledBack(async tx=>{
   const requestKey=randomUUID(),input={requestKey,orderReference:'synthetic-unknown-purchase',email:'withdrawal-fixture@example.invalid',confirmed:true,declarationVersion:WITHDRAWAL_DECLARATION_VERSION}
   const first=await receiveAcademyWithdrawal(input),second=await receiveAcademyWithdrawal(input)
   expect(second).toEqual(first);expect(await tx.academyWithdrawalRequest.count({where:{requestKey}})).toBe(1)
   expect(await tx.notificationOutbox.count({where:{idempotencyKey:`academy-public-withdrawal:${first.reference}`}})).toBe(1)
   await rejectsSql(tx,Sql.sql`DELETE FROM "AcademyWithdrawalRequest" WHERE id=${first.reference}::uuid`)
  })
 },60000)
 it('enforces review ownership, operator decision, audit and append-only history',async()=>{
  await rolledBack(async tx=>{
   const user=await tx.user.findFirstOrThrow({where:{status:'ACTIVE',emailVerified:true}})
   const operator=await tx.user.findFirstOrThrow({where:{status:'ACTIVE',platformRole:'ADMIN',memberships:{some:{status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'}}}}})
   const request={requestKey:randomUUID(),targetId:user.id,kind:'PRIVACY',reason:'Synthetische test van eigenaarschap en menselijke beoordeling'}
   const first=await requestAcademyReview(user.id,request);expect(await requestAcademyReview(user.id,request)).toEqual(first)
   const decision=await decideAcademyReview(operator.id,{requestKey:randomUUID(),caseId:first.caseId,action:'ACCEPTED',reason:'Synthetische geautoriseerde beoordeling; geen historische gegevens wijzigen'})
   expect(await tx.marketplaceAuditEvent.count({where:{entityId:decision.id,action:'ACADEMY_HUMAN_REVIEW'}})).toBe(1)
   await rejectsSql(tx,Sql.sql`UPDATE "AcademyReviewEvent" SET reason='Changed historical reason' WHERE id=${decision.id}::uuid`)
   await expect(decideAcademyReview(operator.id,{requestKey:randomUUID(),caseId:first.caseId,action:'REJECTED',reason:'Synthetische tweede terminale beslissing'})).rejects.toThrow('ALREADY_DECIDED')
  })
 },60000)
 it('transfers an unused alumni seat only after its original consideration is paid, using actual SQL guards',async()=>{
  await rolledBack(async tx=>{
   const actor=await tx.user.create({data:{email:`decision-buyer-${randomUUID()}@example.invalid`,displayName:'Synthetische koper',status:'ACTIVE',emailVerified:true}})
   const target=await tx.user.create({data:{email:`decision-target-${randomUUID()}@example.invalid`,displayName:'Synthetische ontvanger',status:'ACTIVE',emailVerified:true}})
   const org=await tx.organization.create({data:{name:'Synthetische overdrachtsproef',organizationType:'CLIENT',status:'ACTIVE'}})
   await tx.organizationMembership.create({data:{userId:actor.id,organizationId:org.id,role:'OWNER',status:'ACTIVE'}})
   const alumnus=await tx.learningExamAttempt.findFirstOrThrow({where:{passed:true,status:'SUBMITTED',user:{emailVerified:true,status:'ACTIVE'},examVersion:{courseVersion:{course:{code:'WL-901'}}}},include:{user:true}})
   const input=(courseCode:string,emails:string[]=[])=>({courseCode,quantity:5,buyerType:'BUSINESS',organizationId:org.id,followUp:emails.length>0,participantEmails:emails,billing:{name:'Synthetische koper',address:'Teststraat 1',postalCode:'1000AA',city:'Teststad',country:'NL'},platformTermsAccepted:true,academyTermsAccepted:true,legalVersion:ACADEMY_LEGAL_VERSION,idempotencyKey:`decision-${randomUUID()}`})
   const fake=(purchase:{id:string;organizationId:string|null;amountInclVatCents:number})=>{
    const payment:MolliePaymentSnapshot={id:`tr_${randomUUID()}`,status:'open',amountValue:(purchase.amountInclVatCents/100).toFixed(2),currency:'EUR',metadata:{purchaseId:purchase.id,...(purchase.organizationId?{organizationId:purchase.organizationId}:{})},checkoutUrl:'https://www.mollie.com/checkout/test',paidAt:null,createdAt:null,subscriptionId:null,mandateId:null,method:null}
    return {payment,gateway:{createPayment:vi.fn().mockResolvedValue(payment)} as unknown as MollieGateway}
   }
   const prior=await createAcademyOrder(actor.id,input('WL-901'))
   const priorOrder=await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:prior.orderId},include:{purchase:true,seats:true}})
   const priorProvider=fake(priorOrder.purchase)
   await startAcademyOrderPayment(actor.id,prior.orderId,true,priorProvider.gateway)
   await processAcademyMolliePayment({...priorProvider.payment,status:'paid',paidAt:new Date().toISOString()})
   await inviteAcademySeat(actor.id,priorOrder.seats[0].id,alumnus.user.email)
   await acceptAcademySeat(alumnus.userId,priorOrder.seats[0].id,true,ACADEMY_LEGAL_VERSION)
   const created=await createAcademyOrder(actor.id,input('WL-001',[alumnus.user.email,'b@example.invalid','c@example.invalid','d@example.invalid','e@example.invalid']))
   const original=await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:created.orderId},include:{purchase:true,seats:{orderBy:{position:'asc'}}}})
   const paid=fake(original.purchase);await startAcademyOrderPayment(actor.id,created.orderId,true,paid.gateway);await processAcademyMolliePayment({...paid.payment,status:'paid',paidAt:new Date().toISOString()})
   const sourceAmounts=await tx.$queryRaw<Array<{amount:number}>>`SELECT academy_original_seat_amount(${original.purchaseId}::uuid,id) amount FROM "LearningAcademySeat" WHERE "orderId"=${original.id}::uuid ORDER BY position`
   expect(sourceAmounts.map(s=>s.amount)).toEqual([11300,11900,11900,11900,11900])
   const seat=original.seats[0],request={seatId:seat.id,email:target.email,requestKey:randomUUID()}
   const transfer=await prepareAcademySeatTransfer(actor.id,request)
   expect(transfer.amountInclVatCents).toBe(600)
   expect(await prepareAcademySeatTransfer(actor.id,request)).toEqual(transfer)
   expect(await tx.learningAcademySeatTransfer.count({where:{seatId:seat.id}})).toBe(1)
   await rejectsSql(tx,Sql.sql`UPDATE "LearningAcademySeat" SET "invitedEmail"=${target.email} WHERE id=${seat.id}::uuid`)
   const stored=await tx.learningAcademySeatTransfer.findUniqueOrThrow({where:{id:transfer.transferId},include:{purchase:true}}),provider=fake(stored.purchase)
   await startAcademySeatTransferPayment(actor.id,stored.id,true,provider.gateway)
   await processAcademySeatTransferPayment({...provider.payment,status:'pending'})
   expect((await tx.learningAcademySeat.findUniqueOrThrow({where:{id:seat.id}})).invitedEmail).toBe(alumnus.user.email)
   await processAcademySeatTransferPayment({...provider.payment,status:'paid',paidAt:new Date().toISOString()})
   await processAcademySeatTransferPayment({...provider.payment,status:'paid',paidAt:new Date().toISOString()})
   expect(await tx.financialInvoice.count({where:{purchaseId:stored.purchaseId}})).toBe(1)
   await acceptAcademySeat(target.id,seat.id,true,ACADEMY_LEGAL_VERSION)
   await expect(prepareAcademySeatTransfer(actor.id,{...request,requestKey:randomUUID()})).rejects.toThrow('SEAT_NOT_AVAILABLE')
   expect((await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:original.id}})).pricingSnapshot).toEqual(original.pricingSnapshot)
   await rejectsSql(tx,Sql.sql`UPDATE "LearningAcademySeatTransfer" SET snapshot='{}'::jsonb WHERE id=${stored.id}::uuid`)
  })
 },180000)

})

async function legalRefundFixture(tx: Prisma.TransactionClient, courseCode='WL-001') {
 const actor=await tx.user.create({data:{email:`legal-refund-${randomUUID()}@example.invalid`,displayName:'Synthetische deelrefundkoper',status:'ACTIVE',emailVerified:true}})
 const org=await tx.organization.create({data:{name:'Synthetische wettelijke restitutie',organizationType:'CLIENT',status:'ACTIVE'}})
 await tx.organizationMembership.create({data:{userId:actor.id,organizationId:org.id,role:'OWNER',status:'ACTIVE'}})
 const operator=await tx.user.findFirstOrThrow({where:{status:'ACTIVE',platformRole:'ADMIN',memberships:{some:{status:'ACTIVE',role:{in:['OWNER','ADMIN']},organization:{systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'}}}}})
 const result=await createAcademyOrder(actor.id,{courseCode,quantity:5,buyerType:'BUSINESS',organizationId:org.id,followUp:false,participantEmails:[],billing:{name:'Synthetische koper',address:'Teststraat 1',postalCode:'1000AA',city:'Teststad',country:'NL'},platformTermsAccepted:true,academyTermsAccepted:true,legalVersion:ACADEMY_LEGAL_VERSION,idempotencyKey:`legal-refund-${randomUUID()}`})
 const order=await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:result.orderId},include:{purchase:true,seats:{orderBy:{position:'asc'}}}})
 const payment:MolliePaymentSnapshot={id:`tr_${randomUUID()}`,status:'open',amountValue:(order.purchase.amountInclVatCents/100).toFixed(2),currency:'EUR',metadata:{purchaseId:order.purchaseId,organizationId:org.id},checkoutUrl:'https://www.mollie.com/checkout/test',paidAt:null,createdAt:null,subscriptionId:null,mandateId:null,method:null}
 await startAcademyOrderPayment(actor.id,order.id,true,{createPayment:vi.fn().mockResolvedValue(payment)} as unknown as MollieGateway)
 await processAcademyMolliePayment({...payment,status:'paid',paidAt:new Date().toISOString()})
 return {actor,operator,order,payment}
}
function fakeRefundGateway(paymentId:string,status:'refunded'|'pending'|'failed'='refunded'):AcademyLegalRefundFakeGateway {
 const responses=new Map<string, {id:string;paymentId:string;amountValue:string;currency:string;status:typeof status}>()
 return {transport:'FAKE',createRefund:vi.fn(async input=>{let r=responses.get(input.idempotencyKey);if(!r){r={id:`re_${randomUUID()}`,paymentId,amountValue:input.amountValue,currency:'EUR',status};responses.set(input.idempotencyKey,r)}return r}),getRefund:vi.fn(async input=>{const r=[...responses.values()].find(r=>r.id===input.refundId);if(!r)throw Error('FAKE_REFUND_UNKNOWN');return r})}
}
function seatAmounts(order:{seats:Array<{id:string}>}, amount:number, used=0) {
 return order.seats.flatMap((seat,i)=>{const n=Math.max(0,Math.min((i+1)*11900,used+amount)-Math.max(i*11900,used));return n?[{seatId:seat.id,amountCents:n}]:[]})
}
const noRefund={amountInclVatCents:0,amountExclVatCents:0,vatAmountCents:0}
describe.skipIf(!enabled)('D09 actual PostgreSQL, fake provider, rollback-only fixtures',()=>{
 it('approves, reserves, confirms one partial credit note; preserves other seats and immutable price/history',async()=>{
  await rolledBack(async tx=>{
   const f=await legalRefundFixture(tx),amounts=allocateLegalRefund(f.order.purchase,noRefund,11900)
   const request={purchaseId:f.order.purchaseId,requestKey:randomUUID(),reason:'Synthetisch afzonderlijk vastgesteld wettelijk restitutiebesluit',legalEntitlementReviewed:true,...amounts,seatIds:[f.order.seats[0].id],seatAllocations:seatAmounts(f.order,11900)}
   await expect(approveAcademyLegalRefund(f.actor.id,request)).rejects.toThrow()
   const decision=await approveAcademyLegalRefund(f.operator.id,request)
   expect((await approveAcademyLegalRefund(f.operator.id,request)).id).toBe(decision.id)
   expect(await tx.financialRefund.count({where:{purchaseId:f.order.purchaseId}})).toBe(1)
   await tx.$executeRawUnsafe('SAVEPOINT allocation_guard_probes')
   const nextAmounts=allocateLegalRefund(f.order.purchase,amounts,100)
   const next=await approveAcademyLegalRefund(f.operator.id,{...request,requestKey:randomUUID(),...nextAmounts,seatIds:[],seatAllocations:[{seatId:f.order.seats[1].id,amountCents:100}]})
   // Direct insertion into a different pending refund must still respect the first seat's cap.
   await rejectsSql(tx,Sql.sql`INSERT INTO "AcademyRefundSeatAllocation" ("refundId","seatId","originalAmountCents","amountCents","policyVersion") VALUES (${next.refund!.id}::uuid,${f.order.seats[0].id}::uuid,11900,1,'ORIGINAL_SEAT_CONSIDERATION_V1')`)
   await rejectsSql(tx,Sql.sql`INSERT INTO "AcademyRefundSeatAllocation" ("refundId","seatId","originalAmountCents","amountCents","policyVersion") VALUES (${next.refund!.id}::uuid,${f.order.seats[2].id}::uuid,11901,1,'ORIGINAL_SEAT_CONSIDERATION_V1')`)
   await tx.$executeRawUnsafe('SAVEPOINT allocation_total_probe')
   await tx.academyRefundSeatAllocation.create({data:{refundId:next.refund!.id,seatId:f.order.seats[2].id,originalAmountCents:11900,amountCents:1,policyVersion:'ORIGINAL_SEAT_CONSIDERATION_V1'}})
   await expect(tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE')).rejects.toThrow('ACADEMY_REFUND_SEAT_TOTAL_MISMATCH')
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT allocation_total_probe')
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT allocation_guard_probes')
   // Direct SQL probes exercise database guards independently of application validation.
   await rejectsSql(tx,Sql.sql`INSERT INTO "AcademyLegalRefundDecision" ("purchaseId","approvedByUserId","requestKey",reason,"amountInclVatCents","amountExclVatCents","vatAmountCents","seatIds","sourceSnapshot") SELECT "purchaseId",${f.actor.id}::uuid,gen_random_uuid(),reason,"amountInclVatCents","amountExclVatCents","vatAmountCents","seatIds","sourceSnapshot" FROM "AcademyLegalRefundDecision" WHERE id=${decision.id}::uuid`)
   await rejectsSql(tx,Sql.sql`INSERT INTO "AcademyLegalRefundDecision" ("purchaseId","approvedByUserId","requestKey",reason,"amountInclVatCents","amountExclVatCents","vatAmountCents","seatIds","sourceSnapshot") SELECT "purchaseId","approvedByUserId",gen_random_uuid(),reason,59500,49174,10326,"seatIds","sourceSnapshot" FROM "AcademyLegalRefundDecision" WHERE id=${decision.id}::uuid`)
   await rejectsSql(tx,Sql.sql`INSERT INTO "AcademyLegalRefundDecision" ("purchaseId","approvedByUserId","requestKey",reason,"amountInclVatCents","amountExclVatCents","vatAmountCents","seatIds","sourceSnapshot") SELECT "purchaseId","approvedByUserId",gen_random_uuid(),reason,"amountInclVatCents","amountExclVatCents","vatAmountCents",ARRAY[gen_random_uuid()],"sourceSnapshot" FROM "AcademyLegalRefundDecision" WHERE id=${decision.id}::uuid`)
   await rejectsSql(tx,Sql.sql`INSERT INTO "FinancialRefund" ("purchaseId","approvedByUserId",reason,"amountCents",credits,"idempotencyKey") VALUES (${f.order.purchaseId}::uuid,${f.operator.id}::uuid,'Synthetische SQL bovengrensproef',59500,0,${'over-cap-'+randomUUID()})`)

   await rejectsSql(tx,Sql.sql`UPDATE "AcademyLegalRefundDecision" SET reason='Altered legal history' WHERE id=${decision.id}::uuid`)
   await rejectsSql(tx,Sql.sql`UPDATE "FinancialRefund" SET "amountCents"=1 WHERE "legalDecisionId"=${decision.id}::uuid`)
   await rejectsSql(tx,Sql.sql`DELETE FROM "FinancialRefund" WHERE "legalDecisionId"=${decision.id}::uuid`)
   const gateway=fakeRefundGateway(f.payment.id)
   const first=await executeAcademyLegalRefund(f.operator.id,decision.id,gateway)
   expect(first.status).toBe('REFUNDED');await executeAcademyLegalRefund(f.operator.id,decision.id,gateway)
   expect(gateway.createRefund).toHaveBeenCalledTimes(1)
   const note=await tx.financialInvoice.findUniqueOrThrow({where:{refundId:first.id},include:{lines:true,vatSummaries:true}})
   expect(note.amountInclVatCents).toBe(-11900);expect(note.amountExclVatCents).toBe(-amounts.amountExclVatCents);expect(note.vatAmountCents).toBe(-amounts.vatAmountCents)
   expect(note.lines).toHaveLength(1);expect(note.lines[0].amountInclVatCents).toBe(-11900);expect(note.vatSummaries[0].amountInclVatCents).toBe(-11900)
   expect(await tx.financialJorttSync.count({where:{invoiceId:note.id}})).toBe(0)
   const seats=await tx.learningAcademySeat.findMany({where:{orderId:f.order.id},orderBy:{position:'asc'}})
   expect(seats[0].status).toBe('REVOKED');expect(seats.slice(1).every(s=>s.status!=='REVOKED')).toBe(true)
   expect((await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:f.order.id}})).pricingSnapshot).toEqual(f.order.pricingSnapshot)
   const current=await tx.financialPurchase.findUniqueOrThrow({where:{id:f.order.purchaseId}});expect(current.status).toBe('PAID');expect(current.amountInclVatCents).toBe(f.order.purchase.amountInclVatCents)
   await rejectsSql(tx,Sql.sql`UPDATE "FinancialInvoice" SET "amountInclVatCents"=-1 WHERE id=${note.id}::uuid`)
   await expect(approveAcademyLegalRefund(f.operator.id,{...request,requestKey:randomUUID(),...allocateLegalRefund(f.order.purchase,noRefund,59500)})).rejects.toThrow('CAP_EXCEEDED')
   await tx.$executeRawUnsafe('SAVEPOINT full_after_partial')
   await expect(requestAcademyRefund(f.operator.id,f.order.purchaseId,'Volledige refund mag cumulatieve grens niet overschrijden',{} as MollieGateway)).rejects.toThrow()
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT full_after_partial')
   expect(await tx.financialEvent.count({where:{refundId:first.id}})).toBe(2)
  })
 },180000)
 it('keeps pending capacity, releases only terminal failure, reconciles cumulative final cents and revokes all only on full total',async()=>{
  await rolledBack(async tx=>{
   const f=await legalRefundFixture(tx),base={purchaseId:f.order.purchaseId,reason:'Synthetische wettelijke aanspraak met afzonderlijk besluit',legalEntitlementReviewed:true,seatIds:[]}
   const firstAmounts=allocateLegalRefund(f.order.purchase,noRefund,10000)
   const pending=await approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...firstAmounts,seatAllocations:seatAmounts(f.order,10000)})
   await executeAcademyLegalRefund(f.operator.id,pending.id,fakeRefundGateway(f.payment.id,'pending'))
   await expect(approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...allocateLegalRefund(f.order.purchase,noRefund,49501),seatAllocations:seatAmounts(f.order,49501)})).rejects.toThrow('CAP_EXCEEDED')
   const stored=await tx.financialRefund.findUniqueOrThrow({where:{legalDecisionId:pending.id}})
   const failure:AcademyLegalRefundFakeGateway={transport:'FAKE',createRefund:vi.fn(),getRefund:vi.fn().mockResolvedValue({id:stored.mollieRefundId,paymentId:f.payment.id,amountValue:'100.00',currency:'EUR',status:'failed'})}
   await executeAcademyLegalRefund(f.operator.id,pending.id,failure)
   expect(await tx.financialInvoice.count({where:{refundId:stored.id}})).toBe(0)
   const a=await approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...firstAmounts,seatAllocations:seatAmounts(f.order,10000)})
   await executeAcademyLegalRefund(f.operator.id,a.id,fakeRefundGateway(f.payment.id))
   const remaining=allocateLegalRefund(f.order.purchase,firstAmounts,f.order.purchase.amountInclVatCents-firstAmounts.amountInclVatCents)
   const b=await approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...remaining,seatAllocations:seatAmounts(f.order,49500,10000)})
   await executeAcademyLegalRefund(f.operator.id,b.id,fakeRefundGateway(f.payment.id))
   expect((await tx.financialPurchase.findUniqueOrThrow({where:{id:f.order.purchaseId}})).status).toBe('REFUNDED')
   expect(await tx.learningAcademySeat.count({where:{orderId:f.order.id,status:'REVOKED'}})).toBe(5)
   const notes=await tx.financialInvoice.findMany({where:{refund:{purchaseId:f.order.purchaseId}}})
   expect(notes.reduce((sum,n)=>sum+n.amountInclVatCents,0)).toBe(-f.order.purchase.amountInclVatCents)
   expect(notes.reduce((sum,n)=>sum+n.amountExclVatCents,0)).toBe(-f.order.purchase.amountExclVatCents)
   expect(notes.reduce((sum,n)=>sum+n.vatAmountCents,0)).toBe(-f.order.purchase.vatAmountCents)
  })
 },180000)
})

// This opt-in probe retains synthetic immutable audit fixtures only in the isolated child.
// Normal runtime tests above always roll back. No accounts with login credentials are created.
describe.skipIf(!enabled || process.env.ACADEMY_D09_CONCURRENCY !== '1')('D09 independent PostgreSQL transactions',()=>{
 it('serializes duplicate approvals, over-cap requests and duplicate fake delivery without mutating original rows',async()=>{
  const tables=['User','Organization','OrganizationMembership','LearningAcademyOrder','LearningAcademySeat','FinancialPurchase','FinancialRefund','FinancialInvoice','FinancialInvoiceLine','FinancialInvoiceVatSummary','FinancialEvent','NotificationOutbox','LearningExamAttempt','LearningCertificate']
  const before=new Map<string,Set<string>>()
  for(const table of tables){const rows=await db.$queryRawUnsafe<Array<{h:string}>>(`SELECT md5(to_jsonb(t)::text) h FROM public."${table}" t`);before.set(table,new Set(rows.map(r=>r.h)))}
  const f=await db.$transaction(async tx=>{state.db=tx;return legalRefundFixture(tx)},{timeout:60000})
  state.db=db as unknown as Prisma.TransactionClient;state.concurrent=true
  try{
   const base={purchaseId:f.order.purchaseId,reason:'Synthetische concurrencyproef afzonderlijk wettelijk besluit',legalEntitlementReviewed:true,seatIds:[]}
   const firstAmounts=allocateLegalRefund(f.order.purchase,noRefund,40000),request={...base,requestKey:randomUUID(),...firstAmounts,seatAllocations:seatAmounts(f.order,40000)}
   const duplicates=await Promise.all([approveAcademyLegalRefund(f.operator.id,request),approveAcademyLegalRefund(f.operator.id,request)])
   expect(duplicates[0].id).toBe(duplicates[1].id)
   const rest=allocateLegalRefund(f.order.purchase,firstAmounts,f.order.purchase.amountInclVatCents-40000)
   const attempts=await Promise.allSettled([approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...rest,seatAllocations:seatAmounts(f.order,19500,40000)}),approveAcademyLegalRefund(f.operator.id,{...base,requestKey:randomUUID(),...rest,seatAllocations:seatAmounts(f.order,19500,40000)})])
   expect(attempts.filter(a=>a.status==='fulfilled')).toHaveLength(1);expect(attempts.filter(a=>a.status==='rejected')).toHaveLength(1)
   const gateway=fakeRefundGateway(f.payment.id)
   await Promise.all([executeAcademyLegalRefund(f.operator.id,duplicates[0].id,gateway),executeAcademyLegalRefund(f.operator.id,duplicates[0].id,gateway)])
   const second=attempts.find(a=>a.status==='fulfilled');if(second?.status!=='fulfilled')throw Error('CONCURRENCY_WINNER_MISSING')
   await executeAcademyLegalRefund(f.operator.id,second.value.id,gateway)
   expect(await db.financialRefund.count({where:{purchaseId:f.order.purchaseId}})).toBe(2)
   expect(await db.financialInvoice.count({where:{refund:{purchaseId:f.order.purchaseId}}})).toBe(2)
   expect(await db.financialEvent.count({where:{purchaseId:f.order.purchaseId,eventType:'ACADEMY_LEGAL_REFUND_APPROVED'}})).toBe(2)
   expect(await db.financialEvent.count({where:{purchaseId:f.order.purchaseId,eventType:'ACADEMY_LEGAL_REFUND_STATUS'}})).toBe(2)
   expect((await db.financialRefund.aggregate({where:{purchaseId:f.order.purchaseId},_sum:{amountCents:true}}))._sum.amountCents).toBe(f.order.purchase.amountInclVatCents)
   for(const table of tables){const rows=await db.$queryRawUnsafe<Array<{h:string}>>(`SELECT md5(to_jsonb(t)::text) h FROM public."${table}" t`);const after=new Set(rows.map(r=>r.h));expect([...before.get(table)!].every(h=>after.has(h)),`original rows preserved: ${table}`).toBe(true)}
  }finally{state.concurrent=false;state.db=null}
 },180000)
})

// D10 uses a pre-existing synthetic passed course only inside a rolled-back transaction.
describe.skipIf(!enabled)('D10 PostgreSQL per-seat benefit and immutable achievements',()=>{
 it('preserves benefit after own partial and other-seat full refund; excludes only own cumulative full refund',async()=>{
  await rolledBack(async tx=>{
   const pass=await tx.learningExamAttempt.findFirstOrThrow({where:{passed:true,status:'SUBMITTED',user:{emailVerified:true,status:'ACTIVE'},examVersion:{courseVersion:{course:{code:'WL-901'}}}},include:{user:true}})
   const certificates=await tx.learningCertificate.findMany({where:{userId:pass.userId}})
   const f=await legalRefundFixture(tx,'WL-901'),seat=f.order.seats[0]
   await inviteAcademySeat(f.actor.id,seat.id,pass.user.email)
   await acceptAcademySeat(pass.userId,seat.id,true,ACADEMY_LEGAL_VERSION)
   const target=await tx.learningCourse.findUniqueOrThrow({where:{code:'WL-001'}})
   const eligible=()=>qualifyingAcademyPass(tx,pass.user.email,target.id)
   expect((await eligible())?.id).toBe(pass.id)
   let used={...noRefund}
   async function refund(seatId:string,amount:number,revoke=false){
    const amounts=allocateLegalRefund(f.order.purchase,used,amount)
    const request={purchaseId:f.order.purchaseId,requestKey:randomUUID(),reason:'Synthetisch bevoegd D10 besluit per opleidingsplaats',legalEntitlementReviewed:true,...amounts,seatIds:revoke?[seatId]:[],seatAllocations:[{seatId,amountCents:amount}]}
    const decision=await approveAcademyLegalRefund(f.operator.id,request)
    expect((await eligible())?.id).toBe(pass.id) // pending money never removes benefit
    await executeAcademyLegalRefund(f.operator.id,decision.id,fakeRefundGateway(f.payment.id))
    used={amountInclVatCents:used.amountInclVatCents+amount,amountExclVatCents:used.amountExclVatCents+amounts.amountExclVatCents,vatAmountCents:used.vatAmountCents+amounts.vatAmountCents}
    const allocation=await tx.academyRefundSeatAllocation.findFirstOrThrow({where:{refundId:decision.refund!.id}})
    await rejectsSql(tx,Sql.sql`UPDATE "AcademyRefundSeatAllocation" SET "amountCents"=1 WHERE id=${allocation.id}::uuid`)
    await rejectsSql(tx,Sql.sql`DELETE FROM "AcademyRefundSeatAllocation" WHERE id=${allocation.id}::uuid`)
   }
   await refund(seat.id,5000,true)
   expect((await eligible())?.id).toBe(pass.id)
   await refund(f.order.seats[1].id,11900)
   expect((await eligible())?.id).toBe(pass.id)
   await refund(seat.id,6900)
   expect(await eligible()).toBeNull()
   expect((await tx.financialPurchase.findUniqueOrThrow({where:{id:f.order.purchaseId}})).status).toBe('PAID')
   const {user:ignored,...originalAttempt}=pass;void ignored
   expect(await tx.learningExamAttempt.findUniqueOrThrow({where:{id:pass.id}})).toEqual(originalAttempt)
   expect(await tx.learningCertificate.findMany({where:{userId:pass.userId}})).toEqual(certificates)
   expect((await tx.learningAcademyOrder.findUniqueOrThrow({where:{id:f.order.id}})).pricingSnapshot).toEqual(f.order.pricingSnapshot)
  })
 },180000)
})

describe.skipIf(!enabled || process.env.ACADEMY_D09_CONCURRENCY !== '1')('D10 independent per-seat reservations',()=>{
 it('never over-refunds one seat across concurrent approvals below the overall package cap',async()=>{
  const f=await db.$transaction(async tx=>{state.db=tx;return legalRefundFixture(tx)},{timeout:60000})
  state.db=db as unknown as Prisma.TransactionClient;state.concurrent=true
  try{
   const amounts=allocateLegalRefund(f.order.purchase,noRefund,8000)
   const input={purchaseId:f.order.purchaseId,reason:'Synthetische gelijktijdige D10 toets van plaatslimiet',legalEntitlementReviewed:true,seatIds:[],seatAllocations:[{seatId:f.order.seats[0].id,amountCents:8000}],...amounts}
   const results=await Promise.allSettled([approveAcademyLegalRefund(f.operator.id,{...input,requestKey:randomUUID()}),approveAcademyLegalRefund(f.operator.id,{...input,requestKey:randomUUID()})])
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
   const failure=results.find(r=>r.status==='rejected');expect(failure?.status==='rejected'&&failure.reason.message).toContain('SEAT_CAP_EXCEEDED')
   expect(await db.financialRefund.count({where:{purchaseId:f.order.purchaseId}})).toBe(1)
   expect((await db.academyRefundSeatAllocation.aggregate({where:{seatId:f.order.seats[0].id},_sum:{amountCents:true}}))._sum.amountCents).toBe(8000)
   const winner=results.find(r=>r.status==='fulfilled');if(winner?.status!=='fulfilled')throw Error('WINNER_MISSING')
   const gateway=fakeRefundGateway(f.payment.id)
   await Promise.all([executeAcademyLegalRefund(f.operator.id,winner.value.id,gateway),executeAcademyLegalRefund(f.operator.id,winner.value.id,gateway)])
   expect(await db.financialInvoice.count({where:{refund:{purchaseId:f.order.purchaseId}}})).toBe(1)
   expect(await db.financialEvent.count({where:{purchaseId:f.order.purchaseId,eventType:'ACADEMY_LEGAL_REFUND_STATUS'}})).toBe(1)
  }finally{state.concurrent=false;state.db=null}
 },180000)
})
