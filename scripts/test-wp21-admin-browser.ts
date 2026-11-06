import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync, createWriteStream } from 'node:fs'
import { spawn } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const target = new URL(process.env.DATABASE_URL ?? '')
assert.equal(target.hostname, '127.0.0.1'); assert.equal(target.port, '5449')
assert.equal(target.pathname, '/workmatchr_lms20_synthetic'); assert.equal(target.username, 'academy_content_editor')
assert.ok(!process.env.VERCEL && !process.env.RESEND_API_KEY && !process.env.MOLLIE_API_KEY)
const base = 'http://127.0.0.1:3090', dir = '.local-storage/wp21/admin-browser'
mkdirSync(dir, { recursive: true })
Object.assign(process.env, { BETTER_AUTH_URL: base, NEXT_PUBLIC_APP_URL: base, BETTER_AUTH_SECRET: randomBytes(48).toString('base64url'), LEARNING_RUNTIME_ENABLED: 'true', ACADEMY_LOCAL_ACCEPTANCE: 'true', ACADEMY_TEST_PROJECT_ID: 'local-synthetic', ACADEMY_TEST_BRANCH_ID: 'lms20-isolated', COMPLIANCE_F4_ENABLED: 'false', CONTACT_FORM_ENABLED: 'false', ENABLE_TEST_ACCOUNT_SWITCHER: 'false' })
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: target.href }) })
const password = randomBytes(24).toString('base64url')
const { auth } = await import('../src/lib/auth')
const { hashPassword } = await import('better-auth/crypto')
const { importAcademyBundle } = await import('../src/lib/learning/academy-import-service')
const { validateAcademyBundle } = await import('../src/lib/learning/academy-content-standard')
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const org = await db.organization.create({ data: { name: 'Synthetisch WP21 platform', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE' } })
const actors = []
for (const role of ['OWNER','ADMIN','MEMBER'] as const) {
 const user = await db.user.create({ data: { email: `wp21-${randomUUID()}@example.invalid`, displayName: `Synthetisch ${role}`, status: 'ACTIVE', emailVerified: true, platformRole: 'ADMIN' } })
 await db.organizationMembership.create({ data: { userId: user.id, organizationId: org.id, role, status: 'ACTIVE' } })
 await (await auth.$context).internalAdapter.createAccount({ userId:user.id, accountId:user.id, providerId:'credential', password:await hashPassword(password) })
 actors.push({ user, role })
}
const versions: string[] = []
for (const file of ['WL-001_COURSE_1.2_DRAFT.json','WL-002_COURSE_1.3_DRAFT.json','WL-003_COURSE_1.1_DRAFT.json']) {
 const bundle = validateAcademyBundle(JSON.parse(readFileSync('content/academy/'+file,'utf8')))
 const result = await importAcademyBundle(db,bundle,{ execute:true, operatorReference:'wp21-synthetic-browser' })
 assert.ok('courseVersionId' in result); versions.push(result.courseVersionId)
}
assert.equal(await db.learningCourseVersion.count({ where:{status:'PUBLISHED'} }),0)
const log = createWriteStream(dir+'/server.log')
const server = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3090'],{env:{...process.env,NODE_ENV:'development'},windowsHide:true,stdio:['ignore','pipe','pipe']})
server.stdout.pipe(log); server.stderr.pipe(log)
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const results: object[] = []
try {
 let ready=false
 for(let n=0;n<90;n++){await new Promise(r=>setTimeout(r,1000));try{if((await fetch(base+'/inloggen')).ok){ready=true;break}}catch{ } if(server.exitCode!==null)break}
 assert.ok(ready,'LOCAL_BROWSER_SERVER_NOT_READY')
 browser=await chromium.launch({headless:true,channel:'msedge'})
 for(const actor of actors){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage()
  page.setDefaultTimeout(60000)
  const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.name+': '+e.message.slice(0,180)))
  await page.goto(base+'/inloggen?returnTo=%2Fplatformbeheer')
  await page.getByLabel('E-mailadres',{exact:true}).fill(actor.user.email)
  await page.getByLabel('Wachtwoord',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Inloggen',exact:true}).click()
  await page.waitForURL(actor.role==='MEMBER'?'**/platformbeheer/auditor':'**/platformbeheer')
  await page.getByRole('navigation',{name:'Beheerhoofdstukken',exact:true}).waitFor()
  assert.equal(await page.getByRole('button',{name:'Uitloggen',exact:true}).count(),1)
  assert.equal(await page.getByRole('link',{name:'Vergelijk met v0.1',exact:true}).count(),0)
  const menu=page.getByRole('navigation',{name:'Academy / E-learning',exact:true})
  if(actor.role==='MEMBER'){
   assert.equal(await menu.count(),0)
   await page.goto(base+'/platformbeheer/academy/cursussen');await page.waitForURL('**/account')
   await page.goto(base+'/platformbeheer/auditor')
  }else{
   assert.equal(await menu.count(),1);assert.equal(await menu.locator('li').count(),6)
   assert.equal(await menu.getByRole('link').count(),7)
   assert.equal(await menu.getByRole('link',{name:'Deelnemers en resultaten',exact:true}).count(),0)
   await page.getByRole('link',{name:'Account',exact:true}).click();await page.waitForURL('**/account')
   await page.goto(base+'/platformbeheer/academy/cursussen')
   await page.getByRole('heading',{name:'Cursussen beheren',exact:true}).waitFor()
   for(const id of versions){await page.goto(base+'/platformbeheer/academy/cursussen/'+id);await page.getByRole('region',{name:'Volledige cursus bewerken',exact:true}).waitFor(); assert.equal(await page.getByRole('region',{name:'Volledige cursus bewerken',exact:true}).locator('select').first().inputValue(),'course')}
   await page.goto(base+'/platformbeheer/academy/certificaten/sjablonen')
   assert.equal((await page.locator('body').innerText()).includes('Application error'),false)
   await page.goto(base+'/platformbeheer')
  }
  await page.keyboard.press('Tab')
  assert.ok(await page.evaluate(()=>document.activeElement!==document.body))
  assert.ok(await page.evaluate(()=>{const e=document.activeElement!;const c=getComputedStyle(e);return c.outlineStyle!=='none'||c.boxShadow!=='none'}),'VISIBLE_KEYBOARD_FOCUS')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'DESKTOP_OVERFLOW')
  await page.screenshot({path:dir+'/'+actor.role+'-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'MOBILE_OVERFLOW')
  await page.screenshot({path:dir+'/'+actor.role+'-mobile.png',fullPage:true})
  await page.getByRole('button',{name:'Uitloggen',exact:true}).click();await page.waitForURL(base+'/')
  assert.equal(await db.session.count({where:{userId:actor.user.id}}),0)
  await page.goto(base+'/platformbeheer');await page.waitForURL('**/inloggen?**')
  assert.deepEqual(errors,[])
  results.push({role:actor.role,result:'PASS',sessionsAfterLogout:0,javascriptErrors:errors,true200PercentZoom:'NOT_TESTED'})
  await context.close()
 }
 assert.equal(await db.learningCourseVersion.count({where:{status:'PUBLISHED'}}),0)
 writeFileSync(dir+'/results.json',JSON.stringify(results,null,2))
 console.log('WP21 browser PASS: OWNER/ADMIN/MEMBER, single Academy menu, three draft course editors, certificates route, Account, desktop/mobile/focus, logout/re-authentication; no course published.')
} finally {
 await browser?.close();server.kill();await new Promise<void>(r=>{if(server.exitCode!==null)r();else server.once('exit',()=>r())});log.end();await db.$disconnect()
}
