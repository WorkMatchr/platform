import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { Prisma } from '../src/generated/prisma/client'

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
  // This standalone process must never contact a real mail or accounting provider.
  if (process.env.RESEND_API_KEY || process.env.JORTT_CLIENT_SECRET || process.env.MOLLIE_API_KEY) {
    throw new Error('SYNTHETIC_PROVIDER_ENVIRONMENT_REQUIRED')
  }
  globalThis.fetch = async () => { throw new Error('EXTERNAL_HTTP_DISABLED_IN_FINANCIAL_TEST') }
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
    const paidRetry = await prisma.financialPurchase.create({data:{...baseData,id:randomUUID(),status:'PAYMENT_PENDING',paidAt:null,terminalAt:null,molliePaymentId:'tr_p1retry',idempotencyKey:randomUUID()}})
    const pro = await prisma.professionalSubscription.create({data:{organizationId:organization.id,status:'PENDING_MANDATE',planCode:'WORKMATCHR_PRO',planLabel:'Synthetic Pro',amountExclVatCents:4900,vatRateBps:2100,vatAmountCents:1029,amountInclVatCents:5929,currency:'EUR',mollieCustomerId:'cst_p1',firstPaymentPurchaseId:failedFirst.id,currentPeriodStart:new Date('2026-09-04T19:00:48Z'),currentPeriodEnd:new Date('2026-10-04T19:00:48Z')}})
    await prisma.professionalSubscriptionFirstPaymentAttempt.create({data:{subscriptionId:pro.id,purchaseId:paidRetry.id,attemptNumber:1}})
    const { findEffectiveProSubscription } = await import('../src/lib/finance/pro-entitlement-service')
    await prisma.professionalSubscription.update({ where: { id: pro.id }, data: { status: 'ACTIVE' } })
    assert.equal(await findEffectiveProSubscription(prisma, organization.id, baseData.paidAt), null)
    await prisma.professionalSubscription.update({ where: { id: pro.id }, data: { status: 'PENDING_MANDATE' } })
    const { issueInvoiceForPaidPurchase } = await import('../src/lib/finance/invoice-service')
    const initialGateway = {
      getPayment: async () => ({
        id: 'tr_p1retry', status: 'paid', amountValue: '59.29', currency: 'EUR',
        metadata: { purchaseId: paidRetry.id, organizationId: organization.id },
        paidAt: baseData.paidAt.toISOString(), createdAt: baseData.paidAt.toISOString(),
      }),
      listCustomerMandates: async () => [{ id: 'mdt_p1', status: 'valid', method: 'directdebit' }],
      findCustomerSubscription: async () => ({
        id: 'sub_p1', status: 'active', amountValue: '59.29', currency: 'EUR', interval: '1 month',
        mandateId: 'mdt_p1', method: 'directdebit', metadata: { organizationId: organization.id, subscriptionId: pro.id },
      }),
    }
    await processMolliePayment('tr_p1retry', initialGateway as never)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({ where: { id: pro.id } })).status, 'ACTIVE')
    assert.equal(await prisma.financialInvoice.count({ where: { purchaseId: paidRetry.id } }), 1)
    console.log('PASS paid first-payment retry activates Pro and issues its original invoice')
    const payment=(id:string,paidAt:string,status='paid')=>({id,status,amountValue:'59.29',currency:'EUR',metadata:{subscriptionId:pro.id,organizationId:organization.id},paidAt:status==='paid'?paidAt:null,createdAt:paidAt,checkoutUrl:null,subscriptionId:'sub_p1',mandateId:'mdt_p1',method:'directdebit'})
    const october=payment('tr_p1october','2026-10-04T19:00:48Z')
    const november=payment('tr_p1november','2026-11-04T19:00:48Z')
    const { verifyPaidProPricing } = await import('./finance-tests/pro-paid-period')
    await verifyPaidProPricing({
      actorUserId: user.id, organizationId: organization.id, subscriptionId: pro.id,
      freeUserId: secondUser.id, freeOrganizationId: secondOrganization.id, renewal: october as never,
    })
    await processRecurringProPayment(november as never)
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
    let accepted: {id:string;status:'refunded'} | null=null
    const refundGateway={ getPayment:async()=>({...payment('tr_p1retry','2026-09-04'),metadata:{organizationId:organization.id}}),
      createRefund:async()=>{calls++;accepted={id:'re_synthetic_accepted',status:'refunded'};throw new Error('SYNTHETIC_TIMEOUT_AFTER_ACCEPT')},
      findRefundByReference:async()=>accepted }
    const refundInput={actorUserId:platformAdministrator.id,creditNoteId:partial.id,reason:'Synthetic refund accepted but response lost',idempotencyKey:'p1-pro-refund-partial'}
    await assert.rejects(()=>requestProRefund(refundInput,refundGateway as never),/MOLLIE_REFUND_RECONCILIATION_REQUIRED/)
    const uncertain=await prisma.financialRefund.findUniqueOrThrow({where:{proCreditNoteId:partial.id}})
    assert.equal(uncertain.reconciliationRequired,true);assert.equal(uncertain.status,'PENDING')
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
    const { reconcileProPayments } = await import('../src/lib/finance/pro-payment-reconciliation')
    const missed={...november,id:'tr_p1missing',createdAt:'2027-01-04T19:00:48Z',paidAt:'2027-01-06T19:00:48Z'}
    const lookup={ getCustomer:async()=>({id:'cst_p1',organizationId:organization.id}), listSubscriptionPayments:async()=>[missed,november,october] }
    await assert.rejects(()=>reconcileProPayments({actorUserId:secondUser.id,subscriptionId:pro.id,after:new Date('2026-09-01'),reason:'Synthetic missing webhook reconciliation'},lookup as never))
    const recovery=await reconcileProPayments({actorUserId:platformAdministrator.id,subscriptionId:pro.id,after:new Date('2026-09-01'),reason:'Synthetic missing webhook reconciliation'},lookup as never)
    assert.equal(recovery.failed,0);assert.equal(recovery.processed,3)
    assert.equal(await prisma.financialInvoice.count({where:{molliePaymentId:missed.id}}),1)
    await assert.rejects(()=>processRecurringProPayment({...missed,metadata:{...missed.metadata,organizationId:secondOrganization.id}} as never),/MOLLIE_PAYMENT_MISMATCH/)
    assert.ok(await findEffectiveProSubscription(prisma, organization.id, new Date('2026-11-15T12:00:00Z')))
    assert.equal(await findEffectiveProSubscription(prisma, organization.id, new Date('2026-12-15T12:00:00Z')), null)
    assert.ok(await findEffectiveProSubscription(prisma, organization.id, new Date('2027-01-15T12:00:00Z')))
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
      createRefund:async()=>{concurrentCalls++;await new Promise(r=>setTimeout(r,20));return {id:'re_concurrent',status:'refunded'}},findRefundByReference:async()=>null}
    const cash=await Promise.allSettled(Array.from({length:6},()=>requestProRefund({...refundInput,creditNoteId:remainder.id,idempotencyKey:'p1-pro-refund-concurrent'},cashGateway as never)))
    assert.equal(cash.filter(x=>x.status==='fulfilled').length,6);assert.equal(concurrentCalls,1)
    assert.equal((await prisma.financialRefund.findUniqueOrThrow({where:{proCreditNoteId:remainder.id}})).status,'REFUNDED')
    await assert.rejects(()=>prisma!.financialRefund.update({where:{id:uncertain.id},data:{providerAttemptedAt:null}}),/REFUND_SOURCE_IMMUTABLE/)
    await assert.rejects(()=>prisma!.financialRefund.update({where:{id:uncertain.id},data:{status:'PENDING'}}),/REFUND_SOURCE_IMMUTABLE/)
    console.log('PASS six concurrent Pro refund requests -> one provider acceptance; dispatch and terminal state immutable')
    const { scheduleProCancellation, finalizeScheduledProCancellations } = await import('../src/lib/finance/subscription-service')
    let cancelCalls = 0
    const fakeCancellation = { cancelSubscription: async () => { cancelCalls++; return { id: 'sub_p1', status: 'canceled' } } }
    const cancellation = { actorUserId: user.id, organizationId: organization.id }
    await assert.rejects(() => scheduleProCancellation({ ...cancellation, actorUserId: secondUser.id }, fakeCancellation as never))
    const scheduled = await scheduleProCancellation(cancellation, fakeCancellation as never)
    await scheduleProCancellation(cancellation, fakeCancellation as never)
    assert.equal(cancelCalls, 1)
    assert.equal(scheduled.status, 'ACTIVE')
    assert.ok(scheduled.cancellationEffectiveAt)
    assert.equal((await finalizeScheduledProCancellations(scheduled.cancellationEffectiveAt)).count, 1)
    assert.equal((await finalizeScheduledProCancellations(scheduled.cancellationEffectiveAt)).count, 0)
    assert.equal((await prisma.professionalSubscription.findUniqueOrThrow({ where: { id: pro.id } })).status, 'CANCELED')
    assert.equal(await prisma.financialEvent.count({ where: { eventType: 'PRO_CREDIT_ISSUED' } }), 3)
    assert.equal(await prisma.financialJorttSync.count({ where: { invoice: { proCreditKey: { not: null } } } }), 3)
    assert.equal(await prisma.creditTransaction.count(), 0)
    console.log('PASS independent cancellation; three audited credits with three Jortt jobs and unchanged wallet')
    deploySchema()
    const counts=await prisma.$queryRawUnsafe('SELECT count(*)::int AS applied FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
    assert.deepEqual(counts,[{applied:96}])
    console.log('PASS 96 migrations, repeat deploy, cleanup in finally')
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
