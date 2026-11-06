import { after, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { auditPreflight as checkPreflight, pendingMigrations } from './audit-d2c-preflight.mjs'

// Preserve the approved historical eight-migration plan. The new candidate is NOT authorized by it.
const migrationRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'workmatchr-historical-preflight-'))
for (const name of fs.readdirSync('prisma/migrations').filter(n => /^\d/.test(n)
  && n !== '20261102120000_add_closed_contact_audit_retention'
  && n !== '20261103100000_add_closed_contact_decision_register'
  && n !== '20261106120000_repair_pro_financial_integrity')) {
  fs.mkdirSync(path.join(migrationRoot, name))
  fs.copyFileSync(path.join('prisma/migrations', name, 'migration.sql'), path.join(migrationRoot, name, 'migration.sql'))
}
after(() => {
  assert.equal(path.dirname(migrationRoot), path.resolve(os.tmpdir()))
  assert.ok(path.basename(migrationRoot).startsWith('workmatchr-historical-preflight-'))
  fs.rmSync(migrationRoot, { recursive: true })
})
const auditPreflight = (evidence, database) => checkPreflight(evidence, database, migrationRoot)

// Synthetic registry built from public migration files; never reads operational evidence.
const registry=fs.readdirSync(migrationRoot).filter(n=>/^\d/.test(n)&&!pendingMigrations.includes(n)).sort().map(migration_name=>({migration_name,finished:true,rolled_back:false,checksum:createHash('sha256').update(fs.readFileSync(path.join(migrationRoot,migration_name,'migration.sql'),'utf8').replace(/\r\n/g,'\n')).digest('hex')}))
const evidence={database:'fixture_db',readOnly:'on',version:'18.0',registry,invalidIndexes:0,unvalidatedConstraints:0,unfinishedFinanceRuns:0,activeOutboxLeases:0,walletMismatches:0,ungrantedLocks:0,learningTables:0,examGuardExists:false,unfinishedClientTransactions:0,outbox:[]}
test('read-only metadata matches 85 registrations and exactly eight pending files',()=>assert.equal(auditPreflight(evidence,'fixture_db').status,'PASS'))
test('original production plan refuses additional unapproved contact and P1 migrations',()=>assert.throws(()=>checkPreflight(evidence,'fixture_db'),/Unexpected local migration count/))
for(const [name,change] of [
  ['wrong database',e=>{e.database='other'}],
  ['read-write evidence',e=>{e.readOnly='off'}],
  ['wrong client major',e=>{e.version='17.6'}],
  ['unfinished registry',e=>{e.registry[0].finished=false}],
  ['rollback registry',e=>{e.registry[0].rolled_back=true}],
  ['checksum drift',e=>{e.registry[0].checksum='0'.repeat(64)}],
  ['unknown migration',e=>{e.registry[0].migration_name='unknown'}],
  ['duplicate migration',e=>{e.registry[1]=e.registry[0]}],
  ['unexpected count',e=>{e.registry.pop()}],
  ['invalid index',e=>{e.invalidIndexes=1}],
  ['active mail lease',e=>{e.activeOutboxLeases=1}],
  ['wallet mismatch',e=>{e.walletMismatches=1}],
  ['ungranted lock',e=>{e.ungrantedLocks=1}],
  ['unexpected partial learning schema',e=>{e.learningTables=1}],
]) test(`rejects ${name}`,()=>{const candidate=structuredClone(evidence);change(candidate);assert.throws(()=>auditPreflight(candidate,'fixture_db'))})

test('rejects missing independent database identity',()=>assert.throws(()=>auditPreflight(evidence)))
