import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const source = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) throw new Error('De reviewworkflowtest mag uitsluitend lokaal draaien.')

const databaseName = `workmatchr_knowledge_review_${process.pid}_${Date.now()}`
if (!/^workmatchr_knowledge_review_\d+_\d+$/.test(databaseName)) throw new Error('Onveilige tijdelijke databasenaam.')
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
adminUrl.search = ''
const target = new URL(source)
target.pathname = `/${databaseName}`
target.searchParams.set('schema', 'public')

async function main() {
  const admin = new Pool({ connectionString: adminUrl.toString() })
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    const migrate = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8',
    })
    if (migrate.status !== 0) throw new Error(`Migratieketen mislukt:\n${migrate.stdout ?? ''}\n${migrate.stderr ?? ''}`)
    const test = spawnSync(process.execPath, [path.resolve('node_modules/vitest/vitest.mjs'), 'run', 'src/lib/knowledge/knowledge-review-database.test.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: target.toString(), KNOWLEDGE_REVIEW_DATABASE_TEST: 'true' },
      encoding: 'utf8',
    })
    if (test.status !== 0) throw new Error(`Reviewworkflow-integratietest mislukt:\n${test.stdout ?? ''}\n${test.stderr ?? ''}`)
    console.info(`Knowledge Review Workflow-integratie en concurrency geslaagd op tijdelijke database ${databaseName}.`)
  } finally {
    await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', [databaseName])
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
    await admin.end()
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
