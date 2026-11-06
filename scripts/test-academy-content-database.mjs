/** Disposable synthetic-only PostgreSQL 18 harness. Never consumes DATABASE_URL. */
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import pg from 'pg'

if (process.argv[2] !== '--local-synthetic' || process.argv.slice(3).some(arg => arg !== '--browser-only')) throw Error('EXPLICIT_LOCAL_SYNTHETIC_FLAG_REQUIRED')
if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw Error('LOCAL_OR_CI_ONLY')
const database = 'workmatchr_lms20_synthetic'
const name = 'workmatchr-academy-content-test-' + Date.now() + '-' + process.pid
const ownerSecret = randomBytes(32).toString('hex')
const runtimeSecret = randomBytes(32).toString('hex')
const env = { ...process.env, NODE_ENV: 'test' }
for (const key of Object.keys(env)) {
 if (/^(DATABASE_URL|DIRECT_URL|PG|VERCEL|RESEND|MOLLIE|JORTT|CRON_SECRET|FINANCIAL_MAINTENANCE_SECRET|PREVIEW_)/.test(key)) delete env[key]
}
function redact(value) { return value.replaceAll(ownerSecret, '[redacted]').replaceAll(runtimeSecret, '[redacted]') }
function run(command, args, extraEnv = {}) {
 const result = spawnSync(command, args, { env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 300_000, windowsHide: true })
 if (result.status !== 0) throw Error(redact(result.stderr || result.stdout || 'COMMAND_FAILED'))
 return redact(result.stdout)
}
let containerId, client
try {
 // Docker refuses an occupied port; no existing container/database is selected.
 containerId = run('docker', ['run', '-d', '--name', name, '--label', 'workmatchr.synthetic=academy-content-test',
  '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=' + database, '-p', '127.0.0.1:5449:5432', 'postgres:18'],
 { POSTGRES_PASSWORD: ownerSecret }).trim()
 assert.match(containerId, /^[a-f0-9]{64}$/)
 const inspect = JSON.parse(run('docker', ['inspect', containerId]))[0]
 assert.equal(inspect.Name, '/' + name)
 assert.equal(inspect.Config.Labels['workmatchr.synthetic'], 'academy-content-test')
 assert.equal(inspect.HostConfig.PortBindings['5432/tcp'][0].HostIp, '127.0.0.1')
 const ownerUrl = 'postgresql://postgres:' + ownerSecret + '@127.0.0.1:5449/' + database
 for (let attempt = 0; attempt < 30; attempt++) {
  try { client = new pg.Client({ connectionString: ownerUrl }); await client.connect(); break }
  catch { await client?.end().catch(() => {}); client = null; await new Promise(resolve => setTimeout(resolve, 1000)) }
 }
 if (!client) throw Error('SYNTHETIC_DATABASE_NOT_READY')
 const identity = (await client.query("SELECT current_database() AS name,current_setting('server_version_num')::int AS version")).rows[0]
 assert.equal(identity.name, database); assert.ok(identity.version >= 180000 && identity.version < 190000)
 run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { DATABASE_URL: ownerUrl })
 const before = (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows
 assert.equal(before.length, 115)
 assert.ok(before.every(row => row.finished_at && !row.rolled_back_at))
 run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { DATABASE_URL: ownerUrl })
 assert.deepEqual((await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows, before)
 console.log('115 migrations PASS; repeated deploy leaves the registry unchanged.')
 await client.query("CREATE ROLE academy_content_editor LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '" + runtimeSecret + "'")
 await client.query('REVOKE CREATE,TEMPORARY ON DATABASE workmatchr_lms20_synthetic FROM PUBLIC')
 await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC')
 await client.query('GRANT CONNECT ON DATABASE workmatchr_lms20_synthetic TO academy_content_editor')
 await client.query('GRANT USAGE ON SCHEMA public TO academy_content_editor')
 const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations'")).rows
 for (const { tablename } of tables) {
  assert.match(tablename, /^[A-Za-z0-9_]+$/)
  await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON public."' + tablename + '" TO academy_content_editor')
 }
 await client.query('GRANT SELECT ON public._prisma_migrations TO academy_content_editor')
 await client.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO academy_content_editor')
 await client.query('GRANT EXECUTE ON FUNCTION public.learning_question_is_editable(uuid) TO academy_content_editor')
 const runtimeUrl = 'postgresql://academy_content_editor:' + runtimeSecret + '@127.0.0.1:5449/' + database
 if (!process.argv.includes('--browser-only')) console.log(run(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/lib/learning/academy-content-postgres.test.ts', 'src/lib/learning/certificate-design-postgres.test.ts', '--maxWorkers=1'],
  { DATABASE_URL: runtimeUrl, ACADEMY_CONTENT_POSTGRES_TEST: 'true', CERTIFICATE_DESIGN_POSTGRES_TEST: 'true' }))
 if (process.argv.includes('--browser-only')) console.log(run(process.execPath, ['--import','./scripts/register-learning-server.mjs','--import','tsx','scripts/test-wp21-admin-browser.ts'], { DATABASE_URL: runtimeUrl }))
} finally {
 await client?.end().catch(() => {})
 if (!containerId) {
  const probe = spawnSync('docker', ['inspect', name], { encoding: 'utf8', windowsHide: true })
  if (probe.status === 0) containerId = JSON.parse(probe.stdout)[0].Id
 }
 if (containerId) {
  const inspected = JSON.parse(run('docker', ['inspect', containerId]))[0]
  assert.equal(inspected.Name, '/' + name)
  assert.equal(inspected.Config.Labels['workmatchr.synthetic'], 'academy-content-test')
  run('docker', ['rm', '-f', '-v', containerId])
  console.log('Cleanup PASS: own synthetic container and anonymous volume removed.')
 }
}
