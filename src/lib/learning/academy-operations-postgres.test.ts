import { randomUUID, createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
const state = vi.hoisted(() => ({ db: null as PrismaClient | null }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => state.db }))
import { ACADEMY_FINAL_ACCEPTANCE_DATABASE } from './academy-database-policy'
import { readAcademyOperations } from './academy-operations'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
const enabled = process.env.ACADEMY_HARDENING_RUNTIME === '1'
const at = new Date('1901-01-02T00:00:00Z')
let db: PrismaClient
const ids: string[] = []
let before = ''
async function preserved() {
  const rows = await db.$queryRaw`SELECT 'cert' kind, md5(string_agg(row_to_json(t)::text,'' ORDER BY t.id)) h FROM "LearningCertificate" t UNION ALL SELECT 'exam',md5(string_agg(row_to_json(t)::text,'' ORDER BY t.id)) FROM "LearningExamAttempt" t UNION ALL SELECT 'account',md5(string_agg(row_to_json(t)::text,'' ORDER BY t.id)) FROM "Account" t UNION ALL SELECT 'audit',md5(string_agg(row_to_json(t)::text,'' ORDER BY t.id)) FROM "AdminActionLog" t`
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}
beforeAll(async () => {
  if (!enabled) return
  const url = new URL(process.env.DATABASE_URL ?? '')
  const target = process.env.ACADEMY_TEST_BRANCH_ID === ACADEMY_FINAL_ACCEPTANCE_DATABASE.branchId
    ? ACADEMY_FINAL_ACCEPTANCE_DATABASE
    : { branchId: 'branch-fixture-mute-credit', hostname: 'fixture-0167b18845.example.invalid' }
  if (process.env.NODE_ENV !== 'test' || process.env.VERCEL_ENV === 'production' || process.env.ACADEMY_TEST_PROJECT_ID !== 'academy-synthetic-project' || process.env.ACADEMY_TEST_BRANCH_ID !== target.branchId || url.hostname !== target.hostname || url.pathname !== '/neondb' || url.searchParams.get('sslmode') !== 'verify-full'
    || !['postgres:', 'postgresql:'].includes(url.protocol) || !['', '5432'].includes(url.port) || url.hash
    || decodeURIComponent(url.username) !== 'neondb_owner' || !url.password
    || url.searchParams.getAll('sslmode').length !== 1
    || [...url.searchParams.keys()].some(key => key !== 'sslmode')
    || process.env.RESEND_API_KEY || process.env.JORTT_CLIENT_SECRET) throw new Error('HARDENING_RUNTIME_TARGET_REFUSED')
  db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) }); state.db = db
  const identity = await db.$queryRaw<Array<{ database: string; major: number }>>`SELECT current_database() database,(current_setting('server_version_num')::int/10000)::int major`
  expect(identity).toEqual([{ database: 'neondb', major: 17 }]); before = await preserved()
  // Historical fixture clock isolates our claims from all existing 2026 outbox jobs.
  expect(await db.notificationOutbox.count({ where: { availableAt: { lte: at }, status: { in: ['PENDING', 'PROCESSING'] } } })).toBe(0)
}, 30_000)
afterAll(async () => {
  if (!db) return
  await db.notificationOutbox.deleteMany({ where: { id: { in: ids }, eventId: 'academy-hardening-fixture' } })
  expect(await preserved()).toBe(before); await db.$disconnect()
})
async function fixture(processing = false) {
  const id = randomUUID(); ids.push(id)
  return db.notificationOutbox.create({ data: { id, eventId: 'academy-hardening-fixture', channel: 'EMAIL', templateKey: 'LEARNING_RETENTION_WEEK_READY', payload: {}, idempotencyKey: `academy-hardening:${id}`, availableAt: new Date('1901-01-01T00:00:00Z'), ...(processing ? { status: 'PROCESSING', leaseToken: randomUUID(), leaseUntil: new Date('1901-01-01T00:00:00Z') } : {}) } })
}
const send = async () => { throw new Error('REAL_DELIVERY_FORBIDDEN') }
describe.skipIf(!enabled)('hardening on exact isolated PostgreSQL; no accounts or legal agreements created', () => {
  it('executes all aggregate monitoring SQL read-only without exposing records', async () => {
    const report = await readAcademyOperations(new Date('2027-10-29T12:00:00Z'))
    expect(Object.values(report.counts).every(n => Number.isSafeInteger(n) && n >= 0)).toBe(true)
    expect(JSON.stringify(report)).not.toMatch(/@|password|postgresql:|certificateNumber|userId|firstName|lastName/)
  })
  it('concurrent actual workers claim exactly once, fail closed on invalid recipient, and replay does not send', async () => {
    const job = await fixture()
    const reports = await Promise.all([deliverLearningRetentionEmails({ limit: 1, now: () => at, send }), deliverLearningRetentionEmails({ limit: 1, now: () => at, send })])
    expect(reports.reduce((n, r) => n + r.claimed, 0)).toBe(1)
    const saved = await db.notificationOutbox.findUniqueOrThrow({ where: { id: job.id }, select: { status: true, attemptCount: true, lastErrorCode: true } })
    expect(saved).toEqual({ status: 'FAILED', attemptCount: 1, lastErrorCode: 'DELIVERY_RECONCILIATION_REQUIRED' })
    expect((await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).claimed).toBe(0)
  })
  it('recovers an expired processing lease and enforces the unique intent key', async () => {
    const job = await fixture(true)
    expect((await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).claimed).toBe(1)
    await expect(db.notificationOutbox.create({ data: { eventId: 'academy-hardening-fixture', channel: 'EMAIL', templateKey: 'LEARNING_RETENTION_WEEK_READY', payload: {}, idempotencyKey: job.idempotencyKey } })).rejects.toMatchObject({ code: 'P2002' })
  })
})
