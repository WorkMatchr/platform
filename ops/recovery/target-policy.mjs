// Independently reviewed target identity; never contains credentials.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

export const targetFields=['project','branch','host','database','backupRole','restoreOwner']
export function validateTargetPolicy(target) {
  assert.ok(target && typeof target==='object','Separate target policy required')
  assert.equal(target.scope,'D2D_PRIVATE_TARGET_POLICY')
  assert.equal(target.approved,true,'Target review required')
  assert.ok(typeof target.approvalReference==='string' && target.approvalReference.length>8)
  for(const key of ['project','branch']) assert.match(target[key],/^[a-z0-9][a-z0-9-]{2,100}$/)
  assert.match(target.host,/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/)
  assert.ok(!target.host.endsWith('.invalid'),'Placeholder host refused')
  for(const key of ['database','backupRole','restoreOwner']) assert.match(target[key],/^[a-z_][a-z0-9_]{0,62}$/)
  return target
}
export function readTargetPolicy(file,planFile) {
  assert.ok(path.isAbsolute(file),'Absolute private policy path required')
  const resolved=fs.realpathSync(file)
  assert.notEqual(resolved,fs.realpathSync(planFile),'Plan cannot approve itself')
  assert.ok(!/OneDrive|Dropbox|Google Drive|iCloudDrive/i.test(resolved),'Use non-synchronised private storage')
  for(let cursor=path.resolve(file);;cursor=path.dirname(cursor)) {
    assert.ok(!fs.lstatSync(cursor).isSymbolicLink(),'Linked policy path refused')
    const dir=fs.statSync(cursor).isDirectory()?cursor:path.dirname(cursor)
    assert.ok(!fs.existsSync(path.join(dir,'.git')),'Policy must remain outside Git')
    if(cursor===path.dirname(cursor))break
  }
  const stat=fs.statSync(resolved)
  assert.ok(stat.isFile() && stat.size<=16384,'Invalid policy file')
  return validateTargetPolicy(JSON.parse(fs.readFileSync(resolved,'utf8')))
}
