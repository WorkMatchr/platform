import { beforeEach as enableRuntimeBeforeEach } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
const state=vi.hoisted(()=>({user:'10000000-0000-4000-8000-000000000001' as string|null,role:'OWNER',db:null as unknown,pdf:vi.fn()}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:async()=>state.user?{id:state.user}:null}))
vi.mock('@/lib/platform-admin/platform-admin-authorization',async original=>{
  const actual=await original<typeof import('@/lib/platform-admin/platform-admin-authorization')>()
  return {...actual,getPlatformOperatorContext:async()=>{if(!['OWNER','ADMIN'].includes(state.role))throw new actual.PlatformAdminAccessError();return {userId:state.user!,membershipRole:state.role,platformOrganizationId:'10000000-0000-4000-8000-000000000002'}}}
})
vi.mock('./learning-certificate-pdf',()=>({buildLearningCertificatePdf:state.pdf,learningCertificateFilename:()=> 'Certificaat-test.pdf'}))
import { downloadAcademyCertificate,listAcademyCertificateCourses,listAcademyCertificates,readAcademyCertificate,requestAcademyCertificateResend,certificateRecipientFingerprint } from './academy-certificate-admin-service'
import {certificateDateBoundary,certificateFilterSchema,certificateStatusLabel} from './academy-certificate-admin-model'

const certificateId='10000000-0000-4000-8000-000000000003'
function fixture(course='WL-001') {return {
  id:certificateId,userId:'10000000-0000-4000-8000-000000000004',firstName:'Oorspronkelijke',lastName:'Deelnemer',
  certificateNumber:course==='WL-001'?'WM-RIE-2026-0123456789ABCDEF01234567':'WM-ACA-2026-FEDCBA987654321001234567',
  courseTitle:course==='WL-001'?'RI&E in de praktijk':'Preventiemedewerker',courseVersion:'historical-1.0',examVersion:course+'-EXAM-1.0',
  templateVersion:course==='WL-001'?'WL-001-CERT-1.0':'ACADEMY-CERT-1.0',examAttemptId:'10000000-0000-4000-8000-000000000005',
  issuedAt:new Date('2026-01-15T12:00:00Z'),status:'ACTIVE',user:{email:'student@example.invalid',emailVerified:true,status:'ACTIVE'},
}}
function setup(certificate=fixture()) {
 const jobs=new Map<string,{id:string;status:string}>(),audits=new Map<string,unknown>()
 const db={
  learningCourse:{findMany:vi.fn().mockResolvedValue([{code:'WL-001',title:'RI&E in de praktijk'},{code:'WL-002',title:'Preventiemedewerker'}])},
  learningCertificate:{findUnique:vi.fn().mockResolvedValue(certificate),count:vi.fn().mockResolvedValue(26),findMany:vi.fn().mockResolvedValue([certificate])},
  notificationOutbox:{upsert:vi.fn(async({where}:{where:{idempotencyKey:string}})=>{if(!jobs.has(where.idempotencyKey))jobs.set(where.idempotencyKey,{id:randomUUID(),status:'PENDING'});return jobs.get(where.idempotencyKey)!})},
  marketplaceAuditEvent:{create:vi.fn().mockResolvedValue({id:'audit'}),upsert:vi.fn(async(input:{where:{correlationKey:string};create:unknown})=>{audits.set(input.where.correlationKey,input.create);return {id:'audit'}})},
  $queryRaw:vi.fn().mockResolvedValue([{id:certificateId}]),$transaction:vi.fn(),
 }
 db.$transaction.mockImplementation(async work=>typeof work==='function'?work(db):Promise.all(work))
 state.db=db;return {db,jobs,audits}
}
beforeEach(()=>{state.user='10000000-0000-4000-8000-000000000001';state.role='OWNER';state.pdf.mockReset().mockResolvedValue(new Uint8Array([37,80,68,70]));setup()})
function resend(requestId=randomUUID()) {return {certificateId,requestId,recipientFingerprint:certificateRecipientFingerprint(certificateId,'student@example.invalid'),confirmed:true as const}}

