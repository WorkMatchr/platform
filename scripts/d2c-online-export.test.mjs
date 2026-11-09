import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {validateOnline,validateApproval} from './d2c-archive-stage.mjs'
import {encryptArchive} from '../ops/recovery/encrypted-archive.mjs'
const now=Date.now()
const plan={operatorHost:os.hostname().toLowerCase(),project:'fixture-project',branch:'fixture-branch',database:'fixture_db',backupRole:'fixture_backup',host:'db.fixture.test',restoreOwner:'fixture_owner',scope:'D2C_SINGLE_ONLINE_EXPORT',approvalReference:'synthetic-consent',runId:'d2c-1793308880396-331bd58e',fingerprint:'A'.repeat(40),from:new Date(now-1000).toISOString(),until:new Date(now+600000).toISOString(),onlineSnapshotAccepted:true,privilegedCredentialAccepted:true,hostSecurityVerified:true,keyCustodyVerified:true,cleanupBackstopVerified:true,preflight85Verified:true}
const policy={...plan,scope:'D2D_PRIVATE_TARGET_POLICY',onlineScope:plan.scope,approved:true}
test('online consent is bounded, target-specific and unusable for the normal stage',()=>{
  validateOnline(plan,policy,now)
  for(const field of ['backupRole','database','project','host','fingerprint','runId'])assert.throws(()=>validateOnline({...plan,[field]:'other'},policy,now))
  assert.throws(()=>validateOnline({...plan,backupRole:'other'},{...policy,backupRole:'other'},now))
  for(const field of ['onlineSnapshotAccepted','privilegedCredentialAccepted'])assert.throws(()=>validateOnline(plan,{...policy,[field]:false},now))
  assert.throws(()=>validateOnline(plan,policy,now+900001))
  assert.throws(()=>validateApproval(plan,now,policy))
})
test('failed dump after emitting bytes cannot publish archive',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wm-online-fixture-'))
  try {
    const output=path.join(dir,'failed.gpg')
    const launch=(cmd,args)=>cmd==='source'?spawn(process.execPath,['-e',"process.stdout.write('fixture');process.exitCode=1"]):spawn(process.execPath,['-e',"require('fs').writeFileSync(process.argv[1],'synthetic partial');process.stdin.resume()",args[args.indexOf('--output')+1]])
    await assert.rejects(encryptArchive({launch,source:'source',sourceArgs:[],gpg:'fake',keyring:'fixture',fingerprint:plan.fingerprint,output}))
    assert.deepEqual(fs.readdirSync(dir),[])
  } finally {fs.rmdirSync(dir)}
})
