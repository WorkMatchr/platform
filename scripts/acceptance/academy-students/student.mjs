import {Client} from 'pg'
import {pathToFileURL, fileURLToPath} from 'node:url'
import {randomUUID,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

const {chromium}=await import(process.env.ACADEMY_PLAYWRIGHT_PATH ? pathToFileURL(process.env.ACADEMY_PLAYWRIGHT_PATH).href : 'playwright')
const root=process.env.ACADEMY_TEST_ARTIFACTS+'/', url=new URL(process.env.DATABASE_URL)
assert.equal(url.username,'academy_content_editor');assert.equal(url.hostname,'127.0.0.1');assert.match(url.pathname,/^\/workmatchr_learning_\d+_\d+$/)

const emails = new Map(), nonce=randomBytes(32).toString('hex')
const addr=async(s)=>{await new Promise(ok=>s.listen(0,'127.0.0.1',ok));return 'http://127.0.0.1:'+s.address().port}
const sink=createServer(async(req,res)=>{if(req.headers.authorization!==nonce){res.writeHead(403).end();return}let raw='';for await(const b of req)raw+=b;const [email,link]=JSON.parse(raw);emails.set(email,link);res.end('ok')})
const sinkUrl=await addr(sink);const tmp=createServer();const base=await addr(tmp);await new Promise(ok=>tmp.close(ok))
const server=spawn(process.execPath,['--require',fileURLToPath(new URL('./providers.cjs',import.meta.url)),'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',new URL(base).port],{env:{...process.env,BETTER_AUTH_URL:base,NEXT_PUBLIC_APP_URL:base,PILOT_SINK:sinkUrl,PILOT_NONCE:nonce,RESEND_API_KEY:'synthetic-only',AUTH_EMAIL_FROM:'pilot@example.invalid'},stdio:'ignore',windowsHide:true})
try {
for (let i=0;i<120;i++){try{if((await fetch(base+'/inloggen')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
const db=new Client({connectionString:url.toString()}); await db.connect()
const browser=await chromium.launch({executablePath:process.env.ACADEMY_CHROMIUM_PATH,headless:true,args:['--disable-background-networking','--disable-sync','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']})
let errs=0
async function track(name,fn){try{await fn();console.log('PASS '+name)}catch(e){errs++;console.log('FAIL '+name+': '+String(e.message).replaceAll(base,'[local]').slice(0,380))}}
const pw=randomBytes(24).toString('hex')
async function register(p){
 const email=randomUUID()+'@example.invalid';await p.goto('/registreren');await p.waitForLoadState('networkidle')
 await p.locator('[value="CLIENT"]').check();await p.locator('#name').fill('Synthetische Cursist');await p.locator('#email').fill(email);await p.locator('#password').fill(pw);await p.locator('#passwordConfirmation').fill(pw);await p.locator('[name=acceptedTerms]').check();await p.getByRole('button',{name:'Account registreren'}).click()
 try{await p.waitForURL('**/controleer-email',{timeout:16000})}catch{throw Error('Registratie: '+await p.locator('main').innerText().then(x=>x.slice(0,380)))}
 for(let i=0;i<100&&!emails.has(email);i++)await p.waitForTimeout(100)
 const link=emails.get(email);assert.ok(link,'Verificatiemail niet lokaal opgevangen');assert.equal(new URL(link).origin,base);await p.goto(link);emails.delete(email)
 const row=(await db.query('SELECT id,"emailVerified" FROM "User" WHERE email=$1',[email])).rows[0];assert.ok(row?.emailVerified);return {email,id:row.id}
}
async function open(width=1366){
 const ctx=await browser.newContext({baseURL:base,viewport:{width,height:900},serviceWorkers:'block'});await ctx.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort())
 const p=await ctx.newPage();p.setDefaultTimeout(9000);return p
}
async function login(p,act){
 await p.goto('/inloggen');await p.waitForLoadState('networkidle');await p.locator('#email').fill(act.email);await p.locator('#password').fill(pw);await p.getByRole('button',{name:'Inloggen',exact:true}).click();try{await p.waitForURL(u=>u.pathname!='/inloggen',{timeout:9000})}catch{console.log('Aanmeldfeedback',await p.locator('[role=alert]').allTextContents());await p.waitForTimeout(61500);await p.getByRole('button',{name:'Inloggen',exact:true}).click();await p.waitForURL(u=>u.pathname!='/inloggen')}
}
const shot=(p,n)=>p.screenshot({path:root+n+'.png',animations:'disabled'})
async function width(p){assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
try{
for (const [code,slug,version] of [['WL-001','rie-in-de-praktijk','1.2'],['WL-002','preventiemedewerker-in-de-praktijk','WL-002-COURSE-1.3'],['WL-003','veilig-en-gezond-werken','WL-003-COURSE-1.1']]){
 const course='/e-learnings/'+slug, guest=await open(390);let p=await open(390)
 await track(code+' volledige studentroute',async()=>{
 const student=await register(p);console.log(code,'PASS registratie en lokale verificatie');await login(p,student)
 await p.goto('/e-learnings/aanbod');await p.getByRole('link',{name:'Bekijk opleiding'}).first().waitFor()
 await width(p);await shot(p,code+'-aanbod-mobiel')
 await p.getByRole('link',{name:'Bekijk opleiding'}).and(p.locator('a[href="'+course+'"]')).first().click();await p.getByRole('button',{name:'Start deze e-learning'}).click();await p.waitForURL('**/leren/**')
 const next=()=>p.getByRole('button',{name:/^(Volgende|Naar afronding)$/});await next().click();await p.waitForFunction(()=>Number(document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'))>0)
 const progress=await p.locator('[role=progressbar]').getAttribute('aria-valuenow')
 await width(p);await shot(p,code+'-les-mobiel');await p.context().close();p=await open();await login(p,student);await p.goto(course);await p.getByRole('link',{name:'Verder waar u gebleven was'}).click();await p.waitForURL('**/leren/**');assert.equal(await p.locator('[role=progressbar]').getAttribute('aria-valuenow'),progress);console.log('PASS inschrijving, onderbroken sessie en hervatten')
 for(let ch=1;ch<=10;ch++){
  if(ch>1){await p.goto(course);const btn=p.getByRole('button',{name:'Start hoofdstuk '+ch,exact:true}); if(await btn.count())await btn.click();else await p.locator('section[aria-labelledby=available-chapters] li').nth(ch-1).getByRole('link').click();await p.waitForURL('**/leren/**')}
  for(let block=0;block<90;block++){
   const finish=p.getByRole('button',{name:'Hoofdstuk afronden',exact:true});if(await finish.count()){await finish.click();await p.getByRole('heading',{name:new RegExp('Hoofdstuk '+ch+' afgerond')}).waitFor();console.log('PASS hoofdstuk',ch);break}
   const main=p.locator('main').last()
   const old=await next().elementHandle()
   if(await next().isDisabled()){
    const radio=main.locator('input[type=radio]'),box=main.locator('input[type=checkbox]'),sel=main.locator('select')
    if(await radio.count())await radio.first().check()
    if(await box.count())await box.first().check()
    for(let i=0;i<await sel.count();i++){const sl=sel.nth(i);const opts=await sl.locator('option').evaluateAll(v=>v.filter(o=>o.value).map(o=>o.value));await sl.selectOption(opts[0])}
    const confirm=p.getByRole('button',{name:'Antwoord controleren',exact:true});if(await confirm.count())await confirm.click()
   }
   await next().click()
   await p.waitForFunction(el=>!el.isConnected,old,{timeout:9000});await old.dispose()
   await p.waitForTimeout(70)
   if(block===89)throw Error('Hoofdstuk niet afgerond binnen begrensde iteraties')
  }
 }
 await p.goto(course+'/eindtoets');await p.getByRole('button',{name:'Start eindtoets'}).click();await p.locator('fieldset input').first().waitFor()
 await p.getByRole('button',{name:'Toets inleveren'}).click();await p.getByRole('button',{name:'Toch inleveren'}).click();await p.getByRole('heading',{name:'Eindtoets nog niet behaald'}).waitFor()
 await p.getByRole('link',{name:'Terug naar eindtoets'}).click();await p.getByRole('button',{name:'Opnieuw proberen'}).click();await p.locator('fieldset input').first().waitFor()
 console.log(code,'PASS gezakt en herkansing gestart')
 const keys=new Map((await db.query('SELECT q.id,q."correctAnswer" FROM "LearningQuestion" q JOIN "LearningExamQuestion" m ON m."questionId"=q.id JOIN "LearningExamVersion" ev ON ev.id=m."examVersionId" JOIN "LearningCourseVersion" cv ON cv.id=ev."courseVersionId" WHERE cv.version=$1',[version])).rows.map(q=>[q.id,q.correctAnswer]))
 for(let i=1;i<=50;i++){
  const inputs=p.locator('fieldset input'),name=await inputs.first().getAttribute('name'),k=keys.get(name.slice(7));assert.ok(Array.isArray(k))
  for(const v of k)await p.locator('fieldset input[value="'+v+'"]').check()
  if(i<50)await p.getByRole('button',{name:'Volgende',exact:true}).click()
 }
 await p.getByRole('button',{name:'Toets inleveren'}).click();await p.getByRole('button',{name:'Toch inleveren'}).click();await p.waitForURL('**/resultaat/**');await shot(p,code+'-eindtoets')
 await p.getByRole('link',{name:'Naam invullen'}).click();await p.locator('#firstName').fill('Synthetische');await p.locator('#lastName').fill('Cursist');await p.getByRole('button',{name:'Naam opslaan'}).click()
 await p.waitForURL('**/mijn?certificaat=beschikbaar');const cert=(await db.query('SELECT id,"certificateNumber","courseVersion","examVersion","templateVersion" FROM "LearningCertificate" WHERE "userId"=$1',[student.id])).rows[0];assert.ok(cert);assert.equal(cert.courseVersion,version);assert.equal(cert.examVersion,code+'-EXAM-'+version.split('-').at(-1));assert.equal(cert.templateVersion,'ACADEMY-DESIGN-1')
 const href=await p.getByRole('link',{name:'Certificaat downloaden'}).getAttribute('href');const pdf=await p.evaluate(async url=>{const r=await fetch(url);return [r.status,r.headers.get('content-type'),new TextDecoder().decode((await r.arrayBuffer()).slice(0,5))]},href);assert.deepEqual(pdf,[200,'application/pdf','%PDF-'])
 const a=await open();const other=await register(a);await login(a,other); const ownPdf=await p.locator('a[href*="/certificates/"]').first().getAttribute('href');assert.ok(ownPdf.endsWith('/pdf')); const forbidden=await a.evaluate(async url=>(await fetch(url)).status,ownPdf);assert.ok([403,404].includes(forbidden));await guest.goto('/certificaat/'+cert.certificateNumber);await guest.getByRole('heading',{name:'Geldig certificaat'}).waitFor();await shot(guest,code+'-certificaat');console.log('PASS uitgegeven, eigen PDF en publieke verificatie');await a.context().close()
 });await guest.context().close();await p.context().close()
}
}finally{await browser.close();await db.end()}
process.exitCode=errs?1:0
}finally{server.kill();sink.close()}
