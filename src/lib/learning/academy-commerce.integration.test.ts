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
  vi.stubEnv('MOLLIE_API_KEY', 'test_runtime_fake_no_delivery')
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  await identity()
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
        const courseCode = process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true' ? 'WL-991' : 'WL-001'
        if (process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true') {
          const course = await tx.learningCourse.findUniqueOrThrow({where:{code:courseCode}})
          const old = await tx.learningAcademyPriceVersion.findFirstOrThrow({where:{courseId:course.id},orderBy:{revision:'desc'}})
          const {id,createdAt,...values}=old;void id;void createdAt
          await tx.learningAcademyPriceVersion.create({data:{...values,revision:old.revision+1,individualCents:14900,fiveCents:59500}})
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
        const paid = { ...payment, status: 'paid' as const, paidAt: new Date().toISOString() }
        await processAcademyMolliePayment(paid); await processAcademyMolliePayment(paid)
        expect(await tx.financialInvoice.count({ where: { purchaseId: raw.purchaseId } })).toBe(1)
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
        await requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)
        await requestAcademyRefund(owner.id, raw.purchaseId, 'Fictieve terugbetalingsproef', gateway)
        expect(gateway.createRefund).toHaveBeenCalledTimes(1)
        expect(await tx.financialRefund.count({ where: { purchaseId: raw.purchaseId } })).toBe(1)
        expect(await tx.financialInvoice.count({ where: { refund: { purchaseId: raw.purchaseId } } })).toBe(1)
        expect(await tx.learningAcademySeat.count({ where: { orderId: raw.id, status: 'REVOKED' } })).toBe(quantity)
        const seats = await tx.learningAcademySeat.findMany({ where: { orderId: raw.id, enrollmentId: { not: null } } })
        expect(await tx.learningEnrollment.count({ where: { id: { in: seats.map(s => s.enrollmentId!) }, accessRevokedAt: { not: null } } })).toBe(1)
        // Force deferred invoice and exact-seat-count constraints before rollback.
        await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE')
        throw rollback
      }, { timeout: 120_000 })
    } catch (error) { if (error !== rollback) throw error }
    expect(await preserved()).toEqual(before)
  }, 150_000)
})
