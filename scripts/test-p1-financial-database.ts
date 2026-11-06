import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { Prisma, type FinancialPurchase, type FinancialInvoice, type FinancialRefund, type ComplianceFrameworkVersion, type ArboGuideRun } from '../src/generated/prisma/client'

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return nextResolve(specifier, context)
} })

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('De financiële databasetest mag uitsluitend lokaal draaien.')
const databaseName = `workmatchr_finance_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deploySchema() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString() }, encoding: 'utf8', stdio: 'pipe',
  })
  if (result.status !== 0) throw new Error(`Migraties in financiële testdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()
    const { getPrisma } = await import('../src/lib/prisma')
    prisma = getPrisma()
    const organization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const user = await prisma.user.create({ data: { email: `finance-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: organization.id } })
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: 'OWNER', status: 'ACTIVE' } })
    const secondOrganization = await prisma.organization.create({ data: { name: 'TEST-WM Finance Professional Twee', organizationType: 'PROVIDER', status: 'ACTIVE' } })
    const secondUser = await prisma.user.create({ data: { email: `finance-two-${randomUUID()}@example.invalid`, accountType: 'PROFESSIONAL', status: 'ACTIVE', emailVerified: true } })
    await prisma.providerProfile.create({ data: { organizationId: secondOrganization.id } })
    await prisma.organizationMembership.create({ data: { userId: secondUser.id, organizationId: secondOrganization.id, role: 'OWNER', status: 'ACTIVE' } })
    const platformOrganization = await prisma.organization.create({ data: { name: 'TEST-WM Platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const platformAdministrator = await prisma.user.create({ data: { email: `finance-admin-${randomUUID()}@example.invalid`, platformRole: 'ADMIN', status: 'ACTIVE', emailVerified: true } })
    await prisma.organizationMembership.create({ data: { userId: platformAdministrator.id, organizationId: platformOrganization.id, role: 'OWNER', status: 'ACTIVE' } })

    const {runSerializableFinancialTransaction:runSerializable}=await import('../src/lib/finance/financial-transaction')
    const {processMolliePayment}=await import('../src/lib/finance/financial-purchase-service')
    // P1: actual services with synthetic PostgreSQL records; no real providers.
    const { processRecurringProPayment } = await import('../src/lib/finance/subscription-service')
    const { refundWorkmatchrError } = await import('../src/lib/finance/refund-service')
    const baseData = { organizationId:organization.id,createdByUserId:user.id,status:'PAID' as const,packageSku:'WORKMATCHR_PRO',packageLabel:'Synthetic Pro',currency:'EUR',vatRateBps:2100,billingOrganizationName:'Synthetic company',billingAddressLine:'Teststraat 1',billingPostalCode:'1000 AA',billingCity:'Testplaats',billingCountryCode:'NL',paidAt:new Date('2026-09-04T19:00:48Z'),terminalAt:new Date('2026-09-04T19:00:48Z'), id: randomUUID(), kind: 'PRO_SUBSCRIPTION' as const, credits: 0,
      baseAmountCents: 4900, amountExclVatCents: 4900, vatAmountCents: 1029, amountInclVatCents: 5929,
      discountCodeSnapshot: Prisma.DbNull, idempotencyKey: randomUUID(), molliePaymentId: 'tr_p1first' }
    const failedFirst = await prisma.financialPurchase.create({data:{...baseData,status:'EXPIRED',paidAt:null}})
    const paidRetry = await prisma.financialPurchase.create({data:{...baseData,id:randomUUID(),status:'PAID',molliePaymentId:'tr_p1retry',idempotencyKey:randomUUID()}})
    const pro = await prisma.professionalSubscription.create({data:{organizationId:organization.id,status:'ACTIVE',planCode:'WORKMATCHR_PRO',planLabel:'Synthetic Pro',amountExclVatCents:4900,vatRateBps:2100,vatAmountCents:1029,amountInclVatCents:5929,currency:'EUR',mollieCustomerId:'cst_p1',mollieSubscriptionId:'sub_p1',mollieMandateId:'mdt_p1',mollieMandateMethod:'directdebit',mollieMandateStatus:'valid',mollieMandateVerifiedAt:new Date('2026-09-04T19:00:48Z'),firstPaymentPurchaseId:failedFirst.id,currentPeriodStart:new Date('2026-09-04T19:00:48Z'),currentPeriodEnd:new Date('2026-10-04T19:00:48Z')}})
    await prisma.professionalSubscriptionFirstPaymentAttempt.create({data:{subscriptionId:pro.id,purchaseId:paidRetry.id,attemptNumber:1}})
    const { issueInvoiceForPaidPurchase } = await import('../src/lib/finance/invoice-service')
    await runSerializable(transaction=>issueInvoiceForPaidPurchase(transaction,paidRetry.id))
    const payment=(id:string,paidAt:string,status='paid')=>({id,status,amountValue:'59.29',currency:'EUR',metadata:{subscriptionId:pro.id,organizationId:organization.id},paidAt:status==='paid'?paidAt:null,createdAt:paidAt,checkoutUrl:null,subscriptionId:'sub_p1',mandateId:'mdt_p1',method:'directdebit'})
    const october={...payment('tr_p1october','2026-10-04T19:00:48Z'),paidAt:'2026-10-06T12:00:00Z'}
    const november={...payment('tr_p1november','2026-11-04T19:00:48Z'),paidAt:'2026-11-05T12:00:00Z'}
    const { reconcileProPayments } = await import('../src/lib/finance/pro-payment-reconciliation')
    const exactInput={actorUserId:platformAdministrator.id,subscriptionId:pro.id,reason:'Synthetic per-payment approval P14'}
    let recoveryReads=0
    const exactGateway={getCustomer:async()=>({id:'cst_p1',organizationId:organization.id}),
      getPayment:async(id:string)=>{recoveryReads++;return id===october.id?october:november},
      listSubscriptionPayments:async()=>{throw new Error('UNAPPROVED_BROAD_RECOVERY')}}
    const issuedAfter=new Date()
    assert.deepEqual(await reconcileProPayments({...exactInput,paymentId:october.id},exactGateway as never),{inspected:1,processed:1,failed:0})
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:november.id}}),0)
    assert.deepEqual(await reconcileProPayments({...exactInput,paymentId:november.id},exactGateway as never),{inspected:1,processed:1,failed:0})
    const exactReplay=await Promise.all(Array.from({length:6},()=>reconcileProPayments({...exactInput,paymentId:october.id},exactGateway as never)))
    assert.ok(exactReplay.every(result=>result.processed===1&&result.failed===0))
    assert.equal(recoveryReads,8)
    assert.equal(await prisma.professionalSubscriptionPayment.count({where:{subscriptionId:pro.id,status:'PAID'}}),2)
    assert.equal(await prisma.financialEvent.count({where:{subscriptionId:pro.id,eventType:'PRO_PAYMENT_RECONCILED',actorUserId:platformAdministrator.id}}),2)
    for(const [providerId,start,end] of [[october.id,'2026-10-04T19:00:48.000Z','2026-11-04T19:00:48.000Z'],[november.id,'2026-11-04T19:00:48.000Z','2026-12-04T19:00:48.000Z']]) {
      const invoice:FinancialInvoice=await prisma.financialInvoice.findFirstOrThrow({where:{molliePaymentId:providerId}})
      assert.equal(invoice.servicePeriodStart?.toISOString(),start);assert.equal(invoice.servicePeriodEnd?.toISOString(),end)
      assert.ok(invoice.issuedAt>=issuedAfter);assert.equal(invoice.amountInclVatCents,5929);assert.equal(invoice.vatAmountCents,1029)
      assert.equal(await prisma.financialJorttSync.count({where:{invoiceId:invoice.id,status:'PENDING'}}),1)
    }
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).currentPeriodEnd?.toISOString(),'2026-12-04T19:00:48.000Z')
    for(const invalid of [{amountValue:'59.30'},{currency:'USD'},{metadata:{...october.metadata,organizationId:secondOrganization.id}}]) {
      const id='tr_p14invalid'
      const bad={...exactGateway,getPayment:async()=>({...october,...invalid,id})}
      assert.deepEqual(await reconcileProPayments({...exactInput,paymentId:id},bad as never),{inspected:1,processed:0,failed:1})
      assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:id}}),0)
    }
    console.log('P14 PASS: individually scoped October/November; six concurrent exact replays; no broad read; actual issue date, original service periods, VAT, pending Jortt, operator audit; wrong tenant/amount/currency refused')
    assert.equal(await prisma.financialInvoice.count({where:{subscriptionPayment:{subscriptionId:pro.id}}}),2)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).firstPaymentPurchaseId,failedFirst.id)
    console.log('PASS expired original + paid retry: two renewals, original history unchanged')
    let refundProviderCalls=0
    await assert.rejects(()=>refundWorkmatchrError({actorUserId:platformAdministrator.id,purchaseId:paidRetry.id,reasonCode:'WORKMATCHR_TECHNICAL_ERROR',reason:'Synthetic Pro credit test only',idempotencyKey:'p1-pro-refund-test'},{createRefund:async()=>{refundProviderCalls++;throw new Error('UNEXPECTED_PROVIDER')}} as never),/PAID_CREDIT_PURCHASE_REQUIRED/)
    assert.equal(refundProviderCalls,0)
    // A separate healthy synthetic subscription proves later behavior without repairing the broken fixture.
    const healthyOrg=await prisma.organization.create({data:{name:'P1 Healthy Synthetic',organizationType:'PROVIDER',status:'ACTIVE'}})
    const healthyUser=await prisma.user.create({data:{email:`p1-${randomUUID()}@example.invalid`,accountType:'PROFESSIONAL',status:'ACTIVE',emailVerified:true}})
    await prisma.organizationMembership.create({data:{organizationId:healthyOrg.id,userId:healthyUser.id,role:'OWNER',status:'ACTIVE'}})
    const healthyFirst=await prisma.financialPurchase.create({data:{...baseData,id:randomUUID(),organizationId:healthyOrg.id,createdByUserId:healthyUser.id,molliePaymentId:'tr_p1healthyfirst',idempotencyKey:randomUUID()}})
    const healthy=await prisma.professionalSubscription.create({data:{organizationId:healthyOrg.id,status:'ACTIVE',planCode:'WORKMATCHR_PRO',planLabel:'Synthetic Healthy Pro',amountExclVatCents:4900,vatRateBps:2100,vatAmountCents:1029,amountInclVatCents:5929,currency:'EUR',mollieCustomerId:'cst_healthy',mollieSubscriptionId:'sub_healthy',mollieMandateId:'mdt_p1',mollieMandateMethod:'directdebit',mollieMandateStatus:'valid',mollieMandateVerifiedAt:new Date('2026-09-04T19:00:48Z'),firstPaymentPurchaseId:healthyFirst.id,currentPeriodStart:new Date('2026-09-04T19:00:48Z'),currentPeriodEnd:new Date('2026-10-04T19:00:48Z')}})
    await runSerializable(transaction=>issueInvoiceForPaidPurchase(transaction,healthyFirst.id))
    const goodOctober={...october,id:'tr_p1healthyoct',subscriptionId:'sub_healthy',metadata:{subscriptionId:healthy.id,organizationId:healthyOrg.id}}
    const goodNovember={...november,id:'tr_p1healthynov',subscriptionId:'sub_healthy',metadata:goodOctober.metadata}
    const batch=await Promise.allSettled(Array.from({length:6},()=>processMolliePayment(goodOctober.id,{getPayment:async()=>goodOctober} as never)))
    assert.equal(batch.filter(x=>x.status==='fulfilled').length,6)
    assert.equal(await prisma.professionalSubscriptionPayment.count({where:{molliePaymentId:goodOctober.id}}),1)
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:goodOctober.id}}),1)
    await processMolliePayment(goodNovember.id,{getPayment:async()=>goodNovember} as never)
    assert.equal(await prisma.financialInvoice.count({where:{subscriptionPayment:{subscriptionId:healthy.id}}}),2)
    console.log('P1 PASS: route-handler service path getPayment -> recurring -> invoice, six concurrent identical callbacks one invoice; two renewals two invoices')
    await processRecurringProPayment(goodOctober as never)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:healthy.id}})).currentPeriodEnd?.toISOString(),'2026-12-04T19:00:48.000Z')
    console.log('PASS delayed paid replay preserves latest period')
    await processRecurringProPayment({...goodOctober,status:'failed',paidAt:null} as never)
    await processRecurringProPayment({...goodOctober,status:'failed',paidAt:null} as never)
    const stale=await prisma.professionalSubscription.findUniqueOrThrow({where:{id:healthy.id}})
    assert.equal(stale.status,'ACTIVE'); assert.equal(stale.retryCount,0)
    console.log('PASS paid terminal state survives delayed duplicate failures')
    await processRecurringProPayment(goodNovember as never)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:healthy.id}})).status,'ACTIVE')
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:goodNovember.id}}),1)
    console.log('P1 PASS: failed then paid recovers; existing paid invoice not duplicated')
    const failedPayment={...goodNovember,id:'tr_p1failedinvoice',createdAt:'2026-12-04T19:00:48Z',paidAt:'2026-12-06T19:00:48Z'}
    // Narrow fault injection in this synthetic database only; no production objects.
    await prisma.$executeRawUnsafe(`CREATE FUNCTION p1_reject_invoice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."molliePaymentId"='tr_p1failedinvoice' THEN RAISE EXCEPTION 'P1_INVOICE_FAULT'; END IF; RETURN NEW; END $$`)
    await prisma.$executeRawUnsafe(`CREATE TRIGGER p1_reject_invoice BEFORE INSERT ON "FinancialInvoice" FOR EACH ROW EXECUTE FUNCTION p1_reject_invoice()`)
    await assert.rejects(()=>processRecurringProPayment(failedPayment as never),/P1_INVOICE_FAULT/)
    assert.equal(await prisma.professionalSubscriptionPayment.count({where:{molliePaymentId:failedPayment.id}}),0)
    await prisma.$executeRawUnsafe('DROP TRIGGER p1_reject_invoice ON "FinancialInvoice"')
    await prisma.$executeRawUnsafe('DROP FUNCTION p1_reject_invoice()')
    await processRecurringProPayment(failedPayment as never)
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:failedPayment.id}}),1)
    assert.equal(await prisma.financialEvent.count({where:{eventType:'PRO_PAYMENT_PROCESSING_FAILED',subscriptionId:healthy.id}}),1)
    console.log('PASS invoice fault rollback, durable failure signal, replay recovery')
    const { syncFinancialInvoiceToJortt } = await import('../src/lib/finance/jortt-sync-service')
    const recurringInvoice=await prisma.financialInvoice.findFirstOrThrow({where:{molliePaymentId:goodNovember.id}})
    const queue=await prisma.financialJorttSync.findUniqueOrThrow({where:{invoiceId:recurringInvoice.id}})
    assert.equal(queue.status,'PENDING')
    console.log('P1 PASS: recurring invoice creates Jortt PENDING work atomically')
    // sync gateway failure uses the existing mock unit suite; never construct a real gateway here.

    await assert.rejects(()=>syncFinancialInvoiceToJortt(recurringInvoice.id,{submitInvoice:async()=>{throw new Error('SYNTHETIC_JORTT_UNAVAILABLE')}}),/SYNTHETIC_JORTT_UNAVAILABLE/); const jorttFailure=await prisma.financialJorttSync.findUniqueOrThrow({where:{invoiceId:recurringInvoice.id}})
    assert.equal(jorttFailure.status,'RETRY_REQUIRED')
    const jorttRecovered=await syncFinancialInvoiceToJortt(recurringInvoice.id,{submitInvoice:async()=>({externalReference:'synthetic-jortt',remoteInvoiceNumber:'SYNTHETIC-1'})})
    assert.equal(jorttRecovered.status,'SYNCED')
    console.log('P1 PASS: Jortt failure recorded, explicit fake recovery SYNCED without duplicate invoice')
    const { issueProCredit } = await import('../src/lib/finance/pro-credit-service')
    const { requestProRefund } = await import('../src/lib/finance/pro-refund-service')
    const { reconcileMollieRefund } = await import('../src/lib/finance/refund-service')
    const sourceInvoice = await prisma.financialInvoice.findUniqueOrThrow({where:{purchaseId:paidRetry.id},include:{lines:true,vatSummaries:true}})
    const beforeSource = JSON.stringify(sourceInvoice)
    const creditInput={actorUserId:platformAdministrator.id,invoiceId:sourceInvoice.id,amountInclVatCents:1000,reason:'Synthetic authorized partial correction',idempotencyKey:'p1-credit-partial-once'}
    await assert.rejects(()=>issueProCredit({...creditInput,actorUserId:secondUser.id}))
    const credits=await Promise.all(Array.from({length:6},()=>issueProCredit(creditInput)))
    assert.equal(new Set(credits.map(c=>c.id)).size,1)
    const partial=credits[0]
    assert.equal(partial.amountInclVatCents,-1000)
    const remainder=await issueProCredit({...creditInput,amountInclVatCents:4929,idempotencyKey:'p1-credit-remainder'})
    assert.equal(partial.amountExclVatCents+remainder.amountExclVatCents,-4900)
    assert.equal(partial.vatAmountCents+remainder.vatAmountCents,-1029)
    await assert.rejects(()=>issueProCredit({...creditInput,amountInclVatCents:1,idempotencyKey:'p1-overcredit-prohibited'}),/PRO_CREDIT_LIMIT_EXCEEDED/)
    await assert.rejects(()=>issueProCredit({...creditInput,amountInclVatCents:1}),/PRO_CREDIT_IDEMPOTENCY_CONFLICT/)
    assert.equal(JSON.stringify(await prisma.financialInvoice.findUniqueOrThrow({where:{id:sourceInvoice.id},include:{lines:true,vatSummaries:true}})),beforeSource)
    assert.equal(await prisma.creditTransaction.count(),0)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).status,'ACTIVE')
    console.log('PASS partial + remainder: exact VAT, concurrency, overcredit, authorization, immutable source, wallet/subscription unchanged')
    const full=await issueProCredit({...creditInput,invoiceId:recurringInvoice.id,amountInclVatCents:5929,idempotencyKey:'p1-credit-full-recurring'})
    assert.equal(full.amountInclVatCents,-5929)
    assert.equal(full.servicePeriodStart?.toISOString(),recurringInvoice.servicePeriodStart?.toISOString())
    let calls=0
    let accepted: {id:string;status:'refunded';paymentId:string;currency:string;amountValue:string} | null=null
    const refundGateway={ getPayment:async()=>({...payment('tr_p1retry','2026-09-04'),metadata:{organizationId:organization.id}}),
      createRefund:async()=>{calls++;accepted={id:'re_synthetic_accepted',status:'refunded',paymentId:'tr_p1retry',currency:'EUR',amountValue:(-partial.amountInclVatCents/100).toFixed(2)};throw new Error('SYNTHETIC_TIMEOUT_AFTER_ACCEPT')},
      findRefundByReference:async()=>accepted }
    const refundInput={actorUserId:platformAdministrator.id,creditNoteId:partial.id,reason:'Synthetic refund accepted but response lost',idempotencyKey:'p1-pro-refund-partial'}
    await assert.rejects(()=>requestProRefund(refundInput,refundGateway as never),/MOLLIE_REFUND_RECONCILIATION_REQUIRED/)
    const uncertain=await prisma.financialRefund.findUniqueOrThrow({where:{proCreditNoteId:partial.id}})
    assert.equal(uncertain.reconciliationRequired,true);assert.equal(uncertain.status,'PENDING')
    const { applyMollieRefundSnapshot } = await import('../src/lib/finance/refund-service')
    await assert.rejects(applyMollieRefundSnapshot(uncertain.id,{id:'re_bad',status:'refunded',paymentId:'tr_other',currency:'USD',amountValue:'0.01'}),/MOLLIE_REFUND_MISMATCH/)
    assert.equal((await prisma.financialRefund.findUniqueOrThrow({where:{id:uncertain.id}})).status,'PENDING')
    const recovered=await requestProRefund(refundInput,refundGateway as never)
    assert.equal(recovered.refund.status,'REFUNDED');assert.equal(calls,1)
    await reconcileMollieRefund(uncertain.id,refundGateway as never)
    assert.equal(calls,1)
    assert.equal(await prisma.creditTransaction.count(),0)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).status,'ACTIVE')
    console.log('PASS Pro refund timeout, independent credit, provider lookup recovery, no duplicate cash refund')
    const { reconcileJorttPayment } = await import('../src/lib/finance/jortt-payment-service')
    const ledger=randomUUID();let bookCalls=0
    const evidence={id:'synthetic-jortt',reference:recurringInvoice.invoiceNumber,totalCents:5929,dueCents:5929,currency:'EUR',bookings:[] as Array<{id:string;description:string;amountCents:number;ledgerAccountId:string;bookDate:string}>,allowedLedgerAccounts:[ledger]}
    const jorttGateway={inspectPayment:async()=>evidence,registerPayment:async(input:{reference:string;bookDate:string})=>{bookCalls++;evidence.dueCents=0;evidence.bookings.push({id:randomUUID(),description:input.reference,amountCents:5929,ledgerAccountId:ledger,bookDate:input.bookDate});throw new Error('SYNTHETIC_LOST_RESPONSE')}}
    const reconcileInput={actorUserId:platformAdministrator.id,invoiceId:recurringInvoice.id,ledgerAccountId:ledger,bookDate:'2026-11-06',reason:'Synthetic approved clearing account reconciliation'}
    await assert.rejects(()=>reconcileJorttPayment({...reconcileInput,actorUserId:secondUser.id},jorttGateway))
    assert.equal((await reconcileJorttPayment(reconcileInput,jorttGateway)).status,'REVIEW_REQUIRED')
    assert.equal((await reconcileJorttPayment(reconcileInput,jorttGateway)).status,'CONFIRMED')
    assert.equal((await reconcileJorttPayment(reconcileInput,jorttGateway)).status,'CONFIRMED')
    assert.equal(bookCalls,1)
    console.log('PASS Jortt lost response -> read-only confirmation, one booking, authorization')
    const missed={...november,id:'tr_p1missing',createdAt:'2027-01-04T19:00:48Z',paidAt:'2027-01-06T19:00:48Z'}
    const lookup={ getCustomer:async()=>({id:'cst_p1',organizationId:organization.id}), listSubscriptionPayments:async()=>[missed,november,october] }
    await assert.rejects(()=>reconcileProPayments({actorUserId:secondUser.id,subscriptionId:pro.id,after:new Date('2026-09-01'),reason:'Synthetic missing webhook reconciliation'},lookup as never))
    const recovery=await reconcileProPayments({actorUserId:platformAdministrator.id,subscriptionId:pro.id,after:new Date('2026-09-01'),reason:'Synthetic missing webhook reconciliation'},lookup as never)
    assert.equal(recovery.failed,0);assert.equal(recovery.processed,3)
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:missed.id}}),1)
    await assert.rejects(()=>processRecurringProPayment({...missed,metadata:{...missed.metadata,organizationId:secondOrganization.id}} as never),/MOLLIE_PAYMENT_MISMATCH/)
    console.log('PASS missing webhook backfill through existing service; cross-tenant binding rejected')
    // A lost client acknowledgement after commit cannot result in a second invoice.
    const committed={...missed,id:'tr_p1lostcommit',createdAt:'2027-02-04T19:00:48Z',paidAt:'2027-02-06T19:00:48Z'}
    await assert.rejects(async()=>{await processRecurringProPayment(committed as never);throw new Error('SYNTHETIC_LOST_DB_CONFIRMATION')})
    await processRecurringProPayment(committed as never)
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:committed.id}}),1)
    const failedLater={...committed,id:'tr_p1failure',createdAt:'2027-03-04T19:00:48Z',paidAt:null,status:'failed'}
    await processRecurringProPayment(failedLater as never);await processRecurringProPayment(failedLater as never)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).retryCount,1)
    await processRecurringProPayment({...failedLater,status:'paid',paidAt:'2027-03-06T19:00:48Z'} as never)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({where:{id:pro.id}})).status,'ACTIVE')
    console.log('PASS lost commit acknowledgement; failed -> paid; duplicate failures counted once')
    // Genuine competing refund requests: at most one provider call for the independent credit.
    let concurrentCalls=0
    const cashGateway={getPayment:async()=>({...payment('tr_p1retry','2026-09-04'),metadata:{organizationId:organization.id}}),
      createRefund:async()=>{concurrentCalls++;await new Promise(r=>setTimeout(r,20));return {id:'re_concurrent',status:'refunded',paymentId:'tr_p1retry',currency:'EUR',amountValue:(-remainder.amountInclVatCents/100).toFixed(2)}},findRefundByReference:async()=>null}
    const cash=await Promise.allSettled(Array.from({length:6},()=>requestProRefund({...refundInput,creditNoteId:remainder.id,idempotencyKey:'p1-pro-refund-concurrent'},cashGateway as never)))
    assert.equal(cash.filter(x=>x.status==='fulfilled').length,6);assert.equal(concurrentCalls,1)
    assert.equal((await prisma.financialRefund.findUniqueOrThrow({where:{proCreditNoteId:remainder.id}})).status,'REFUNDED')
    await assert.rejects(()=>prisma!.financialRefund.update({where:{id:uncertain.id},data:{providerAttemptedAt:null}}),/REFUND_SOURCE_IMMUTABLE/)
    await assert.rejects(()=>prisma!.financialRefund.update({where:{id:uncertain.id},data:{status:'PENDING'}}),/REFUND_SOURCE_IMMUTABLE/)
    console.log('PASS six concurrent Pro refund requests -> one provider acceptance; dispatch and terminal state immutable')
    // Integrated daily comparison: append-only observations, no provider mutation.
    const { runDailyFinancialChainReview } = await import('../src/lib/finance/financial-chain-review-service')
    const scope = `organization:${organization.id}`
    const chainAmounts = { net: 4900, vat: 1029, gross: 5929, currency: 'EUR' }
    const chainPeriod = { periodStart: '2026-11-01T00:00:00Z', periodEnd: '2026-12-01T00:00:00Z' }
    const chainEvidence = { tenantKey: scope, paymentId: 'tr_reviewfake', product: 'PRO_SUBSCRIPTION' as const, paidAt: '2026-11-02T00:00:00Z',
      provider: { status: 'paid' as const, gross:5929,currency:'EUR' }, registrations:[{...chainAmounts,...chainPeriod,id:'registration',paymentId:'tr_reviewfake'}],
      invoices:[{...chainAmounts,...chainPeriod,id:'invoice',paymentId:'tr_reviewfake',tenantKey:scope,original:true,descriptionPresent:true}],
      ledger:{applicable:false,checked:true,expectedCredits:0,actualCredits:0,entries:0}, access:{customer:true,administrator:true,pdf:true,tenantIsolation:true},
      jortt:{checked:true,invoiceId:'fake-jortt',documentMatched:true,settled:false,dueCents:5929},corrections:[],refunds:[],complete:true }
    let reads=0
    const reader={async read(){reads++;return {complete:true,expectedPaid:1,payments:[chainEvidence]}}}
    delete process.env.FINANCIAL_CHAIN_REVIEW_ENABLED
    await assert.rejects(runDailyFinancialChainReview(platformAdministrator.id,scope,reader),/DISABLED/)
    assert.equal(reads,0)
    process.env.FINANCIAL_CHAIN_REVIEW_ENABLED='true'
    await assert.rejects(runDailyFinancialChainReview(secondUser.id,scope,reader))
    assert.equal(reads,0)
    const reviewed=await Promise.all(Array.from({length:6},()=>runDailyFinancialChainReview(platformAdministrator.id,scope,reader)))
    assert.ok(reviewed.every(rows=>rows[0].status==='DEVIATION'))
    assert.equal(await prisma.financialEvent.count({where:{eventType:'FINANCIAL_CHAIN_REVIEW'}}),1)
    chainEvidence.jortt.settled=true;chainEvidence.jortt.dueCents=0
    assert.equal((await runDailyFinancialChainReview(platformAdministrator.id,scope,reader))[0].status,'RECOVERED')
    assert.equal(await prisma.financialEvent.count({where:{eventType:'FINANCIAL_CHAIN_REVIEW'}}),2)
    await assert.rejects(runDailyFinancialChainReview(platformAdministrator.id,`organization:${secondOrganization.id}`,reader),/SCOPE_MISMATCH/)
    await assert.rejects(runDailyFinancialChainReview(platformAdministrator.id,scope,{async read(){return {complete:false,expectedPaid:0,payments:[]}}}),/COVERAGE/)
    const {createFinancialChainReader}=await import('../src/lib/finance/financial-chain-reader')
    const paidSources=await prisma.financialPurchase.findMany({where:{paidAt:{not:null},molliePaymentId:{not:null}}})
    const paidRecurring=await prisma.professionalSubscriptionPayment.findMany({where:{status:'PAID'},include:{subscription:true}})
    const providerRecords=[...paidSources.map(p=>({...payment(p.molliePaymentId!,p.paidAt!.toISOString()),amountValue:(p.amountInclVatCents/100).toFixed(2),metadata:{organizationId:p.organizationId!,purchaseId:p.id}})),
      ...paidRecurring.map(p=>({...payment(p.molliePaymentId,p.periodStart!.toISOString()),amountValue:(p.amountInclVatCents/100).toFixed(2),metadata:{organizationId:p.subscription.organizationId,subscriptionId:p.subscriptionId}}))]
    const localEventCount=await prisma.financialEvent.count()
    const readOnlyBatch=await createFinancialChainReader({listPaymentsForReview:async()=>providerRecords as never,listRefundsForReview:async()=>[]},{inspectPayment:async()=>evidence})
    assert.equal(readOnlyBatch.paymentCount,providerRecords.length)
    assert.equal(await prisma.financialEvent.count(),localEventCount)
    const projected=await readOnlyBatch.reader.read({tenantKey:scope,through:new Date()})
    assert.ok(projected.payments.every(p=>p.access.customer===null && p.access.administrator===null))
    await assert.rejects(createFinancialChainReader({listPaymentsForReview:async()=>[],listRefundsForReview:async()=>[]},{inspectPayment:async()=>evidence}),/PROVIDER_COVERAGE_MISMATCH/)
    console.log('PASS read-only provider adapter: real PostgreSQL projection, coverage loss blocked, no financial/event mutations, route proof not fabricated')
    delete process.env.FINANCIAL_CHAIN_REVIEW_ENABLED
    console.log('PASS daily financial comparison: closed gate, authorization, tenant, six concurrent observations -> one event, recovery preserves original event')
    // Integration regression: P1's nullable Pro source must not break existing Academy zero-credit refunds.
    const {issueCreditNoteForCompletedRefund}=await import('../src/lib/finance/invoice-service')
    for(const academyOrganization of [organization.id,null]) {
      const purchase: FinancialPurchase=await prisma.financialPurchase.create({data:{...baseData,id:randomUUID(),organizationId:academyOrganization,kind:'ACADEMY_COURSE',pricingMode:'ACADEMY_SANDBOX',packageSku:'SYNTHETIC_ACADEMY',packageLabel:'Synthetic Academy integration',molliePaymentId:'tr_academy_'+randomUUID(),idempotencyKey:randomUUID()}})
      const original: FinancialInvoice|null=await runSerializable(tx=>issueInvoiceForPaidPurchase(tx,purchase.id))
      assert.ok(original)
      await assert.rejects(()=>prisma!.financialRefund.create({data:{purchaseId:purchase.id,approvedByUserId:platformAdministrator.id,reason:'Synthetic unauthorized partial refund',amountCents:100,credits:0,idempotencyKey:randomUUID()}}))
      const refund: FinancialRefund=await prisma.financialRefund.create({data:{purchaseId:purchase.id,approvedByUserId:platformAdministrator.id,reason:'Synthetic full Academy refund',amountCents:purchase.amountInclVatCents,credits:0,idempotencyKey:randomUUID()}})
      await prisma.financialRefund.update({where:{id:refund.id},data:{status:'REFUNDED',mollieRefundId:'re_fake_'+randomUUID(),completedAt:new Date()}})
      const credit: FinancialInvoice=await runSerializable(tx=>issueCreditNoteForCompletedRefund(tx,refund.id))
      assert.ok(credit);assert.equal(credit.originalInvoiceId,original.id);assert.equal(credit.amountInclVatCents,-5929);assert.equal(credit.organizationId,academyOrganization)
      assert.equal((await runSerializable(tx=>issueCreditNoteForCompletedRefund(tx,refund.id))).id,credit.id)
      await assert.rejects(()=>prisma!.financialRefund.delete({where:{id:refund.id}}))
      assert.equal(await prisma.financialJorttSync.count({where:{invoiceId:{in:[original.id,credit.id]}}}),0)
    }
    console.log('PASS merged Academy guards: consumer/business full credit commits, exact VAT/source, repeat idempotent, unauthorized partial/delete refused; sandbox Jortt hold retained')
    // P1.7: close product-bound accounting gaps with real services and fake gateways.
    // No provider networking is permitted during this additional acceptance slice.
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => { throw new Error('P17_EXTERNAL_PROVIDER_FORBIDDEN') }
    try {
      const { buildFinancialInvoicePdf } = await import('../src/lib/finance/financial-invoice-pdf')
      const { getProfessionalFinancialDashboard } = await import('../src/lib/finance/financial-dashboard-service')
      const { listPlatformFinancialInvoices } = await import('../src/lib/finance/platform-financial-query-service')
      const snapshots: FinancialInvoice[] = []
      for (const kind of ['CREDIT_PACKAGE','COMPLIANCE_SCAN'] as const) {
        const net = kind === 'CREDIT_PACKAGE' ? 2500 : 2495
        const vat = Math.round(net * 21 / 100), gross = net + vat
        const framework: ComplianceFrameworkVersion|null = kind==='COMPLIANCE_SCAN' ? await prisma.complianceFrameworkVersion.create({data:{
          frameworkCode:'P17_SYNTHETIC_FINANCE',version:'1',status:'DRAFT',title:'Synthetic financial binding only',
          methodology:'No legal evaluation',disclaimer:'Synthetic fixture, never publish',checksum:'a'.repeat(64)}}) : null
        // Financial boundary fixture only: no claim that a legal framework is published.
        const draft: ArboGuideRun|null = framework ? await prisma.arboGuideRun.create({data:{guideType:'COMPLIANCE',guideVersion:'2',reportVersion:'2.0',
          organizationId:organization.id,completedByUserId:user.id,complianceFrameworkVersionId:framework.id,
          idempotencyKey:randomUUID(),answersSnapshot:{},draftRevision:0,draftDefinitionChecksum:'a'.repeat(64)}}) : null
        const purchase: FinancialPurchase = await prisma.financialPurchase.create({data:{...baseData,id:randomUUID(),kind,
          complianceRunId:draft?.id??null,
          status:'PAYMENT_PENDING',paidAt:null,terminalAt:null,credits:kind==='CREDIT_PACKAGE'?25:0,
          packageSku:kind==='CREDIT_PACKAGE'?'CREDITS_25':'SYNTHETIC_COMPLIANCE',packageLabel:'Synthetic '+kind,
          baseAmountCents:net,amountExclVatCents:net,vatAmountCents:vat,amountInclVatCents:gross,
          molliePaymentId:'tr_p17_'+randomUUID(),idempotencyKey:randomUUID()}})
        const observed={id:purchase.molliePaymentId!,status:'paid',amountValue:(gross/100).toFixed(2),currency:'EUR',
          metadata:{purchaseId:purchase.id,organizationId:organization.id},paidAt:new Date().toISOString(),
          createdAt:new Date().toISOString(),checkoutUrl:null}
        const gateway={getPayment:async()=>observed} as unknown as Parameters<typeof processMolliePayment>[1]
        const failedDeliveries=await Promise.allSettled(Array.from({length:6},()=>processMolliePayment(observed.id,gateway)))
        assert.ok(failedDeliveries.every(r=>r.status==='rejected' && r.reason.message==='INVOICE_EMAIL_NOT_ACCEPTED'))
        const committedInvoice=await prisma.financialInvoice.findUniqueOrThrow({where:{purchaseId:purchase.id}})
        const { deliverFinancialInvoiceEmail }=await import('../src/lib/finance/financial-invoice-delivery-service')
        let fakeMailAcceptances=0
        await deliverFinancialInvoiceEmail(committedInvoice.id,async()=>{fakeMailAcceptances++;return {accepted:true,transport:'RESEND',status:'ACCEPTED',messageId:'p17-fake-only'}})
        await Promise.all(Array.from({length:6},()=>processMolliePayment(observed.id,gateway)))
        assert.equal(fakeMailAcceptances,1)
        await processMolliePayment(observed.id,{getPayment:async()=>({...observed,status:'pending'})} as unknown as Parameters<typeof processMolliePayment>[1])
        assert.equal(await prisma.financialInvoice.count({where:{purchaseId:purchase.id}}),1)
        assert.equal((await prisma.financialPurchase.findUniqueOrThrow({where:{id:purchase.id}})).status,'PAID')
        const document: Prisma.FinancialInvoiceGetPayload<{include:{lines:true;vatSummaries:true}}>=await prisma.financialInvoice.findUniqueOrThrow({where:{purchaseId:purchase.id},include:{lines:true,vatSummaries:true}})
        snapshots.push(document)
        assert.equal(document.amountInclVatCents,gross);assert.equal(document.vatAmountCents,vat)
        assert.equal(document.lines[0].unit,kind==='CREDIT_PACKAGE'?'credit':'scan')
        if(kind==='CREDIT_PACKAGE') {
          const ledgerEntries: Array<{totalDelta:number}>=await prisma.creditTransaction.findMany({where:{creditedPurchase:{id:purchase.id}}})
          assert.equal(ledgerEntries.length,1);assert.equal(ledgerEntries[0].totalDelta,25)
        }
        assert.equal(Buffer.from(await buildFinancialInvoicePdf(document)).subarray(0,5).toString(),'%PDF-')
        let documentPosts=0, paymentPosts=0
        await syncFinancialInvoiceToJortt(document.id,{submitInvoice:async(payload)=>{
          documentPosts++;assert.equal(payload.amountInclVatCents,gross)
          return {externalReference:'fake-'+document.id,remoteInvoiceNumber:'SYNTHETIC-'+document.sequenceNumber}
        }})
        await syncFinancialInvoiceToJortt(document.id,{submitInvoice:async()=>{throw new Error('DUPLICATE_DOCUMENT')}})
        const remote={id:'fake-'+document.id,reference:document.invoiceNumber,totalCents:gross,dueCents:gross,currency:'EUR',
          bookings:[] as typeof evidence.bookings,allowedLedgerAccounts:[ledger]}
        const fake={inspectPayment:async()=>remote,registerPayment:async(input:{reference:string;bookDate:string})=>{
          paymentPosts++;const id=randomUUID();remote.dueCents=0
          remote.bookings.push({id,description:input.reference,amountCents:gross,ledgerAccountId:ledger,bookDate:input.bookDate})
          return {bookingId:id}
        }}
        const input={...reconcileInput,invoiceId:document.id}
        await assert.rejects(()=>reconcileJorttPayment({...input,actorUserId:secondUser.id},fake))
        assert.equal((await reconcileJorttPayment(input,fake)).status,'CONFIRMED')
        assert.equal((await reconcileJorttPayment(input,fake)).status,'CONFIRMED')
        assert.equal(documentPosts,1);assert.equal(paymentPosts,1)
      }
      const own=await getProfessionalFinancialDashboard({actorUserId:user.id,organizationId:organization.id})
      const other=await getProfessionalFinancialDashboard({actorUserId:secondUser.id,organizationId:secondOrganization.id})
      const adminInvoices=await listPlatformFinancialInvoices(platformAdministrator.id)
      for(const document of snapshots) {
        assert.ok(own.invoices.some(i=>i.id===document.id))
        assert.ok(!other.invoices.some(i=>i.id===document.id))
        assert.ok(adminInvoices.items.some(i=>i.id===document.id))
      }
      await assert.rejects(()=>getProfessionalFinancialDashboard({actorUserId:secondUser.id,organizationId:organization.id}))
      await assert.rejects(()=>listPlatformFinancialInvoices(secondUser.id))
      const historical=await prisma.financialInvoice.findMany({where:{subscriptionPayment:{molliePaymentId:{in:[october.id,november.id]}}}})
      assert.equal(historical.length,2)
      for(const document of historical) {
        let documentPosts=0,paymentPosts=0
        await syncFinancialInvoiceToJortt(document.id,{submitInvoice:async()=>{
          documentPosts++;return {externalReference:'p17-history-'+document.id,remoteInvoiceNumber:'FAKE-'+document.sequenceNumber}
        }})
        const remote={id:'p17-history-'+document.id,reference:document.invoiceNumber,totalCents:5929,dueCents:5929,currency:'EUR',
          bookings:[] as typeof evidence.bookings,allowedLedgerAccounts:[ledger]}
        const fake={inspectPayment:async()=>remote,registerPayment:async(input:{reference:string;bookDate:string})=>{
          paymentPosts++;remote.dueCents=0
          remote.bookings.push({id:randomUUID(),description:input.reference,amountCents:5929,ledgerAccountId:ledger,bookDate:input.bookDate})
          throw new Error('P17_FAKE_LOST_ACCEPTANCE')
        }}
        const input={...reconcileInput,invoiceId:document.id}
        assert.equal((await reconcileJorttPayment(input,fake)).status,'REVIEW_REQUIRED')
        assert.equal((await reconcileJorttPayment(input,fake)).status,'CONFIRMED')
        assert.equal((await reconcileJorttPayment(input,fake)).status,'CONFIRMED')
        await syncFinancialInvoiceToJortt(document.id,{submitInvoice:async()=>{throw new Error('DUPLICATE_DOCUMENT')}})
        assert.equal(documentPosts,1);assert.equal(paymentPosts,1)
        assert.equal((await prisma.financialInvoice.findUniqueOrThrow({where:{id:document.id}})).invoiceNumber,document.invoiceNumber)
      }
      console.log('P17 PASS: two selected historical synthetic invoices -> fake Jortt document, uncertain settlement, read-only confirmation, one booking each and unchanged original number')
      console.log('P17 PASS: credits and Compliance financial handlers, six callbacks each, one invoice and exact credits/VAT, tenant/admin lists, PDF bytes, fake Jortt document+settlement replay; not a Compliance checkout/access test')
    } finally { globalThis.fetch=originalFetch }
    deploySchema()
    const counts=await prisma.$queryRawUnsafe('SELECT count(*)::int AS applied FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
    assert.deepEqual(counts,[{applied:115}])
    console.log('PASS 115 migrations, repeat deploy, cleanup in finally')
    if (process.argv.includes('--browser')) {
      const browser = spawnSync(process.execPath, ['--import','./scripts/register-learning-server.mjs','--import','tsx','scripts/test-p11-financial-browser.ts'], { cwd:process.cwd(), env:{...process.env,DATABASE_URL:testUrl.toString()},encoding:'utf8',windowsHide:true,timeout:300000 })
      if(browser.status!==0) throw new Error(`P11_BROWSER_FAILED: ${browser.stdout} ${browser.stderr}`)
      console.log(browser.stdout)
    }

  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende financiële databasetestfout.')
  process.exitCode = 1
})
