import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { cleanupExpiredRun } from './retention.mjs'
function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'d2d-retention-'))
  const m={runId:'d2c-1793308880396-331bd58e',scope:'D2C_SINGLE_BACKUP_AND_ISOLATED_RESTORE',cleanupAuthorized:true,hold:false,createdAt:'2026-01-01T00:00:00Z',expiresAt:'2026-01-02T00:00:00Z'}
  const dir=path.join(root,m.runId);fs.mkdirSync(dir)
  const write=()=>fs.writeFileSync(path.join(dir,'cleanup.json'),JSON.stringify(m));write()
  fs.writeFileSync(path.join(dir,'backup.dump.gpg'),'synthetic ciphertext placeholder')
  t.after(()=>{assert.ok(root.startsWith(path.join(os.tmpdir(),'d2d-retention-')));fs.rmSync(root,{recursive:true,force:true})})
  return {root,m,dir,write}
}
test('dry run default, exact expired run deleted; sibling untouched',t=>{const {root,m,dir}=fixture(t);fs.writeFileSync(path.join(root,'unrelated'),'keep');assert.equal(cleanupExpiredRun(root,m).execution,false);assert.ok(fs.existsSync(dir));assert.equal(cleanupExpiredRun(root,m,{execute:true}).removed,true);assert.equal(fs.readFileSync(path.join(root,'unrelated'),'utf8'),'keep')})
for(const kind of ['hold','not expired','no approval','unknown file','path traversal','manifest mismatch'])test(`cleanup refuses ${kind}`,t=>{
  const {root,m,dir,write}=fixture(t)
  if(kind==='hold')m.hold=true
  if(kind==='not expired')m.expiresAt='2099-01-01T00:00:00Z'
  if(kind==='no approval')m.cleanupAuthorized=false
  if(kind==='unknown file')fs.writeFileSync(path.join(dir,'.backup-in-progress'),'active')
  if(kind==='path traversal')m.runId='../other'
  if(kind!=='manifest mismatch')write();else m.expiresAt='2026-01-03T00:00:00Z'
  assert.throws(()=>cleanupExpiredRun(root,m,{execute:true}));assert.ok(fs.existsSync(path.join(dir,'backup.dump.gpg')))
})
