import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import type { MollieGateway, MolliePaymentSnapshot } from '@/lib/finance/mollie-gateway'

const context = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => context.db }))
vi.mock('@/lib/finance/mollie-gateway', async original => ({
  ...await original<typeof import('@/lib/finance/mollie-gateway')>(),
  getMollieUrls: () => ({ redirectBaseUrl: 'http://127.0.0.1:3002', webhookBaseUrl: 'https://example.invalid' }),
  createMollieGateway: () => { throw new Error('REAL_PROVIDER_REFUSED') },
}))
import { createAcademyOrder, startAcademyOrderPayment, processAcademyMolliePayment, inviteAcademySeat, acceptAcademySeat, getAcademyOrderView, recordAcademyWithdrawal } from './academy-commerce-service'
import { requestAcademyRefund } from './academy-commerce-refund'
import { deliverAcademyCommerceEmails } from './academy-commerce-email-worker'
import { ACADEMY_LEGAL_VERSION } from './academy-commerce-policy'

const enabled = process.env.ACADEMY_COMMERCE_RUNTIME === '1'
const browserFixtures = process.env.P18_RETAIN_LOCAL_BUYER_FIXTURES === 'true'
let db: PrismaClient
function scoped(tx: Prisma.TransactionClient): PrismaClient {
  const proxy = new Proxy(tx, { get(target, key) {
    if (key === '$transaction') return async (work: unknown) => typeof work === 'function' ? (work as (value: unknown) => unknown)(proxy) : Promise.all(work as Promise<unknown>[])
    const value = Reflect.get(target, key)
    return typeof value === 'function' ? value.bind(target) : value
  } })
  return proxy as unknown as PrismaClient
}
async function identity() {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  if (process.env.RESEND_API_KEY) throw new Error('LIVE_MAIL_REFUSED')
  const [row] = await db.$queryRaw<Array<{ db: string; major: number; ready: boolean }>>`SELECT current_database() db,(current_setting('server_version_num')::int/10000)::int major, EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name='20261026100000_add_academy_commerce' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) ready`
  expect(row).toMatchObject(process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true' ? {db:'workmatchr_lms20_synthetic',major:18,ready:true} : { db: 'neondb', major: 17, ready: true })
}
async function preserved() {
  return db.$queryRaw<Array<{ kind: string; count: bigint; fingerprint: string | null }>>`
    SELECT 'certificate' kind,count(*) count,md5(string_agg(row_to_json(c)::text,'' ORDER BY c.id)) fingerprint FROM "LearningCertificate" c
    UNION ALL SELECT 'owner-marker',count(*),md5(string_agg(row_to_json(e)::text,'' ORDER BY e.id)) FROM "OrganizationMembershipEvent" e WHERE e."idempotencyKey"='workmatchr:first-platform-owner:v1:membership'
    UNION ALL SELECT 'auth-account',count(*),null FROM "Account"
    UNION ALL SELECT 'auth-session',count(*),null FROM "Session"
    UNION ALL SELECT 'purchase',count(*),null FROM "FinancialPurchase"
    UNION ALL SELECT 'draft-questions',count(*),null FROM "LearningQuestion" WHERE code LIKE 'WL002-%' AND status='DRAFT'
  `
}
beforeAll(async () => {
  if (!enabled) return
  vi.stubEnv('ACADEMY_COMMERCE_SANDBOX', '1')
  // Synthetic value; every provider call is injected, never sent to Mollie.
  if (process.env.ACADEMY_LOCAL_ACCEPTANCE !== 'true') vi.stubEnv('MOLLIE_API_KEY', 'test_runtime_fake_no_delivery')
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  await identity()
  if (browserFixtures) {
    expect(process.env.ACADEMY_LOCAL_ACCEPTANCE).toBe('true')
    expect(await db.learningAcademyOrder.count()).toBe(0)
    expect(await db.user.count()).toBe(0)
  }
})
afterAll(async () => { await db?.$disconnect(); vi.unstubAllEnvs() })

describe.skipIf(!enabled)('Academy commerce: isolated PostgreSQL, fake transport, all fixtures rolled back', () => {
  it.each([1, 5] as const)('%i places: payment, authorization, invoice, outbox, activation and full refund', async quantity => {
    await identity()
    const before = await preserved()
    const rollback = new Error('EXPECTED_COMMERCE_ROLLBACK')
    try {
      await db.$transaction(async tx => {
        context.db = scoped(tx)
        const user = await tx.user.create({ data: { email: `commerce-${randomUUID()}@example.invalid`, displayName: 'Fictieve testkoper', status: 'ACTIVE', emailVerified: true } })
        let organizationId: string | undefined
        if (quantity === 5) {
          const organization = await tx.organization.create({ data: { name: 'Fictieve Academy-testorganisatie', organizationType: 'CLIENT', status: 'ACTIVE' } })
          organizationId = organization.id
          await tx.organizationMembership.create({ data: { userId: user.id, organizationId, role: 'OWNER', status: 'ACTIVE' } })
        }
        const courseCode = process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true' ? (quantity===1?'WL-991':'WL-992') : 'WL-001'
        if (process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true') {
          // This is a new disposable database; no dependency on a previous editor session.
          const operator = await tx.user.create({data:{email:`operator-${randomUUID()}@example.invalid`,platformRole:'ADMIN',status:'ACTIVE',emailVerified:true}})
          const platform = await tx.organization.upsert({where:{systemKey:'WORKMATCHR_PLATFORM'},create:{name:'Synthetic platform',organizationType:'PLATFORM_OPERATOR',status:'ACTIVE',systemKey:'WORKMATCHR_PLATFORM'},update:{}})
          await tx.organizationMembership.create({data:{userId:operator.id,organizationId:platform.id,role:'OWNER',status:'ACTIVE'}})
          const now = new Date()
          const course = await tx.learningCourse.create({data:{code:courseCode,slug:`synthetic-commerce-${quantity}`,title:'Synthetic course',description:'Local finance fixture',status:'PUBLISHED',
            versions:{create:{version:'1',status:'PUBLISHED',publishedAt:now,validFrom:now,reviewDueAt:new Date(now.getTime()+86400000)}}}})
          await tx.learningAcademyPriceVersion.create({data:{scopeKey:course.id,courseId:course.id,revision:1,individualCents:14900,fiveCents:59500,followUpIndividualCents:13999,followUpFiveCents:56500,vatRateBps:2100,vatTreatment:'TAXABLE',taxStatus:'TAX_REVIEW_REQUIRED',taxReference:'',createdByUserId:operator.id}})
        }
        const input = { courseCode, quantity, buyerType: quantity === 1 ? 'CONSUMER' : 'BUSINESS', ...(organizationId ? { organizationId } : {}), billing: { name: 'Fictieve Testkoper', address: 'Teststraat 1', postalCode: '1000AA', city: 'Teststad', country: 'NL' }, platformTermsAccepted: true, academyTermsAccepted: true, legalVersion: ACADEMY_LEGAL_VERSION, idempotencyKey: `fixture-${randomUUID()}` }
        const order = await createAcademyOrder(user.id, input)
        expect(await createAcademyOrder(user.id, input)).toEqual(order)
        expect(await tx.learningEnrollment.count({ where: { userId: user.id } })).toBe(0)
        await expect(getAcademyOrderView(randomUUID(), order.orderId)).rejects.toThrow()
        const raw = await tx.learningAcademyOrder.findUniqueOrThrow({ where: { id: order.orderId }, include: { purchase: true, seats: true } })
        expect(raw.seats).toHaveLength(quantity)
        async function rejectsDatabaseMutation(operation: () => Promise<unknown>) {
          await tx.$executeRawUnsafe('SAVEPOINT academy_commerce_guard_test')
          try { await expect(operation()).rejects.toThrow() }
          finally {
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT academy_commerce_guard_test')
            await tx.$executeRawUnsafe('RELEASE SAVEPOINT academy_commerce_guard_test')
          }
        }
        await rejectsDatabaseMutation(() => tx.learningAcademyOrder.update({ where: { id: raw.id }, data: { quantity: quantity === 1 ? 5 : 1 } }))
        await rejectsDatabaseMutation(() => tx.learningAcademySeat.delete({ where: { id: raw.seats[0].id } }))
        const payment: MolliePaymentSnapshot = { id: `tr_${randomUUID()}`, status: 'open', amountValue: quantity === 1 ? '149.00' : '595.00', currency: 'EUR', metadata: { purchaseId: raw.purchaseId, ...(organizationId ? { organizationId } : {}) }, checkoutUrl: 'https://www.mollie.com/checkout/test', paidAt: null, createdAt: null, subscriptionId: null, mandateId: null, method: null }
        const gateway = { createPayment: vi.fn().mockResolvedValue(payment), createRefund: vi.fn().mockImplementation(async ({ amountValue, currency }: { amountValue: string; currency: string }) => ({ id: `re_${raw.purchaseId}`, status: 'refunded', amountValue, currency, paymentId: payment.id, createdAt: null })) } as unknown as MollieGateway
        await startAcademyOrderPayment(user.id, order.orderId, true, gateway)
        await processAcademyMolliePayment(payment)
        expect(await tx.learningEnrollment.count({ where: { userId: user.id } })).toBe(0)
        await processAcademyMolliePayment({ ...payment, status: 'failed' })
        expect(await tx.financialInvoice.count({where:{purchaseId:raw.purchaseId}})).toBe(0)
        const paid = { ...payment, status: 'paid' as const, paidAt: new Date().toISOString() }
        await processAcademyMolliePayment(paid); await processAcademyMolliePayment(paid)
        await processAcademyMolliePayment(payment) // stale open callback after paid
        expect((await tx.financialPurchase.findUniqueOrThrow({where:{id:raw.purchaseId}})).status).toBe('PAID')
        expect(await tx.financialInvoice.count({ where: { purchaseId: raw.purchaseId } })).toBe(1)
        const invoice = await tx.financialInvoice.findUniqueOrThrow({where:{purchaseId:raw.purchaseId}, include:{lines:true,vatSummaries:true,jorttSync:true,originalInvoice:{include:{jorttSync:true}}}})
        const {buildFinancialInvoicePdf} = await import('@/lib/finance/financial-invoice-pdf')
        const {buildJorttInvoicePayload} = await import('@/lib/finance/jortt-sync-service')
        const {confirmsJorttBooking} = await import('@/lib/finance/jortt-payment-service')
        const {listPlatformFinancialInvoices} = await import('@/lib/finance/platform-financial-query-service')
        const operator = await tx.user.findFirstOrThrow({where:{platformRole:'ADMIN',memberships:{some:{organization:{systemKey:'WORKMATCHR_PLATFORM'},role:'OWNER',status:'ACTIVE'}}}})
        expect((await listPlatformFinancialInvoices(operator.id)).items.some(row=>row.id===invoice.id)).toBe(true)
        expect((await getAcademyOrderView(user.id,order.orderId)).invoice?.id).toBe(invoice.id)
        expect(Buffer.from(await buildFinancialInvoicePdf(invoice)).subarray(0,5).toString()).toBe('%PDF-')
        // Exercise the immutable mapping and the same settlement evidence predicate without a queue or live posting.
        const document = buildJorttInvoicePayload(invoice)
        expect(document.organizationId).toBe(organizationId??null)
        expect(document.paymentReference).toBe(payment.id)
        expect([document.amountExclVatCents,document.vatAmountCents,document.amountInclVatCents]).toEqual(quantity===1?[12314,2586,14900]:[49174,10326,59500])
        const ledger = randomUUID(), bookDate = paid.paidAt.slice(0,10)
        const submitInvoice = vi.fn(async (payload: typeof document) => {
          expect(payload.lines.reduce((n,line)=>n+line.netAmountExclVatCents+line.vatAmountCents,0)).toBe(payload.amountInclVatCents)
          return {externalReference:'fake-'+payload.invoiceId, remoteInvoiceNumber:'TEST-'+payload.invoiceNumber}
        })
        const accepted = await submitInvoice(document)
        const remote = {id:accepted.externalReference,reference:document.invoiceNumber,currency:document.currency,totalCents:document.amountInclVatCents,dueCents:document.amountInclVatCents,
          allowedLedgerAccounts:[ledger],bookings:[] as Array<{id:string;description:string;amountCents:number;ledgerAccountId:string;bookDate:string}>}
        const provider = {
          inspectPayment:vi.fn(async()=>remote),
          registerPayment:vi.fn(async (input:{invoiceId:string;reference:string;amountCents:number;ledgerAccountId:string;bookDate:string})=>{
            expect(input.invoiceId).toBe(remote.id)
            remote.bookings.push({id:randomUUID(),description:input.reference,amountCents:input.amountCents,ledgerAccountId:input.ledgerAccountId,bookDate:input.bookDate})
            remote.dueCents-=input.amountCents
            throw new Error('SYNTHETIC_LOST_SETTLEMENT_RESPONSE')
          })
        }
        // Only substitute the future document-link read. Never enqueue, mark an actual
        // Academy sync as SYNCED or switch the immutable snapshot out of sandbox mode.
        const persisted = scoped(tx)
        context.db = new Proxy(persisted,{get(target,key){
          if(key!=='financialInvoice') return Reflect.get(target,key)
          return {findUniqueOrThrow:async ({where}:{where:{id:string}})=>{
            const row=await tx.financialInvoice.findUniqueOrThrow({where,include:{purchase:true,subscriptionPayment:true,jorttSync:true}})
            expect(row.id).toBe(invoice.id);expect(row.jorttSync).toBeNull()
            return {...row,jorttSync:{...accepted,status:'SYNCED'}}
          }}
        }})
        try {
          const {reconcileJorttPayment}=await import('@/lib/finance/jortt-payment-service')
          const input={invoiceId:invoice.id,actorUserId:operator.id,ledgerAccountId:ledger,bookDate,reason:'Isolated synthetic settlement'}
          await expect(reconcileJorttPayment({...input,actorUserId:user.id},provider)).rejects.toThrow()
          expect((await reconcileJorttPayment(input,provider)).status).toBe('REVIEW_REQUIRED')
          expect((await reconcileJorttPayment(input,provider)).status).toBe('CONFIRMED')
          expect((await reconcileJorttPayment(input,provider)).status).toBe('CONFIRMED')
          expect(provider.registerPayment).toHaveBeenCalledTimes(1)
          expect(confirmsJorttBooking(remote,invoice,'other-clearing',bookDate)).toBe(false)
          expect(await tx.financialEvent.count({where:{invoiceId:invoice.id,eventType:'JORTT_PAYMENT_CONFIRMED'}})).toBe(1)
        } finally { context.db=persisted }
        expect(await tx.financialJorttSync.count({ where: { invoice: { purchaseId: raw.purchaseId } } })).toBe(0)
        expect(await tx.notificationOutbox.count({ where: { idempotencyKey: `academy-order-confirmed:${raw.purchaseId}` } })).toBe(1)
        if (quantity === 5) {
          const participant = await tx.user.create({ data: { email: `seat-${randomUUID()}@example.invalid`, displayName: 'Fictieve deelnemer', status: 'ACTIVE', emailVerified: true } })
          const seat = raw.seats[0]
          await inviteAcademySeat(user.id, seat.id, participant.email); await inviteAcademySeat(user.id, seat.id, participant.email)
          await expect(acceptAcademySeat(user.id, seat.id, true, ACADEMY_LEGAL_VERSION)).rejects.toThrow()
          await acceptAcademySeat(participant.id, seat.id, true, ACADEMY_LEGAL_VERSION)
          await acceptAcademySeat(participant.id, seat.id, true, ACADEMY_LEGAL_VERSION)
          expect(await tx.learningAcademySeatEvent.count({ where: { seatId: seat.id, action: 'INVITED' } })).toBe(1)
          expect(await tx.learningEnrollment.count({ where: { userId: participant.id } })).toBe(1)
        }
        // Only these transaction-local jobs are eligible for the fake delivery run.
        const fixtureJobs = await tx.notificationOutbox.findMany({ where: { OR: [{ recipientUserId: user.id }, { templateKey: 'ACADEMY_SEAT_INVITED', payload: { path: ['seatId'], equals: raw.seats[0].id } }] }, select: { id: true } })
        const tick = new Date('2000-01-01T00:00:00Z')
        await tx.notificationOutbox.updateMany({ where: { id: { in: fixtureJobs.map(j => j.id) } }, data: { availableAt: tick } })
        const send = vi.fn().mockResolvedValue({ accepted: true, transport: 'DEVELOPMENT_LOG', status: 'ACCEPTED', messageId: 'fake-only' })
        expect((await deliverAcademyCommerceEmails({ send, now: () => tick })).sent).toBe(1)
        expect(send.mock.calls[0][0].attachments[0].content).toContain('TAX_REVIEW_REQUIRED')
        await recordAcademyWithdrawal(user.id, order.orderId); await recordAcademyWithdrawal(user.id, order.orderId)
        expect(await tx.notificationOutbox.count({ where: { idempotencyKey: `academy-withdrawal-receipt:${raw.purchaseId}` } })).toBe(1)
        const owner = await tx.user.findFirstOrThrow({ where: { platformRole: 'ADMIN', status: 'ACTIVE', memberships: { some: { role: 'OWNER', status: 'ACTIVE', organization: { systemKey: 'WORKMATCHR_PLATFORM' } } } }, select: { id: true } })
        await rejectsDatabaseMutation(() => tx.financialRefund.create({ data: { purchaseId: raw.purchaseId, approvedByUserId: owner.id, reason: 'Ongeldige gedeeltelijke fixture', amountCents: 1, credits: 0, idempotencyKey: `invalid-${randomUUID()}` } }))
        await expect(requestAcademyRefund(user.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
        const acceptedRefund = { id: `re_${raw.purchaseId}`, status:'refunded' as const, amountValue:payment.amountValue, currency:'EUR', paymentId:payment.id }
        vi.mocked(gateway.createRefund).mockRejectedValueOnce(new Error('SYNTHETIC_RESPONSE_LOST'))
        gateway.findRefundByReference = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(acceptedRefund)
        await expect(requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)).rejects.toThrow('MOLLIE_REFUND_RECONCILIATION_REQUIRED')
        await expect(requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)).rejects.toThrow('MOLLIE_REFUND_RECONCILIATION_REQUIRED')
        await requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)
        expect(gateway.findRefundByReference).toHaveBeenCalledTimes(2)
        await requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)
        expect(gateway.createRefund).toHaveBeenCalledTimes(1)
        expect(await tx.financialRefund.count({ where: { purchaseId: raw.purchaseId } })).toBe(1)
        expect(await tx.financialInvoice.count({ where: { refund: { purchaseId: raw.purchaseId } } })).toBe(1)
        expect(await tx.learningAcademySeat.count({ where: { orderId: raw.id, status: 'REVOKED' } })).toBe(quantity)
        const seats = await tx.learningAcademySeat.findMany({ where: { orderId: raw.id, enrollmentId: { not: null } } })
        expect(await tx.learningEnrollment.count({ where: { id: { in: seats.map(s => s.enrollmentId!) }, accessRevokedAt: { not: null } } })).toBe(1)
        // Force deferred invoice and exact-seat-count constraints before rollback.
        await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE')
        if (!browserFixtures) throw rollback
      }, { timeout: 120_000 })
    } catch (error) { if (error !== rollback) throw error }
    if (!browserFixtures) expect(await preserved()).toEqual(before)
  }, 150_000)
})
