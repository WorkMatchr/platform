import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { assertWp17bTarget, WP17B_TARGET as target } from './wp17b-acceptance-target'
import { PREVIEW_IDENTITY_SQL } from '../src/lib/maintenance/preview-database-pool'
import { verifiedDatabaseClientTls } from '../src/lib/maintenance/database-client-tls'

const path = '.local-storage/wp17b/acceptance-secret.json'
const secrets = JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>
const url = assertWp17bTarget(secrets.migrationUrl)
assert.equal(url.username, target.owner)
const mode = process.argv[2]
assert.ok(['--provision', '--seed', '--verify'].includes(mode))
url.search = ''
const db = new Client({ connectionString: url.href, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10000 })
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return next(specifier, context)
} })
try {
  await db.connect()
  const identity = (await db.query("SELECT current_database() AS database,current_user AS role,current_setting('neon.branch_id',true) AS branch,current_setting('neon.endpoint_id',true) AS endpoint")).rows[0]
  assertWp17bTarget(secrets.migrationUrl, identity)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows[0].n, 93)
  if (mode === '--provision') {
    assert.equal((await db.query('SELECT count(*)::int AS n FROM "User"')).rows[0].n, 0)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM pg_roles WHERE rolname=$1', [target.runtime])).rows[0].n, 0)
    const password = randomBytes(36).toString('base64url')
    await db.query('BEGIN')
    try {
      await db.query(`CREATE ROLE "${target.runtime}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`)
      await db.query(`REVOKE CREATE,TEMPORARY ON DATABASE "${target.database}" FROM PUBLIC`)
      await db.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
      await db.query(`GRANT CONNECT ON DATABASE "${target.database}" TO "${target.runtime}"`)
      await db.query(`GRANT USAGE ON SCHEMA public TO "${target.runtime}"`)
      for (const row of (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'")).rows) {
        assert.match(row.tablename, /^[A-Za-z0-9_]+$/)
        await db.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON public."${row.tablename}" TO "${target.runtime}"`)
      }
      await db.query(`GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO "${target.runtime}"`)
      await db.query('COMMIT')
    } catch (error) { await db.query('ROLLBACK'); throw error }
    const runtime = new URL(secrets.migrationUrl); runtime.username = target.runtime; runtime.password = password
    secrets.runtimeUrl = runtime.href
    secrets.authSecret = randomBytes(48).toString('base64url')
    secrets.cronSecret = randomBytes(48).toString('base64url')
    secrets.password = randomBytes(24).toString('base64url')
    writeFileSync(path, JSON.stringify(secrets), { mode: 0o600 })
    console.log('PASS new acceptance runtime role provisioned; no production role changed')
  }
  if (mode === '--seed') {
    assert.ok(secrets.runtimeUrl && secrets.authSecret && secrets.password)
    Object.assign(process.env, { DATABASE_URL: secrets.migrationUrl, DOTENV_CONFIG_PATH: '.local-storage/wp17b/absent.env',
      BETTER_AUTH_SECRET: secrets.authSecret, BETTER_AUTH_URL: 'https://workmatchr-wp17b-acceptance.vercel.app', NEXT_PUBLIC_APP_URL: 'https://workmatchr-wp17b-acceptance.vercel.app',
      VERCEL_ENV: '', RESEND_API_KEY: '', MOLLIE_API_KEY: '', JORTT_CLIENT_ID: '', JORTT_CLIENT_SECRET: '', OPENAI_API_KEY: '', BLOB_READ_WRITE_TOKEN: '', TRADING_ADMIN_API_TOKEN: '', CONTACT_FORM_ENABLED: 'false' })
    for (const script of ['prisma/seed.ts', 'scripts/seed-learning.ts', 'scripts/seed-learning-final-exam.ts']) {
      const run = spawnSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', script], { env: process.env, encoding: 'utf8', timeout: 180000 })
      console.log(JSON.stringify({ seed: script, exit: run.status }))
      assert.equal(run.status, 0, 'Existing seed failed; raw output withheld')
    }
    const { PrismaClient } = await import('../src/generated/prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const { hashPassword } = await import('better-auth/crypto')
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: secrets.runtimeUrl }) })
    try {
      const password = await hashPassword(secrets.password)
      const fixtures = []
      for (const role of ['client', 'professional', 'admin', 'other-client'] as const) {
        const email = `wp17b-${role}@example.invalid`
        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          const organization = await prisma.organization.create({ data: { name: `Synthetisch WP17B ${role}`, status: 'ACTIVE', organizationType: role === 'admin' ? 'PLATFORM_OPERATOR' : role === 'professional' ? 'PROVIDER' : 'CLIENT', ...(role === 'admin' ? { systemKey: 'WORKMATCHR_PLATFORM' } : {}), ...(role === 'professional' ? { providerProfile: { create: {} } } : {}) } })
          user = await prisma.user.create({ data: { email, displayName: `Synthetisch ${role}`, status: 'ACTIVE', emailVerified: true, accountType: role === 'admin' ? null : role === 'professional' ? 'PROFESSIONAL' : 'CLIENT', platformRole: role === 'admin' ? 'ADMIN' : 'USER', memberships: { create: { organizationId: organization.id, status: 'ACTIVE', role: 'OWNER' } } } })
          await prisma.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password } })
        }
        const membership = await prisma.organizationMembership.findFirstOrThrow({ where: { userId: user.id } })
        fixtures.push({ role, userId: user.id, organizationId: membership.organizationId, email })
      }
      writeFileSync('.local-storage/wp17b/accounts.json', JSON.stringify(fixtures, null, 2))
      console.log(JSON.stringify({ syntheticAccounts: fixtures.length, credentialMechanism: 'Better Auth scrypt; existing fixture pattern', realEmail: false }))
    } finally { await prisma.$disconnect() }
  }
  if (secrets.runtimeUrl) {
    const runtimeUrl = assertWp17bTarget(secrets.runtimeUrl); runtimeUrl.search = ''
    const runtime = new Client({ connectionString: runtimeUrl.href, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 10000 })
    try {
      await runtime.connect()
      const row = (await runtime.query(PREVIEW_IDENTITY_SQL)).rows[0]
      const clientTls = verifiedDatabaseClientTls(runtime, target.host)
      assertWp17bTarget(secrets.runtimeUrl, row)
      assert.equal(row.login, target.runtime)
      for (const key of ['privileged', 'memberships', 'database_create', 'schema_create', 'owns_objects', 'registry_write']) assert.equal(row[key], false, key)
      await runtime.query('SELECT count(*) FROM "User"')
      for (const sql of ['SELECT * FROM _prisma_migrations', 'CREATE TABLE wp17b_denied(id int)', 'CREATE TEMP TABLE wp17b_denied(id int)', 'TRUNCATE "Session"', 'CREATE ROLE wp17b_denied', 'ALTER TABLE "User" DISABLE TRIGGER ALL', 'SET session_replication_role=replica']) await assert.rejects(runtime.query(sql), (error: { code?: string }) => error.code === '42501')
      writeFileSync('.local-storage/wp17b/runtime-role-evidence.json', JSON.stringify({ observedAt: new Date().toISOString(), ...row, clientTls, deniedOperations: 7 }, null, 2))
      console.log(JSON.stringify({ runtimeIdentity: row, clientTls, deniedOperations: 7 }))
    } finally { await runtime.end() }
  }
} catch (error) { console.log(JSON.stringify({ failed: true, code: (error as { code?: string }).code ?? 'WP17B_FIXTURE_CHECK_FAILED' })); process.exitCode = 1 } finally { await db.end() }
