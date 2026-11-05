import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget, ACADEMY_FINAL_ACCEPTANCE_DATABASE } from './academy-database-policy'
const state=vi.hoisted(()=>({db:null as Prisma.TransactionClient|null, actor:''}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/finance/financial-transaction',()=>({runSerializableFinancialTransaction:(fn:(tx:Prisma.TransactionClient)=>unknown)=>fn(state.db!)}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:async()=>state.actor?{id:state.actor}:null}))
import { requestAcademyReview, decideAcademyReview, listAcademyReviews } from './academy-review-service'
import { readAcademyPricingAdmin } from './academy-pricing-service'
import { regularAcademyCourses } from './academy-admin-selection'
const enabled=process.env.ACADEMY_ADMIN_REMEDIATION_RUNTIME==='1'
let db:PrismaClient
beforeAll(async()=>{
 if(!enabled)return
 const identity=assertAcademyDatabaseTarget({databaseUrl:process.env.DATABASE_URL,projectId:process.env.ACADEMY_TEST_PROJECT_ID,branchId:process.env.ACADEMY_TEST_BRANCH_ID,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV})
 if(identity.branchId!==ACADEMY_FINAL_ACCEPTANCE_DATABASE.branchId||process.env.RESEND_API_KEY||process.env.MOLLIE_API_KEY||process.env.ACADEMY_COMMERCE_SANDBOX)throw Error('RUNTIME_TARGET_REFUSED')
 db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})})
 expect(await db.$queryRaw`SELECT current_database() database,(current_setting('server_version_num')::int/10000)::int major`).toEqual([{database:'neondb',major:17}])
},30000)
afterAll(async()=>{await db?.$disconnect()})
async function rolledBack(fn:(tx:Prisma.TransactionClient)=>Promise<void>){
 const sentinel=new Error('EXPECTED_ROLLBACK')
 try{await db.$transaction(async tx=>{state.db=tx;await fn(tx);await tx.$executeRawUnsafe('SET CONSTRAINTS ALL IMMEDIATE');throw sentinel},{timeout:90000})}catch(error){if(error!==sentinel)throw error}
}
async function operator(tx:Prisma.TransactionClient){return tx.user.findFirstOrThrow({where:{status:'ACTIVE',platformRole:'ADMIN',memberships:{some:{status:'ACTIVE',role:'OWNER',organization:{systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'}}}},select:{id:true}})}
describe.skipIf(!enabled)('Academy admin remediation — exact isolated PostgreSQL, rollback only',()=>{
 it('selects ordinary courses and registered accounts while preserving all records and existing promotions',async()=>{
  await rolledBack(async tx=>{
   state.actor=(await operator(tx)).id
   const before=await tx.learningCourse.count(),usersBefore=await tx.user.count(),promosBefore=await tx.learningAcademyPromotion.count()
   const result=await readAcademyPricingAdmin()
   expect(result.courses.map(c=>c.code)).toEqual(['WL-001','WL-002','WL-003'])
   expect(result.users.some(u=>u.id===state.actor)).toBe(true)
   for(const user of result.users)expect(await tx.account.count({where:{userId:user.id}})).toBeGreaterThan(0)
   expect(result.promotions.length).toBe(promosBefore)
   expect(await tx.learningCourse.count()).toBe(before);expect(await tx.user.count()).toBe(usersBefore)
   expect(await tx.learningCourse.count({where:{NOT:regularAcademyCourses}})).toBe(2)
  })
 },90000)
 it('records, decides and audits an exam objection without commerce and preserves original exam history',async()=>{
  const before=await db.academyReviewEvent.count(),audit=await db.marketplaceAuditEvent.count()
  await rolledBack(async tx=>{
   const admin=await operator(tx)
   const attempt=await tx.learningExamAttempt.findFirstOrThrow({where:{status:'SUBMITTED',examVersion:{courseVersion:{course:{code:'WL-901'}}},user:{status:'ACTIVE',emailVerified:true,accounts:{none:{}}}},include:{answers:true}})
   const original=JSON.stringify(attempt)
   const request=await requestAcademyReview(attempt.userId,{requestKey:randomUUID(),targetId:attempt.id,kind:'EXAM_SCORE',reason:'Synthetische teruggedraaide acceptatieproef voor examenbezwaar.'})
   await expect(listAcademyReviews(attempt.userId,true)).rejects.toMatchObject({code:'ACCESS_DENIED'})
   const decision={requestKey:randomUUID(),caseId:request.caseId,action:'ACCEPTED',reason:'Synthetisch beoordeeld zonder historische examenmutatie.'}
   const result=await decideAcademyReview(admin.id,decision);expect(await decideAcademyReview(admin.id,decision)).toEqual(result)
   const history=await listAcademyReviews(admin.id,true);expect(history.filter(e=>e.caseId===request.caseId).map(e=>e.action)).toEqual(['REQUESTED','ACCEPTED'])
   expect(await tx.marketplaceAuditEvent.count({where:{entityId:result.id,action:'ACADEMY_HUMAN_REVIEW'}})).toBe(1)
   expect(JSON.stringify(await tx.learningExamAttempt.findUnique({where:{id:attempt.id},include:{answers:true}}))===original).toBe(true)
   await expect(decideAcademyReview(admin.id,{...decision,requestKey:randomUUID()})).rejects.toThrow('ALREADY_DECIDED')
  })
  expect(await db.academyReviewEvent.count()).toBe(before);expect(await db.marketplaceAuditEvent.count()).toBe(audit)
 },90000)
 it('records a separate certificate name correction, refuses another subject, and leaves the snapshot unchanged',async()=>{
  await rolledBack(async tx=>{
   const admin=await operator(tx)
   const cert=await tx.learningCertificate.findFirstOrThrow({where:{course:{code:'WL-901'},status:'ACTIVE',user:{status:'ACTIVE',emailVerified:true,accounts:{none:{}}}}})
   const original=JSON.stringify(cert)
   await expect(requestAcademyReview(admin.id,{requestKey:randomUUID(),targetId:cert.id,kind:'CERTIFICATE_NAME',reason:'Onbevoegde aanvraag voor certificaat van een andere gebruiker.'})).rejects.toThrow('TARGET_NOT_AVAILABLE')
   const request=await requestAcademyReview(cert.userId,{requestKey:randomUUID(),targetId:cert.id,kind:'CERTIFICATE_NAME',reason:'Synthetische naamcorrectie uitsluitend in teruggedraaide transactie.'})
   const result=await decideAcademyReview(admin.id,{requestKey:randomUUID(),caseId:request.caseId,action:'ACCEPTED',reason:'Gecontroleerde testcorrectie; geen wijziging van het oorspronkelijke certificaat.',firstName:'Test',lastName:'Correctie'})
   expect((await tx.academyReviewEvent.findUniqueOrThrow({where:{id:result.id}})).details).toMatchObject({firstName:'Test',lastName:'Correctie',templateVersion:'ACADEMY-CORRECTION-1.0'})
   expect(JSON.stringify(await tx.learningCertificate.findUnique({where:{id:cert.id}}))===original).toBe(true)
   expect(await listAcademyReviews(admin.id)).toHaveLength(0)
  })
 },90000)
})
