import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Prisma } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
const state=vi.hoisted(()=>({db:null as unknown,actor:''}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:async()=>state.actor?{id:state.actor}:null}))
import {listAcademyCertificates,readAcademyCertificate,downloadAcademyCertificate,requestAcademyCertificateResend} from './academy-certificate-admin-service'
import {deliverLearningCertificateEmails} from './learning-certificate-email-worker'
const enabled=process.env.ACADEMY_CERTIFICATE_ADMIN_RUNTIME==='1'
describe.skipIf(!enabled)('Academy certificate management PostgreSQL, all writes rolled back',()=>{
 let db:PrismaClient
 beforeAll(async()=>{
  vi.stubEnv('LEARNING_RUNTIME_ENABLED','true')
  assertAcademyDatabaseTarget({databaseUrl:process.env.DATABASE_URL,projectId:process.env.ACADEMY_TEST_PROJECT_ID,branchId:process.env.ACADEMY_TEST_BRANCH_ID,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV})
  if(process.env.RESEND_API_KEY||process.env.AUTH_EMAIL_FROM)throw new Error('LIVE_MAIL_CONFIG_REFUSED')
  db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL!})})
  const [identity]=await db.$queryRawUnsafe<Array<{database:string;major:number}>>("SELECT current_database() AS database,(current_setting('server_version_num')::int/10000)::int AS major")
  expect(identity).toEqual({database:'neondb',major:17})
 })
 afterAll(async()=>{await db?.$disconnect();vi.unstubAllEnvs()})
 it('preserves real snapshots, deduplicates intents, audits fake delivery, and leaves no writes',async()=>{
  const actor=await db.user.findFirstOrThrow({where:{status:'ACTIVE',platformRole:'ADMIN',memberships:{some:{role:'OWNER',status:'ACTIVE',organization:{systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'}}}},select:{id:true}})
  const original=await db.learningCertificate.findFirstOrThrow({where:{status:'ACTIVE',course:{code:'WL-001'}}})
  const recipient=await db.user.findUniqueOrThrow({where:{id:original.userId},select:{email:true,status:true,emailVerified:true}})
  if(!recipient.email.endsWith('@example.invalid'))throw new Error('FICTIONAL_FIXTURE_REQUIRED')
  const beforeRecipient=JSON.stringify(recipient)
  const before=JSON.stringify(original)
  const beforeExam=JSON.stringify(await db.learningExamAttempt.findUnique({where:{id:original.examAttemptId},include:{answers:true}}))
  const originalAttempt=await db.learningExamAttempt.findUniqueOrThrow({where:{id:original.examAttemptId}})
  const beforeVersion=JSON.stringify(await db.learningCourseVersion.findUnique({where:{id:originalAttempt.courseVersionId}}))
  const beforeCounts=[await db.notificationOutbox.count(),await db.marketplaceAuditEvent.count()]
  const rollback=new Error('EXPECTED_ROLLBACK')
  try{
   await db.$transaction(async tx=>{
    const proxy:typeof tx=new Proxy(tx,{get(target,key){
     if(key==='$transaction')return async(work:unknown)=>typeof work==='function'?(work as (t:unknown)=>Promise<unknown>)(proxy):Promise.all(work as Promise<unknown>[])
     const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value
    }})
    state.db=proxy;state.actor=actor.id
    // Isolated delivery fixture only; this change is never committed or used for authentication.
    await tx.user.update({where:{id:original.userId},data:{status:'ACTIVE',emailVerified:true}})
    const found=await listAcademyCertificates({q:original.certificateNumber})
    expect(found.total).toBe(1);expect(found.rows[0].id).toBe(original.id)
    const detail=await readAcademyCertificate(original.id)
    expect(detail.certificateNumber===original.certificateNumber).toBe(true)
    expect(detail.courseVersion===original.courseVersion).toBe(true)
    const downloaded=await downloadAcademyCertificate(original.id)
    const {PDFDocument,PDFName}=await import('pdf-lib')
    const pdf=await PDFDocument.load(downloaded.pdf)
    expect(pdf.getPageCount()).toBe(1)
    expect(pdf.catalog.has(PDFName.of('StructTreeRoot'))).toBe(true)
    expect(pdf.catalog.get(PDFName.of('Lang'))?.toString()).toContain('nl')
    expect(Buffer.from(downloaded.pdf).subarray(0,5).toString()).toBe('%PDF-')
    const request={certificateId:original.id,requestId:randomUUID(),recipientFingerprint:detail.recipientFingerprint,confirmed:true}
    await Promise.all([requestAcademyCertificateResend(request),requestAcademyCertificateResend(request)])
    const key=(requestId:string)=>['EMAIL','ACADEMY_RESEND',original.id,actor.id,requestId].join(':')
    const queued=await tx.notificationOutbox.findMany({where:{idempotencyKey:key(request.requestId)}})
    expect(queued).toHaveLength(1)
    const secondRequestId=randomUUID()
    await requestAcademyCertificateResend({...request,requestId:secondRequestId})
    const jobs=await tx.notificationOutbox.findMany({where:{idempotencyKey:{in:[key(request.requestId),key(secondRequestId)]}},orderBy:{id:'asc'}})
    expect(jobs).toHaveLength(2)
    const tick=new Date('2000-01-01T12:00:00Z')
    await tx.notificationOutbox.update({where:{id:jobs[0].id},data:{availableAt:tick}})
    expect(await tx.notificationOutbox.count({where:{channel:'EMAIL',templateKey:{in:['LEARNING_CERTIFICATE_ISSUED','LEARNING_CERTIFICATE_RESEND']},OR:[{status:'PENDING',availableAt:{lte:tick}},{status:'PROCESSING',OR:[{leaseUntil:null},{leaseUntil:{lte:tick}}]}]}})).toBe(1)
    const send=vi.fn().mockResolvedValue({accepted:true,transport:'RESEND',status:'ACCEPTED',messageId:'fake-postgresql-only'})
    expect(await deliverLearningCertificateEmails({send,now:()=>tick,limit:1})).toMatchObject({sent:1,failed:0})
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0][0].to===detail.recipientEmail).toBe(true)
    expect(Buffer.from(send.mock.calls[0][0].attachments[0].content).subarray(0,5).toString()).toBe('%PDF-')
    expect(await tx.marketplaceAuditEvent.count({where:{entityId:original.id,action:'ACADEMY_CERTIFICATE_RESEND_SENT',metadata:{path:['outboxId'],equals:jobs[0].id}}})).toBe(1)
    await tx.user.update({where:{id:original.userId},data:{emailVerified:false}})
    await expect(requestAcademyCertificateResend({...request,requestId:randomUUID()})).rejects.toMatchObject({status:409})
    await tx.notificationOutbox.update({where:{id:jobs[1].id},data:{availableAt:tick}})
    send.mockClear()
    expect(await deliverLearningCertificateEmails({send,now:()=>tick,limit:1})).toMatchObject({failed:1,sent:0})
    expect(send).not.toHaveBeenCalled()
    expect(await tx.marketplaceAuditEvent.count({where:{entityId:original.id,action:'ACADEMY_CERTIFICATE_RESEND_FAILED',metadata:{path:['outboxId'],equals:jobs[1].id}}})).toBe(1)
    expect(JSON.stringify(await tx.learningCertificate.findUnique({where:{id:original.id}}))===before).toBe(true)
    throw rollback
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:120_000,maxWait:20_000})
  }catch(error){if(error!==rollback)throw error}finally{state.db=null;state.actor=''}
  expect(JSON.stringify(await db.learningCertificate.findUnique({where:{id:original.id}}))===before).toBe(true)
  expect(JSON.stringify(await db.learningExamAttempt.findUnique({where:{id:original.examAttemptId},include:{answers:true}}))===beforeExam).toBe(true)
  expect(JSON.stringify(await db.learningCourseVersion.findUnique({where:{id:originalAttempt.courseVersionId}}))===beforeVersion).toBe(true)
  expect(JSON.stringify(await db.user.findUnique({where:{id:original.userId},select:{email:true,status:true,emailVerified:true}}))===beforeRecipient).toBe(true)
  expect([await db.notificationOutbox.count(),await db.marketplaceAuditEvent.count()]).toEqual(beforeCounts)
 },150_000)
})
