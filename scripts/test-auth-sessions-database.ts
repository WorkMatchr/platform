import assert from 'node:assert/strict'
import { randomBytes, createHash } from 'node:crypto'
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import type { Session } from '../src/generated/prisma/client'

// This harness never reads dotenv and can only create its own local database.
const source = new URL(process.env.DATABASE_URL ?? 'invalid:')
assert.ok(['postgres:', 'postgresql:'].includes(source.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(source.hostname), 'Explicit loopback PostgreSQL required')
const databaseName = `workmatchr_a07_session_test_${process.pid}_${Date.now()}`
assert.match(databaseName, /^workmatchr_a07_session_test_[0-9_]+$/)
const adminUrl = new URL(source); adminUrl.pathname = '/postgres'; adminUrl.search = ''
const testUrl = new URL(source); testUrl.pathname = `/${databaseName}`; testUrl.search = ''
const npmPath = process.env.npm_execpath
assert.ok(npmPath, 'Run with npm run test:db:auth-sessions')
const browserMode = process.argv.includes('--browser')
const baseURL = 'http://127.0.0.1:3062'
const directory = '.local-storage/a07-final-acceptance'
const runtimePath = `${directory}/runtime.json`
const stopPath = `${directory}/stop`
let requestHeaders = new Headers()
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  if (specifier === 'next/headers') return { url: 'data:text/javascript,export async function headers(){return globalThis.a07Headers()}', shortCircuit: true }
  return nextResolve(specifier, context)
} })
Object.assign(globalThis, { a07Headers: () => requestHeaders })
Object.assign(process.env, { NODE_ENV: 'development', DATABASE_URL: testUrl.toString(), BETTER_AUTH_URL: baseURL,
  NEXT_PUBLIC_APP_URL: baseURL, BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'),
  CONTACT_FORM_ENABLED: 'false', COMPLIANCE_F4_ENABLED: 'false', LEARNING_RUNTIME_ENABLED: 'false', ENABLE_TEST_ACCOUNT_SWITCHER: 'false' })
