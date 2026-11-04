import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
const state=vi.hoisted(()=>({db:null as unknown,pdf:vi.fn(),authorize:vi.fn()}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/platform-admin/platform-admin-authorization',()=>({getPlatformOperatorContext:state.authorize}))
vi.mock('./learning-certificate-pdf',()=>({buildLearningCertificatePdf:state.pdf,learningCertificateFilename:()=> 'Certificaat-test.pdf'}))
import {deliverLearningCertificateEmails} from './learning-certificate-email-worker'
import {certificateRecipientFingerprint} from './learning-certificate-delivery-policy'
import {AuthEmailDeliveryError} from '@/lib/email'
const ids={certificate:randomUUID(),user:randomUUID(),actor:randomUUID(),organization:randomUUID(),job:randomUUID()}
const tick=new Date('2026-10-25T12:00:00Z')
function setup(){
 const certificate={certificateNumber:'WM-RIE-2026-0123456789ABCDEF01234567',courseTitle:'RI&E in de praktijk',firstName:'Historische',lastName:'Naam',issuedAt:new Date('2026-01-01T12:00:00Z'),templateVersion:'WL-001-CERT-1.0',user:{email:'student@example.invalid',emailVerified:true,status:'ACTIVE'}}
 const payload={certificateId:ids.certificate,requestedByUserId:ids.actor,platformOrganizationId:ids.organization,actorRole:'PLATFORM_OWNER',recipientFingerprint:certificateRecipientFingerprint(ids.certificate,certificate.user.email)}
 const job={id:ids.job,templateKey:'LEARNING_CERTIFICATE_RESEND',channel:'EMAIL',status:'PROCESSING',recipientUserId:ids.user,payload,idempotencyKey:'EMAIL:ACADEMY_RESEND:test',attemptCount:1,firstAttemptAt:tick,deliveryFingerprint:null}
 const audits:unknown[]=[]
 const db={
  $queryRaw:vi.fn().mockResolvedValueOnce([{id:ids.job}]).mockResolvedValue([]),
  notificationOutbox:{findUniqueOrThrow:vi.fn().mockResolvedValue(job),updateMany:vi.fn().mockResolvedValue({count:1})},
  learningCertificate:{findFirst:vi.fn().mockResolvedValue(certificate)},
  marketplaceAuditEvent:{upsert:vi.fn(async({create}: {create:unknown})=>{audits.push(create);return {id:'audit'}})},
  $transaction:vi.fn(),
 }
 db.$transaction.mockImplementation(async work=>work(db));state.db=db
 const send=vi.fn().mockResolvedValue({accepted:true,transport:'RESEND',status:'ACCEPTED',messageId:'fake-only'})
 return {db,job,certificate,send,audits}
}
afterEach(()=>vi.unstubAllEnvs())
beforeEach(()=>{vi.stubEnv('LEARNING_RUNTIME_ENABLED','true');state.pdf.mockReset().mockResolvedValue(new Uint8Array(Buffer.from('%PDF-fixture')));state.authorize.mockReset().mockResolvedValue({membershipRole:'OWNER'})})
describe('explicit certificate resend worker, fake delivery only',()=>{
 it('uses current verified recipient, original snapshot and transactional success audit',async()=>{
  const {certificate,send,audits,db}=setup()
  const before=JSON.stringify(certificate)
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({sent:1,failed:0})
  const message=send.mock.calls[0][0]
  expect(message.to).toBe(certificate.user.email);expect(message.subject).toBe('Uw WorkMatchr-certificaat — RI&E in de praktijk')
  expect(message.attachments[0]).toMatchObject({contentType:'application/pdf',filename:'Certificaat-test.pdf'})
  expect(message.attachments[0].content.toString()).toBe('%PDF-fixture')
  expect(message.text).toContain(certificate.certificateNumber)
  expect(message.text).not.toMatch(/kennisbehoud|korting|score|hercertificering/i)
  expect(state.pdf).toHaveBeenCalledWith(certificate);expect(JSON.stringify(certificate)).toBe(before)
  expect(audits).toEqual([expect.objectContaining({actorUserId:ids.actor,entityId:ids.certificate,action:'ACADEMY_CERTIFICATE_RESEND_SENT',metadata:expect.objectContaining({result:'SENT'})})])
  expect(db.$transaction).toHaveBeenCalled()
 })
 it.each(['REVOKED','UNVERIFIED','INACTIVE','CHANGED_EMAIL','ACTOR_REVOKED'])('fails closed for %s and audits without provider call',async condition=>{
  const {db,certificate,send,audits}=setup()
  if(condition==='REVOKED')db.learningCertificate.findFirst.mockResolvedValue(null)
  if(condition==='UNVERIFIED')certificate.user.emailVerified=false
  if(condition==='INACTIVE')certificate.user.status='BLOCKED'
  if(condition==='CHANGED_EMAIL')certificate.user.email='changed@example.invalid'
  if(condition==='ACTOR_REVOKED')state.authorize.mockRejectedValue(new Error('denied'))
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({sent:0,failed:1})
  expect(send).not.toHaveBeenCalled();expect(audits).toEqual([expect.objectContaining({action:'ACADEMY_CERTIFICATE_RESEND_FAILED'})])
  expect(JSON.stringify(audits)).not.toContain('student@example.invalid')
 })
 it('rechecks revocation immediately before sending',async()=>{
  const {db,certificate,send}=setup()
  db.learningCertificate.findFirst.mockResolvedValueOnce(certificate).mockResolvedValueOnce(null)
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({failed:1})
  expect(send).not.toHaveBeenCalled()
 })
 it('audits PDF failures and oversized attachments without exposing exception text',async()=>{
  const {send,audits}=setup();state.pdf.mockRejectedValue(new Error('private fixture'))
  await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})
  expect(send).not.toHaveBeenCalled();expect(JSON.stringify(audits)).not.toContain('private fixture')
  const second=setup();state.pdf.mockResolvedValue({byteLength:20*1024*1024+1})
  expect(await deliverLearningCertificateEmails({send:second.send,limit:1,now:()=>tick})).toMatchObject({failed:1})
  expect(second.send).not.toHaveBeenCalled()
 })
 it('retries same outbox delivery and records the retry result',async()=>{
  const {db,job,send,audits}=setup()
  send.mockRejectedValueOnce(new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE','fixture',503))
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({retry:1})
  expect(audits).toEqual([expect.objectContaining({action:'ACADEMY_CERTIFICATE_RESEND_RETRY'})])
  job.attemptCount=2
  db.$queryRaw.mockResolvedValueOnce([{id:ids.job}])
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({sent:1})
  expect(send.mock.calls[0][0].idempotencyKey).toBe(send.mock.calls[1][0].idempotencyKey)
 })
 it('does not send if another worker owns the lease',async()=>{
  const {db,send}=setup();db.notificationOutbox.updateMany.mockResolvedValue({count:0})
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({sent:0})
  expect(send).not.toHaveBeenCalled()
 })
 it('does not treat development-only delivery as a real success',async()=>{
  const {send}=setup();send.mockResolvedValue({accepted:true,transport:'DEVELOPMENT_LOG',status:'DEVELOPMENT_ONLY',messageId:'fake'})
  expect(await deliverLearningCertificateEmails({send,limit:1,now:()=>tick})).toMatchObject({failed:1,sent:0})
 })
})
