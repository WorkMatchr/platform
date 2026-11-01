import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { Client } from 'pg'
import type { PrismaClient } from '../../src/generated/prisma/client'
import { cleanContactRetention } from '../../src/lib/contact/contact-retention'
import { submitContact } from '../../src/lib/contact/contact-service'
import { deliverContactEmails } from '../../src/lib/contact/contact-email-worker'
import { issueContactRequest } from '../../src/lib/contact/contact-request-token'
import { contactDigest } from '../../src/lib/contact/contact-envelope'
import { CONTACT_METADATA_RETENTION_MS, CONTACT_RATE_LIMIT_RETENTION_MS } from '../../src/lib/contact/contact-configuration'

export async function contactRetentionChecks(db: PrismaClient, sql: Client, check: (name: string) => void) {
  const now = new Date(), day = 86400000, cutoff = new Date(now.getTime() - CONTACT_METADATA_RETENTION_MS)
  const reset = async () => { await db.notificationOutbox.deleteMany(); await db.rateLimit.deleteMany() }
  const row = (extra = {}) => ({ eventId: randomUUID(), idempotencyKey: `contact:${randomUUID()}`, channel: 'EMAIL', templateKey: 'CONTACT_MESSAGE',
    payload: { redacted: true, digest: 'synthetic' }, status: 'SENT' as const, createdAt: new Date(cutoff.getTime() - day), processedAt: cutoff, ...extra })
  const counter = (key: string, age: number) => ({ key, count: 1, lastRequest: BigInt(now.getTime() - age) })
  await reset()
  const exact = await db.notificationOutbox.create({ data: row() })
  const fresh = await db.notificationOutbox.create({ data: row({ processedAt: new Date(cutoff.getTime() + 1) }) })
  const unsent = await db.notificationOutbox.create({ data: row({ status: 'FAILED', attemptCount: 0 }) })
  const other = await db.notificationOutbox.create({ data: row({ templateKey: 'MARKETPLACE_INVITATION' }) })
  const pending = await db.notificationOutbox.create({ data: row({ status: 'PENDING', processedAt: null, createdAt: now }) })
  const active = await db.notificationOutbox.create({ data: row({ leaseUntil: new Date(now.getTime() + 60_000) }) })
  const uncertain = await db.notificationOutbox.create({ data: row({ status: 'FAILED', attemptCount: 5, lastErrorCode: 'DELIVERY_RECONCILIATION_REQUIRED' }) })
  const missingDate = await db.notificationOutbox.create({ data: row({ processedAt: null }) })
  const inconsistent = await db.notificationOutbox.create({ data: row({ processedAt: new Date(0) }) })
  await db.rateLimit.createMany({ data: [counter('contact:exact', CONTACT_RATE_LIMIT_RETENTION_MS),
    counter('contact:fresh', CONTACT_RATE_LIMIT_RETENTION_MS - 1), counter('contact:old', 100 * day), counter('auth:keep', 100 * day)] })
  delete process.env.CONTACT_RETENTION_ENABLED
  const closed = await cleanContactRetention(now)
  assert.equal(closed.enabled, false); assert.equal(closed.metadataDeleted, 0); assert.equal(closed.countersDeleted, 0)
  process.env.CONTACT_RETENTION_ENABLED = 'true'
  const before = await cleanContactRetention(new Date(now.getTime() - 1))
  assert.equal(before.metadataDeleted, 0); assert.equal(before.countersDeleted, 1)
  const concurrent = await Promise.all(Array.from({ length: 6 }, () => cleanContactRetention(now)))
  assert.equal(concurrent.reduce((sum, r) => sum + r.metadataDeleted, 0), 2)
  assert.equal(concurrent.reduce((sum, r) => sum + r.countersDeleted, 0), 1)
  assert.equal(await db.notificationOutbox.count({ where: { id: { in: [exact.id, unsent.id] } } }), 0)
  assert.equal(await db.notificationOutbox.count({ where: { id: { in: [fresh.id, other.id, pending.id, active.id, uncertain.id, missingDate.id, inconsistent.id] } } }), 7)
  assert.deepEqual((await db.rateLimit.findMany({ orderBy: { key: 'asc' } })).map(r => r.key), ['auth:keep', 'contact:fresh'])
  assert.equal((await cleanContactRetention(now)).reviewRequired, 4)
  check('exact 30d/24h boundaries, six concurrent cleanups, other templates/auth counters and active/unresolved records protected')

  await reset()
  await db.notificationOutbox.createMany({ data: Array.from({ length: 205 }, () => row()) })
  await db.rateLimit.createMany({ data: Array.from({ length: 1005 }, (_, i) => counter(`contact:backlog:${i}`, 100 * day)) })
  const oldQueued = await db.notificationOutbox.create({ data: row({ status: 'PENDING', payload: { ciphertext: 'synthetic', digest: 'synthetic' }, createdAt: new Date(now.getTime() - 100 * day), processedAt: null }) })
  const previousKey = process.env.CONTACT_MESSAGE_ENCRYPTION_KEY
  delete process.env.CONTACT_MESSAGE_ENCRYPTION_KEY
  process.env.CONTACT_OUTBOX_ENABLED = 'false'; process.env.CONTACT_FORM_ENABLED = 'false'
  let mailCalls = 0, deleted = 0, counters = 0, batches = 0
  for (;;) {
    const report = await deliverContactEmails({ now: () => now, send: async () => { mailCalls++; throw new Error('NO_MAIL_ALLOWED') } })
    deleted += report.retention.metadataDeleted; counters += report.retention.countersDeleted; batches++
    if (!report.retention.pending) break
    assert.ok(batches < 5)
  }
  assert.equal(deleted, 206); assert.equal(counters, 1005); assert.equal(batches, 3); assert.equal(mailCalls, 0)
  assert.equal(await db.notificationOutbox.findUnique({ where: { id: oldQueued.id } }), null)
  assert.equal((await cleanContactRetention(now)).metadataDeleted, 0)
  process.env.CONTACT_MESSAGE_ENCRYPTION_KEY = previousKey
  check('100-day scheduler interruption catches up in three batches with both gates closed and no key; second cleanup idempotent')

  await reset()
  await db.notificationOutbox.create({ data: row() })
  await db.rateLimit.create({ data: counter('contact:rollback', 2 * day) })
  await sql.query(`CREATE FUNCTION test_retention_failure() RETURNS trigger LANGUAGE plpgsql AS $test$ BEGIN RAISE EXCEPTION 'synthetic retention failure'; END $test$;
    CREATE TRIGGER test_retention_failure BEFORE DELETE ON "RateLimit" FOR EACH ROW EXECUTE FUNCTION test_retention_failure()`)
  await assert.rejects(cleanContactRetention(now))
  assert.equal(await db.notificationOutbox.count(), 1); assert.equal(await db.rateLimit.count(), 1)
  await sql.query('DROP TRIGGER test_retention_failure ON "RateLimit"; DROP FUNCTION test_retention_failure()')
  assert.equal((await cleanContactRetention(now)).metadataDeleted, 1)
  check('injected cleanup failure rolls back all deletions; next run recovers')

  await reset()
  await db.rateLimit.create({ data: counter('contact:renew', 2 * day) })
  await sql.query('BEGIN; SELECT pg_advisory_xact_lock(310034)')
  try {
    await sql.query('UPDATE "RateLimit" SET "lastRequest" = $1 WHERE "key" = $2', [now.getTime(), 'contact:renew'])
    assert.equal((await cleanContactRetention(now)).pending, true)
  } finally { await sql.query('COMMIT') }
  assert.equal((await cleanContactRetention(now)).countersDeleted, 0)
  check('counter renewal/admission lock wins safely over concurrent cleanup; no quota reset')

  await reset()
  const key = Buffer.from(previousKey!, 'hex'), start = Date.now()
  const content = { name: 'Synthetic', email: 'retention@example.invalid', subject: 'GENERAL' as const, message: 'Een synthetische retentietest.' }
  const requestId = issueContactRequest(key, start), payload = { ...content, requestId }
  assert.equal((await submitContact(payload, 'synthetic')).status, 202)
  const entry = await db.notificationOutbox.findFirstOrThrow()
  const finished = new Date(start + 1000)
  await db.notificationOutbox.update({ where: { id: entry.id }, data: { status: 'SENT', processedAt: finished, payload: { digest: (entry.payload as { digest: string }).digest, redacted: true } } })
  const purgeAt = new Date(finished.getTime() + CONTACT_METADATA_RETENTION_MS)
  const actualNow = Date.now
  Date.now = () => purgeAt.getTime()
  try {
    assert.equal((await submitContact(payload, 'synthetic')).status, 202)
    const races = await Promise.all([cleanContactRetention(purgeAt), ...Array.from({ length: 10 }, () => submitContact(payload, 'synthetic'))])
    assert.ok(races.slice(1).every(r => 'status' in r && [202, 410, 429].includes(r.status)))
    await cleanContactRetention(purgeAt)
    assert.equal((await submitContact(payload, 'synthetic')).status, 410)
    assert.equal(await db.notificationOutbox.count(), 0)
    assert.equal((await submitContact({ ...payload, requestId: issueContactRequest(key, purgeAt.getTime() - day) }, 'synthetic')).status, 410)
    assert.equal(await db.rateLimit.count(), 0)
  } finally { Date.now = actualNow }
  check('real admission/purge race; exact old signed request cannot resend after physical deletion, even at the 24h boundary')

  const legacy = randomUUID(), legacyPayload = { ...content, requestId: legacy }
  const recipient = process.env.CONTACT_EMAIL_TO!
  await db.notificationOutbox.create({ data: row({ idempotencyKey: `contact:${legacy}`, payload: { digest: contactDigest({ ...content, recipient }, key), redacted: true } }) })
  assert.equal((await submitContact(legacyPayload, 'synthetic')).status, 202)
  await cleanContactRetention(now)
  assert.equal((await submitContact(legacyPayload, 'synthetic')).status, 410)
  assert.equal((await submitContact({ ...legacyPayload, requestId: randomUUID() }, 'synthetic')).status, 410)
  assert.equal(await db.notificationOutbox.count(), 0)
  check('legacy UUID lookup preserved while retained; deleted and new unsigned UUIDs fail closed without tombstones')
  await reset()
}
