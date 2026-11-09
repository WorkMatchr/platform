// Explicit future operator stage. Default is an offline plan; never run --execute
// without a separately approved production export/restore and all runbook gates.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { encryptArchive, decryptVerifiedArchive } from '../ops/recovery/encrypted-archive.mjs'

import { readTargetPolicy, validateTargetPolicy, targetFields } from '../ops/recovery/target-policy.mjs'
const image='postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
export function validateApproval(p,now=Date.now(),target) {
  validateTargetPolicy(target)
  assert.equal(p.scope,'D2C_SINGLE_BACKUP_AND_ISOLATED_RESTORE')
  for(const key of targetFields) assert.equal(p[key],target[key],'Target mismatch')
  assert.ok(typeof p.approvalReference==='string' && p.approvalReference.length>8)
  const until=Date.parse(p.until);assert.ok(until>now && until-now<=15*60*1000,'Approval window must be current and bounded')
  for(const gate of ['hostSecurityVerified','keyCustodyVerified','writerPauseVerified','cleanupBackstopVerified','preflight85Verified']) assert.equal(p[gate],true,`Missing operator evidence: ${gate}`)
  assert.match(p.runId,/^d2c-[0-9]{13}-[a-f0-9]{8}$/)
}
const onlineScope='D2C_SINGLE_ONLINE_EXPORT'
const productionPin='ed35968b40546d386343b0195239bcad0bca15e29615d727e7323cba402df84c'
export function validateOnline(p,target,now=Date.now()) {
  validateTargetPolicy(target)
  assert.equal(p.scope,onlineScope)
  assert.equal(target.onlineScope,onlineScope)
  for(const key of [...targetFields,'runId','from','until','fingerprint','approvalReference']) assert.equal(p[key],target[key],'Online policy mismatch')
  assert.match(p.runId,/^d2c-[0-9]{13}-[a-f0-9]{8}$/)
  assert.match(p.fingerprint,/^(?:[A-F0-9]{40}|[A-F0-9]{64})$/)
  const start=Date.parse(p.from), end=Date.parse(p.until)
  assert.ok(start<=now && now<end && end-start<=900000,'Outside approved window')
  assert.equal(p.operatorHost,target.operatorHost)
  assert.equal(p.operatorHost,os.hostname().toLowerCase(),'Unexpected operator host')
  const pin=createHash('sha256').update([p.project,p.branch,p.database,p.backupRole].join('|')).digest('hex')
  const fixture=p.project==='fixture-project' && p.branch==='fixture-branch' && p.database==='fixture_db' && p.backupRole==='fixture_backup' && p.host==='db.fixture.test'
  assert.ok(pin===productionPin || fixture,'Unapproved source')
  for(const gate of ['hostSecurityVerified','keyCustodyVerified','cleanupBackstopVerified','preflight85Verified','onlineSnapshotAccepted','privilegedCredentialAccepted']) {
    assert.equal(p[gate],true)
    assert.equal(target[gate],true)
  }
}
const osEnv=()=>Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PROGRAMFILES|HOMEDRIVE|HOMEPATH)$/i.test(k)))
function launch(cmd,args) {
  if (cmd === 'ubuntu-gpg') {
    cmd = path.join(process.env.SystemRoot, 'System32', 'wsl.exe')
    args = ['--distribution', 'Ubuntu', '--exec', '/usr/bin/gpg', '--no-options', ...args.map(a =>
      /^[Cc]:[\\/]/.test(a) ? '/mnt/c/' + a.slice(3).replaceAll('\\', '/') : a)]
  }
  return spawn(cmd,args,{windowsHide:true,env:osEnv(),stdio:['pipe','pipe','pipe']})
}
async function run(cmd,args,input) {
  const p=launch(cmd,args),out=[],err=[];let size=0,errSize=0,overLimit=false
  const timer=setTimeout(()=>p.kill(),180000)
  const done=new Promise((resolve,reject)=>{
    p.on('error',reject)
    p.stdout.on('data',b=>{size+=b.length;if(size>512*1024*1024){overLimit=true;p.kill()}else out.push(b)})
    p.stderr.on('data',b=>{errSize+=b.length;if(errSize<1024*1024)err.push(b)})
    p.on('close',code=>resolve({code:overLimit?1:code,stdout:Buffer.concat(out),stderr:Buffer.concat(err).toString()}))
  })
  p.stdin.on('error',()=>{});p.stdin.end(input)
  try{return await done}finally{clearTimeout(timer)}
}
async function ok(args,input) {const r=await run('docker',args,input);assert.equal(r.code,0,'Docker/client operation failed; raw stderr suppressed');return r.stdout}
async function stage(mode,config,execute,target) {
  const online=mode==='online-backup'
  assert.ok(online || ['backup','restore'].includes(mode))
  const backup=mode!=='restore'
  if(!execute) {console.log(JSON.stringify({mode,execution:false,requires:'Approved checklist, operator credentials/key custody, client or isolated target provisioned per runbook'}));return}
  if(online) validateOnline(config,target)
  else validateApproval(config,Date.now(),target)
  const { host, database, backupRole, restoreOwner }=target
  assert.equal(process.platform,'win32')
  const privateRoot=path.join(process.env.LOCALAPPDATA,'WorkMatchr')
  const archiveRoot=path.resolve(config.archiveRoot ?? path.join(privateRoot,'production-recovery'))
  const relative=path.relative(privateRoot,archiveRoot)
  assert.ok(/^C:\\/i.test(archiveRoot) && relative && !relative.startsWith('..') && !path.isAbsolute(relative))
  const dir=path.join(archiveRoot,config.runId),archive=path.join(dir,'backup.dump.gpg')
  // The run directory must already be secured by the operator; reject links.
  for(let p=dir;p!==path.dirname(p);p=path.dirname(p))assert.ok(fs.statSync(p).isDirectory()&&!fs.lstatSync(p).isSymbolicLink())
  assert.equal(fs.realpathSync.native(dir).toLowerCase(),dir.toLowerCase())
  assert.match(backup?config.publicKeyring:config.privateKeyring,/^\/dev\/shm\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/)
  const gpg='ubuntu-gpg'
  const client=`d2c-${backup?'client':'restore'}-${config.runId.slice(4)}`
  const meta=JSON.parse((await ok(['inspect',client])).toString())[0]
  assert.equal(meta.Config.Labels['workmatchr.d2c'],config.runId)
  assert.equal(meta.Config.Image,image)
  assert.equal(Object.keys(meta.HostConfig.PortBindings??{}).length,0)
  assert.ok(meta.Mounts.every(m=>m.Type==='tmpfs'),'No persistent database/credential mounts')
  const manifestFile=path.join(dir,'manifest.json')
  if(backup) {
    const cardScript=fileURLToPath(new URL('./d2c-card.ps1',import.meta.url))
    const cardArgs=['-NoProfile','-NonInteractive','-File',cardScript,'-VolumeId',target.volumeId,'-Serial',target.volumeSerial,'-RunId',config.runId]
    const card=async(extra=[])=>{
      const result=await run('pwsh', [...cardArgs,...extra])
      assert.equal(result.code,0,'Archive card check or transfer failed')
    }
    await card()
    assert.ok(!fs.existsSync(manifestFile)&&!fs.existsSync(archive),'One archive only; no overwrite/retry')
    assert.equal(meta.HostConfig.NetworkMode,'bridge')
    if(online) {
      assert.ok(Object.hasOwn(meta.HostConfig.Tmpfs??{},'/run/d2c') || meta.Mounts.some(m=>m.Type==='tmpfs' && m.Destination==='/run/d2c'),'Private credential tmpfs required')
      assert.ok(!meta.Config.Env.some(v=>/^PG(?!DATA=|_MAJOR=|_VERSION=|_SHA256=)/i.test(v)), 'Unexpected libpq environment')
    }
    const base=['exec','-i','--env',`PGHOST=${host}`,'--env',`PGDATABASE=${database}`,'--env',`PGUSER=${backupRole}`,'--env','PGPASSFILE=/run/d2c/pgpass','--env','PGSSLMODE=verify-full','--env','PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt','--env','PGOPTIONS=-c default_transaction_read_only=on',client]
    let password
    let clientArgs=base
    if(online) {
      assert.ok(!process.stdin.isTTY,'Masked operator input required')
      password=fs.readFileSync(0)
      if(password.at(-2)===13 && password.at(-1)===10){password[password.length-2]=10;password=password.subarray(0,-1)}
      assert.ok(password.length>1 && password.length<=4096 && password.at(-1)===10 && !password.subarray(0,-1).some(b=>b===0 || b===10 || b===13),'Invalid credential input')
      clientArgs=[...base,'sh','-c','IFS= read -r PGPASSWORD || exit 1; export PGPASSWORD; exec "$@"','sh']
    }
    try {
    const check=await run('docker',[...clientArgs,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-w','-c',"SELECT json_build_object('database',current_database(),'role',current_user,'version',current_setting('server_version'),'readonly',current_setting('transaction_read_only'),'branch',current_setting('neon.branch_id',true),'project',current_setting('neon.project_id',true),'powerful',rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls) FROM pg_roles WHERE rolname=current_user;"],password)
    assert.equal(check.code,0,'Identity check failed')
    const identity=JSON.parse(check.stdout.toString())
    assert.equal(identity.database,database);assert.equal(identity.role,backupRole);assert.equal(identity.readonly,'on');assert.match(identity.version,/^18\./);if(online) {
      assert.equal(identity.project,target.project)
      assert.equal(identity.branch,target.branch)
    } else assert.equal(identity.powerful,false)
    // pg_dump owns a transactionally consistent snapshot. Writer pause is an
    // independent prerequisite; this flag is operator evidence, not an auth system.
    const lock=path.join(dir,'.backup-in-progress')
    const lockFd=fs.openSync(lock,'wx')
    try {
      if(online) {
        validateOnline(config,target)
        const marker=path.join(privateRoot,config.runId+'.online-used')
        fs.writeFileSync(marker,config.approvalReference,{flag:'wx'})
      }
      const result=await encryptArchive({launch:(cmd,args)=>{const child=launch(cmd,args);if(password && cmd==='docker'){child.stdin.on('error',()=>{});child.stdin.write(password)}return child},source:'docker',sourceArgs:[...clientArgs,'pg_dump','--no-password','--format=custom','--lock-wait-timeout=5s','--serializable-deferrable'],gpg,keyring:config.publicKeyring,fingerprint:config.fingerprint,output:archive})
      await card(['-Archive',archive,'-ExpectedHash',result.sha256])
      fs.writeFileSync(manifestFile,JSON.stringify({runId:config.runId,createdAt:new Date().toISOString(),source:{host,database},...(online?{mode,approvalReference:config.approvalReference,fingerprint:config.fingerprint}:{}),...result},null,2),{flag:'wx'})
      console.log(JSON.stringify({stage:'backup',complete:true,bytes:result.bytes,sha256:result.sha256}))
    } finally {fs.closeSync(lockFd);fs.unlinkSync(lock)}
    } finally {password?.fill(0)}
  } else {
    assert.equal(meta.HostConfig.NetworkMode,'none')
    const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));assert.equal(manifest.runId,config.runId)
    assert.equal((await ok(['exec',client,'psql','-X','-qAt','-U','postgres','-d','d2c_restore','-c',"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');"])).toString().trim(),'0','Target must be empty')
    // Dedicated secure stdin, not a command argument or environment variable.
    const pass=fs.readFileSync(0);assert.ok(pass.length>0&&pass.length<=512)
    let plain
    try {
      plain=await decryptVerifiedArchive({run,gpg,keyring:config.privateKeyring,archive,expectedSha256:manifest.sha256,passphrase:pass.toString().trimEnd()})
      await ok(['exec','-i',client,'pg_restore','-U','workmatchr_restore',`--role=${restoreOwner}`,'--dbname=d2c_restore','--no-password','--single-transaction','--exit-on-error'],plain)
    } finally {pass.fill(0);plain?.fill(0)}
    console.log(JSON.stringify({stage:'restore',loaded:true,integrityAcceptance:'REQUIRED; run preflight and catalog/data comparison before claiming PASS'}))
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const [mode,configFile,flag,policyFile]=process.argv.slice(2)
    assert.ok(process.argv.length===4||process.argv.length===6)
    assert.ok(flag===undefined||flag==='--execute')
    const target=flag==='--execute'?readTargetPolicy(policyFile,configFile):undefined
    await stage(mode,JSON.parse(fs.readFileSync(configFile,'utf8')),flag==='--execute',target)
  } catch (error) {const line=error.stack?.match(/d2c-archive-stage\.mjs:(\d+):/);console.error('Check line '+(line?.[1]??'unknown'));console.error('D2C stage refused or failed; no raw subprocess output. Keep writers closed and inspect the approved run locally.');process.exitCode=1}
}
