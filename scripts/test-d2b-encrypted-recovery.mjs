// Synthetic-only Windows/Docker drill. No URL input, host ports, mounts or production access.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { encryptArchive, decryptVerifiedArchive } from '../ops/recovery/encrypted-archive.mjs'

const d2d = process.argv.includes('--d2d-controls')
const d2c = d2d || process.argv.includes('--d2c-controls')
assert.deepEqual(process.argv.slice(2), d2d ? ['--synthetic-only', '--d2d-controls'] : d2c ? ['--synthetic-only', '--d2c-controls'] : ['--synthetic-only'])
assert.equal(process.platform, 'win32')
const runId = `d2b-${Date.now()}-${randomBytes(4).toString('hex')}`
const image = 'postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5'
const gpg = 'C:/Program Files/Git/usr/bin/gpg.exe'
const gpgconf = 'C:/Program Files/Git/usr/bin/gpgconf.exe'
const base = path.join(process.env.LOCALAPPDATA, 'WorkMatchr')
assert.ok(!/OneDrive|worktrees|\.git/i.test(base))
const backupDir = path.join(base, 'recovery-tests', runId)
const keyDir = path.join(base, 'operator-secrets', runId)
const emptyKeyDir = path.join(base, 'operator-secrets', `${runId}-empty`)
// Keep Git/MSYS gpg-agent socket paths below the Unix-domain path length limit.
const publicKeyDir = path.join(base, 'public-keys', runId)
const recoveryKeyDir = path.join(base, 'recovery-keys', runId)
const dirs = [backupDir, keyDir, emptyKeyDir, ...(d2c ? [publicKeyDir] : []), ...(d2d ? [recoveryKeyDir] : [])]
const containers = []
const password = randomBytes(32).toString('hex') // synthetic key passphrase, only in RAM/fd
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) =>
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|COMSPEC|PROGRAMFILES|PROGRAMFILES\(X86\)|COMMONPROGRAMFILES|HOMEDRIVE|HOMEPATH)$/i.test(k)))
const evidence = { runId, startedAt: new Date().toISOString(), syntheticOnly: true, image,
  stages: {}, checks: {}, cleanup: {}, productionAccess: false }
const hash = value => createHash('sha256').update(value).digest('hex')
let stage = 'preflight'

