import { beforeEach,describe,expect,it,vi } from 'vitest'
const state=vi.hoisted(()=>({db:null as unknown}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/finance/financial-transaction',()=>({runSerializableFinancialTransaction:(fn:(db:unknown)=>unknown)=>fn(state.db)}))
vi.mock('./academy-review-environment',()=>({assertAcademyReviewEnvironment:vi.fn()}))
vi.mock('./academy-commerce-environment',()=>({assertAcademyCommerceSandbox:vi.fn()}))
vi.mock('./learning-certificate-pdf',()=>({buildLearningCertificatePdf:vi.fn().mockResolvedValue(Buffer.from('%PDF-fixture'))}))
import { receiveAcademyWithdrawal } from './academy-withdrawal-service'
import { requestAcademyReview,decideAcademyReview,downloadAcademyCorrection,listAcademyReviews } from './academy-review-service'
import { qualifyingAcademyPass } from './academy-commerce-access'
import { WITHDRAWAL_DECLARATION_VERSION } from './academy-withdrawal-policy'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
const id='10000000-0000-4000-8000-000000000001',target='10000000-0000-4000-8000-000000000002',key='10000000-0000-4000-8000-000000000003'
function fixture(){return {
 $queryRaw:vi.fn(),user:{findUnique:vi.fn().mockResolvedValue({id,status:'ACTIVE',emailVerified:true}),findFirst:vi.fn().mockResolvedValue(null)},
 academyWithdrawalRequest:{findUnique:vi.fn().mockResolvedValue(null),count:vi.fn().mockResolvedValue(0),create:vi.fn().mockResolvedValue({id,receivedAt:new Date('2026-10-30'),declarationVersion:WITHDRAWAL_DECLARATION_VERSION})},
 academyReviewEvent:{findUnique:vi.fn().mockResolvedValue(null),findFirst:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue({id}),findMany:vi.fn().mockResolvedValue([])},
 learningCertificate:{findFirst:vi.fn().mockResolvedValue({id:target,userId:id,status:'ACTIVE',firstName:'Oorspronkelijk',lastName:'Test'}),update:vi.fn()},
 learningExamAttempt:{findFirst:vi.fn().mockResolvedValue(null),findMany:vi.fn().mockResolvedValue([])},
 learningAcademySeat:{findMany:vi.fn().mockResolvedValue([])},learningChapterProgress:{count:vi.fn().mockResolvedValue(10)},learningChapter:{count:vi.fn().mockResolvedValue(10)},
 financialEvent:{create:vi.fn()},notificationOutbox:{create:vi.fn()},marketplaceAuditEvent:{create:vi.fn()},
}}
let db:ReturnType<typeof fixture>
beforeEach(()=>{vi.clearAllMocks();db=fixture();state.db=db})
const declaration={requestKey:key,orderReference:'unknown-order',email:'operator@example.invalid',confirmed:true,declarationVersion:WITHDRAWAL_DECLARATION_VERSION}
describe('D15 private durable receipt without order enumeration',()=>{
 it('records an unmatched declaration without account or purchase lookup and queues one receipt',async()=>{expect(await receiveAcademyWithdrawal(declaration)).toEqual({reference:id,receivedAt:'2026-10-30T00:00:00.000Z'});expect(db.notificationOutbox.create).toHaveBeenCalledTimes(1);expect(db.user.findUnique).not.toHaveBeenCalled();expect(db.financialEvent.create).toHaveBeenCalledTimes(1)})
 it('replays the same declaration without a second email',async()=>{db.academyWithdrawalRequest.findUnique.mockResolvedValue({...declaration,id,receivedAt:new Date('2026-10-30')});await receiveAcademyWithdrawal(declaration);expect(db.notificationOutbox.create).not.toHaveBeenCalled()})
 it('refuses identity substitution under the same request key',async()=>{db.academyWithdrawalRequest.findUnique.mockResolvedValue({...declaration,email:'other@example.invalid'});await expect(receiveAcademyWithdrawal(declaration)).rejects.toThrow('CONFLICT')})
 it('rate-limits before any write',async()=>{db.academyWithdrawalRequest.count.mockResolvedValue(50);await expect(receiveAcademyWithdrawal(declaration)).rejects.toThrow('RATE_LIMIT');expect(db.academyWithdrawalRequest.create).not.toHaveBeenCalled()})
 it('never accepts an unchecked declaration',async()=>{await expect(receiveAcademyWithdrawal({...declaration,confirmed:false})).rejects.toThrow();expect(db.academyWithdrawalRequest.create).not.toHaveBeenCalled()})
})
describe('D11 human review and immutable correction',()=>{
 const request={requestKey:key,targetId:target,kind:'CERTIFICATE_NAME',reason:'Een gecontroleerde naamcorrectie'}
 const first={id,caseId:id,targetId:target,kind:'CERTIFICATE_NAME',subjectUserId:id,action:'REQUESTED'}
 const decision={requestKey:key,caseId:id,action:'ACCEPTED',reason:'Identiteit is door de bevoegde operator gecontroleerd',firstName:'Gecorrigeerd',lastName:'Test'}
 it('records own request and never edits the certificate',async()=>{await requestAcademyReview(id,request);expect(db.academyReviewEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({actorUserId:id,subjectUserId:id,action:'REQUESTED'})}));expect(db.learningCertificate.update).not.toHaveBeenCalled()})
 it('refuses another student certificate or unfinished exam',async()=>{db.learningCertificate.findFirst.mockResolvedValue(null);await expect(requestAcademyReview(id,request)).rejects.toThrow('NOT_AVAILABLE');await expect(requestAcademyReview(id,{...request,kind:'EXAM_SCORE'})).rejects.toThrow('NOT_AVAILABLE');expect(db.academyReviewEvent.create).not.toHaveBeenCalled()})
 it('refuses student decisions before writes',async()=>{await expect(decideAcademyReview(id,decision)).rejects.toThrow();expect(db.academyReviewEvent.create).not.toHaveBeenCalled()})
 it('stores explicit corrected data separately and audits the authorized decision',async()=>{db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findFirst.mockResolvedValueOnce(first).mockResolvedValueOnce(null);await decideAcademyReview(id,decision);expect(db.learningCertificate.update).not.toHaveBeenCalled();expect(db.academyReviewEvent.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({details:{firstName:'Gecorrigeerd',lastName:'Test',templateVersion:'ACADEMY-CORRECTION-1.0'}})}));expect(db.marketplaceAuditEvent.create).toHaveBeenCalledTimes(1)})
 it('refuses a changed name under a repeated decision key',async()=>{db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findFirst.mockResolvedValue(first);db.academyReviewEvent.findUnique.mockResolvedValue({...decision,actorUserId:id,details:{firstName:'Ander',lastName:'Test'}});await expect(decideAcademyReview(id,decision)).rejects.toThrow('CONFLICT')})
 it('does not allow a name request to revoke a certificate',async()=>{db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findFirst.mockResolvedValueOnce(first).mockResolvedValueOnce(null);await expect(decideAcademyReview(id,{...decision,action:'REVOKED'})).rejects.toThrow('REVOCATION_CONTEXT');expect(db.learningCertificate.update).not.toHaveBeenCalled()})
 it('builds a marked correction from immutable original data only for its owner',async()=>{db.academyReviewEvent.findFirst.mockResolvedValue({...first,createdAt:new Date('2026-10-30'),details:{firstName:'Gecorrigeerd',lastName:'Test',templateVersion:'ACADEMY-CORRECTION-1.0'}});await downloadAcademyCorrection(id,target);expect(buildLearningCertificatePdf).toHaveBeenCalledWith(expect.objectContaining({firstName:'Gecorrigeerd',correctionNotice:expect.stringContaining('oorspronkelijke')}));expect(db.learningCertificate.findFirst).toHaveBeenCalledWith({where:{id:target,userId:id,status:'ACTIVE'}});expect(db.learningCertificate.update).not.toHaveBeenCalled()})
 it('limits student history to the authenticated subject',async()=>{await listAcademyReviews(id);expect(db.academyReviewEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{subjectUserId:id}}))})
})
describe('D10 future alumni provenance',()=>{
 const pass={id:target,userId:id,enrollmentId:target,courseVersionId:target}
 const paid={status:'ACTIVE',order:{purchase:{status:'PAID',amountInclVatCents:14900,molliePaymentId:'tr_fake',refunds:[]}}}
 async function qualify(){return qualifyingAcademyPass(db as unknown as Parameters<typeof qualifyingAcademyPass>[0],'student@example.invalid',target)}
 it('accepts an evidenced paid pass and a still-pending refund request',async()=>{db.learningExamAttempt.findMany.mockResolvedValue([pass]);db.learningAcademySeat.findMany.mockResolvedValue([{...paid,order:{purchase:{...paid.order.purchase,status:'REFUND_REVIEW_REQUIRED'}}}]);expect(await qualify()).toEqual(pass)})
 it.each(['REFUNDED','PARTIALLY_REFUNDED','CANCELED'])('does not guess eligibility for %s',async status=>{db.learningExamAttempt.findMany.mockResolvedValue([pass]);db.learningAcademySeat.findMany.mockResolvedValue([{...paid,order:{purchase:{...paid.order.purchase,status}}}]);expect(await qualify()).toBeNull()})
 it('excludes a confirmed refund even if a stale purchase status says PAID',async()=>{db.learningExamAttempt.findMany.mockResolvedValue([pass]);db.learningAcademySeat.findMany.mockResolvedValue([{...paid,order:{purchase:{...paid.order.purchase,refunds:[{id:'confirmed',status:'REFUNDED',amountCents:14900}]}}}]);expect(await qualify()).toBeNull()})
 it('accepts another valid course after a refunded course',async()=>{db.learningExamAttempt.findMany.mockResolvedValue([pass,{...pass,id:key}]);db.learningAcademySeat.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([paid]);expect((await qualify())?.id).toBe(key)})
 it('routes unattributable partial history to review, but accepts a separate proven course',async()=>{
  db.learningExamAttempt.findMany.mockResolvedValue([pass])
  const uncertain={...paid,order:{purchase:{...paid.order.purchase,refunds:[{id:'old',status:'REFUNDED',amountCents:100,seatAllocations:[]}]}}}
  db.learningAcademySeat.findMany.mockResolvedValue([uncertain])
  await expect(qualify()).rejects.toThrow('REVIEW_REQUIRED')
  db.learningExamAttempt.findMany.mockResolvedValue([pass,{...pass,id:key}])
  db.learningAcademySeat.findMany.mockResolvedValueOnce([uncertain]).mockResolvedValueOnce([paid])
  expect((await qualify())?.id).toBe(key)
 })
 it.each([0,14900])('blocks free and unproven legacy provenance %s',async amount=>{db.learningExamAttempt.findMany.mockResolvedValue([pass]);db.learningAcademySeat.findMany.mockResolvedValue([{...paid,order:{purchase:{...paid.order.purchase,amountInclVatCents:amount,molliePaymentId:null}}}]);expect(await qualify()).toBeNull()})
})

