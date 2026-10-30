// Exact-run cleanup only. No recursion, scheduler registration or production default.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
export function retentionPlan(root, manifest, now=Date.now()) {
  assert.match(manifest.runId,/^d2c-[0-9]{13}-[a-f0-9]{8}$/)
  assert.equal(manifest.scope,'D2C_SINGLE_BACKUP_AND_ISOLATED_RESTORE')
  assert.equal(manifest.cleanupAuthorized,true)
  assert.equal(manifest.hold,false,'Never delete an incident/migration checkpoint on a timer')
  assert.ok(Date.parse(manifest.expiresAt)<=now && Date.parse(manifest.createdAt)<Date.parse(manifest.expiresAt),'Not expired/invalid retention')
  const base=path.resolve(root), dir=path.join(base,manifest.runId)
  let ancestor=dir
  while (ancestor!==path.dirname(ancestor)) {
    assert.ok(!fs.lstatSync(ancestor).isSymbolicLink(),'No symlink/junction in cleanup path')
    ancestor=path.dirname(ancestor)
  }
  const marker=JSON.parse(fs.readFileSync(path.join(dir,'cleanup.json'),'utf8'))
  assert.deepEqual(marker,manifest,'Manifest changed')
  const allowed=['backup.dump.gpg','manifest.json','cleanup.json']
  const entries=fs.readdirSync(dir)
  assert.ok(entries.length && entries.every(n=>allowed.includes(n)),'Unknown file or active backup; stop')
  for(const n of entries) assert.ok(fs.lstatSync(path.join(dir,n)).isFile()&&!fs.lstatSync(path.join(dir,n)).isSymbolicLink())
  return {dir,files:entries.map(n=>path.join(dir,n)),runId:manifest.runId}
}
export function cleanupExpiredRun(root,manifest,{execute=false,now=Date.now()}={}) {
  const plan=retentionPlan(root,manifest,now)
  if(!execute)return {runId:plan.runId,execution:false,files:plan.files.map(f=>path.basename(f))}
  // Revalidate immediately; operator must exclude concurrent backup access with ACLs.
  retentionPlan(root,manifest,now)
  for(const f of plan.files)fs.unlinkSync(f)
  fs.rmdirSync(plan.dir)
  return {runId:plan.runId,execution:true,removed:!fs.existsSync(plan.dir)}
}
