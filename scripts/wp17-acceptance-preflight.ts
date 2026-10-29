import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { PREVIEW_FORBIDDEN_VARIABLES } from '../src/lib/maintenance/preview-isolation'

export function acceptanceConnection(env: Record<string, string | undefined>) {
  try {
    const url = new URL(env.WP17_ACCEPTANCE_DATABASE_URL ?? '')
    assert.ok(['postgres:', 'postgresql:'].includes(url.protocol))
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname))
    assert.match(url.pathname, /^\/workmatchr_(a07_session_test|learning|wp17_acceptance|db02_fresh)_\d+_\d+$/)
    assert.equal(url.search, ''); assert.equal(url.hash, '')
    assert.ok(!env.VERCEL && !env.VERCEL_ENV)
    for (const key of [...PREVIEW_FORBIDDEN_VARIABLES, 'DATABASE_URL', 'CRON_SECRET', 'FINANCIAL_MAINTENANCE_SECRET']) assert.ok(!env[key])
    for (const key of ['COMPLIANCE_F4_ENABLED', 'LEARNING_RUNTIME_ENABLED', 'CONTACT_FORM_ENABLED']) assert.ok(!env[key] || env[key] === 'false')
    return url
  } catch { throw new Error('WP17_ACCEPTANCE_CONFIGURATION_REFUSED') }
}

async function check() {
  assert.deepEqual(process.argv.slice(2), ['--check'], 'Only read-only --check is supported')
  const url = acceptanceConnection(process.env)
  const db = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 })
  try {
    await db.connect()
    await db.query('BEGIN READ ONLY')
    await db.query("SET LOCAL statement_timeout='5s'")
    const identity = (await db.query('SELECT current_database() AS database,current_user AS role')).rows[0]
    assert.equal(identity.database, url.pathname.slice(1))
    const rows = (await db.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows
    const names = readdirSync('prisma/migrations').filter(name => /^\d/.test(name)).sort()
    assert.equal(names.length, 93); assert.deepEqual(rows.map(row => row.migration_name), names)
    for (const row of rows) {
      assert.ok(row.finished_at && !row.rolled_back_at)
      const sql = readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`, 'utf8')
      const hashes = [sql.replace(/\r\n/g, '\n'), sql.replace(/\r?\n/g, '\r\n')]
        .map(text => createHash('sha256').update(text).digest('hex'))
      assert.ok(hashes.includes(row.checksum))
    }
    const required = ['User', 'Session', 'Organization', 'OrganizationMembership', 'Request', 'Assignment', 'NotificationOutbox', 'LearningEnrollment', 'LearningCertificate', 'ComplianceFrameworkVersion']
    for (const table of required) assert.ok((await db.query('SELECT to_regclass($1) AS object', [`public."${table}"`])).rows[0].object)
    await db.query('ROLLBACK')
    console.log(JSON.stringify({ status: 'LOCAL_PREFLIGHT_PASS', database: identity.database, migrations: rows.length, externalProviders: 'absent', gates: 'closed', browserAcceptance: 'not performed' }))
  } finally { await db.end() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  check().catch(() => { console.error('WP17_ACCEPTANCE_PREFLIGHT_BLOCKED'); process.exitCode = 1 })
}
