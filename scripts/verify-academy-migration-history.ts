import 'dotenv/config'
import { readFile, readdir } from 'node:fs/promises'
import { Client } from 'pg'
import { inspectMigrationHistory, type MigrationRecord } from '../src/lib/maintenance/migration-history'

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  if (process.env.NODE_ENV !== 'test' || process.env.VERCEL_ENV === 'production'
    || process.env.ACADEMY_TEST_PROJECT_ID !== 'academy-synthetic-project'
    || process.env.ACADEMY_TEST_BRANCH_ID !== 'branch-fixture-mute-credit'
    || !['postgres:', 'postgresql:'].includes(url.protocol)
    || url.hostname !== 'fixture-0167b18845.example.invalid'
    || !['/neondb','/hardening_fresh','/hardening_upgrade','/hardening_restore'].includes(url.pathname)
    || url.searchParams.get('sslmode') !== 'verify-full'
    || !['', '5432'].includes(url.port) || url.hash
    || decodeURIComponent(url.username) !== 'neondb_owner' || !url.password
    || url.searchParams.getAll('sslmode').length !== 1
    || [...url.searchParams.keys()].some(key => key !== 'sslmode')) throw new Error('MIGRATION_HISTORY_TARGET_REFUSED')
  const db = new Client({ connectionString: url.href, connectionTimeoutMillis: 15_000 })
  await db.connect()
  try {
    const identity = (await db.query("SELECT current_database() database,(current_setting('server_version_num')::int/10000)::int major")).rows[0]
    if (identity.database !== url.pathname.slice(1) || identity.major !== 17) throw new Error('MIGRATION_HISTORY_TARGET_REFUSED')
    const names = (await readdir('prisma/migrations', { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
    const files = await Promise.all(names.map(async name => ({ name, bytes: await readFile(`prisma/migrations/${name}/migration.sql`) })))
    const rows = (await db.query<MigrationRecord>('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')).rows
    const report = inspectMigrationHistory(files, rows)
    console.log(JSON.stringify({ database: identity.database, ...report }))
    if (report.status !== 'PASS') process.exitCode = 1
  } finally { await db.end() }
}
main().catch(() => { console.error('ACADEMY_MIGRATION_HISTORY_CHECK_FAILED'); process.exitCode = 1 })
