import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'
import { pendingMigrations } from './audit-d2c-preflight.mjs'
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
let migrationStage: string | undefined
let cases = 0
const check = (name: string) => { cases++; console.log(`PASS ${name}`) }
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  process.env.DATABASE_URL = testUrl.href
  const baseline = process.argv.includes('--baseline-85')
  const migrationRoot = path.resolve('prisma/migrations')
  const allMigrations = readdirSync(migrationRoot).filter(name => /^\d/.test(name)).sort()
  assert.equal(allMigrations.length, 93)
  const expectedMigrations = allMigrations.filter(name => !baseline || !pendingMigrations.includes(name))
  const migrateArgs = [process.env.npm_execpath!, 'run', 'db:deploy']
  if (baseline) {
    // Reconstruct the documented 85-migration state only in this newly created DB.
    // No resolve, fabricated registry entries or changes to repository migrations.
    assert.equal(expectedMigrations.length, 85)
    const stageRoot = path.resolve('.local-storage')
    mkdirSync(stageRoot, { recursive: true })
    migrationStage = mkdtempSync(path.join(stageRoot, 'contact-schema-'))
    mkdirSync(path.join(migrationStage, 'migrations'))
    copyFileSync('prisma/schema.prisma', path.join(migrationStage, 'schema.prisma'))
    copyFileSync(path.join(migrationRoot, 'migration_lock.toml'), path.join(migrationStage, 'migrations/migration_lock.toml'))
    for (const name of expectedMigrations) cpSync(path.join(migrationRoot, name), path.join(migrationStage, 'migrations', name), { recursive: true })
    writeFileSync(path.join(migrationStage, 'prisma.config.ts'), "import { defineConfig, env } from 'prisma/config'\nexport default defineConfig({schema:'schema.prisma',migrations:{path:'migrations'},datasource:{url:env('DATABASE_URL')}})\n")
    migrateArgs.push('--', '--config', path.join(migrationStage, 'prisma.config.ts'))
  }
  const migrate = () => {
    const result = spawnSync(process.execPath, migrateArgs, { env: process.env, encoding: 'utf8' })
    if (result.status !== 0) throw new Error('CONTACT_TEST_MIGRATION_FAILED')
  }
  migrate()
  sql = new Client({ connectionString: testUrl.href }); await sql.connect()
  const registry = await sql.query('SELECT id, migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')
  assert.deepEqual(registry.rows.map(row => row.migration_name), expectedMigrations)
  for (const row of registry.rows) {
    assert.ok(row.finished_at); assert.equal(row.rolled_back_at, null)
    assert.equal(row.checksum, createHash('sha256').update(readFileSync(path.join(migrationRoot, row.migration_name, 'migration.sql'))).digest('hex'))
  }
  migrate()
  assert.deepEqual((await sql.query('SELECT id, migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')).rows, registry.rows)
  check(`${expectedMigrations.length} exact migration checksums; repeated deploy changes no registry; no new schema`)
  process.env.CONTACT_MESSAGE_ENCRYPTION_KEY = randomBytes(32).toString('hex')
  process.env.CONTACT_EMAIL_TO = 'contact-acceptance@example.invalid'
  process.env.CONTACT_OUTBOX_ENABLED = 'true'
  const { getPrisma } = await import('../src/lib/prisma'); db = getPrisma()
  const freshClient = async () => {
    await db!.$disconnect()
    // Test a cold runtime connection without reusing a disposed PrismaPg pool.
    const cache = globalThis as unknown as { prisma?: PrismaClient; runtimePool?: unknown }
    delete cache.prisma; delete cache.runtimePool
    db = getPrisma()
  }
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
  // Real HTTP handler -> validation -> DB -> real SDK adapter, with fetch stubbed in-process.
  const { POST } = await import('../src/app/api/contact/route')
  const { sendAuthEmail } = await import('../src/lib/email')
  process.env.CONTACT_FORM_ENABLED = 'true'; process.env.BETTER_AUTH_URL = 'http://127.0.0.1:3071'
  process.env.RESEND_API_KEY = 'synthetic-not-a-provider-key'; process.env.AUTH_EMAIL_FROM = 'WorkMatchr <contact@example.invalid>'
  const httpPayload = payload()
  const request = () => new Request('http://127.0.0.1:3071/api/contact', { method: 'POST', headers: { origin: 'http://127.0.0.1:3071', 'content-type': 'application/json' }, body: JSON.stringify(httpPayload) })
  assert.equal((await POST(request())).status, 202); assert.equal((await POST(request())).status, 202)
  assert.equal(await db.notificationOutbox.count(), 1)
  const sdkRequests: string[] = []
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'https://api.resend.com/emails')
    const body = JSON.parse(String(init?.body)); assert.equal(body.to, 'contact-acceptance@example.invalid')
    assert.equal(body.subject, 'Algemene vraag | WorkMatchr'); assert.equal(body.text.includes(httpPayload.message), true)
    sdkRequests.push(new Headers(init?.headers).get('Idempotency-Key')!)
    return Response.json({ id: 'synthetic-sdk-accepted' })
  }
  assert.equal((await deliverContactEmails({ send: sendAuthEmail })).sent, 1)
  assert.deepEqual(sdkRequests, [`contact:${httpPayload.requestId}`])
  const httpSent = await db.notificationOutbox.findFirstOrThrow()
  assert.equal(httpSent.status, 'SENT'); assert.equal(httpSent.attemptCount, 1)
  assert.equal(httpSent.providerMessageId, 'synthetic-sdk-accepted'); assert.equal((httpSent.payload as { redacted: boolean }).redacted, true)
  globalThis.fetch = async () => { throw new Error('EXTERNAL_TRANSPORT_DISABLED') }
  delete process.env.RESEND_API_KEY
  await reset()
  check('real HTTP handler through encrypted PostgreSQL and Resend SDK with local fetch stub, one replay-safe delivery')

  // A provider may accept while its response is lost; timeout must not invent success.
  const timeoutJob = await enqueue()
  let lateResult!: (value: Awaited<ReturnType<typeof send>>) => void
  const started = performance.now()
  assert.equal((await deliverContactEmails({ send: async email => {
    const receipt = await send(email)
    return new Promise(resolve => { lateResult = () => resolve(receipt) })
  } })).retry, 1)
  const elapsed = performance.now() - started
  assert.ok(elapsed >= 8_000 && elapsed < 15_000)
  let timeoutState = await db.notificationOutbox.findUniqueOrThrow({ where: { id: timeoutJob.id } })
  assert.equal(timeoutState.status, 'PENDING'); assert.equal(timeoutState.lastErrorCode, 'EMAIL_PROVIDER_UNAVAILABLE')
  lateResult({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'ignored' })
  await new Promise(resolve => setImmediate(resolve))
  timeoutState = await db.notificationOutbox.findUniqueOrThrow({ where: { id: timeoutJob.id } })
  assert.equal(timeoutState.status, 'PENDING')
  assert.equal((await deliverContactEmails({ send, now: () => new Date(Date.now() + 15 * 60_000) })).sent, 1)
  assert.equal(calls.length, 2); assert.equal(accepted.size, 1)
  assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey)
  console.log(`CONTACT_TIMEOUT elapsed_ms=${Math.round(elapsed)}; attempts=2; provider_acceptances=1`)
  await reset()
  check('real PostgreSQL timeout, late response and retry retain one provider acceptance')

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

  await reset(); const preserved = await enqueue(); const unavailablePayload = payload()
  const beforeOutage = await db.notificationOutbox.findUniqueOrThrow({ where: { id: preserved.id } })
  await sql.end(); sql = undefined; await freshClient()
  process.env.RESEND_API_KEY = 'synthetic-not-a-provider-key'
  const { contactFormEnabled } = await import('../src/lib/contact/contact-configuration')
  assert.equal(contactFormEnabled(), true)
  // A real connection refusal, confined to this harness's generated database.
  await admin.query(`ALTER DATABASE "${databaseName}" ALLOW_CONNECTIONS false`)
  try {
    const response = await POST(new Request('http://127.0.0.1:3071/api/contact', { method: 'POST', headers: { origin: 'http://127.0.0.1:3071', 'content-type': 'application/json' }, body: JSON.stringify(unavailablePayload) }))
    assert.equal(response.status, 503); assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), (await import('../src/lib/contact/contact-service')).unavailable().body)
    await assert.rejects(deliverContactEmails({ send }))
    assert.equal(calls.length, 0)
  } finally {
    await admin.query(`ALTER DATABASE "${databaseName}" ALLOW_CONNECTIONS true`)
    await freshClient()
    sql = new Client({ connectionString: testUrl.href }); await sql.connect()
    delete process.env.RESEND_API_KEY
  }
  assert.deepEqual(await db.notificationOutbox.findUniqueOrThrow({ where: { id: preserved.id } }), beforeOutage)
  assert.equal(await db.notificationOutbox.count(), 1)
  assert.equal((await submitContact(unavailablePayload, 'recovered')).status, 202)
  assert.equal((await submitContact(unavailablePayload, 'recovered')).status, 202)
  assert.equal((await deliverContactEmails({ send })).sent, 2)
  assert.equal(accepted.size, 2)
  check('real database outage: generic HTTP503, no provider call or data loss, same request recovers once')

  await reset(); const interrupted = await enqueue()
  await sql.query(`CREATE FUNCTION test_contact_worker() RETURNS trigger LANGUAGE plpgsql AS $test$ BEGIN IF NEW."deliveryFingerprint" IS NOT NULL THEN RAISE EXCEPTION 'synthetic worker interruption'; END IF; RETURN NEW; END $test$; CREATE TRIGGER test_contact_worker BEFORE UPDATE ON "NotificationOutbox" FOR EACH ROW EXECUTE FUNCTION test_contact_worker()`)
  await assert.rejects(deliverContactEmails({ send }))
  const interruptedState = await db.notificationOutbox.findUniqueOrThrow({ where: { id: interrupted.id } })
  assert.equal(interruptedState.status, 'PROCESSING'); assert.equal(interruptedState.attemptCount, 1)
  assert.equal(calls.length, 0); assert.ok((interruptedState.payload as { ciphertext?: string }).ciphertext)
  await sql.query('DROP TRIGGER test_contact_worker ON "NotificationOutbox"; DROP FUNCTION test_contact_worker()')
  assert.equal((await deliverContactEmails({ send })).claimed, 0)
  assert.equal((await deliverContactEmails({ send, now: () => new Date(Date.now() + 6 * 60_000) })).sent, 1)
  assert.equal(calls.length, 1); assert.equal(accepted.size, 1)
  check('worker interruption after claim: active lease retained, expired lease resumes exactly once')

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
  check('retention removes ciphertext; worker default-off cannot send')
  process.env.CONTACT_OUTBOX_ENABLED = 'true'
  await reset()
  const expiredClosed = await enqueue(), unexpiredClosed = await enqueue(), leasedClosed = await enqueue()
  const cleanupNow = new Date(), old = new Date(cleanupNow.getTime() - 8 * 86400000)
  await db.notificationOutbox.update({ where: { id: expiredClosed.id }, data: { createdAt: old } })
  await db.notificationOutbox.update({ where: { id: leasedClosed.id }, data: { createdAt: old, status: 'PROCESSING', leaseUntil: new Date(cleanupNow.getTime() + 60000) } })
  const keyBeforeCleanup = process.env.CONTACT_MESSAGE_ENCRYPTION_KEY
  process.env.CONTACT_OUTBOX_ENABLED = 'false'; delete process.env.CONTACT_MESSAGE_ENCRYPTION_KEY
  const purges = await Promise.all([deliverContactEmails({ now: () => cleanupNow, send }), deliverContactEmails({ now: () => cleanupNow, send })])
  assert.equal(purges.reduce((sum, report) => sum + report.redacted, 0), 1)
  assert.equal(purges.reduce((sum, report) => sum + report.claimed, 0), 0); assert.equal(calls.length, 0)
  const closedTombstone = await db.notificationOutbox.findUniqueOrThrow({ where: { id: expiredClosed.id } })
  assert.equal(closedTombstone.status, 'FAILED'); assert.equal(closedTombstone.lastErrorCode, 'CONTACT_RETENTION_EXPIRED')
  assert.equal(closedTombstone.attemptCount, 0); assert.deepEqual(Object.keys(closedTombstone.payload as object).sort(), ['digest', 'redacted'])
  for (const id of [unexpiredClosed.id, leasedClosed.id]) {
    assert.ok('ciphertext' in ((await db.notificationOutbox.findUniqueOrThrow({ where: { id } })).payload as object))
  }
  assert.equal((await deliverContactEmails({ now: () => new Date(cleanupNow.getTime() + 60001), send })).redacted, 1)
  assert.equal(calls.length, 0)
  process.env.CONTACT_MESSAGE_ENCRYPTION_KEY = keyBeforeCleanup
  check('closed delivery and missing key: concurrent retention, active lease protection and later cleanup; no mail')
  console.log(`CONTACT_DATABASE_PASS cases=${cases}; real provider calls=0`)
} finally {
  await sql?.end(); await db?.$disconnect()
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
  await admin.end()
  if (migrationStage) {
    assert.equal(path.dirname(migrationStage), path.resolve('.local-storage'))
    assert.ok(path.basename(migrationStage).startsWith('contact-schema-'))
    rmSync(migrationStage, { recursive: true })
  }
  console.log('CONTACT_TEST_DATABASE_REMOVED')
}
