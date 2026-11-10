import {Client} from 'pg'
import { checkAcademyAdministration,createTestAdministrator } from './administration.mjs'
import {pathToFileURL, fileURLToPath} from 'node:url'
import {randomUUID,randomBytes} from 'node:crypto'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
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
async function secondClockCheck(p,db,userId){
  await p.bringToFront()
  await p.reload({waitUntil:'networkidle'})
  const active=p.getByRole('button',{name:'Ik studeer',exact:true})
  async function awaitObservation(check,label){
    const until=Date.now()+20000
    do {
      if(await check())return
      await p.waitForTimeout(150)
    } while(Date.now()<until)
    throw Error('Tijdmeting: '+label+' ontbreekt na 20 seconden')
  }
  const current=async()=>(await db.query('SELECT "lastContext","clockId" FROM "LearningPilotAssignment" WHERE "userId"=$1',[userId])).rows[0]
  await active.click()
  await awaitObservation(async()=>Boolean((await current()).clockId),'eerste serverwaarneming')
  const totals=async()=>Number((await db.query(`SELECT COALESCE(SUM(t."activeMs"),0) AS ms FROM "LearningPilotDuration" t JOIN "LearningPilotAssignment" a ON a.id=t."assignmentId" WHERE a."userId"=$1 AND (t.context LIKE 'les:%' OR t.context LIKE 'oefening:%')`,[userId])).rows[0].ms)
  await p.waitForTimeout(3500);await active.click()
  await awaitObservation(async()=>await totals()>=2000,'gemeten lesactiviteit')
  await p.getByRole('button',{name:'Meting pauzeren'}).click()
  await awaitObservation(async()=>(await current()).lastContext==='pauze','opgeslagen pauze')
  const before=await totals();assert.ok(before>=2000)
  await p.waitForTimeout(3200);assert.equal(await totals(),before)
  await p.getByRole('button',{name:'Meting hervatten'}).click();console.log('PASS tijdmeting, pauze en hervatten')
}
try{
const selectedCourse=process.argv.includes('--course') ? process.argv[process.argv.indexOf('--course')+1] : null
await track('Academy-beheer', () => checkAcademyAdministration({db, open, login, pw, root}))
const assigned=process.env.ACADEMY_TEST_ASSIGNED_PILOT==='1'
const pilotAdmin=assigned?await open():null
if(pilotAdmin) await login(pilotAdmin,await createTestAdministrator(db,pw))
if(!process.argv.includes('--administration-only')) for (const [code,slug,legacyVersion] of [['WL-001','rie-in-de-praktijk','1.2'],['WL-002','preventiemedewerker-in-de-praktijk','WL-002-COURSE-1.3'],['WL-003','veilig-en-gezond-werken','WL-003-COURSE-1.1']]){
 const version=assigned?legacyVersion.split('-').at(-1)+'-r07':legacyVersion
 if(selectedCourse && code!==selectedCourse)continue
 const course='/e-learnings/'+slug, guest=await open(390);let p=await open(390)
 await track(code+' volledige studentroute',async()=>{
 const student=await register(p);console.log(code,'PASS registratie en lokale verificatie');await login(p,student)
 if(assigned){
   await p.goto(course)
   assert.equal(await p.getByRole('button',{name:'Start deze e-learning'}).count(),0)
   await pilotAdmin.goto('/platformbeheer/academy/cursussen',{waitUntil:'networkidle'})
   await pilotAdmin.getByLabel(/E-mailadres van het geverifieerde/).fill(student.email)
   await pilotAdmin.getByRole('checkbox',{name:new RegExp(version.replaceAll('.','\\.'))}).check()
   await pilotAdmin.getByLabel(/Vervaldatum/).fill(new Date(Date.now()+86400000*2).toISOString().slice(0,10))
   await pilotAdmin.getByRole('button',{name:'Pilotcode aanmaken'}).click()
   const result=pilotAdmin.getByRole('status').filter({hasText:/Persoonlijke code:/})
   await result.waitFor()
   const promo=(await result.innerText()).match(/PILOT-[A-F0-9]{20}/)[0]
   await p.goto('/e-learnings/pilot',{waitUntil:'networkidle'})
   await p.getByLabel('Persoonlijke pilotcode').fill(promo)
   await p.getByRole('button',{name:'Kosteloos inschrijven'}).click()
   await p.waitForURL('**/e-learnings/mijn')
   const redeemed=await db.query('SELECT a."enrollmentId",d."percentageBps" FROM "LearningPilotAssignment" a JOIN "DiscountCode" d ON d.id=a."discountCodeId" WHERE a."userId"=$1',[student.id])
   assert.equal(redeemed.rowCount,1);assert.ok(redeemed.rows[0].enrollmentId);assert.equal(redeemed.rows[0].percentageBps,10000)
 }
 await p.goto('/e-learnings/aanbod');await p.getByRole('link',{name:'Bekijk opleiding'}).first().waitFor()
 await width(p);await shot(p,code+'-aanbod-mobiel')
 await p.getByRole('link',{name:'Bekijk opleiding'}).and(p.locator('a[href="'+course+'"]')).first().click();const secondTab=await p.context().newPage()
 await secondTab.goto(course)
 await Promise.all([p,secondTab].map(async tab=>{
  await tab.getByRole('button',{name:'Start deze e-learning'}).click()
  await tab.waitForURL('**/leren/**')
 }))
 assert.equal(new URL(p.url()).pathname,new URL(secondTab.url()).pathname)
 const enrolled=await db.query('SELECT v.version FROM "LearningEnrollment" e JOIN "LearningCourseVersion" v ON v.id=e."courseVersionId" WHERE e."userId"=$1',[student.id])
 assert.deepEqual(enrolled.rows,[{version}]);await secondTab.close()
 console.log(code,'PASS twee inschrijfverzoeken, één versiegebonden inschrijving')
 if(assigned){
   await secondClockCheck(p,db,student.id)
 }
 const next=()=>p.getByRole('button',{name:/^(Volgende|Naar afronding)$/});await next().click();await p.waitForFunction(()=>Number(document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow'))>0)
 const progress=await p.locator('[role=progressbar]').getAttribute('aria-valuenow')
 await width(p);await shot(p,code+'-les-mobiel')
 const lessonPath=new URL(p.url()).pathname
 await p.goto('/account');await p.getByRole('button',{name:'Uitloggen',exact:true}).first().click()
 await p.waitForURL(base+'/')
 assert.equal((await db.query('SELECT count(*)::int AS n FROM "Session" WHERE "userId"=$1',[student.id])).rows[0].n,0)
 await p.goto(lessonPath);await p.waitForURL(u=>u.pathname==='/inloggen')
 await p.context().close();p=await open();await login(p,student);await p.goto(course);await p.getByRole('link',{name:'Verder waar u gebleven was'}).click();await p.waitForURL('**/leren/**');assert.equal(await p.locator('[role=progressbar]').getAttribute('aria-valuenow'),progress);assert.equal(new URL(p.url()).pathname,lessonPath);console.log('PASS uitloggen, sessie ingetrokken en eigen lespositie hervat')
 for(let ch=1;ch<=10;ch++){
  if(ch>1){await p.goto(course);const btn=p.getByRole('button',{name:'Start hoofdstuk '+ch,exact:true}); if(await btn.count())await btn.click();else await p.locator('section[aria-labelledby=available-chapters] li').nth(ch-1).getByRole('link').click();await p.waitForURL('**/leren/**')}
  for(let block=0;block<90;block++){
   const finish=p.getByRole('button',{name:'Hoofdstuk afronden',exact:true})
   // Chapter changes may first render a route-loading boundary.
   await finish.or(next()).first().waitFor({state:'visible',timeout:30000})
   if(await finish.isVisible()){await finish.click();await p.getByRole('heading',{name:new RegExp('Hoofdstuk '+ch+' afgerond')}).waitFor();console.log('PASS hoofdstuk',ch);break}
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
 await p.waitForURL('**/mijn?certificaat=beschikbaar');const cert=(await db.query('SELECT id,"certificateNumber","courseVersion","examVersion","templateVersion" FROM "LearningCertificate" WHERE "userId"=$1',[student.id])).rows[0];assert.ok(cert);assert.equal(cert.courseVersion,version);assert.equal(cert.examVersion,code+'-EXAM-'+(assigned?version:version.split('-').at(-1)));assert.equal(cert.templateVersion,'ACADEMY-DESIGN-1')
 const link=p.getByRole('link',{name:'Certificaat downloaden'})
 const href=await link.getAttribute('href')
 assert.equal(href,'/api/learning/certificates/'+cert.id+'/pdf')
 const responseEvent=p.waitForResponse(response=>new URL(response.url()).pathname===href).then(response=>{
  console.log(code,'certificaatdownload HTTP',response.status(),response.headers()['content-type'])
  return response
 })
 const downloadEvent=p.waitForEvent('download',{timeout:18000})
 const [response,download]=await Promise.all([responseEvent,downloadEvent,link.click()])
 assert.equal(response.status(),200)
 assert.equal(response.headers()['content-type'],'application/pdf')
 const path=await download.path();assert.ok(path)
 assert.equal((await readFile(path)).subarray(0,5).toString(),'%PDF-')
 console.log(code,'PASS eigen certificaat gedownload')
 await guest.goto('/certificaat/'+cert.certificateNumber)
 await guest.getByRole('heading',{name:'Geldig certificaat'}).waitFor()
 await shot(guest,code+'-certificaat')
 const a=await open(), other=await register(a)
 await login(a,other)
 // The login tab may still be redirecting. Use a fresh document in its authenticated context.
 const separateTab=await a.context().newPage()
 await separateTab.goto('/e-learnings/mijn',{waitUntil:'networkidle'})
 const access=await separateTab.evaluate(async href=>{
  const session=await fetch('/api/auth/get-session').then(response=>response.json())
  const denied=await fetch(href,{redirect:'error'})
  return {viewer:session?.user?.id,status:denied.status,error:(await denied.json()).error}
 },href)
 assert.deepEqual(access,{viewer:other.id,status:404,error:'Niet gevonden.'})
 console.log('PASS eigen PDF, publieke verificatie en privédownload geweigerd aan aangemelde andere cursist')
 if(assigned){
   const grant=(await db.query('SELECT "courseVersionId","discountCodeId" FROM "LearningPilotAssignment" WHERE "userId"=$1',[student.id])).rows[0]
   const id=grant.courseVersionId
   await pilotAdmin.goto('/platformbeheer/academy/cursussen/'+id)
   await pilotAdmin.getByRole('heading',{name:'Studieduurpilot'}).waitFor()
   const row=pilotAdmin.locator('details').filter({hasText:grant.discountCodeId})
   await row.locator('summary').click()
   await row.getByText(/Eerste toets · 0\/50/).waitFor()
   await row.getByText(/Herkansing 1 · 50\/50/).waitFor()
   await row.getByText(/certificaat geldig/).waitFor()
   assert.equal(Number((await db.query('SELECT count(*) AS n FROM "FinancialPurchase"')).rows[0].n),0)
   console.log('PASS beheer, codegebruik, kosteloze inschrijving en nul financiële aankopen')
 }
 await a.context().close()
 });await guest.context().close();await p.context().close()
}
}finally{await browser.close();await db.end()}
process.exitCode=errs?1:0
}finally{server.kill();sink.close()}