describe('admin request history readmodel',()=>{
 it('checks operator authorization before reading case histories',async()=>{await expect(listAcademyReviews(id,true)).rejects.toThrow();expect(db.academyReviewEvent.findMany).not.toHaveBeenCalled()})
 it('loads complete case histories after limiting requests, without cutting off terminal decisions',async()=>{
  db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findMany.mockResolvedValueOnce([{caseId:id}]).mockResolvedValueOnce([{caseId:id,action:'REQUESTED'},{caseId:id,action:'ACCEPTED'}]);
  expect(await listAcademyReviews(id,true)).toHaveLength(2)
  expect(db.academyReviewEvent.findMany).toHaveBeenNthCalledWith(1,expect.objectContaining({where:{action:'REQUESTED'},take:100,select:{caseId:true}}))
  expect(db.academyReviewEvent.findMany.mock.calls[1][0]).toEqual({where:{caseId:{in:[id]}},orderBy:[{createdAt:'asc'},{id:'asc'}]})
 })
 it('accepts an exam objection with an audit event and no historical exam mutation',async()=>{
  db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findFirst.mockResolvedValueOnce({caseId:id,targetId:target,subjectUserId:id,kind:'EXAM_SCORE'}).mockResolvedValueOnce(null)
  await decideAcademyReview(id,{requestKey:key,caseId:id,action:'ACCEPTED',reason:'De inhoudelijk bevoegde reviewer heeft het bezwaar beoordeeld.'})
  expect(db.marketplaceAuditEvent.create).toHaveBeenCalledOnce();expect(db.learningCertificate.update).not.toHaveBeenCalled();expect(db.learningExamAttempt.findFirst).not.toHaveBeenCalled()
 })
 it('replays the same accepted decision without a second audit event',async()=>{
  db.user.findFirst.mockResolvedValue({id});db.academyReviewEvent.findFirst.mockResolvedValue({caseId:id,targetId:target,subjectUserId:id,kind:'EXAM_SCORE'})
  const decision={requestKey:key,caseId:id,action:'ACCEPTED',reason:'Gecontroleerd bezwaar met gemotiveerd besluit'}
  db.academyReviewEvent.findUnique.mockResolvedValue({...decision,id,actorUserId:id,details:{}})
  expect(await decideAcademyReview(id,decision)).toEqual({id});expect(db.marketplaceAuditEvent.create).not.toHaveBeenCalled();expect(db.academyReviewEvent.create).not.toHaveBeenCalled()
 })
})
