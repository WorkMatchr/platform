import assert from 'node:assert/strict'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { Client } from 'pg'
import type { AuthEmail, AuthEmailDeliveryResult } from '../src/lib/email'

// Never load .env or use an existing database for fixtures. Explicit local test acknowledgement required.
const source = new URL(process.env.DATABASE_URL ?? '')
assert.equal(process.env.CONTACT_DATABASE_TEST_ACK, 'isolated-local', 'Explicit isolated-local acknowledgement required')
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(source.hostname), 'Local PostgreSQL required')
const databaseName = `workmatchr_contact_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'; adminUrl.search = ''
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`; testUrl.search = '?application_name=a06-contact-test'
const admin = new Client({ connectionString: adminUrl.href })
await admin.connect()
let created = false
let db: ReturnType<typeof import('../src/lib/prisma').getPrisma> | undefined
let passed = 0
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true
  process.env.DATABASE_URL = testUrl.href
  process.env.RESEND_API_KEY = ''
  process.env.AUTH_EMAIL_FROM = ''
  const targeted = process.argv.includes('--rate-limit-only')
  if (targeted) {
    // Explicit focused fixture, not a full migration acceptance or a forged registry.
    // These unchanged source migrations own RateLimit; later migrations do not alter it.
    const fixture = new Client({ connectionString: testUrl.href })
    await fixture.connect()
    try {
      for (const name of ['20260712132604_init', '20260712165804_add_authentication']) {
        await fixture.query(readFileSync(`prisma/migrations/${name}/migration.sql`, 'utf8'))
      }
    } finally { await fixture.end() }
    console.log('Focused RateLimit fixture: 2 original SQL migrations executed; no migration registry fabricated')
  } else {
    const require = createRequire(import.meta.url)
    const migration = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
    assert.equal(migration.status, 0, 'Full migration deploy failed; inspect existing migration baseline separately; no registry altered')
  }
  const { getPrisma } = await import('../src/lib/prisma')
  const { reserveContactAttempt } = await import('../src/lib/contact/contact-rate-limit')
  const { submitContact } = await import('../src/lib/contact/contact-service')
  db = getPrisma()
  if (!targeted) {
    const registry = await db.$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name`
    const local = readdirSync('prisma/migrations').filter(name => existsSync(`prisma/migrations/${name}/migration.sql`)).sort()
    assert.deepEqual(registry.map(row => row.migration_name), local)
    assert.ok(registry.every(row => row.finished_at && !row.rolled_back_at))
    console.log(`Migrations: ${registry.length}/${local.length}; failed=0; unexpected=0`)
  }
  const concurrency = process.argv.includes('--burst') ? 45 : 3
  console.log(`Concurrent requests per wave: ${concurrency}`)
  const requests = async <T>(count: number, run: (index: number) => Promise<T>) => {
    const results: T[] = []
    for (let offset = 0; offset < count; offset += concurrency) {
      results.push(...await Promise.all(Array.from({ length: Math.min(concurrency, count - offset) }, (_, index) => run(offset + index))))
    }
    return results
  }
  let sent: AuthEmail[] = []
  const send = async (mail: AuthEmail): Promise<AuthEmailDeliveryResult> => {
    assert.equal(mail.to, 'contact-test@example.invalid')
    sent.push(mail)
    return { accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'mock-only' }
  }
  const secret = 'synthetic-local-contact-database-test-secret'
  const request = (index: number, address: string, email = `test-${index}@example.invalid`) => submitContact({ name: 'Synthetic', email, subject: 'GENERAL', message: 'Synthetic database test; never sent.', website: '', requestId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}` }, address, secret, { reserve: async limits => {
    try { return await reserveContactAttempt(limits) }
    catch (error) {
      // Codes only: never log a query, parameters or personal data.
      console.log('Limiter database error code:', error && typeof error === 'object' && 'code' in error ? String(error.code) : 'UNKNOWN')
      throw error
    }
  }, send, recipient: 'contact-test@example.invalid' })
  const reset = async () => { await db!.rateLimit.deleteMany(); sent = [] }
  const test = async (name: string, run: () => Promise<void>) => { await reset(); await run(); passed++; console.log(`PASS ${name}`) }
  await test('same email: 12 attempts in concurrent waves -> exactly 3 accepted', async () => {
    const results = await requests(12, i => request(i, 'same-ip', 'same@example.invalid'))
    assert.equal(results.filter(r => r.status === 200).length, 3)
    assert.equal(results.filter(r => r.status === 429).length, 9)
    assert.equal(sent.length, 3)
    assert.equal((await db!.rateLimit.findUniqueOrThrow({ where: { key: 'contact:global' } })).count, 3)
  })
  await test('same IP: 15 attempts with different email addresses -> exactly 5 accepted', async () => {
    const results = await requests(15, i => request(i, 'same-ip'))
    assert.equal(results.filter(r => r.status === 200).length, 5)
    assert.equal(results.filter(r => r.status === 429).length, 10)
    assert.equal(sent.length, 5)
  })
  await test('global: 45 attempts with distinct IP/email pairs -> exactly 30 accepted', async () => {
    const results = await requests(45, i => request(i, `ip-${i}`))
    assert.equal(results.filter(r => r.status === 200).length, 30)
    assert.equal(results.filter(r => r.status === 429).length, 15)
    assert.equal(sent.length, 30)
    const connections = await db!.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'a06-contact-test'`
    assert.ok(Number(connections[0].count) >= 2, 'Concurrent PostgreSQL connections required')
  })
  await test('exhausted email does not partially consume global/new-IP buckets', async () => {
    for (let i = 0; i < 3; i++) assert.equal((await request(i, 'ip-one', 'same@example.invalid')).status, 200)
    const before = await db!.rateLimit.findMany({ orderBy: { key: 'asc' } })
    assert.equal((await request(10, 'ip-two', 'same@example.invalid')).status, 429)
    assert.deepEqual(await db!.rateLimit.findMany({ orderBy: { key: 'asc' } }), before)
    assert.equal(sent.length, 3)
  })
  await test('expired windows reopen; active window start does not slide', async () => {
    await db!.rateLimit.create({ data: { key: 'contact:window', count: 3, lastRequest: BigInt(Date.now() - 20000) } })
    const limits = [{ key: 'contact:window', limit: 3, windowMs: 10000 }]
    assert.equal(await reserveContactAttempt(limits), true)
    const first = await db!.rateLimit.findUniqueOrThrow({ where: { key: 'contact:window' } })
    assert.equal(first.count, 1)
    assert.equal(await reserveContactAttempt(limits), true)
    const second = await db!.rateLimit.findUniqueOrThrow({ where: { key: 'contact:window' } })
    assert.equal(second.count, 2); assert.equal(second.lastRequest, first.lastRequest)
  })
  await test('cleanup removes only expired contact counters, never auth counters', async () => {
    const old = BigInt(Date.now() - 7200000)
    await db!.rateLimit.createMany({ data: [{ key: 'contact:expired', count: 1, lastRequest: old }, { key: 'auth:sentinel', count: 1, lastRequest: old }] })
    await reserveContactAttempt([{ key: 'contact:new', limit: 1, windowMs: 10000 }])
    assert.equal(await db!.rateLimit.findUnique({ where: { key: 'contact:expired' } }), null)
    assert.ok(await db!.rateLimit.findUnique({ where: { key: 'auth:sentinel' } }))
  })
  await test('stored counters contain no message, raw email or raw client address', async () => {
    assert.equal((await request(1, 'synthetic-client-address')).status, 200)
    const rows = await db!.rateLimit.findMany()
    const values = rows.map(row => row.key).join(' ')
    assert.ok(!values.includes('@') && !values.includes('synthetic-client-address') && !values.includes('Synthetic database'))
    assert.ok(rows.every(row => Object.keys(row).sort().join(',') === 'count,id,key,lastRequest'))
  })
  await test('real database error fails closed before mocked transport', async () => {
    await db!.$executeRawUnsafe('ALTER TABLE "RateLimit" RENAME TO "RateLimit_test_unavailable"')
    try { assert.equal((await request(1, 'test-ip')).status, 503); assert.equal(sent.length, 0) }
    finally { await db!.$executeRawUnsafe('ALTER TABLE "RateLimit_test_unavailable" RENAME TO "RateLimit"') }
  })
  console.log(`CONTACT_DATABASE_TESTS_PASS ${passed}/8; real emails=0`)
} finally {
  await db?.$disconnect()
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`)
  await admin.end()
}
