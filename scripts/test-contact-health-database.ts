import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { contactRetentionFixture } from './fixtures/contact-retention-database'
import type { PrismaClient } from '../src/generated/prisma/client'

registerHooks({ resolve(s, c, next) { if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }; return next(s, c) } })
const source = new URL(process.env.DATABASE_URL ?? '')
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(source.hostname) && !source.search)
assert.ok(['postgres:', 'postgresql:'].includes(source.protocol))
assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
const name = `workmatchr_contact_health_${randomUUID().replaceAll('-', '')}`
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'
const target = new URL(source); target.pathname = `/${name}`
const admin = new Client({ connectionString: adminUrl.href }); await admin.connect()
let sql: Client | undefined, db: PrismaClient | undefined, created = false, cases = 0
const check = (label: string) => { cases++; console.log(`PASS ${label}`) }
try {
  await admin.query(`CREATE DATABASE "${name}"`); created = true
  sql = new Client({ connectionString: target.href }); await sql.connect()
  await sql.query(contactRetentionFixture)
  // Only this disposable database: production service must succeed with read-only transactions.
  await admin.query(`ALTER DATABASE "${name}" SET default_transaction_read_only = on`)
  process.env.DATABASE_URL = target.href
  process.env.CONTACT_RETENTION_ENABLED = 'false'; process.env.CONTACT_OUTBOX_ENABLED = 'false'; process.env.CONTACT_FORM_ENABLED = 'false'
  const { getPrisma } = await import('../src/lib/prisma'); db = getPrisma()
  const { readContactHealth } = await import('../src/lib/contact/contact-health')
  assert.equal((await db.$queryRaw<{ default_transaction_read_only: string }[]>`SHOW default_transaction_read_only`)[0].default_transaction_read_only, 'on')
  const now = new Date('2026-11-01T12:00:00Z'), hour = 3_600_000, day = 24 * hour
  const before = (ms: number) => new Date(now.getTime() - ms)
  const insert = async (age: number, status = 'FAILED', attempts = 1, extra: { template?: string; code?: string; fingerprint?: string; lease?: Date; processed?: Date | null; recipient?: string } = {}) => {
    const id = randomUUID()
    await sql!.query(`INSERT INTO "NotificationOutbox" ("eventId", "idempotencyKey", "templateKey", "channel", "payload", "status", "attemptCount", "createdAt", "firstAttemptAt", "processedAt", "lastErrorCode", "deliveryFingerprint", "leaseUntil", "recipientUserId")
      VALUES ($1,$1,$2,'EMAIL','{"redacted":true}',$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, extra.template ?? 'CONTACT_MESSAGE', status, attempts, before(age + day), attempts ? before(age) : null,
      extra.processed === undefined ? before(age) : extra.processed, extra.code ?? null, extra.fingerprint ?? null, extra.lease ?? null, extra.recipient ?? null])
  }
  const reset = () => sql!.query('TRUNCATE "NotificationOutbox", "RateLimit"')
  assert.equal((await readContactHealth(now)).reviewRequired, 0); check('empty queue read-only, gates closed, no mail credentials')
  await insert(30 * day - hour - 1, 'SENT', 1)
  await insert(30 * day - hour, 'SENT', 1)
  await insert(30 * day - 1, 'SENT', 1)
  await insert(30 * day, 'SENT', 1, { lease: before(-hour) })
  let report = await readContactHealth(now)
  assert.equal(report.metadataDueSoon, 3); assert.equal(report.metadataOverdue, 1)
  check('one-hour lead and exact 30-day boundary include active lease; no deletion')
  await reset()
  for (const age of [day - hour - 1, day - hour, day - 1, day]) await sql.query('INSERT INTO "RateLimit" ("key","count","lastRequest") VALUES ($1,1,$2)', [`contact:${randomUUID()}`, now.getTime() - age])
  await sql.query('INSERT INTO "RateLimit" ("key","count","lastRequest") VALUES ($1,1,$2)', ['auth:synthetic', now.getTime() - 100 * day])
  report = await readContactHealth(now)
  assert.equal(report.countersDueSoon, 3); assert.equal(report.countersOverdue, 1)
  check('24-hour counter boundary and contact-only scope')
  await reset()
  for (const age of [day - 1, day, 3 * day - 1, 3 * day, 7 * day - 1, 7 * day]) await insert(age)
  report = await readContactHealth(now)
  assert.equal(report.reviewRequired, 6); assert.equal(report.triageDue, 5); assert.equal(report.escalationDue, 3); assert.equal(report.decisionDue, 1)
  check('exact 24h/72h/day7 reconciliation deadlines without timestamp renewal')
  await reset()
  await insert(day, 'PENDING', 1, { code: 'DELIVERY_RECONCILIATION_REQUIRED', processed: null })
  await insert(day, 'PROCESSING', 1, { fingerprint: 'a'.repeat(64), lease: now, processed: null })
  await insert(day, 'FAILED', 0) // Definitively never offered, not uncertain.
  await insert(day, 'PENDING', 1, { code: 'EMAIL_RATE_LIMITED', processed: null })
  await insert(day, 'FAILED', 1, { template: 'OTHER' })
  await insert(day, 'FAILED', 1, { recipient: randomUUID() })
  report = await readContactHealth(now); assert.equal(report.reviewRequired, 2)
  check('legacy uncertain retry/lost acknowledgement included; confirmed rejection and unrelated templates excluded')
  await reset()
  await insert(100 * day, 'SENT', 1); await insert(100 * day, 'FAILED', 1)
  await sql.query('INSERT INTO "RateLimit" ("key","count","lastRequest") VALUES ($1,1,$2)', ['contact:old', now.getTime() - 100 * day])
  const snapshot = async () => JSON.stringify([(await sql!.query('SELECT * FROM "NotificationOutbox" ORDER BY "id"')).rows, (await sql!.query('SELECT * FROM "RateLimit" ORDER BY "id"')).rows])
  const saved = await snapshot()
  const results = await Promise.all(Array.from({ length: 6 }, () => readContactHealth(now)))
  assert.ok(results.every(r => r.metadataOverdue === 1 && r.countersOverdue === 1 && r.decisionDue === 1))
  assert.equal(await snapshot(), saved)
  check('100-day scheduler gap and six concurrent observations preserve all records')
  await sql.query('ALTER TABLE "RateLimit" RENAME TO "UnavailableSyntheticCounters"')
  await assert.rejects(readContactHealth(now)); check('database failure is not reported as healthy')
  await sql.query('ALTER TABLE "UnavailableSyntheticCounters" RENAME TO "RateLimit"')
  assert.equal((await readContactHealth(now)).decisionDue, 1); assert.equal(await snapshot(), saved)
  check('recovery does not silently resolve uncertain provider acceptance')
  console.log(`CONTACT_HEALTH_DATABASE_PASS cases=${cases} externalCalls=0 migrations=0`)
} finally {
  await db?.$disconnect(); await sql?.end()
  if (created) {
    assert.match(name, /^workmatchr_contact_health_[a-f0-9]{32}$/)
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [name])
    await admin.query(`DROP DATABASE "${name}"`)
    console.log('CONTACT_HEALTH_TEST_DATABASE_REMOVED')
  }
  await admin.end()
}
