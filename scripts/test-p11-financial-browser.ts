import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdirSync, createWriteStream, writeFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
const target = new URL(process.env.DATABASE_URL ?? '')
assert.equal(target.hostname,'127.0.0.1'); assert.equal(target.port,'5491')
assert.match(target.pathname,/^\/workmatchr_finance_\d+_\d+$/)
assert.ok(!process.env.VERCEL && !process.env.MOLLIE_API_KEY && !process.env.RESEND_API_KEY && !process.env.JORTT_CLIENT_SECRET)
const base='http://127.0.0.1:3092', dir='.local-storage/p11/browser'
mkdirSync(dir,{recursive:true})
Object.assign(process.env,{BETTER_AUTH_URL:base,NEXT_PUBLIC_APP_URL:base,BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),
  LEARNING_RUNTIME_ENABLED:'false',COMPLIANCE_F4_ENABLED:'false',CONTACT_FORM_ENABLED:'false',PRO_FINANCIAL_CORRECTIONS_ENABLED:'false',JORTT_PAYMENT_RECONCILIATION_ENABLED:'false',FINANCIAL_CHAIN_REVIEW_ENABLED:'false',AUTH_EMAIL_DELIVERY_ENABLED:'false'})
const db=new PrismaClient({adapter:new PrismaPg({connectionString:target.href})})
const {auth}=await import('../src/lib/auth')
const {hashPassword}=await import('better-auth/crypto')
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const password=randomBytes(24).toString('base64url')
const platform=await db.organization.findUniqueOrThrow({where:{systemKey:'WORKMATCHR_PLATFORM'}})
const invoice=await db.financialInvoice.findFirstOrThrow({where:{documentType:'INVOICE',organizationId:{not:null}},orderBy:{createdAt:'asc'}})
const creditInvoice=await db.financialInvoice.findFirstOrThrow({where:{organizationId:invoice.organizationId,documentType:'INVOICE',purchase:{kind:'CREDIT_PACKAGE'}}})
const academyInvoice=await db.financialInvoice.findFirstOrThrow({where:{organizationId:null,documentType:'INVOICE',purchase:{kind:'ACADEMY_COURSE'}}})
const owner=await db.organizationMembership.findFirstOrThrow({where:{organizationId:invoice.organizationId!,role:'OWNER'},include:{user:true}})
const outsider=await db.organizationMembership.findFirstOrThrow({where:{organizationId:{notIn:[invoice.organizationId!,platform.id]}},include:{user:true}})
const actors=[]
for(const role of ['OWNER','ADMIN','MEMBER'] as const){
 const user=await db.user.create({data:{email:`p11-${randomUUID()}@example.invalid`,displayName:`Synthetisch ${role}`,status:'ACTIVE',emailVerified:true,platformRole:'ADMIN'}})
 await db.organizationMembership.create({data:{userId:user.id,organizationId:platform.id,role,status:'ACTIVE'}})
 actors.push({user,role})
}
actors.push({user:owner.user,role:'CUSTOMER' as const},{user:outsider.user,role:'OUTSIDER' as const})
for(const {user} of actors){assert.ok(user.email.endsWith('@example.invalid'));await (await auth.$context).internalAdapter.createAccount({userId:user.id,accountId:user.id,providerId:'credential',password:await hashPassword(password)})}
const log=createWriteStream(dir+'/server.log')
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3092'],{env:{...process.env,NODE_ENV:'production'},windowsHide:true,stdio:['ignore','pipe','pipe']})
server.stdout.pipe(log);server.stderr.pipe(log)
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
const results: object[]=[]
try{
 let ready=false
 for(let n=0;n<60;n++){await new Promise(r=>setTimeout(r,1000));try{if((await fetch(base+'/inloggen')).ok){ready=true;break}}catch{}if(server.exitCode!==null)break}
 assert.ok(ready,'P11_LOCAL_SERVER_NOT_READY')
 browser=await chromium.launch({headless:true,channel:'msedge'})
 for(const actor of actors){
  const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();page.setDefaultTimeout(30000)
  const errors:string[]=[];page.on('pageerror',(e:Error)=>errors.push(e.name))
  await page.goto(base+'/inloggen?returnTo=%2Faccount');await page.getByLabel('E-mailadres',{exact:true}).fill(actor.user.email);await page.getByLabel('Wachtwoord',{exact:true}).fill(password)
  await page.getByRole('button',{name:'Inloggen',exact:true}).click();await page.waitForURL('**/account')
  const readPdf = (url: string) => page.evaluate(async (href: string) => { const response=await fetch(href);return {url:response.url,status:response.status,contentType:response.headers.get('content-type'),cache:response.headers.get('cache-control'),prefix:new TextDecoder('ascii').decode(new Uint8Array(await response.arrayBuffer()).slice(0,4))} }, url)
  if(actor.role==='OWNER'||actor.role==='ADMIN'){
   await page.goto(base+'/platformbeheer/financien');await page.getByRole('heading',{name:'Financieel overzicht',exact:true}).waitFor()
   await page.getByText('Automatische ketencontrole is niet geactiveerd.',{exact:true}).waitFor()
   await page.goto(base+'/platformbeheer/financien/facturen/'+invoice.id);await page.getByRole('link',{name:'PDF bekijken',exact:true}).waitFor()
   for(const other of [creditInvoice, academyInvoice]){
     const download=await readPdf(base+'/platformbeheer/financien/facturen/'+other.id+'/pdf')
     assert.equal(download.status,200);assert.equal(download.prefix,'%PDF')
   }
   assert.equal(await page.locator('fieldset:not([disabled])').count(),0,'CORRECTION_GATES_CLOSED')
   const pdf=await readPdf(base+'/platformbeheer/financien/facturen/'+invoice.id+'/pdf');assert.equal(pdf.status,200);assert.equal(pdf.contentType,'application/pdf');assert.equal(pdf.prefix,'%PDF')
  }else if(actor.role==='CUSTOMER'){
   await page.goto(base+'/credits/facturen/'+invoice.id);await page.getByRole('link',{name:'Download pdf',exact:true}).waitFor()
   const pdf=await readPdf(base+'/credits/facturen/'+invoice.id+'/pdf');assert.equal(pdf.status,200);assert.equal(pdf.cache,'private, no-store');assert.equal(pdf.contentType,'application/pdf');assert.equal(pdf.prefix,'%PDF')
   await page.goto(base+'/credits/facturen/'+creditInvoice.id)
   await page.getByRole('link',{name:'Download pdf',exact:true}).waitFor()
   assert.equal((await readPdf(base+'/credits/facturen/'+creditInvoice.id+'/pdf')).prefix,'%PDF')
   // Synthetic state transition only: cancellation cannot erase historical invoice access.
   const changed=await db.professionalSubscription.updateMany({where:{organizationId:invoice.organizationId!},data:{status:'CANCELED'}})
   assert.equal(changed.count,1)
   const historical=await readPdf(base+'/credits/facturen/'+invoice.id+'/pdf');assert.equal(historical.contentType,'application/pdf');assert.equal(historical.prefix,'%PDF')
   await db.organizationMembership.update({where:{id:owner.id},data:{status:'REMOVED'}})
   const revoked=await readPdf(base+'/credits/facturen/'+invoice.id+'/pdf');assert.notEqual(revoked.contentType,'application/pdf');assert.notEqual(revoked.prefix,'%PDF')

  }else{
   await page.goto(base+'/platformbeheer/financien');await page.waitForURL(base+'/account');assert.equal(await page.getByRole('heading',{name:'Financieel overzicht',exact:true}).count(),0)
   const pdf=await readPdf(base+'/credits/facturen/'+invoice.id+'/pdf');if(actor.role==='MEMBER'){assert.equal(new URL(pdf.url).pathname,'/organisatie/nieuw');assert.notEqual(pdf.contentType,'application/pdf');assert.notEqual(pdf.prefix,'%PDF')}else assert.equal(pdf.status,404)
  }
  await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.body))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'DESKTOP_OVERFLOW')
  await page.screenshot({path:dir+'/'+actor.role+'-desktop.png',fullPage:true})
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'MOBILE_OVERFLOW')
  await page.screenshot({path:dir+'/'+actor.role+'-mobile.png',fullPage:true})
  await page.goto(base+'/account');await page.getByRole('button',{name:'Uitloggen',exact:true}).click();await page.waitForURL(base+'/')
  assert.equal(await db.session.count({where:{userId:actor.user.id}}),0)
  await page.goto(base+'/credits/facturen/'+invoice.id);await page.waitForURL('**/inloggen?**')
  assert.deepEqual(errors,[]);results.push({role:actor.role,status:'PASS',sessionsAfterLogout:0,real200PercentZoom:'NOT_TESTED'})
  await context.close()
 }
 writeFileSync(dir+'/results.json',JSON.stringify(results,null,2));console.log('P11 financial browser PASS: OWNER/ADMIN/MEMBER/customer/outsider, gated actions, invoice/PDF, tenant isolation, desktop/mobile, logout')
}finally{await browser?.close();server.kill();await new Promise<void>(r=>{if(server.exitCode!==null)r();else server.once('exit',()=>r())});log.end();await db.$disconnect()}
