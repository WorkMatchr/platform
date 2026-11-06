/** New P1.7 assumptions only. No supplied URLs/credentials; own networkless PG18. */
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fenceSql } from '../ops/recovery/write-fence.mjs'

assert.ok(process.argv.includes('--synthetic-only'), 'SYNTHETIC_OPT_IN_REQUIRED')
const name = 'wm-p17-' + Date.now() + '-' + randomBytes(4).toString('hex')
const image = 'postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PROGRAMFILES|HOMEDRIVE|HOMEPATH)$/i.test(k)))
const docker = (args, input) => execFileSync('docker', args, { input, env, windowsHide: true, timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
const inventory = () => ({ containers: docker(['ps','-aq','--no-trunc']).split('\n').sort(), volumes: docker(['volume','ls','-q']).split('\n').sort() })
const before = inventory(), checks = []
let created = false, client
const sql = (text, user = 'postgres', db = 'fixture') => docker(['exec','-i',name,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U',user,'-d',db], text)
const denied = (text, user) => assert.throws(() => sql(text, user))
const plan = { scope: 'D2D_DATABASE_LOGIN_FENCE', approved: true, approvalReference: 'p17-synthetic-only', database: 'fixture', operator: 'p17_control', writers: [{ name:'p17_writer', originalLogin:true }] }
try {
  docker(['image','inspect',image])
  docker(['run','-d','--name',name,'--label','workmatchr.p17='+name,'--network','none','--memory','512m','--cpus','1','--tmpfs','/var/lib/postgresql:rw,noexec,nosuid,size=384m','--env','POSTGRES_HOST_AUTH_METHOD=trust',image]); created = true
  for (let i=0;i<60;i++) { try { docker(['exec',name,'pg_isready','-U','postgres']); break } catch { await new Promise(r=>setTimeout(r,300)) } }
  sql('CREATE DATABASE fixture; CREATE ROLE p17_control LOGIN CREATEROLE; CREATE ROLE p17_writer LOGIN; CREATE ROLE p17_replica LOGIN REPLICATION; CREATE ROLE p17_reader LOGIN; CREATE ROLE p17_restore LOGIN; GRANT p17_writer,p17_replica TO p17_control WITH ADMIN TRUE, INHERIT FALSE, SET FALSE; GRANT pg_read_all_stats TO p17_control;', 'postgres', 'postgres')
  sql('REVOKE CONNECT,TEMP ON DATABASE fixture FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT CONNECT ON DATABASE fixture TO p17_control,p17_writer,p17_reader; CREATE TABLE ledger(id int PRIMARY KEY, amount int NOT NULL); INSERT INTO ledger VALUES(1,3025); GRANT SELECT,UPDATE ON ledger TO p17_writer; GRANT SELECT ON ledger TO p17_reader; REVOKE EXECUTE ON FUNCTION lo_create(oid),lo_creat(integer),lo_from_bytea(oid,bytea) FROM PUBLIC;')
  assert.equal(sql("SELECT rolreplication FROM pg_roles WHERE rolname='p17_replica'"), 't')
  assert.equal(sql("SELECT current_user||'|'||rolsuper||'|'||rolreplication FROM pg_roles WHERE rolname=current_user",'p17_control'), 'p17_control|false|false')
  sql('ALTER ROLE p17_replica NOLOGIN;', 'p17_control')
  assert.equal(sql("SELECT rolcanlogin||'|'||rolreplication FROM pg_roles WHERE rolname='p17_replica'"), 'false|true')
  sql('ALTER ROLE p17_replica LOGIN;', 'p17_control')
  denied('ALTER ROLE p17_replica NOREPLICATION;', 'p17_control')
  checks.push('Observed CREATEROLE+ADMIN can change LOGIN on REPLICATION target but cannot change REPLICATION; differs from documentation wording, Neon support still required')
  checks.push('Local PostgreSQL version: '+sql('SHOW server_version'))
  for (const command of ['UPDATE ledger SET amount=1','CREATE TABLE forbidden(id int)','CREATE TEMP TABLE forbidden(id int)','SELECT lo_create(0)','SET ROLE p17_writer','ALTER ROLE p17_writer NOLOGIN','ALTER ROLE p17_writer LOGIN']) denied(command,'p17_reader')
  assert.equal(sql('SELECT amount FROM ledger','p17_reader'), '3025')
  denied('SELECT 1','p17_restore')
  checks.push('reader writes, DDL, large objects, escalation and fence/reopen denied; isolated restore role has no source CONNECT')
  sql('REVOKE CONNECT ON DATABASE fixture FROM p17_reader')
  client = spawn('docker',['exec','-i',name,'psql','-XqAt','-v','ON_ERROR_STOP=1','-U','p17_writer','-d','fixture'],{env,windowsHide:true,stdio:['pipe','pipe','pipe']})
  client.stderr.resume()
  const command = text => new Promise((resolve,reject) => {
    let output=''; const marker='p17_'+randomBytes(6).toString('hex')
    const timer=setTimeout(()=>{cleanup();reject(new Error('SYNTHETIC_CLIENT_TIMEOUT'))},10000)
    const data=chunk=>{output+=chunk.toString();if(output.includes(marker)){cleanup();resolve(output)}}
    const close=()=>{cleanup();reject(new Error('SYNTHETIC_CLIENT_CLOSED'))}
    function cleanup(){clearTimeout(timer);client.stdout.off('data',data);client.off('close',close)}
    client.stdout.on('data',data);client.once('close',close);client.stdin.write(text+"; SELECT '"+marker+"';\n")
  })
  await command('SELECT 1')
  sql(fenceSql(plan,'close'),'p17_control')
  denied('SELECT 1','p17_writer')
  await command('UPDATE ledger SET amount=3026 WHERE id=1')
  assert.equal(sql('SELECT amount FROM ledger'), '3026')
  denied(fenceSql(plan,'verify'),'p17_control')
  checks.push('NOLOGIN rejects new connections but existing connection still writes; verification blocks')
  await new Promise(resolve=>{client.once('close',resolve);client.stdin.end('\\q\n')});client=null
  sql(fenceSql(plan,'verify'),'p17_control')
  sql('CREATE ROLE p17_unknown LOGIN; GRANT CONNECT ON DATABASE fixture TO p17_unknown')
  denied(fenceSql(plan,'verify'),'p17_control'); denied(fenceSql(plan,'open'),'p17_control')
  sql('REVOKE CONNECT ON DATABASE fixture FROM p17_unknown; DROP ROLE p17_unknown')
  sql(fenceSql(plan,'verify'),'p17_control'); sql(fenceSql(plan,'open'),'p17_control')
  assert.equal(sql('SELECT amount FROM ledger','p17_writer'), '3026')
  checks.push('unknown login blocks verify and reopen; reviewed drain and recovery pass')
  console.log(JSON.stringify({ status:'PASS', checks, productionActions:false }))
} finally {
  if(client) { client.stdin.end('\\q\n'); client.kill() }
  if(created) { const own=JSON.parse(docker(['inspect',name]))[0];assert.equal(own.Config.Labels['workmatchr.p17'],name);assert.equal(own.HostConfig.NetworkMode,'none');assert.ok(own.Mounts.every(m=>m.Type==='tmpfs'));docker(['rm','-f',name]) }
  assert.deepEqual(inventory(),before)
  console.log(JSON.stringify({cleanup:'PASS',existingContainers:before.containers.length,existingVolumes:before.volumes.length,unchanged:true}))
}
