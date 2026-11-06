/**
 * WP21 synthetic integration runner. Creates and deletes only its own PG18
 * container/volume; never reads a supplied database or provider credential.
 */
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import pg from 'pg'

assert.ok(process.argv.includes('--local-synthetic'), 'EXPLICIT_SYNTHETIC_OPT_IN_REQUIRED')
assert.ok(!process.env.VERCEL && process.env.NODE_ENV !== 'production', 'LOCAL_ONLY')
const secret = randomBytes(32).toString('hex')
const name = 'workmatchr-wp21-' + Date.now() + '-' + process.pid
const env = { ...process.env, NODE_ENV: 'test', DOTENV_CONFIG_PATH: '.local-storage/wp21/absent.env' }
for (const key of Object.keys(env)) {
 if (/^(DATABASE_URL|DIRECT_URL|PG|VERCEL|RESEND|MOLLIE|JORTT|CRON_SECRET|FINANCIAL_MAINTENANCE_SECRET|PREVIEW_|CONTACT_|LEARNING_|COMPLIANCE_|OPENAI_|BLOB_)/.test(key)) delete env[key]
}
Object.assign(env, { CONTACT_FORM_ENABLED:'false', LEARNING_RUNTIME_ENABLED:'false', COMPLIANCE_F4_ENABLED:'false' })
assert.ok(env.npm_execpath, 'RUN_VIA_NPM_EXEC')
const dir = '.local-storage/wp21'
mkdirSync(dir, { recursive: true })
const results = []
const clean = text => String(text).replaceAll(secret, '[REDACTED]')
function run(cmd, args, extra = {}, timeout = 900000) {
 const r = spawnSync(cmd, args, {env:{...env,...extra}, encoding:'utf8', windowsHide:true, timeout, maxBuffer:32*1024*1024})
 return {status:r.status,signal:r.signal,stdout:clean(r.stdout??''),stderr:clean(r.stderr??'')}
}
let id, db
try {
 const started = run('docker', ['run','-d','--name',name,'--label','workmatchr.synthetic=wp21-integration','--memory=512m','-e','POSTGRES_PASSWORD','-p','127.0.0.1:5491:5432','postgres:18'],{POSTGRES_PASSWORD:secret})
 assert.equal(started.status,0,'OWN_CONTAINER_START_FAILED')
 id=started.stdout.trim();assert.match(id,/^[a-f0-9]{64}$/)
 const inspect=JSON.parse(run('docker',['inspect',id]).stdout)[0]
 assert.equal(inspect.Name,'/'+name)
 assert.equal(inspect.Config.Labels['workmatchr.synthetic'],'wp21-integration')
 assert.equal(inspect.HostConfig.PortBindings['5432/tcp'][0].HostIp,'127.0.0.1')
 env.DATABASE_URL='postgresql://postgres:'+secret+'@127.0.0.1:5491/postgres'
 env.WP16_POSTGRES_CONTAINER_ID=id
 for(let i=0;i<30;i++){try{db=new pg.Client({connectionString:env.DATABASE_URL});await db.connect();break}catch{await db?.end().catch(()=>{});db=null;await new Promise(r=>setTimeout(r,1000))}}
 assert.ok(db,'PG18_READY_REQUIRED')
 const version=(await db.query("SELECT current_setting('server_version_num')::int AS version")).rows[0].version
 assert.ok(version>=180000 && version<190000)
 const existing=(await db.query("SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname")).rows
 assert.deepEqual(existing,[{datname:'postgres'}])
 await db.end();db=null
 const suites=[
 ['production-baseline-upgrade',['exec','--','tsx','scripts/test-learning-publication-integrity-database.ts','--production-upgrade-only']],
 ['current-main-upgrade',['exec','--','tsx','scripts/test-learning-publication-integrity-database.ts','--current-upgrade-only']],
 ['contact-audit',['exec','--','tsx','scripts/test-contact-audit-retention-database.ts']],
 ['contact-register',['exec','--','tsx','scripts/test-contact-decision-register-database.ts']],
 ['integrity-restore',['run','test:db:learning-integrity','--','--local-synthetic-recovery']],
 ['finance',['run','test:db:finance']],
 ['finance-p1',['run','test:db:finance-p1',...(process.argv.includes('--finance-browser')?['--','--browser']:[])]],
 ['marketplace-concurrency',['run','test:db:marketplace-concurrency']],
 ['sessions',['run','test:db:auth-sessions']],
 ['notification-commercial-chain',['run','test:db:assignment-notifications']],
 ['compliance',['run','test:db:compliance-runs',...(process.argv.includes('--browser')?['--','--browser']:[])]],
 ['contact-current',['run','test:db:contact']],
 ['contact-baseline',['run','test:db:contact','--','--baseline-85']]
 ]
 const selected = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',')
 if (selected) assert.ok(selected.every(name => suites.some(([suite]) => suite === name)), 'UNKNOWN_SUITE')
 for(const [suite,args] of suites.filter(([suite]) => !selected || selected.includes(suite))){
  const time=Date.now();const r=run(process.execPath,[env.npm_execpath,...args])
  writeFileSync(dir+'/'+suite+'.log',r.stdout+'\n'+r.stderr)
  const result={suite,exit:r.status,signal:r.signal,durationMs:Date.now()-time};results.push(result);console.log(JSON.stringify(result))
  writeFileSync(dir+(process.argv.some(arg=>arg.startsWith('--only='))?'/postgres-additional-results.json':'/postgres-results.json'),JSON.stringify(results,null,2))
 }
 if (!selected) {
 const t=Date.now(),academy=run(process.execPath,['scripts/test-academy-content-database.mjs','--local-synthetic'])
 writeFileSync(dir+'/academy.log',academy.stdout+'\n'+academy.stderr)
 results.push({suite:'academy-courses-certificates',exit:academy.status,durationMs:Date.now()-t})
 console.log(JSON.stringify(results.at(-1)));writeFileSync(dir+(process.argv.some(arg=>arg.startsWith('--only='))?'/postgres-additional-results.json':'/postgres-results.json'),JSON.stringify(results,null,2))
 }
 if(results.some(r=>r.exit!==0))process.exitCode=1
} finally {
 await db?.end().catch(()=>{})
 if(id){
  const inspect=JSON.parse(run('docker',['inspect',id]).stdout)[0]
  assert.equal(inspect.Name,'/'+name);assert.equal(inspect.Config.Labels['workmatchr.synthetic'],'wp21-integration')
  assert.equal(run('docker',['rm','-f','-v',id]).status,0)
  console.log('CLEANUP PASS: only own WP21 container/anonymous volume removed')
 }
}
