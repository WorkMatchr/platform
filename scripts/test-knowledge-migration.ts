import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const source = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) throw new Error('De migratietest mag uitsluitend lokaal draaien.')

const databaseName = `workmatchr_knowledge_migration_${process.pid}_${Date.now()}`
if (!/^workmatchr_knowledge_migration_\d+_\d+$/.test(databaseName)) throw new Error('Onveilige tijdelijke databasenaam.')
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
adminUrl.search = ''
const target = new URL(source)
target.pathname = `/${databaseName}`
target.searchParams.set('schema', 'public')

async function main() {
  const admin = new Pool({ connectionString: adminUrl.toString() })
  try {
    const stale = await admin.query<{ datname: string }>(`SELECT datname FROM pg_database WHERE datname LIKE 'workmatchr_knowledge_migration_%'`)
    for (const database of stale.rows) {
      if (!/^workmatchr_knowledge_migration_\d+_\d+$/.test(database.datname)) continue
      await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [database.datname])
      await admin.query(`DROP DATABASE "${database.datname}"`)
    }
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    const migrate = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (migrate.status !== 0) throw new Error(`Migratieketen mislukt:\n${migrate.stdout ?? ''}\n${migrate.stderr ?? ''}\n${migrate.error?.message ?? ''}`)
    const constraints = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/test-knowledge-engine-database.ts'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (constraints.status !== 0) throw new Error(`Constrainttest mislukt:\n${constraints.stdout ?? ''}\n${constraints.stderr ?? ''}\n${constraints.error?.message ?? ''}`)
    if (existsSync('local-sources/knowledge/knowledge-sources.local.json')) {
      const rollbackPool = new Pool({ connectionString: target.toString() })
      await rollbackPool.query(`INSERT INTO "KnowledgeRole" ("id","code","title","description","createdAt","updatedAt") VALUES (gen_random_uuid(),'werkgever','Conflictrol','Rollbacktest',now(),now())`)
      const rejected = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', 'data/knowledge/poc/AI-01.v1.json', '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
      if (rejected.status === 0) throw new Error('De bewuste databaseconflictimport had moeten mislukken.')
      const rollbackCount = await rollbackPool.query<{ sources: string; claims: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource") sources, (SELECT count(*)::text FROM "KnowledgeClaim") claims`)
      if (rollbackCount.rows[0].sources !== '0' || rollbackCount.rows[0].claims !== '0') throw new Error('De mislukte import is niet volledig teruggerold.')
      await rollbackPool.query(`DELETE FROM "KnowledgeRole" WHERE "code"='werkgever'`)
      await rollbackPool.end()
      for (const code of ['01', '02', '03', '04', '05']) {
        const imported = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', `data/knowledge/poc/AI-${code}.v1.json`, '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
        if (imported.status !== 0) throw new Error(`PoC-import AI-${code} mislukt:\n${imported.stdout ?? ''}\n${imported.stderr ?? ''}`)
      }
      const targetPool = new Pool({ connectionString: target.toString() })
      const counts = await targetPool.query<{ sources: string; claims: string; citations: string; tasks: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource") sources, (SELECT count(*)::text FROM "KnowledgeClaim") claims, (SELECT count(*)::text FROM "KnowledgeCitation") citations, (SELECT count(*)::text FROM "KnowledgeReviewTask") tasks`)
      await targetPool.end()
      const row = counts.rows[0]
      if (row.sources !== '5' || row.claims !== '40' || row.citations !== '40' || row.tasks !== '0') throw new Error(`Onverwachte PoC-tellingen: ${JSON.stringify(row)}`)
      const duplicate = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', 'data/knowledge/poc/AI-01.v1.json', '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
      if (duplicate.status === 0 || !`${duplicate.stdout}${duplicate.stderr}`.includes('Import geweigerd')) throw new Error('Een tweede import is niet fail-closed geweigerd.')
    }
    console.info(`Volledige migratieketen en Knowledge Engine-constraints geslaagd op tijdelijke database ${databaseName}.`)
  } finally {
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [databaseName])
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
    await admin.end()
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
