// Offline comparison of read-only evidence. Never connects to a database.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { readTargetPolicy } from '../ops/recovery/target-policy.mjs'

export const pendingMigrations = [
  '20260924150000_add_learning_vertical_slice',
  '20260927210000_add_learning_final_exam',
  '20260929100000_add_learning_certificates',
  '20260930100000_add_learning_retention',
  '20260930120000_correct_learning_retention_publication_policy',
  '20261017100000_add_compliance_question_visibility',
  '20261019100000_allow_annual_reminder_reconsent',
  '20261026090000_restore_learning_exam_question_immutability',
]
export function auditPreflight(evidence, expectedDatabase, migrationRoot = 'prisma/migrations') {
  assert.match(expectedDatabase,/^[a-z_][a-z0-9_]{0,62}$/,'Independently verified database required')
  assert.equal(evidence.database, expectedDatabase, 'Database mismatch')
  assert.equal(evidence.readOnly, 'on', 'Read-only evidence required')
  assert.match(evidence.version, /^18\./, 'PostgreSQL 18 required')
  const registry = evidence.registry
  assert.equal(registry.length, 85, 'Unexpected registry count')
  assert.equal(new Set(registry.map(m=>m.migration_name)).size,85,'Duplicate registry')
  const folders = fs.readdirSync(migrationRoot).filter(n=>/^\d/.test(n)).sort()
  assert.equal(folders.length,93,'Unexpected local migration count')
  const digest=s=>createHash('sha256').update(s).digest('hex')
  for(const migration of registry) {
    assert.ok(folders.includes(migration.migration_name),'Unknown migration')
    assert.equal(migration.finished,true,'Unfinished migration');assert.equal(migration.rolled_back,false,'Rolled-back migration')
    const lf=fs.readFileSync(path.join(migrationRoot,migration.migration_name,'migration.sql'),'utf8').replace(/\r\n/g,'\n')
    assert.ok([digest(lf),digest(lf.replace(/\n/g,'\r\n'))].includes(migration.checksum),'Historical checksum mismatch')
  }
  const pending=folders.filter(n=>!registry.some(m=>m.migration_name===n))
  assert.deepEqual(pending,pendingMigrations,'Unexpected pending migrations')
  for(const field of ['invalidIndexes','unvalidatedConstraints','unfinishedFinanceRuns','activeOutboxLeases','walletMismatches','ungrantedLocks']) assert.equal(evidence[field],0,`Preflight blocker: ${field}`)
  assert.equal(evidence.learningTables,0,'Unexpected Learning schema')
  assert.equal(evidence.examGuardExists,false,'Unexpected exam guard before migration 1')
  return {status:'PASS',applied:85,pending:pending.length,checksumMismatches:0,
    unfinishedClientTransactions:evidence.unfinishedClientTransactions,
    pendingOutbox:evidence.outbox,productionMigrationAuthorized:false}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    assert.equal(process.argv.length,4,'Evidence and separate private target policy required')
    const target=readTargetPolicy(process.argv[3],process.argv[2])
    const { status,applied,pending,checksumMismatches,productionMigrationAuthorized }=auditPreflight(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),target.database)
    console.log(JSON.stringify({status,applied,pending,checksumMismatches,productionMigrationAuthorized}))
  } catch { console.error('Preflight refused; inspect evidence locally.');process.exitCode=1 }
}
