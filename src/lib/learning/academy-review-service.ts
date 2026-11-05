import 'server-only'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { requireAcademyBuyer, lockAcademyCommerce } from './academy-commerce-access'
import { commerceAssert } from './academy-commerce-policy'
import { assertAcademyReviewEnvironment } from './academy-review-environment'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
const kinds = z.enum(['CERTIFICATE_NAME','CERTIFICATE_ERROR','FRAUD','EXAM_QUESTION','EXAM_SCORE','PRIVACY'])
const requestInput = z.object({ requestKey: z.uuid(), targetId: z.uuid(), kind: kinds, reason: z.string().trim().min(10).max(2000) }).strict()
const decisionInput = z.object({ requestKey: z.uuid(), caseId: z.uuid(), action: z.enum(['RECEIVED','UPDATE','ACCEPTED','REJECTED','REVOKED']), reason: z.string().trim().min(10).max(2000), firstName: z.string().trim().min(1).max(100).optional(), lastName: z.string().trim().min(1).max(100).optional() }).strict()
export async function requestAcademyReview(userId: string, raw: unknown) {
  assertAcademyReviewEnvironment()
  const input = requestInput.parse(raw)
  return runSerializableFinancialTransaction(async tx => {
    await requireAcademyBuyer(tx, userId)
    await lockAcademyCommerce(tx, `review-request:${input.requestKey}`)
    const old = await tx.academyReviewEvent.findUnique({ where: { requestKey: input.requestKey } })
    if (old) { commerceAssert(old.actorUserId === userId && old.targetId === input.targetId && old.kind === input.kind && old.reason === input.reason, 'REVIEW_REQUEST_CONFLICT'); return { caseId: old.caseId } }
    const target = input.kind.startsWith('EXAM_')
      ? await tx.learningExamAttempt.findFirst({ where: { id: input.targetId, userId, status: 'SUBMITTED' } })
      : input.kind === 'PRIVACY' ? (input.targetId === userId ? { userId } : null)
      : await tx.learningCertificate.findFirst({ where: { id: input.targetId, userId } })
    commerceAssert(target, 'REVIEW_TARGET_NOT_AVAILABLE')
    const caseId = randomUUID()
    await tx.academyReviewEvent.create({ data: { ...input, caseId, actorUserId: userId, subjectUserId: userId, action: 'REQUESTED', details: {} } })
    return { caseId }
  })
}
export async function decideAcademyReview(actorId: string, raw: unknown) {
  assertAcademyReviewEnvironment()
  const input = decisionInput.parse(raw)
  return runSerializableFinancialTransaction(async tx => {
    await requireMarketplacePlatformAdmin(tx, actorId)
    await lockAcademyCommerce(tx, `review:${input.caseId}`)
    const first = await tx.academyReviewEvent.findFirst({ where: { caseId: input.caseId, action: 'REQUESTED' } })
    commerceAssert(first, 'REVIEW_NOT_FOUND')
    const old = await tx.academyReviewEvent.findUnique({ where: { requestKey: input.requestKey } })
    if (old) { commerceAssert(old.caseId === input.caseId && old.actorUserId === actorId && old.action === input.action && old.reason === input.reason && (old.details as {firstName?:string}).firstName === input.firstName && (old.details as {lastName?:string}).lastName === input.lastName, 'REVIEW_REQUEST_CONFLICT'); return { id: old.id } }
    commerceAssert(!await tx.academyReviewEvent.findFirst({ where: { caseId: input.caseId, action: { in: ['ACCEPTED','REJECTED','REVOKED'] } } }), 'REVIEW_ALREADY_DECIDED')
    const corrected = first.kind === 'CERTIFICATE_NAME' && input.action === 'ACCEPTED'
    commerceAssert(!corrected || (input.firstName && input.lastName && !/[\x00-\x1f\x7f]/.test(input.firstName + input.lastName)), 'REVIEW_CORRECTED_NAME_REQUIRED')
    if (input.action === 'REVOKED') {
      commerceAssert(['FRAUD','CERTIFICATE_ERROR'].includes(first.kind), 'REVIEW_REVOCATION_CONTEXT_REQUIRED')
      await tx.learningCertificate.update({ where: { id: first.targetId, userId: first.subjectUserId }, data: { status: 'REVOKED', revokedAt: new Date() } })
    }
    const result = await tx.academyReviewEvent.create({ data: {
      requestKey: input.requestKey, caseId: first.caseId, actorUserId: actorId, subjectUserId: first.subjectUserId,
      kind: first.kind, targetId: first.targetId, action: input.action, reason: input.reason,
      details: corrected ? { firstName: input.firstName!, lastName: input.lastName!, templateVersion: 'ACADEMY-CORRECTION-1.0' } : {},
    } })
    await tx.marketplaceAuditEvent.create({ data: { actorUserId: actorId, actorRole: 'PLATFORM_ADMIN', entityType: 'AcademyReviewEvent', entityId: result.id, action: 'ACADEMY_HUMAN_REVIEW', metadata: { caseId: first.caseId, kind: first.kind, action: input.action } } })
    return { id: result.id }
  })
}
export async function listAcademyReviews(userId: string, admin = false) {
  assertAcademyReviewEnvironment()
  const db = getPrisma()
  if (admin) await requireMarketplacePlatformAdmin(db, userId); else await requireAcademyBuyer(db, userId)
  if (!admin) return db.academyReviewEvent.findMany({ where: { subjectUserId: userId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100 })
  // Bound requests, not audit events: a terminal decision must never disappear
  // merely because its request or another case has a long event history.
  const requests = await db.academyReviewEvent.findMany({ where: { action: 'REQUESTED' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100, select: { caseId: true } })
  return db.academyReviewEvent.findMany({ where: { caseId: { in: requests.map(request => request.caseId) } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
}
export async function downloadAcademyCorrection(userId: string, revisionId: string) {
  assertAcademyReviewEnvironment()
  const db = getPrisma(); await requireAcademyBuyer(db, userId)
  const revision = await db.academyReviewEvent.findFirst({ where: { id: z.uuid().parse(revisionId), subjectUserId: userId, kind: 'CERTIFICATE_NAME', action: 'ACCEPTED' } })
  commerceAssert(revision, 'CERTIFICATE_CORRECTION_NOT_FOUND')
  const certificate = await db.learningCertificate.findFirst({ where: { id: revision.targetId, userId, status: 'ACTIVE' } })
  commerceAssert(certificate, 'CERTIFICATE_CORRECTION_NOT_FOUND')
  const names = z.object({ firstName: z.string(), lastName: z.string(), templateVersion: z.literal('ACADEMY-CORRECTION-1.0') }).parse(revision.details)
  return buildLearningCertificatePdf({ ...certificate, firstName: names.firstName, lastName: names.lastName, correctionNotice: `Naamcorrectie van ${revision.createdAt.toISOString().slice(0,10)}; het oorspronkelijke certificaat blijft bewaard.` })
}

export async function getAcademyReviewTargets(userId: string) {
  assertAcademyReviewEnvironment()
  const db = getPrisma(); await requireAcademyBuyer(db,userId)
  const [certificates,attempts] = await Promise.all([
    db.learningCertificate.findMany({where:{userId},select:{id:true,courseTitle:true,certificateNumber:true}}),
    db.learningExamAttempt.findMany({where:{userId,status:'SUBMITTED'},select:{id:true,attemptNumber:true,examVersion:{select:{courseVersion:{select:{course:{select:{title:true}}}}}}}}),
  ])
  return {certificates,attempts}
}

export async function getPublicAcademyCorrection(code: string) {
  if (!/^WM-(?:RIE|ACA)-\d{4}-[0-9A-F]{24}$/.test(code.toUpperCase())) return null
  const db=getPrisma()
  const certificate=await db.learningCertificate.findUnique({where:{certificateNumber:code.toUpperCase()},select:{id:true,status:true}})
  if(!certificate||certificate.status!=='ACTIVE')return null
  const correction=await db.academyReviewEvent.findFirst({where:{targetId:certificate.id,kind:'CERTIFICATE_NAME',action:'ACCEPTED'},orderBy:{createdAt:'desc'},select:{details:true,createdAt:true}})
  if(!correction)return null
  const names=z.object({firstName:z.string(),lastName:z.string()}).safeParse(correction.details)
  return names.success?{...names.data,correctedAt:correction.createdAt}:null
}
// A platform operator opens a review in their own identity, never impersonating the holder.
export async function requestAcademyAdminCertificateReview(actorId:string, raw:unknown) {
  assertAcademyReviewEnvironment()
  const input=requestInput.parse(raw)
  commerceAssert(['FRAUD','CERTIFICATE_ERROR'].includes(input.kind),'REVIEW_REVOCATION_CONTEXT_REQUIRED')
  return runSerializableFinancialTransaction(async tx=>{
    await requireMarketplacePlatformAdmin(tx,actorId)
    await lockAcademyCommerce(tx,`review-request:${input.requestKey}`)
    const old=await tx.academyReviewEvent.findUnique({where:{requestKey:input.requestKey}})
    if(old){commerceAssert(old.actorUserId===actorId&&old.targetId===input.targetId&&old.kind===input.kind&&old.reason===input.reason,'REVIEW_REQUEST_CONFLICT');return {caseId:old.caseId}}
    const certificate=await tx.learningCertificate.findUnique({where:{id:input.targetId}})
    commerceAssert(certificate?.status==='ACTIVE','REVIEW_TARGET_NOT_AVAILABLE')
    const caseId=randomUUID()
    await tx.academyReviewEvent.create({data:{...input,caseId,actorUserId:actorId,subjectUserId:certificate.userId,action:'REQUESTED',details:{source:'PLATFORM_OPERATOR'}}})
    return {caseId}
  })
}