function launch(command, args, secretFd = false) {
  // Git for Windows ships MSYS GnuPG, which requires /c/... rather than backslashes.
  if (command === gpg || command === gpgconf) args = args.map(a => /^[A-Za-z]:[\\/]/.test(a)
    ? a.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`) : a)
  return spawn(command, args, { windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe', ...(secretFd ? ['pipe'] : [])] })
}
async function run(command, args, input, secret) {
  const child = launch(command, args, secret !== undefined)
  const out = [], err = []
  let size = 0
  const timer = setTimeout(() => child.kill(), 180000)
  const done = new Promise((resolve, reject) => {
    child.on('error', reject)
    child.stdout.on('data', b => { size += b.length; if (size > 512 * 1024 * 1024) child.kill(); else out.push(b) })
    child.stderr.on('data', b => { if (err.reduce((s, v) => s + v.length, 0) < 1024 * 1024) err.push(b) })
    child.on('close', code => resolve({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() }))
  })
  child.stdin.on('error', () => {})
  if (secret !== undefined) { child.stdio[3].on('error', () => {}); child.stdio[3].end(`${secret}\n`) }
  child.stdin.end(input)
  try { return await done } finally { clearTimeout(timer) }
}
async function ok(command, args, input, secret) {
  const result = await run(command, args, input, secret)
  if (result.code !== 0 && command === 'docker' && args.includes('pg_restore')) {
    evidence.restoreToolError = result.stderr.split(/\r?\n/).filter(l=>l.startsWith('pg_restore: error:')).map(l=>l.slice(0,200)).slice(0,3)
  }
  assert.equal(result.code, 0, `${stage}: child failed; raw stderr suppressed`)
  return result.stdout
}
const docker = (args, input) => ok('docker', args, input)
async function inspect(id) { return JSON.parse((await docker(['inspect', id])).toString())[0] }
async function sql(id, text, user = 'postgres', database = 'd2b_fixture') {
  return (await docker(['exec', '-i', id, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-U', user, '-d', database], text)).toString().trim()
}
async function denied(id, text, user, expected) {
  const r = await run('docker', ['exec', '-i', id, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate', '-U', user, '-d', 'd2b_fixture'], text)
  assert.notEqual(r.code, 0); assert.ok(r.stderr.includes(expected), 'Expected SQLSTATE was not returned')
}
const roles = `
CREATE ROLE d2b_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE d2b_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS;
CREATE ROLE d2b_backup_rls LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE d2b_restore LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE d2b_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT d2b_owner TO d2b_restore WITH INHERIT FALSE, SET TRUE;
CREATE DATABASE d2b_fixture OWNER d2b_owner TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER builtin BUILTIN_LOCALE 'C.UTF-8';
REVOKE ALL ON DATABASE d2b_fixture FROM PUBLIC;
GRANT CONNECT ON DATABASE d2b_fixture TO d2b_backup, d2b_backup_rls, d2b_restore, d2b_runtime;
`
const migrations = [
  `SET ROLE d2b_owner;
   REVOKE ALL ON SCHEMA public FROM PUBLIC;
   CREATE SCHEMA fixture AUTHORIZATION d2b_owner;
   CREATE TABLE public._prisma_migrations (migration_name text PRIMARY KEY, checksum text NOT NULL CHECK(length(checksum)=64), finished_at timestamptz NOT NULL);
   CREATE TABLE fixture.tenant (id integer PRIMARY KEY, name text NOT NULL UNIQUE);
   CREATE TABLE fixture.record (id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY, tenant_id integer NOT NULL REFERENCES fixture.tenant, amount integer NOT NULL CHECK(amount>=0), payload text NOT NULL);
   CREATE INDEX record_tenant_idx ON fixture.record(tenant_id);
   CREATE TABLE fixture.audit (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, record_id bigint NOT NULL, operation text NOT NULL);
   RESET ROLE;`,
  `SET ROLE d2b_owner;
   CREATE FUNCTION fixture.audit_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,fixture AS $$ BEGIN INSERT INTO fixture.audit(record_id,operation) VALUES(NEW.id,'INSERT'); RETURN NEW; END $$;
   CREATE FUNCTION fixture.audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable synthetic audit' USING ERRCODE='55000'; END $$;
   CREATE TRIGGER record_audit AFTER INSERT ON fixture.record FOR EACH ROW EXECUTE FUNCTION fixture.audit_insert();
   CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON fixture.audit FOR EACH ROW EXECUTE FUNCTION fixture.audit_immutable();
   REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fixture FROM PUBLIC;
   INSERT INTO fixture.tenant VALUES(1,'Synthetic A'),(2,'Synthetic B');
   INSERT INTO fixture.record(tenant_id,amount,payload) SELECT 1+(g%2),g,repeat(md5(g::text),16) FROM generate_series(1,50000) g;
   RESET ROLE;`,
  `SET ROLE d2b_owner;
   GRANT USAGE ON SCHEMA fixture,public TO d2b_backup,d2b_backup_rls,d2b_runtime;
   GRANT SELECT ON ALL TABLES IN SCHEMA fixture,public TO d2b_backup,d2b_backup_rls;
   GRANT SELECT ON ALL SEQUENCES IN SCHEMA fixture TO d2b_backup,d2b_backup_rls;
   GRANT SELECT,INSERT ON fixture.record TO d2b_runtime;
   GRANT USAGE ON ALL SEQUENCES IN SCHEMA fixture TO d2b_runtime;
   ALTER TABLE fixture.record ENABLE ROW LEVEL SECURITY;
   ALTER TABLE fixture.record FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_scope ON fixture.record USING(tenant_id=current_setting('fixture.tenant',true)::integer) WITH CHECK(tenant_id=current_setting('fixture.tenant',true)::integer);
   ALTER DEFAULT PRIVILEGES FOR ROLE d2b_owner IN SCHEMA fixture REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
   RESET ROLE;`
]
const catalogQuery = `SELECT json_build_object(
 'schemas',(SELECT json_agg(x ORDER BY name) FROM (SELECT nspname name,pg_get_userbyid(nspowner) owner,nspacl::text acl FROM pg_namespace WHERE nspname IN ('fixture','public')) x),
 'indexes',(SELECT json_agg(x ORDER BY indexname) FROM (SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('fixture','public')) x),
 'columns',(SELECT json_agg(x ORDER BY table_schema,table_name,ordinal_position) FROM (SELECT table_schema,table_name,ordinal_position,column_name,data_type,is_nullable,column_default,is_identity FROM information_schema.columns WHERE table_schema IN ('fixture','public')) x),
 'constraints',(SELECT json_agg(x ORDER BY n,c) FROM (SELECT conrelid::regclass::text n,conname c,pg_get_constraintdef(oid) def FROM pg_constraint WHERE connamespace IN ('fixture'::regnamespace,'public'::regnamespace)) x),
 'tables',(SELECT json_agg(x ORDER BY name) FROM (SELECT c.oid::regclass::text name,pg_get_userbyid(relowner) owner,relkind,relacl::text,relrowsecurity,relforcerowsecurity FROM pg_class c WHERE relnamespace IN ('fixture'::regnamespace,'public'::regnamespace)) x),
 'functions',(SELECT json_agg(x ORDER BY name) FROM (SELECT oid::regprocedure::text name,pg_get_userbyid(proowner) owner,proacl::text,prosecdef,pg_get_functiondef(oid) def FROM pg_proc WHERE pronamespace='fixture'::regnamespace) x),
 'triggers',(SELECT json_agg(x ORDER BY name) FROM (SELECT tgname name,pg_get_triggerdef(oid) def FROM pg_trigger WHERE tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='fixture'::regnamespace) AND NOT tgisinternal) x),
 'policies',(SELECT json_agg(x ORDER BY policyname) FROM (SELECT * FROM pg_policies WHERE schemaname='fixture') x),
 'defaults',(SELECT json_agg(x ORDER BY role) FROM (SELECT pg_get_userbyid(defaclrole) role,defaclnamespace::regnamespace::text ns,defaclobjtype,defaclacl::text FROM pg_default_acl) x),
 'database',(SELECT json_build_object('owner',pg_get_userbyid(datdba),'acl',datacl::text,'encoding',pg_encoding_to_char(encoding),'collate',datcollate,'ctype',datctype,'provider',datlocprovider,'locale',datlocale,'collationVersion',datcollversion) FROM pg_database WHERE datname=current_database())
);`
const dataQuery = `SELECT json_build_object(
 'registry',(SELECT json_agg(x ORDER BY migration_name) FROM public._prisma_migrations x),
 'records',(SELECT json_build_object('count',count(*),'digest',md5(string_agg(id||':'||tenant_id||':'||amount||':'||payload,'|' ORDER BY id))) FROM fixture.record),
 'audit',(SELECT json_build_object('count',count(*),'digest',md5(string_agg(id||':'||record_id||':'||operation,'|' ORDER BY id))) FROM fixture.audit),
 'tenants',(SELECT json_agg(x ORDER BY id) FROM fixture.tenant x),
 'sequence_record',(SELECT last_value FROM fixture.record_id_seq),
 'sequence_audit',(SELECT last_value FROM fixture.audit_id_seq)
);`
let snapshotProcess
try {
  const beforeContainers = JSON.parse((await docker(['ps', '-aq', '--no-trunc'])).toString().trim().split(/\r?\n/).filter(Boolean).length ? JSON.stringify((await docker(['ps', '-aq', '--no-trunc'])).toString().trim().split(/\r?\n/).filter(Boolean).sort()) : '[]')
  evidence.existingContainerIds = beforeContainers
  evidence.versions = { node: process.version, gpg: (await ok(gpg, ['--version'])).toString().split(/\r?\n/)[0] }
  const sid = (await ok('powershell.exe', ['-NoProfile','-Command','[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value'])).toString().trim()
  assert.match(sid, /^S-1-5-[0-9-]+$/)
  for (const dir of dirs) {
    assert.equal(fs.existsSync(dir), false); fs.mkdirSync(dir,{recursive:true})
    await ok('icacls.exe', [dir,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'])
    const acl = JSON.parse((await ok('powershell.exe',['-NoProfile','-Command',`$a=Get-Acl -LiteralPath '${dir.replace(/'/g,"''")}'; [pscustomobject]@{Protected=$a.AreAccessRulesProtected;Rules=@($a.Access | ForEach-Object { $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value })}|ConvertTo-Json -Compress`])).toString())
    assert.equal(acl.Protected,true); assert.ok(acl.Rules.every(s=>[sid,'S-1-5-18'].includes(s)))
  }
  evidence.checks.operatorAndSystemAclOnly = true
  stage='key-generation'
  await ok(gpg,['--homedir',keyDir,'--batch','--pinentry-mode','loopback','--passphrase-fd','0','--quick-generate-key','D2B Synthetic <d2b@example.invalid>','rsa3072','encr','1d'],`${password}\n`)
  const keys=(await ok(gpg,['--homedir',keyDir,'--batch','--with-colons','--list-keys'])).toString()
  const fingerprint=keys.split(/\r?\n/).find(l=>l.startsWith('fpr:')).split(':')[9]
  assert.match(fingerprint,/^[A-F0-9]{40}$/)
  if(d2c) {
    stage='d2c-export-public-key'
    const publicKey=await ok(gpg,['--homedir',keyDir,'--batch','--export',fingerprint])
    stage='d2c-import-public-key'
    await ok(gpg,['--homedir',publicKeyDir,'--batch','--import'],publicKey)
    stage='d2c-verify-public-only-keyring'
    const privateKeys=await ok(gpg,['--homedir',publicKeyDir,'--batch','--with-colons','--list-secret-keys'])
    assert.ok(!privateKeys.toString().includes('sec:'))
    evidence.checks.backupKeyringContainsNoPrivateKey=true
  }
  if(d2d) {
    stage='d2d-portable-key-recovery'
    // Passphrase-protected export, in the separate ACL-restricted recovery keyring.
    // Passphrase uses stdin; never command arguments, environment or a plaintext file.
    const portable=await ok(gpg,['--homedir',keyDir,'--batch','--pinentry-mode','loopback','--passphrase-fd','0','--export-secret-keys',fingerprint],`${password}\n`)
    const protectedExport=path.join(recoveryKeyDir,'portable.secret.gpg')
    try {
      fs.writeFileSync(protectedExport,portable,{flag:'wx'})
      await ok(gpg,['--homedir',recoveryKeyDir,'--batch','--pinentry-mode','loopback','--passphrase-fd','0','--import',protectedExport],`${password}\n`)
    } finally {portable.fill(0);if(fs.existsSync(protectedExport))fs.unlinkSync(protectedExport)}
    evidence.checks.passphraseProtectedPortableKeyImportedIntoEmptyKeyring=true
  }
  for (const part of ['source','restore']) {
    stage=`create-${part}`
    const id=(await docker(['run','--detach','--name',`${runId}-${part}`,'--label',`workmatchr.d2b=${runId}`,'--network','none','--memory','768m','--cpus','1','--tmpfs','/var/lib/postgresql:rw,nosuid,nodev,size=536870912','--tmpfs','/tmp:rw,nosuid,nodev,size=67108864','--env','POSTGRES_HOST_AUTH_METHOD=trust',image])).toString().trim()
    containers.push(id)
    const meta=await inspect(id)
    assert.equal(meta.HostConfig.NetworkMode,'none'); assert.equal(Object.keys(meta.HostConfig.PortBindings ?? {}).length,0,'No published ports allowed')
    assert.equal(meta.Config.Labels['workmatchr.d2b'],runId)
    assert.ok(meta.Mounts.every(m=>m.Type==='tmpfs'),'Only temporary RAM-backed mounts allowed')
    let ready=false
    for(let n=0;n<60;n++) {
      const r=await run('docker',['exec',id,'pg_isready','-U','postgres'])
      const pid1=await run('docker',['exec',id,'cat','/proc/1/comm'])
      // The image's temporary initdb server is not the final PostgreSQL process.
      if(r.code===0 && pid1.stdout.toString().trim()==='postgres'){ready=true;break}
      await new Promise(r=>setTimeout(r,250))
    }
    assert.ok(ready)
    await sql(id,roles,'postgres','postgres')
  }
  const [source,target]=containers
  evidence.versions.pg_dump=(await docker(['exec',source,'pg_dump','--version'])).toString().trim()
  evidence.versions.pg_restore=(await docker(['exec',target,'pg_restore','--version'])).toString().trim()
  stage='synthetic-fixtures'
  for (const [i,migration] of migrations.entries()) {
    await sql(source,`BEGIN;${migration} INSERT INTO public._prisma_migrations VALUES ('d2b_synthetic_00${i+1}','${hash(migration)}','2026-10-29T00:00:00Z'); COMMIT;`)
  }
  const dataBefore=JSON.parse(await sql(source,dataQuery)),catalogBefore=JSON.parse(await sql(source,catalogQuery))
  assert.equal(dataBefore.registry.length,3)
  assert.equal(catalogBefore.database.provider,'b');assert.equal(catalogBefore.database.locale,'C.UTF-8')
  evidence.databaseLocale={encoding:catalogBefore.database.encoding,provider:catalogBefore.database.provider,locale:catalogBefore.database.locale,collationVersion:catalogBefore.database.collationVersion}
  evidence.syntheticDatabaseBytes=Number(await sql(source,'SELECT pg_database_size(current_database());'))
  evidence.checks.backupNoWrite = true
  for (const query of ['CREATE TABLE public.forbidden(id int);','UPDATE fixture.record SET amount=1;','DELETE FROM fixture.record;']) await denied(source,query,'d2b_backup','42501')
  stage='rls-fail-closed'
  const invalidDump=await run('docker',['exec',source,'pg_dump','-U','d2b_backup_rls','-Fc','--no-password','-d','d2b_fixture'])
  assert.notEqual(invalidDump.code,0); assert.match(invalidDump.stderr,/row-level security|row_security/i); invalidDump.stdout.fill(0)
  evidence.checks.backupWithoutRlsBypassRejected=true
  stage='consistent-snapshot'
  snapshotProcess=launch('docker',['exec','-i',source,'psql','-X','-qAt','-U','postgres','-d','d2b_fixture'])
  snapshotProcess.stderr.resume()
  const snapshot=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('snapshot timeout')),10000)
    snapshotProcess.stdout.on('data',b=>{const s=b.toString().trim();if(/^[0-9A-F-]+$/.test(s)){clearTimeout(timeout);resolve(s)}})
    snapshotProcess.stdin.write('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT pg_export_snapshot();\n')
  })
  await sql(source,"INSERT INTO fixture.record(tenant_id,amount,payload) VALUES(1,1,'synthetic committed after snapshot');")
  // Sequences are not MVCC snapshots. Check their actual dump-time values explicitly.
  // This demonstrates why zero-loss rollback additionally needs a full writer pause.
  evidence.consistency = { snapshotRows:50000, committedAfterSnapshotRows:1,
    sequenceBeforeConcurrentWrite:dataBefore.sequence_record }
  dataBefore.sequence_record=Number(await sql(source,'SELECT last_value FROM fixture.record_id_seq;'))
  dataBefore.sequence_audit=Number(await sql(source,'SELECT last_value FROM fixture.audit_id_seq;'))
  evidence.consistency.sequenceAtDump=dataBefore.sequence_record
  const encrypted=path.join(backupDir,'synthetic.dump.gpg'),partial=`${encrypted}.partial`
  stage='dump-and-encrypt'
  const dumpStart=performance.now()
  if(d2c) {
    await encryptArchive({launch,source:'docker',sourceArgs:['exec',source,'pg_dump','-U','d2b_backup','-Fc','--no-password',`--snapshot=${snapshot}`,'--lock-wait-timeout=5s','-d','d2b_fixture'],gpg,keyring:publicKeyDir,fingerprint,output:encrypted})
  } else {
  const dump=launch('docker',['exec',source,'pg_dump','-U','d2b_backup','-Fc','--no-password',`--snapshot=${snapshot}`,'--lock-wait-timeout=5s','-d','d2b_fixture'])
  const enc=launch(gpg,['--homedir',keyDir,'--batch','--trust-model','always','--cipher-algo','AES256','--compress-algo','none','--recipient',fingerprint,'--output',partial,'--encrypt'])
  const exit=p=>new Promise((resolve,reject)=>{p.on('error',reject);p.on('close',resolve);p.stderr.resume();p.stdout.resume()})
  // Do not drain dump stdout: it is the binary, plaintext pipe into encryption.
  const dumpExit=new Promise((resolve,reject)=>{dump.on('error',reject);dump.on('close',resolve);dump.stderr.resume()})
  const encExit=exit(enc)
  dump.stdin.end()
  await pipeline(dump.stdout,enc.stdin)
  assert.deepEqual(await Promise.all([dumpExit,encExit]),[0,0])
  fs.renameSync(partial,encrypted)
  }
  snapshotProcess.stdin.end('ROLLBACK;\n')
  await new Promise(resolve=>snapshotProcess.on('close',resolve)); snapshotProcess=null
  evidence.stages.dumpAndEncryptionMs=Math.round(performance.now()-dumpStart)
  evidence.encryptedBytes=fs.statSync(encrypted).size
  evidence.encryptedSha256=hash(fs.readFileSync(encrypted))
  evidence.checks.onlyCiphertextOnDisk=fs.readdirSync(backupDir).every(n=>n.endsWith('.gpg'))
  stage='wrong-key-and-tamper'
  const wrong=await run(gpg,['--homedir',emptyKeyDir,'--batch','--status-fd','2','--decrypt',encrypted]); assert.notEqual(wrong.code,0);assert.match(wrong.stderr,/NO_SECKEY/);wrong.stdout.fill(0)
  const bad=fs.readFileSync(encrypted);bad[Math.floor(bad.length/2)]^=1
  const badPath=path.join(backupDir,'tampered.gpg');fs.writeFileSync(badPath,bad);bad.fill(0)
  const corrupt=await run(gpg,['--homedir',keyDir,'--batch','--status-fd','2','--pinentry-mode','loopback','--passphrase-fd','0','--decrypt',badPath],`${password}\n`)
  assert.notEqual(corrupt.code,0);assert.match(corrupt.stderr,/BADMDC|DECRYPTION_FAILED/);corrupt.stdout.fill(0)
  evidence.checks.wrongKeyRejected=true;evidence.checks.tamperingRejectedBeforeRestore=true
  stage='decrypt-and-restore'
  const restoreStart=performance.now()
  const decrypted=d2c ? {code:0,stderr:'[GNUPG:] DECRYPTION_OKAY',stdout:await decryptVerifiedArchive({run,gpg,keyring:d2d?recoveryKeyDir:keyDir,archive:encrypted,expectedSha256:evidence.encryptedSha256,passphrase:password})} : await run(gpg,['--homedir',keyDir,'--batch','--status-fd','2','--pinentry-mode','loopback','--passphrase-fd','0','--decrypt',encrypted],`${password}\n`)
  if(d2d)evidence.checks.restoredUsingImportedKeyWithoutOriginalKeyring=true
  assert.equal(decrypted.code,0,'Valid encrypted archive must decrypt');assert.match(decrypted.stderr,/DECRYPTION_OKAY/)
  const plaintext=decrypted.stdout
  const decryptMs=performance.now()-restoreStart
  assert.equal(plaintext.subarray(0,5).toString(),'PGDMP')
  assert.equal(await sql(target,"SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema');"),'0')
  stage='pg-restore'
  try { await docker(['exec','-i',target,'pg_restore','-U','d2b_restore','--role=d2b_owner','--exit-on-error','--single-transaction','--no-password','-d','d2b_fixture'],plaintext) } finally { plaintext.fill(0) }
  evidence.stages.decryptMs=Math.round(decryptMs)
  evidence.stages.decryptAndRestoreMs=Math.round(performance.now()-restoreStart)
  stage='integrity-verification'
  const dataAfter=JSON.parse(await sql(target,dataQuery)),catalogAfter=JSON.parse(await sql(target,catalogQuery))
  for (const key of Object.keys(dataBefore)) assert.deepEqual(dataAfter[key],dataBefore[key],`Data integrity differs: ${key}`)
  for (const key of Object.keys(catalogBefore)) assert.deepEqual(catalogAfter[key],catalogBefore[key],`Catalog integrity differs: ${key}`)
  const roleQuery="SELECT json_agg(x ORDER BY rolname) FROM (SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolinherit FROM pg_roles WHERE rolname LIKE 'd2b_%') x;"
  assert.deepEqual(JSON.parse(await sql(source,roleQuery)),JSON.parse(await sql(target,roleQuery)))
  assert.equal(await sql(source,'SELECT count(*) FROM fixture.record;'),'50001')
  assert.equal(await sql(target,'SELECT count(*) FROM fixture.record;'),'50000')
  assert.equal(await sql(target,"SET fixture.tenant='1';SELECT count(*) FROM fixture.record;",'d2b_runtime'),'25000')
  await denied(target,"SET fixture.tenant='1'; INSERT INTO fixture.record(tenant_id,amount,payload) VALUES(2,1,'forbidden');",'d2b_runtime','42501')
  await denied(target,"SET fixture.tenant='1'; INSERT INTO fixture.record(tenant_id,amount,payload) VALUES(1,-1,'invalid');",'d2b_runtime','23514')
  await denied(target,"SET ROLE d2b_owner; DELETE FROM fixture.audit;",'d2b_restore','55000')
  await denied(target,'CREATE ROLE forbidden;','d2b_restore','42501')
  await denied(target,'CREATE DATABASE forbidden;','d2b_restore','42501')
  await denied(target,"INSERT INTO fixture.record(tenant_id,amount,payload) VALUES(99,1,'invalid');",'postgres','23503')
  for(const query of ['CREATE TABLE public.forbidden(id int);','UPDATE fixture.record SET amount=1;','DELETE FROM fixture.record;']) await denied(target,query,'d2b_backup','42501')
  evidence.stages.restoreIncludingVerificationMs=Math.round(performance.now()-restoreStart)
  evidence.checks={...evidence.checks,networkNone:true,publishedPorts:0,persistentDatabaseVolumes:0,
    schemaConstraintsFunctionsTriggersOwnersAndAclsEqual:true,roleCapabilitiesEqual:true,
    syntheticMigrationChecksumsEqual:true,syntheticMigrationCount:3,dataAndSequenceDigestsEqual:true,
    postSnapshotWriteExcluded:true,rlsIsolationAndConstraintEnforcement:true,restoreOperatorNotClusterAdmin:true}
  if(d2c) {
    stage='d2c-pipeline-failure-controls'
    const failedOutput=path.join(backupDir,'failed.gpg')
    await assert.rejects(encryptArchive({launch,source:process.execPath,sourceArgs:['-e',"process.stdout.write('PGDMP synthetic');process.exitCode=2"],gpg,keyring:publicKeyDir,fingerprint,output:failedOutput}))
    assert.ok(!fs.existsSync(failedOutput)&&!fs.existsSync(`${failedOutput}.partial`))
    await assert.rejects(encryptArchive({launch,source:process.execPath,sourceArgs:['-e','setInterval(()=>{},1000)'],gpg,keyring:publicKeyDir,fingerprint,output:failedOutput,timeoutMs:1000}))
    assert.ok(!fs.existsSync(failedOutput)&&!fs.existsSync(`${failedOutput}.partial`))
    await assert.rejects(encryptArchive({launch,source:process.execPath,sourceArgs:[],gpg,keyring:publicKeyDir,fingerprint,output:encrypted}))
    await assert.rejects(decryptVerifiedArchive({run,gpg,keyring:keyDir,archive:badPath,expectedSha256:evidence.encryptedSha256,passphrase:password}))
    evidence.checks.failedDumpTimeoutOverwriteAndHashMismatchRejected=true
    stage='d2c-minimal-backup-role'
    await sql(source,'CREATE DATABASE d2c_minimal OWNER d2b_owner;','postgres','postgres')
    await sql(source,'CREATE TABLE public.sample(id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY); INSERT INTO public.sample SELECT FROM generate_series(1,100);','postgres','d2c_minimal')
    const proposal=fs.readFileSync('ops/recovery/prepare-backup-role.sql','utf8')
    const unapproved=await run('docker',['exec','-i',source,'psql','-X','-qAt','-U','postgres','-d','d2c_minimal'],proposal)
    assert.notEqual(unapproved.code,0)
    assert.equal(await sql(source,"SELECT count(*) FROM pg_roles WHERE rolname='d2c_backup';"),'0')
    await sql(source,"\\set d2c_provision_authorized true\n\\set backup_role d2c_backup\n"+proposal,'postgres','d2c_minimal')
    assert.equal(await sql(source,"SELECT rolcanlogin OR rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls FROM pg_roles WHERE rolname='d2c_backup';"),'f')
    await sql(source,'ALTER ROLE d2c_backup LOGIN;','postgres','d2c_minimal') // synthetic local socket only
    assert.equal(await sql(source,"SELECT current_setting('transaction_read_only');",'d2c_backup','d2c_minimal'),'on')
    const minimalDump=await docker(['exec',source,'pg_dump','-U','d2c_backup','--no-password','-Fc','-d','d2c_minimal'])
    assert.equal(minimalDump.subarray(0,5).toString(),'PGDMP');minimalDump.fill(0)
    const deniedWrite=await run('docker',['exec','-i',source,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','d2c_backup','-d','d2c_minimal'],'SET default_transaction_read_only=off; INSERT INTO sample DEFAULT VALUES;')
    assert.notEqual(deniedWrite.code,0)
    evidence.checks.minimalNoBypassBackupRoleAndProvisionGate=true
    stage='d2c-writer-fence'
    await sql(source,'CREATE ROLE d2c_writer LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE; GRANT CONNECT ON DATABASE d2c_minimal TO d2c_writer; GRANT USAGE ON SCHEMA public TO d2c_writer; GRANT INSERT,SELECT ON sample TO d2c_writer; GRANT USAGE ON SEQUENCE sample_id_seq TO d2c_writer; ALTER ROLE d2c_writer SET default_transaction_read_only=on;','postgres','d2c_minimal')
    const writer=launch('docker',['exec','-i',source,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','d2c_writer','-d','d2c_minimal'])
    writer.stderr.resume()
    const nextLine=query=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{writer.kill();reject(new Error('Synthetic writer timeout'))},10000);const listener=b=>{const s=b.toString().trim();if(s){clearTimeout(t);writer.stdout.off('data',listener);resolve(s)}};writer.stdout.on('data',listener);writer.stdin.write(query+'\n')})
    try {
      const pid=await nextLine('SELECT pg_backend_pid();');assert.match(pid,/^\d+$/)
      await sql(source,'ALTER ROLE d2c_writer NOLOGIN;','postgres','d2c_minimal')
      assert.equal(await nextLine('SET default_transaction_read_only=off; INSERT INTO sample DEFAULT VALUES RETURNING id;'),'101')
      const refused=await run('docker',['exec',source,'psql','-X','-qAt','-U','d2c_writer','-d','d2c_minimal','-c','SELECT 1']);assert.notEqual(refused.code,0)
      const closed=new Promise(resolve=>writer.on('close',resolve))
      assert.equal(await sql(source,`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid=${pid} AND usename='d2c_writer' AND datname='d2c_minimal';`,'postgres','d2c_minimal'),'t')
      writer.stdin.end() // psql otherwise waits for stdin after its backend has ended.
      await closed
      assert.equal(await sql(source,"SELECT count(*) FROM pg_stat_activity WHERE usename='d2c_writer';"),'0')
      evidence.checks.readOnlyDefaultAndNoLoginAloneInsufficient=true
      evidence.checks.noLoginPlusDrainedSessionsBlocksSyntheticWriter=true
    } finally {writer.stdin.destroy();writer.kill()}
  }
  evidence.status='PASS'
} catch(error) {
  evidence.status='FAIL';evidence.failedStage=stage
  console.log(JSON.stringify({syntheticFailureStage:stage}))
  evidence.failure=error instanceof assert.AssertionError ? error.message.split('\n')[0].slice(0,160) : 'Operation failed; raw output suppressed'
  process.exitCode=1
} finally {
  if(snapshotProcess) {snapshotProcess.stdin.end('ROLLBACK;\n');snapshotProcess.kill()}
  for(const id of containers.reverse()) {
    const m=await inspect(id)
    assert.equal(m.Config.Labels['workmatchr.d2b'],runId)
    assert.ok(m.Name.startsWith(`/${runId}-`))
    await docker(['rm','--force',id])
  }
  for(const dir of [keyDir,emptyKeyDir,...(d2c?[publicKeyDir]:[]),...(d2d?[recoveryKeyDir]:[])]) if(fs.existsSync(dir)) await run(gpgconf,['--homedir',dir,'--kill','gpg-agent'])
  for(const dir of dirs) {
    const resolved=path.resolve(dir)
    assert.ok(resolved.startsWith(`${path.resolve(base)}${path.sep}`));assert.ok(path.basename(resolved).startsWith(runId))
    if(fs.existsSync(resolved)) fs.rmSync(resolved,{recursive:true,force:true,maxRetries:10,retryDelay:300})
    assert.equal(fs.existsSync(resolved),false)
  }
  const after=(await docker(['ps','-aq','--no-trunc'])).toString().trim().split(/\r?\n/).filter(Boolean).sort()
  assert.deepEqual(after,evidence.existingContainerIds)
  delete evidence.existingContainerIds
  evidence.cleanup={ownedContainersRemoved:true,tmpfsDatabasesAndSyntheticRolesRemoved:true,encryptedFilesRemoved:true,syntheticPrivateKeysRemoved:true,existingContainersUnchanged:true}
  evidence.finishedAt=new Date().toISOString()
  const out=path.join(process.env.LOCALAPPDATA,'WorkMatchr','private-evidence','synthetic',runId+'.json')
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,`${JSON.stringify(evidence,null,2)}\n`)
  console.log(JSON.stringify({status:evidence.status,failedStage:evidence.failedStage,cleanup:evidence.cleanup}))
}
