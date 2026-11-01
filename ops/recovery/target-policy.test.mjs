import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { readTargetPolicy, validateTargetPolicy } from './target-policy.mjs'
const policy={scope:'D2D_PRIVATE_TARGET_POLICY',approved:true,approvalReference:'synthetic-target-review',project:'fixture-project',branch:'fixture-branch',host:'db.fixture.test',database:'fixture_db',backupRole:'fixture_backup',restoreOwner:'fixture_owner'}
test('requires independently reviewed identity',()=>{assert.throws(()=>validateTargetPolicy());assert.throws(()=>validateTargetPolicy({...policy,approved:false}));assert.throws(()=>validateTargetPolicy({...policy,approvalReference:null}))})
for(const [field,value] of [['host','https://db.fixture.test'],['host','unconfigured.invalid'],['host','db.fixture.test/password'],['database','db; DROP'],['backupRole','role with spaces'],['restoreOwner',null],['branch','*']])test('rejects malformed '+field+' '+String(value),()=>assert.throws(()=>validateTargetPolicy({...policy,[field]:value})))
test('private target file cannot be the plan, a repository file or an unreviewed template',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wm-policy-fixture-'))
 try {
  const target=path.join(dir,'target.json'),plan=path.join(dir,'plan.json')
  fs.writeFileSync(target,JSON.stringify(policy));fs.writeFileSync(plan,'{}')
  assert.deepEqual(readTargetPolicy(target,plan),policy)
  assert.throws(()=>readTargetPolicy(target,target))
  assert.throws(()=>readTargetPolicy('relative.json',plan))
  fs.mkdirSync(path.join(dir,'.git'));assert.throws(()=>readTargetPolicy(target,plan))
 } finally {assert.ok(path.basename(dir).startsWith('wm-policy-fixture-'));fs.rmSync(dir,{recursive:true,force:true})}
})