describe('Academy certificate management access',()=>{
 it.each(['OWNER','ADMIN'])('allows platform %s',async role=>{state.role=role;expect(await listAcademyCertificateCourses()).toHaveLength(2)})
 it.each(['STUDENT','MEMBER','ORGANIZATION_ADMIN','PROFESSIONAL','CLIENT'])('denies %s for every data operation',async role=>{
  state.role=role;const {db}=setup()
  for(const operation of [()=>listAcademyCertificates({}),()=>readAcademyCertificate(certificateId),()=>downloadAcademyCertificate(certificateId),()=>requestAcademyCertificateResend(resend()),()=>listAcademyCertificateCourses()])await expect(operation()).rejects.toMatchObject({status:403})
  expect(db.learningCertificate.findUnique).not.toHaveBeenCalled();expect(db.notificationOutbox.upsert).not.toHaveBeenCalled()
 })
 it('denies anonymous reads and writes before accessing records',async()=>{state.user=null;await expect(listAcademyCertificates({})).rejects.toMatchObject({status:401});await expect(requestAcademyCertificateResend(resend())).rejects.toMatchObject({status:401})})
})
describe('immutable snapshots, lookup and filtering',()=>{
 it('filters and pages on the server without returning user emails',async()=>{
  const {db}=setup();const result=await listAcademyCertificates({q:'Oorspronkelijke student@example.invalid',course:'WL-002',status:'REVOKED',page:2,from:'2026-01-01',until:'2026-01-31'})
  expect(result.total).toBe(26);expect(result.pageCount).toBe(2)
  expect(db.learningCertificate.findMany).toHaveBeenCalledWith(expect.objectContaining({skip:25,take:25,where:expect.objectContaining({status:'REVOKED',course:{code:'WL-002'},AND:expect.any(Array),issuedAt:{gte:new Date('2025-12-31T23:00:00Z'),lt:new Date('2026-01-31T23:00:00Z')}})}))
  // The actual Prisma select is the privacy boundary; the mock row has more fields.
  expect(db.learningCertificate.findMany.mock.calls[0][0].select).not.toHaveProperty('user')
 })
 it.each(['WL-001','WL-002'])('uses the original %s snapshot for details and PDF',async course=>{
  const original=fixture(course);const before=JSON.stringify(original);const {db}=setup(original)
  const detail=await readAcademyCertificate(certificateId)
  expect(detail.courseVersion).toBe('historical-1.0');expect(detail.certificateNumber).toBe(original.certificateNumber)
  expect(detail).not.toHaveProperty('user');expect(detail).not.toHaveProperty('score')
  await downloadAcademyCertificate(certificateId);expect(state.pdf).toHaveBeenCalledWith(original)
  expect(JSON.stringify(original)).toBe(before)
  expect(db.marketplaceAuditEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({entityId:certificateId,action:'ACADEMY_CERTIFICATE_PDF_DOWNLOADED',metadata:{result:'SUCCESS'}})}))
 })
 it('does not expose an unverified recipient in confirmation',async()=>{const c=fixture();c.user.emailVerified=false;setup(c);const r=await readAcademyCertificate(certificateId);expect(r.recipientEmail).toBeNull();expect(r.recipientFingerprint).toBeNull()})
 it('returns generic not-found for unknown and malformed IDs',async()=>{const {db}=setup();db.learningCertificate.findUnique.mockResolvedValue(null);await expect(readAcademyCertificate(certificateId)).rejects.toMatchObject({status:404});await expect(downloadAcademyCertificate('42')).rejects.toMatchObject({status:404})})
 it('blocks download for revoked certificates and records the result',async()=>{const c=fixture();c.status='REVOKED';const {db}=setup(c);await expect(downloadAcademyCertificate(certificateId)).rejects.toMatchObject({status:409});expect(state.pdf).not.toHaveBeenCalled();expect(db.marketplaceAuditEvent.create).toHaveBeenCalled()})
 it('rechecks revocation after PDF generation before serving the document',async()=>{
  const original=fixture();const {db}=setup(original)
  db.learningCertificate.findUnique.mockResolvedValueOnce(original).mockResolvedValueOnce({...original,status:'REVOKED'})
  await expect(downloadAcademyCertificate(certificateId)).rejects.toMatchObject({status:409})
  expect(db.marketplaceAuditEvent.create).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({metadata:{result:'REVOKED'}})}))
 })
 it('audits a PDF generation failure without leaking exception details',async()=>{const {db}=setup();state.pdf.mockRejectedValue(new Error('private fixture'));await expect(downloadAcademyCertificate(certificateId)).rejects.toThrow();expect(db.marketplaceAuditEvent.create).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({metadata:{result:'FAILED'}})}))})
 it('rejects impossible dates, inverted ranges, extra fields and invalid pages',()=>{
  for(const f of [{from:'2026-02-30'},{from:'2026-04-02',until:'2026-04-01'},{page:0},{page:1.1},{q:'x'.repeat(161)},{userId:'other'}])expect(certificateFilterSchema.safeParse(f).success).toBe(false)
 })
 it('uses Dutch calendar dates at DST boundaries',()=>{
  expect(certificateDateBoundary('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z')
  expect(certificateDateBoundary('2026-03-29',true).toISOString()).toBe('2026-03-29T22:00:00.000Z')
  expect(certificateDateBoundary('2026-10-25',true).getTime()-certificateDateBoundary('2026-10-25').getTime()).toBe(25*60*60*1000)
 })
})
describe('explicit resend requests',()=>{
 it('deduplicates repeated and simultaneous requests; permits a deliberate later request',async()=>{
  const {jobs,audits,db}=setup();const request=resend()
  await Promise.all([requestAcademyCertificateResend(request),requestAcademyCertificateResend(request),requestAcademyCertificateResend(request)])
  expect(jobs.size).toBe(1);expect(audits.size).toBe(1)
  await requestAcademyCertificateResend(resend());expect(jobs.size).toBe(2)
  expect(db.notificationOutbox.upsert.mock.calls[0][0]).toMatchObject({create:{templateKey:'LEARNING_CERTIFICATE_RESEND',recipientUserId:fixture().userId}})
  expect([...jobs.keys()].every(key=>key.length<=160)).toBe(true)
 })
 it.each(['REVOKED','UNVERIFIED','INACTIVE','CHANGED_EMAIL'])('blocks %s before creating intent',async condition=>{
  const c=fixture();if(condition==='REVOKED')c.status='REVOKED';if(condition==='UNVERIFIED')c.user.emailVerified=false;if(condition==='INACTIVE')c.user.status='BLOCKED';if(condition==='CHANGED_EMAIL')c.user.email='changed@example.invalid'
  const {jobs}=setup(c);await expect(requestAcademyCertificateResend(resend())).rejects.toMatchObject({status:409});expect(jobs.size).toBe(0)
 })
 it('requires confirmation and rejects a client supplied recipient or administrator',async()=>{
  for(const input of [{...resend(),confirmed:false},{...resend(),email:'other@example.invalid'},{...resend(),actorUserId:randomUUID()}])await expect(requestAcademyCertificateResend(input)).rejects.toMatchObject({status:400})
 })
 it('retries a Serializable conflict without inventing a second intent',async()=>{
  const {db,jobs}=setup()
  const {Prisma}=await import('@/generated/prisma/client')
  db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflict',{code:'P2034',clientVersion:'7.8.0'}))
  await requestAcademyCertificateResend(resend());expect(jobs.size).toBe(1)
 })
})

it('presents known certificate statuses and a neutral unknown status',()=>{
 expect(certificateStatusLabel('ACTIVE')).toBe('Geldig')
 expect(certificateStatusLabel('REVOKED')).toBe('Ingetrokken')
 expect(certificateStatusLabel('UNKNOWN')).toBe('Status niet beschikbaar')
 expect(certificateStatusLabel('toString')).toBe('Status niet beschikbaar')
})

enableRuntimeBeforeEach(()=>{vi.stubEnv('LEARNING_RUNTIME_ENABLED','true')})