// Empty values also prevent Next.js dotenv loading from restoring local provider keys.
for (const key of new Set([...Object.keys(process.env), 'RESEND_API_KEY', 'AUTH_EMAIL_FROM', 'PREVIEW_EMAIL_RECIPIENT_OVERRIDE'])) {
  if (/RESEND|MOLLIE|JORTT|AUTH_EMAIL_FROM|PREVIEW_EMAIL_RECIPIENT_OVERRIDE/.test(key)) process.env[key] = ''
}
const cookieHeader = (response: Response) => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
const admin = new Client({ connectionString: adminUrl.toString() })
let created = false
let server: ReturnType<typeof spawn> | undefined
let prisma: ReturnType<typeof import('../src/lib/prisma').getPrisma> | undefined
const initialDatabases: string[] = []
function deploy() {
  const result = spawnSync(process.execPath, [npmPath!, 'run', 'db:deploy'], { env: process.env, encoding: 'utf8', stdio: 'pipe' })
  assert.equal(result.status, 0, 'All repository migrations must succeed; raw output withheld to protect credentials')
}
try {
  await admin.connect()
  initialDatabases.push(...(await admin.query<{ datname: string }>('SELECT datname FROM pg_database ORDER BY datname')).rows.map(row => row.datname))
  await admin.query(`CREATE DATABASE "${databaseName}"`); created = true
  deploy()
  const { getPrisma } = await import('../src/lib/prisma')
  prisma = getPrisma()
  const { auth } = await import('../src/lib/auth')
  const { hashPassword } = await import('better-auth/crypto')
  const { getCurrentAuthenticationContext } = await import('../src/lib/test-impersonation/test-impersonation-context')
  const { requireOrganizationMembership } = await import('../src/lib/organizations/organization-authorization')
  const { requirePlatformRole } = await import('../src/lib/authorization')
  const { requirePlatformAdministrator } = await import('../src/lib/platform-admin/platform-admin-authorization')
  const files = readdirSync('prisma/migrations', { withFileTypes: true }).filter(item => item.isDirectory()).map(item => item.name).sort()
  const registry = () => prisma!.$queryRawUnsafe<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')
  const before = await registry()
  assert.deepEqual(before.map(row => row.migration_name), files)
  for (const row of before) {
    assert.ok(row.finished_at); assert.equal(row.rolled_back_at, null)
    assert.equal(row.checksum, createHash('sha256').update(readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'))
  }
  deploy(); assert.deepEqual(await registry(), before)
  console.log(`PASS migrations: ${files.length}/${files.length}, checksums, repeat unchanged, zero failures`)
  const password = randomBytes(24).toString('base64url')
  const passwordHash = await hashPassword(password)
  const fixtures: Array<{ role: 'client' | 'professional' | 'admin'; userId: string; organizationId: string; email: string }> = []
  for (const role of ['client', 'professional', 'admin'] as const) {
    const org = await prisma.organization.create({ data: { name: `Synthetisch A07 ${role}`, status: 'ACTIVE',
      organizationType: role === 'admin' ? 'PLATFORM_OPERATOR' : role === 'professional' ? 'PROVIDER' : 'CLIENT',
      ...(role === 'admin' ? { systemKey: 'WORKMATCHR_PLATFORM' } : {}),
      ...(role === 'professional' ? { providerProfile: { create: {} } } : {}) } })
    const user = await prisma.user.create({ data: { email: `a07-${role}@example.invalid`, displayName: `Synthetisch A07 ${role}`, status: 'ACTIVE', emailVerified: true,
      accountType: role === 'admin' ? null : role === 'client' ? 'CLIENT' : 'PROFESSIONAL', platformRole: role === 'admin' ? 'ADMIN' : 'USER',
      memberships: { create: { organizationId: org.id, role: role === 'admin' ? 'OWNER' : 'MEMBER', status: 'ACTIVE' } } } })
    const context = await auth.$context
    await context.internalAdapter.createAccount({ userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash })
    fixtures.push({ role, userId: user.id, organizationId: org.id, email: user.email })
  }
  const call = (path: string, cookie = '', body?: unknown, origin = baseURL) => auth.handler(new Request(`${baseURL}/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }))
  for (const fixture of fixtures) {
    await prisma.rateLimit.deleteMany() // Independent synthetic role scenarios; runtime limits stay enabled.
    const login = await call('sign-in/email', '', { email: fixture.email, password })
    assert.equal(login.status, 200)
    const cookie = cookieHeader(login)
    assert.ok(login.headers.getSetCookie().some(value => value.startsWith('better-auth.session_token=') && !/Max-Age|Expires=/i.test(value)))
    let session: Session = await prisma.session.findFirstOrThrow({ where: { userId: fixture.userId } })
    assert.ok(session.expiresAt.getTime() - session.createdAt.getTime() <= 86_400_000)
    requestHeaders = new Headers({ cookie })
    assert.equal((await getCurrentAuthenticationContext())?.effectiveUser.id, fixture.userId)
    if (fixture.role === 'admin') {
      await assert.rejects(() => requireOrganizationMembership(fixture.organizationId))
      await requirePlatformAdministrator()
    } else {
      assert.equal((await requireOrganizationMembership(fixture.organizationId)).activeMembership.organization.id, fixture.organizationId)
      await assert.rejects(() => requirePlatformAdministrator())
    }
    await assert.rejects(() => requireOrganizationMembership(fixtures.find(other => other.userId !== fixture.userId)!.organizationId))
    if (fixture.role !== 'admin') await assert.rejects(() => requirePlatformRole('ADMIN'))
    else assert.equal((await requirePlatformRole('ADMIN')).id, fixture.userId)
    assert.equal((await call('sign-out', cookie, {}, 'https://untrusted.example.invalid')).status, 403)
    assert.equal(await prisma.session.count({ where: { id: session.id } }), 1)
    assert.equal((await call('sign-out', cookie, {})).status, 200)
    assert.equal(await prisma.session.count({ where: { id: session.id } }), 0)
    assert.equal(await (await call('get-session', cookie)).json(), null)
    const remembered = await call('sign-in/email', '', { email: fixture.email, password, rememberMe: true })
    assert.equal(remembered.status, 200)
    assert.ok(remembered.headers.getSetCookie().some(value => value.includes('Max-Age=604800')))
    session = await prisma.session.findFirstOrThrow({ where: { userId: fixture.userId } })
    assert.ok(session.expiresAt.getTime() - session.createdAt.getTime() > 6 * 86_400_000)
    await prisma.session.update({ where: { id: session.id }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000), updatedAt: new Date(Date.now() - 2 * 86_400_000), expiresAt: new Date(Date.now() + 5 * 86_400_000) } })
    const refreshed = await (await call('get-session', cookieHeader(remembered))).json()
    assert.ok(new Date(refreshed.session.expiresAt).getTime() > Date.now() + 6 * 86_400_000)
    await prisma.user.update({ where: { id: fixture.userId }, data: { status: 'BLOCKED' } })
    requestHeaders = new Headers({ cookie: cookieHeader(remembered) })
    assert.equal(await getCurrentAuthenticationContext(), null)
    assert.equal(await prisma.session.count({ where: { userId: fixture.userId } }), 0)
    assert.equal((await call('sign-in/email', '', { email: fixture.email, password })).status, 401)
    await prisma.user.update({ where: { id: fixture.userId }, data: { status: 'ACTIVE' } })
    console.log(`PASS ${fixture.role}: session cookie/24h, persistent/7d/refresh, logout DB deletion, deactivation, server authorization and tenant isolation`)
  }
  // Fail the real PostgreSQL DELETE, not a mocked HTTP response.
  await prisma.rateLimit.deleteMany()
  const client = fixtures[0]
  const login = await call('sign-in/email', '', { email: client.email, password })
  assert.equal(login.status, 200)
  const cookie = cookieHeader(login)
  const session = await prisma.session.findFirstOrThrow({ where: { userId: client.userId } })
  await prisma.$executeRawUnsafe(`CREATE FUNCTION a07_fail_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_DELETE_FAILURE'; END $$`)
  await prisma.$executeRawUnsafe(`CREATE TRIGGER a07_fail_delete BEFORE DELETE ON "Session" FOR EACH ROW EXECUTE FUNCTION a07_fail_delete()`)
  const failed = await call('sign-out', cookie, {})
  assert.equal(failed.status, 503, 'A failed PostgreSQL deletion must not report logout success')
  assert.equal(failed.headers.getSetCookie().length, 0, 'Keep cookie for retry when revocation failed')
  assert.equal(await prisma.session.count({ where: { id: session.id } }), 1)
  await prisma.$executeRawUnsafe('DROP TRIGGER a07_fail_delete ON "Session"')
  await prisma.$executeRawUnsafe('DROP FUNCTION a07_fail_delete()')
  const retry = await Promise.all([call('sign-out', cookie, {}), call('sign-out', cookie, {})])
  assert.ok(retry.every(response => response.status === 200))
  assert.equal(await prisma.session.count({ where: { id: session.id } }), 0)
  assert.equal(await (await call('get-session', cookie)).json(), null)
  assert.equal(await (await call('get-session', 'better-auth.session_token=invalid')).json(), null)
  const expiring = await call('sign-in/email', '', { email: fixtures[1].email, password })
  const expired = await prisma.session.findFirstOrThrow({ where: { userId: fixtures[1].userId } })
  await prisma.session.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } })
  assert.equal(await (await call('get-session', cookieHeader(expiring))).json(), null)
  assert.equal(await prisma.session.count(), 0)
  console.log('PASS real PostgreSQL failure → 503/no cookie clear; retry/concurrent logout → zero sessions; expired/invalid rejected')
  // Isolated fixture rate-limit data may be cleared for manual browser logins.
  await prisma.rateLimit.deleteMany()
  if (browserMode) {
    mkdirSync(directory, { recursive: true })
    if (existsSync(stopPath)) unlinkSync(stopPath)
    writeFileSync(runtimePath, JSON.stringify({ databaseName, databaseURL: testUrl.toString(), password, fixtures, baseURL }))
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3062'], { env: process.env, stdio: 'ignore', windowsHide: true })
    console.log('BROWSER_FIXTURE_READY http://127.0.0.1:3062; credentials only in ignored local fixture; create stop file for cleanup')
    while (!existsSync(stopPath) && server.exitCode === null) await new Promise(resolve => setTimeout(resolve, 1000))
    if (existsSync(stopPath)) unlinkSync(stopPath)
    assert.equal(await prisma.session.count(), 0, 'Browser acceptance must finish logged out')
  }
} finally {
  server?.kill()
  if (existsSync(runtimePath)) unlinkSync(runtimePath)
  await prisma?.$disconnect()
  if (created) {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [databaseName])
    await admin.query(`DROP DATABASE "${databaseName}"`)
    const remaining = (await admin.query<{ datname: string }>('SELECT datname FROM pg_database ORDER BY datname')).rows.map(row => row.datname)
    for (const name of initialDatabases) assert.ok(remaining.includes(name), 'Existing databases must remain')
    assert.ok(!remaining.includes(databaseName))
    console.log('CLEANUP PASS: only process-owned test database removed; existing databases retained')
  }
  await admin.end()
}