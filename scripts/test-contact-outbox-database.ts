import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import type { PrismaClient } from '../src/generated/prisma/client'
import type { AuthEmail } from '../src/lib/email'

registerHooks({ resolve(s, c, next) { if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }; return next(s, c) } })
const source = new URL(process.env.DATABASE_URL ?? '')
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(source.hostname))
assert.ok(!source.search && ['postgres:', 'postgresql:'].includes(source.protocol))
assert.ok(!process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY && !process.env.JORTT_CLIENT_SECRET)
globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
const databaseName = `workmatchr_contact_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`
const admin = new Client({ connectionString: adminUrl.href })
await admin.connect()
let db: PrismaClient | undefined, sql: Client | undefined
let cases = 0
const check = (name: string) => { cases++; console.log(`PASS ${name}`) }
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  process.env.DATABASE_URL = testUrl.href
  const migration = spawnSync(process.execPath, [process.env.npm_execpath!, 'run', 'db:deploy'], { env: process.env, encoding: 'utf8' })
  if (migration.status !== 0) throw new Error('CONTACT_TEST_MIGRATION_FAILED')
  sql = new Client({ connectionString: testUrl.href }); await sql.connect()
  const registry = await sql.query('SELECT count(*)::int AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
  assert.equal(registry.rows[0].n, 93); check('93 existing migrations; no new schema')
  process.env.CONTACT_MESSAGE_ENCRYPTION_KEY = randomBytes(32).toString('hex')
  process.env.CONTACT_EMAIL_TO = 'contact-acceptance@example.invalid'
  process.env.CONTACT_OUTBOX_ENABLED = 'true'
  const { getPrisma } = await import('../src/lib/prisma'); db = getPrisma()
  const { submitContact } = await import('../src/lib/contact/contact-service')
  const { deliverContactEmails } = await import('../src/lib/contact/contact-email-worker')
  const { AuthEmailDeliveryError } = await import('../src/lib/email')
  const payload = (extra = {}) => ({ name: 'Synthetic Contact', email: `${randomUUID()}@example.invalid`, subject: 'GENERAL', message: 'Een uitsluitend synthetisch testbericht.', requestId: randomUUID(), ...extra })
  const accepted = new Map<string, string>(), calls: AuthEmail[] = []
  const send = async (email: AuthEmail) => {
    assert.equal(email.to, process.env.CONTACT_EMAIL_TO); calls.push(email)
    if (!accepted.has(email.idempotencyKey!)) accepted.set(email.idempotencyKey!, randomUUID())
    return { accepted: true as const, transport: 'RESEND' as const, status: 'ACCEPTED' as const, messageId: accepted.get(email.idempotencyKey!)! }
  }
  const reset = async () => { await db!.notificationOutbox.deleteMany(); await db!.rateLimit.deleteMany({ where: { key: { startsWith: 'contact:' } } }); calls.length = 0; accepted.clear() }
  const enqueue = async () => { const p = payload(); assert.equal((await submitContact(p, randomUUID())).status, 202); return (await db!.notificationOutbox.findUniqueOrThrow({ where: { idempotencyKey: `contact:${p.requestId}` } })) }
  assert.equal((await submitContact(payload({ website: 'bot' }), 'ip')).status, 400)
  assert.equal((await submitContact(payload({ email: 'bad' }), 'ip')).status, 400)
  assert.equal(await db.notificationOutbox.count(), 0); assert.equal(await db.rateLimit.count(), 0)
  check('invalid/honeypot has no outbox or quota effects')

  const same = payload(), race = await Promise.all(Array.from({ length: 12 }, () => submitContact(same, 'same-ip')))
  assert.ok(race.every(r => r.status === 202 || r.status === 429))
  assert.equal(await db.notificationOutbox.count(), 1)
  assert.equal((await submitContact(same, 'same-ip')).status, 202)
  assert.equal((await submitContact({ ...same, message: 'Een ander synthetisch bericht.' }, 'same-ip')).status, 409)
  assert.equal((await db.rateLimit.findUniqueOrThrow({ where: { key: 'contact:global' } })).count, 1)
  const sealed = await db.notificationOutbox.findFirstOrThrow()
  assert.ok(!JSON.stringify(sealed.payload).includes(same.email))
  check('concurrent replay exact one durable encrypted outbox + atomic quota + conflict')

  await db.notificationOutbox.create({ data: { eventId: randomUUID(), channel: 'EMAIL', templateKey: 'MARKETPLACE_INVITATION', payload: {}, idempotencyKey: randomUUID() } })
  await Promise.all([deliverContactEmails({ send }), deliverContactEmails({ send })])
  assert.equal(calls.length, 1); assert.equal(accepted.size, 1)
  const sent = await db.notificationOutbox.findUniqueOrThrow({ where: { id: sealed.id } })
  assert.equal(sent.status, 'SENT'); assert.equal(sent.attemptCount, 1); assert.ok(!(sent.payload as object).hasOwnProperty('ciphertext'))
  assert.equal((await submitContact(same, 'same-ip')).status, 202)
  assert.equal(await db.notificationOutbox.count({ where: { templateKey: 'MARKETPLACE_INVITATION', status: 'PENDING' } }), 1)
  check('concurrent dispatch once, SENT redacted, other templates untouched')

  await reset()
  await sql.query('BEGIN'); await sql.query('SELECT pg_advisory_xact_lock(310034)')
  const timings: number[] = []
  const busy = await Promise.all(Array.from({ length: 45 }, async () => { const t = performance.now(); const r = await submitContact(payload(), randomUUID()); timings.push(performance.now() - t); return r }))
  await sql.query('ROLLBACK')
  assert.equal(busy.filter(r => r.status === 429).length, 45); assert.equal(await db.notificationOutbox.count(), 0)
  timings.sort((a, b) => a - b); console.log(`BURST held-lock 45/45=429; 503=0; p95_ms=${timings[42].toFixed(1)}`)
  const peak = await Promise.all(Array.from({ length: 45 }, () => submitContact(payload(), randomUUID())))
  assert.ok(peak.every(r => r.status === 202 || r.status === 429))
  const admitted = peak.filter(r => r.status === 202).length
  assert.ok(admitted > 0 && admitted <= 30)
  assert.equal(await db.notificationOutbox.count(), admitted)
  console.log(`BURST unlocked 45: accepted=${admitted}, rejected=${45 - admitted}, 503=0`)
  await reset()
  for (let i = 0; i < 30; i++) assert.equal((await submitContact(payload(), randomUUID())).status, 202)
  assert.equal((await submitContact(payload(), randomUUID())).status, 429)
  check('45-request lock pressure fail-closed, recovery and exact global quota')

  await reset()
  for (let i = 0; i < 5; i++) assert.equal((await submitContact(payload(), 'same-ip')).status, 202)
  assert.equal((await submitContact(payload(), 'same-ip')).status, 429)
  await reset()
  for (let i = 0; i < 3; i++) assert.equal((await submitContact(payload({ email: 'repeat@example.invalid' }), randomUUID())).status, 202)
  assert.equal((await submitContact(payload({ email: 'repeat@example.invalid' }), randomUUID())).status, 429)
  check('exact IP and email quotas')

  await reset()
  await sql.query(`CREATE FUNCTION test_contact_fail() RETURNS trigger LANGUAGE plpgsql AS $test$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $test$; CREATE TRIGGER test_contact_fail BEFORE INSERT ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION test_contact_fail()`)
  assert.equal((await submitContact(payload(), 'ip')).status, 503)
  assert.equal(await db.rateLimit.count(), 0); assert.equal(await db.notificationOutbox.count(), 0)
  await sql.query('DROP TRIGGER test_contact_fail ON "NotificationOutbox"; DROP FUNCTION test_contact_fail()')
  check('enqueue fault rolls back quotas and no receipt is promised')

  await reset(); const retry = await enqueue()
  assert.equal((await deliverContactEmails({ send: async () => { throw new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'not logged') } })).retry, 1)
  const later = new Date(Date.now() + 15 * 60_000)
  assert.equal((await deliverContactEmails({ send, now: () => later })).sent, 1)
  assert.equal((await db.notificationOutbox.findUniqueOrThrow({ where: { id: retry.id } })).attemptCount, 2)
  check('missed run catches up with same provider idempotency key')

  await reset(); const ack = await enqueue()
  await sql.query(`CREATE FUNCTION test_contact_ack() RETURNS trigger LANGUAGE plpgsql AS $test$ BEGIN IF NEW."status"='SENT' THEN RAISE EXCEPTION 'synthetic acknowledgement failure'; END IF; RETURN NEW; END $test$; CREATE TRIGGER test_contact_ack BEFORE UPDATE ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION test_contact_ack()`)
  await assert.rejects(deliverContactEmails({ send }), /DELIVERY_ACKNOWLEDGEMENT_FAILED/)
  assert.equal((await db.notificationOutbox.findUniqueOrThrow({ where: { id: ack.id } })).status, 'PROCESSING')
  await sql.query('DROP TRIGGER test_contact_ack ON "NotificationOutbox"; DROP FUNCTION test_contact_ack()')
  assert.equal((await deliverContactEmails({ send, now: () => new Date(Date.now() + 6 * 60_000) })).sent, 1)
  assert.equal(calls.length, 2); assert.equal(accepted.size, 1); assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey)
  check('lost acknowledgement recovers via expired lease without second provider acceptance')

  await reset(); const uncertain = await enqueue()
  await db.notificationOutbox.update({ where: { id: uncertain.id }, data: { status: 'PROCESSING', leaseUntil: new Date(0), firstAttemptAt: new Date(Date.now() - 24 * 3600000) } })
  assert.equal((await deliverContactEmails({ send })).failed, 1); assert.equal(calls.length, 0)
  check('provider idempotency window exceeded: no unsafe resend')

  await reset(); const exhausted = await enqueue()
  await db.notificationOutbox.update({ where: { id: exhausted.id }, data: { attemptCount: 4 } })
  assert.equal((await deliverContactEmails({ send: async () => { throw new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'private') } })).failed, 1)
  assert.equal((await db.notificationOutbox.findUniqueOrThrow({ where: { id: exhausted.id } })).attemptCount, 5)
  check('bounded attempts and generic failure code')

  await reset(); await enqueue()
  process.env.CONTACT_EMAIL_TO = 'other@example.invalid'
  assert.equal((await deliverContactEmails({ send })).failed, 1); assert.equal(calls.length, 0)
  process.env.CONTACT_EMAIL_TO = 'contact-acceptance@example.invalid'
  check('recipient changes cannot redirect queued contact messages')

  await reset(); const corrupt = await enqueue()
  await db.notificationOutbox.update({ where: { id: corrupt.id }, data: { payload: { ciphertext: 'broken' } } })
  assert.equal((await deliverContactEmails({ send })).failed, 1); assert.equal(calls.length, 0)
  check('invalid ciphertext never sent')

  await reset(); await enqueue()
  assert.equal((await deliverContactEmails({ send: async () => ({ accepted: true, transport: 'DEVELOPMENT_LOG', status: 'DEVELOPMENT_ONLY', messageId: 'fake' }) })).failed, 1)
  check('development logging cannot claim provider acceptance')

  await reset(); const expired = await enqueue()
  await db.notificationOutbox.update({ where: { id: expired.id }, data: { createdAt: new Date(Date.now() - 8 * 86400000) } })
  const purge = await deliverContactEmails({ send })
  assert.equal(purge.redacted, 1); assert.equal(calls.length, 0)
  const tombstone = await db.notificationOutbox.findUniqueOrThrow({ where: { id: expired.id } })
  assert.equal(tombstone.status, 'FAILED'); assert.deepEqual(Object.keys(tombstone.payload as object).sort(), ['digest', 'redacted'])
  await reset(); const future = await enqueue()
  await db.notificationOutbox.update({ where: { id: future.id }, data: { availableAt: new Date(Date.now() + 3600000) } })
  assert.equal((await deliverContactEmails({ send })).claimed, 0)
  await db.notificationOutbox.update({ where: { id: future.id }, data: { status: 'PROCESSING', createdAt: new Date(Date.now() - 8 * 86400000), leaseUntil: new Date(Date.now() + 3600000) } })
  const activeLease = await deliverContactEmails({ send })
  assert.equal(activeLease.claimed, 0); assert.equal(activeLease.redacted, 0)
  assert.ok((await db.notificationOutbox.findUniqueOrThrow({ where: { id: future.id } })).payload)
  check('future due time and active leases prevent premature send or purge')
  process.env.CONTACT_OUTBOX_ENABLED = 'false'
  assert.equal((await deliverContactEmails({ send })).claimed, 0)
  check('retention removes ciphertext; worker default-off is inert')
  console.log(`CONTACT_DATABASE_PASS cases=${cases}; real provider calls=0`)
} finally {
  await sql?.end(); await db?.$disconnect()
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  await admin.end()
  console.log('CONTACT_TEST_DATABASE_REMOVED')
}
