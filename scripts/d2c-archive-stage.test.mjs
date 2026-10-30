import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { validateApproval } from './d2c-archive-stage.mjs'
const now=Date.parse('2026-10-29T00:00:00Z')
const target={scope:'D2D_PRIVATE_TARGET_POLICY',approved:true,approvalReference:'synthetic-target-review',project:'fixture-project',branch:'fixture-branch',host:'db.fixture.test',database:'fixture_db',backupRole:'fixture_backup',restoreOwner:'fixture_owner'}
const valid={...target,scope:'D2C_SINGLE_BACKUP_AND_ISOLATED_RESTORE',approvalReference:'synthetic-test-only',until:'2026-10-29T00:10:00Z',runId:'d2c-1793308880396-331bd58e',hostSecurityVerified:true,keyCustodyVerified:true,writerPauseVerified:true,cleanupBackstopVerified:true,preflight85Verified:true}
test('accepts a bounded checklist matching the separately reviewed target',()=>assert.doesNotThrow(()=>validateApproval(valid,now,target)))
for(const key of ['scope','project','branch','host','database','backupRole','restoreOwner','approvalReference','runId','until','hostSecurityVerified','keyCustodyVerified','writerPauseVerified','cleanupBackstopVerified','preflight85Verified'])test('rejects missing '+key,()=>{const v={...valid};delete v[key];assert.throws(()=>validateApproval(v,now,target))})
test('rejects expired approval',()=>assert.throws(()=>validateApproval(valid,now+15*60*1000,target)))
test('rejects an unbounded window',()=>assert.throws(()=>validateApproval({...valid,until:'2026-10-30T00:00:00Z'},now,target)))
test('has no implicit target fallback',()=>assert.throws(()=>validateApproval(valid,now)))
test('rejects unreviewed target',()=>assert.throws(()=>validateApproval(valid,now,{...target,approved:false})))
for(const key of ['project','branch','host','database','backupRole','restoreOwner'])test('rejects changed target '+key,()=>assert.throws(()=>validateApproval({...valid,[key]:'other'},now,target)))
test('published example is not executable',()=>assert.throws(()=>validateApproval(JSON.parse(fs.readFileSync('ops/recovery/operator-plan.example.json','utf8')),now,JSON.parse(fs.readFileSync('ops/recovery/target-policy.example.json','utf8')))))
