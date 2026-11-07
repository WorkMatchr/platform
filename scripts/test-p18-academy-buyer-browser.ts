// Called only by the disposable local Academy PG18 harness. Production checkout stays closed.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import next from 'next'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { assertAcademyDatabaseTarget } from '../src/lib/learning/academy-database-policy'

const endpoint=assertAcademyDatabaseTarget({databaseUrl:process.env.DATABASE_URL,projectId:process.env.ACADEMY_TEST_PROJECT_ID,
  branchId:process.env.ACADEMY_TEST_BRANCH_ID,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV})
assert.equal(endpoint.hostname,'127.0.0.1');assert.equal(endpoint.projectId,'local-synthetic');assert.ok(!process.env.VERCEL)
const url=new URL(process.env.DATABASE_URL!)
assert.equal(url.username,'academy_content_editor')
const hostname='127.0.0.1', port=3096, base=`http://${hostname}:${port}`
Object.assign(process.env,{BETTER_AUTH_URL:base,NEXT_PUBLIC_APP_URL:base,BETTER_AUTH_SECRET:randomBytes(48).toString('hex'),
  NEXT_TELEMETRY_DISABLED:'1',NODE_ENV:'development'})
const {auth}=await import('../src/lib/auth')
const {hashPassword}=await import('better-auth/crypto')
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright')
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.href})})
const app=next({dev:true,webpack:true,hostname,port})
const handle=app.getRequestHandler()
const server=createServer((req,res)=>{void handle(req,res)})
const sockets=new Set<import('node:net').Socket>()
server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket))})
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined
try {
  // Bind before starting the application: never log into a pre-existing process.
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,hostname,resolve)})
  const orders=await db.learningAcademyOrder.findMany({include:{buyer:true},orderBy:{quantity:'asc'}})
  assert.deepEqual(orders.map(o=>o.quantity),[1,5])
  const password=randomBytes(30).toString('base64url')
  for(const {buyer} of orders){
    assert.ok(buyer.email.endsWith('@example.invalid'))
    await (await auth.$context).internalAdapter.createAccount({userId:buyer.id,accountId:buyer.id,providerId:'credential',password:await hashPassword(password)})
  }
  await app.prepare()
  browser=await chromium.launch({headless:true,channel:'msedge'})
  for(const [i,order] of orders.entries()){
    const context=await browser.newContext()
    try {
      const page=await context.newPage();page.setDefaultTimeout(60000)
      await page.route('**/*',(route:{request():{url():string};continue():Promise<void>;abort():Promise<void>})=>new URL(route.request().url()).origin===base ? route.continue():route.abort())
      await page.goto(base+'/inloggen?returnTo=%2Faccount')
      await page.getByLabel('E-mailadres',{exact:true}).fill(order.buyer.email)
      await page.getByLabel('Wachtwoord',{exact:true}).fill(password)
      await page.getByRole('button',{name:'Inloggen',exact:true}).click()
      await page.waitForURL('**/account')
      const path='/e-learnings/aankopen/'+order.id
      await page.goto(base+path);const link=page.getByRole('link',{name:'Testfactuur downloaden'})
      await link.waitFor();assert.equal(await link.getAttribute('href'),path+'/factuur')
      const pdf=await context.request.get(base+path+'/factuur')
      assert.equal(pdf.status(),200);assert.equal(pdf.headers()['cache-control'],'private, no-store')
      assert.equal((await pdf.body()).subarray(0,5).toString(),'%PDF-')
      const denied=await context.request.get(base+'/e-learnings/aankopen/'+orders[1-i].id+'/factuur')
      assert.equal(denied.status(),404)
    } finally {await context.close()}
  }
  console.log('PASS: authenticated individual and business buyers read their own historical course PDF; cross-buyer requests denied.')
} finally {
  await browser?.close();for(const socket of sockets) socket.destroy();if(server.listening) await new Promise<void>(resolve=>server.close(()=>resolve()))
  await app.close();await db.$disconnect()
}

// This dedicated browser subprocess also loaded Next dev watchers; release them after explicit cleanup.
process.exit(0)
