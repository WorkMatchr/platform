// Synthetic PostgreSQL and HTTP adapter only; no WorkMatchr/provider network calls.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fenceSql } from '../ops/recovery/write-fence.mjs'
assert.deepEqual(process.argv.slice(2),['--synthetic-only'])
assert.equal(process.platform,'win32')
assert.ok(process.env.LOCALAPPDATA && !/OneDrive|worktrees|\.git/i.test(process.env.LOCALAPPDATA))
const id=`d2d-${Date.now()}-${randomBytes(4).toString('hex')}`
const image='postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PROGRAMFILES|HOMEDRIVE|HOMEPATH)$/i.test(k)))
const launch=args=>spawn('docker',args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']})
async function run(args,input) {
 const p=launch(args),out=[],err=[];const timer=setTimeout(()=>p.kill(),20000)
 p.stdout.on('data',b=>out.push(b));p.stderr.on('data',b=>err.push(b));p.stdin.on('error',()=>{});p.stdin.end(input)
 try{return await new Promise((resolve,reject)=>{p.on('error',reject);p.on('close',code=>resolve({code,out:Buffer.concat(out).toString().trim(),err:Buffer.concat(err).toString()}))})}finally{clearTimeout(timer)}
}
const sqlArgs=user=>['exec','-i',id,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U',user,'-d','d2d_fixture']
async function sql(text,user='d2d_operator') {const r=await run(sqlArgs(user),text);assert.equal(r.code,0,'Synthetic SQL failed; raw output suppressed');return r.out}
const evidence={runId:id,syntheticOnly:true,productionAccess:false,startedAt:new Date().toISOString(),checks:{}}
let created=false,server,writer
const before=await run(['ps','-aq','--no-trunc']);assert.equal(before.code,0)
const plan={scope:'D2D_DATABASE_LOGIN_FENCE',approved:true,approvalReference:'synthetic-only-fixture',database:'d2d_fixture',operator:'d2d_operator',writers:[{name:'d2d_writer',originalLogin:true}]}
try {
 const c=await run(['run','--detach','--name',id,'--label',`workmatchr.d2d=${id}`,'--network','none','--memory','512m','--cpus','1','--tmpfs','/var/lib/postgresql:rw,noexec,nosuid,size=384m','--env','POSTGRES_HOST_AUTH_METHOD=trust',image]);assert.equal(c.code,0);created=true
 for(let n=0;n<60;n++){const r=await run(['exec',id,'pg_isready','-U','postgres']);if(r.code===0)break;await new Promise(r=>setTimeout(r,300))}
 const setup=await run(['exec','-i',id,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],`CREATE ROLE d2d_operator LOGIN CREATEROLE CREATEDB; CREATE ROLE d2d_writer LOGIN; GRANT d2d_writer TO d2d_operator WITH ADMIN TRUE; GRANT pg_read_all_stats TO d2d_operator; CREATE DATABASE d2d_fixture OWNER d2d_operator;`);assert.equal(setup.code,0)
 await sql(`CREATE TABLE ledger(provider_id text PRIMARY KEY, amount integer CHECK(amount>0)); GRANT SELECT,INSERT ON ledger TO d2d_writer;`)
 writer=launch(sqlArgs('d2d_writer'));writer.stderr.resume()
 const q=text=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Writer timeout')),10000);const f=b=>{clearTimeout(timer);writer.stdout.off('data',f);resolve(b.toString().trim())};writer.stdout.on('data',f);writer.stdin.write(text+'\n')})
 await q("BEGIN; INSERT INTO ledger VALUES ('in_flight',10); SELECT 'transaction_started';")
 await sql(fenceSql(plan,'close'))
 assert.notEqual((await run(sqlArgs('d2d_writer'),'SELECT 1;')).code,0)
 await q("COMMIT; SELECT 'drained';")
 assert.notEqual((await run(sqlArgs('d2d_operator'),fenceSql(plan,'verify'))).code,0,'Idle pooled connection must block verify')
 const ended=new Promise(r=>writer.on('close',r));writer.stdin.end();await ended;writer=null
 await sql(fenceSql(plan,'verify'))
 evidence.checks.newLoginBlockedExistingTransactionCommittedIdlePoolDetected=true
 // Same database credential beneath all adapters: a path/method cannot bypass DB login denial.
 server=http.createServer(async(req,res)=>{
  const r=await run(sqlArgs('d2d_writer'),"INSERT INTO ledger VALUES ('webhook_payment',25) ON CONFLICT DO NOTHING;")
  res.writeHead(r.code===0?200:503,{'Cache-Control':'no-store','Retry-After':'60'});res.end(r.code===0?'OK':'Unavailable')
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`
 for(const route of ['/api','/server-action','/webhook','/maintenance','/auth','/legacy']) assert.equal((await fetch(url+route,{method:'POST'})).status,503)
 assert.equal((await fetch(url+'/get-with-write')).status,503)
 assert.equal(await sql('SELECT count(*) FROM ledger;'),'1')
 evidence.checks.syntheticHttpAdaptersCannotBypassFence=true
 await sql(fenceSql(plan,'open'))
 const results=await Promise.all(Array.from({length:6},()=>fetch(url+'/webhook',{method:'POST'})))
 assert.ok(results.every(r=>r.status===200));assert.equal(await sql('SELECT count(*),sum(amount) FROM ledger;'),'2|35')
 evidence.checks.resumeAndSixDuplicateSyntheticWebhooksSingleLedgerEntry=true
 // These are fixture semantics; actual finance service has its own regression suite.
 await sql("CREATE ROLE d2d_bypass LOGIN; GRANT d2d_writer TO d2d_bypass;")
 assert.notEqual((await run(sqlArgs('d2d_operator'),fenceSql(plan,'close'))).code,0)
 assert.equal(await sql("SELECT rolcanlogin FROM pg_roles WHERE rolname='d2d_writer';"),'t')
 evidence.checks.unlistedMembershipFailsBeforeRoleMutation=true
 const backupSql=fs.readFileSync('ops/recovery/prepare-backup-role.sql','utf8')
 const provision=await run(['exec','-i',id,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','d2d_fixture'],"\\set d2c_provision_authorized true\n\\set backup_role d2d_backup\n"+backupSql);assert.equal(provision.code,0)
 await sql('ALTER ROLE d2d_backup LOGIN;','postgres')
 for(const statement of ['CREATE ROLE illicit LOGIN;','SET ROLE d2d_operator;','SET default_transaction_read_only=off; DELETE FROM ledger;']) assert.notEqual((await run(sqlArgs('d2d_backup'),statement)).code,0)
 evidence.checks.backupPrivilegeEscalationAndWriteDenied=true
 const m=JSON.parse((await run(['inspect',id])).out)[0];assert.equal(m.HostConfig.NetworkMode,'none');assert.equal(Object.keys(m.HostConfig.PortBindings??{}).length,0);assert.ok(m.Mounts.every(x=>x.Type==='tmpfs'))
 evidence.status='PASS'
} catch {evidence.status='FAIL';process.exitCode=1}
finally {
 if(server)await new Promise(r=>server.close(r));if(writer){writer.stdin.destroy();writer.kill()}
 if(created){const m=JSON.parse((await run(['inspect',id])).out)[0];assert.equal(m.Config.Labels['workmatchr.d2d'],id);assert.equal((await run(['rm','--force',id])).code,0)}
 const after=await run(['ps','-aq','--no-trunc']);assert.deepEqual(after.out.split('\n').sort(),before.out.split('\n').sort())
 evidence.cleanup={ownContainerAndRolesRemoved:true,existingContainersUnchanged:true};evidence.finishedAt=new Date().toISOString()
 const evidenceDir=path.join(process.env.LOCALAPPDATA,'WorkMatchr','private-evidence','synthetic');fs.mkdirSync(evidenceDir,{recursive:true});fs.writeFileSync(path.join(evidenceDir,id+'.json'),JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({syntheticOnly:true,checks:evidence.checks,cleanup:evidence.cleanup}))
}
