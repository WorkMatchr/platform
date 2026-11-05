import 'server-only'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { certificateRecipientFingerprint } from './learning-certificate-delivery-policy'
export { certificateRecipientFingerprint } from './learning-certificate-delivery-policy'
import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext, PlatformAdminAccessError } from '@/lib/platform-admin/platform-admin-authorization'
import { buildLearningCertificatePdf, learningCertificateFilename } from './learning-certificate-pdf'
import { certificateDateBoundary, certificateFilterSchema, certificateResendSchema, type CertificateList } from './academy-certificate-admin-model'

export class AcademyCertificateAdminError extends Error {
  constructor(public readonly status: number) { super('Certificaatbeheer is niet beschikbaar.'); this.name = 'AcademyCertificateAdminError' }
}
async function authorize() {
  if (!isLearningRuntimeEnabled()) throw new AcademyCertificateAdminError(404)
  const user = await getCurrentUser()
  if (!user) throw new AcademyCertificateAdminError(401)
  try { return await getPlatformOperatorContext(user.id) } catch (error) {
    if (error instanceof PlatformAdminAccessError) throw new AcademyCertificateAdminError(403)
    throw error
  }
}
type Actor = Awaited<ReturnType<typeof authorize>>
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function validateId(id: string) { if (!uuid.test(id)) throw new AcademyCertificateAdminError(404) }
function auditData(actor: Actor, certificateId: string, action: string, result: string) {
  return { actorUserId: actor.userId, actorRole: 'PLATFORM_' + actor.membershipRole,
    organizationId: actor.platformOrganizationId, entityType: 'LearningCertificate', entityId: certificateId,
    action: 'ACADEMY_CERTIFICATE_' + action, metadata: { result } }
}
export async function listAcademyCertificateCourses() {
  await authorize()
  return getPrisma().learningCourse.findMany({ select: { code: true, title: true }, orderBy: { code: 'asc' } })
}
export async function listAcademyCertificates(input: unknown): Promise<CertificateList> {
  await authorize()
  const parsed = certificateFilterSchema.safeParse(input)
  if (!parsed.success) throw new AcademyCertificateAdminError(400)
  const filter = parsed.data
  const where: Prisma.LearningCertificateWhereInput = {
    ...(filter.course ? { course: { code: filter.course } } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.from || filter.until ? { issuedAt: {
      ...(filter.from ? { gte: certificateDateBoundary(filter.from) } : {}),
      ...(filter.until ? { lt: certificateDateBoundary(filter.until, true) } : {}),
    } } : {}),
    ...(filter.q ? { AND: filter.q.split(/\s+/).map(token => ({ OR: [
      { firstName: { contains: token, mode: 'insensitive' as const } },
      { lastName: { contains: token, mode: 'insensitive' as const } },
      { certificateNumber: { contains: token, mode: 'insensitive' as const } },
      { user: { email: { contains: token, mode: 'insensitive' as const } } },
    ] })) } : {}),
  }
  const db = getPrisma()
  const [total, rows] = await db.$transaction([
    db.learningCertificate.count({ where }),
    db.learningCertificate.findMany({ where, select: { id: true, certificateNumber: true, firstName: true, lastName: true, courseTitle: true, issuedAt: true, status: true },
      orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }], skip: (filter.page - 1) * 25, take: 25 }),
  ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  return { rows: rows.map(row => ({ id:row.id,certificateNumber:row.certificateNumber,firstName:row.firstName,lastName:row.lastName,courseTitle:row.courseTitle,status:row.status,issuedAt:row.issuedAt.toISOString() })), total, page: filter.page, pageCount: Math.max(1, Math.ceil(total / 25)) }
}
const detailSelect = {
  id: true, certificateNumber: true, firstName: true, lastName: true, courseTitle: true,
  courseVersion: true, examVersion: true, templateVersion: true, issuedAt: true, status: true, examAttemptId: true,
  user: { select: { email: true, emailVerified: true, status: true } },
} satisfies Prisma.LearningCertificateSelect

export async function readAcademyCertificate(certificateId: string) {
  const actor = await authorize(); validateId(certificateId)
  const db = getPrisma()
  const certificate = await db.learningCertificate.findUnique({ where: { id: certificateId }, select: detailSelect })
  if (!certificate) throw new AcademyCertificateAdminError(404)
  await db.marketplaceAuditEvent.create({ data: auditData(actor, certificateId, 'DETAIL_VIEWED', 'SUCCESS') })
  const { user, issuedAt, ...snapshot } = certificate
  const recipientEmail = user.emailVerified && user.status === 'ACTIVE' ? user.email : null
  return { ...snapshot, issuedAt: issuedAt.toISOString(), recipientEmail,
    recipientFingerprint: recipientEmail ? certificateRecipientFingerprint(certificateId, recipientEmail) : null,
    requestId: randomUUID() }
}
export async function downloadAcademyCertificate(certificateId: string) {
  const actor = await authorize(); validateId(certificateId)
  const db = getPrisma()
  const certificate = await db.learningCertificate.findUnique({ where: { id: certificateId } })
  if (!certificate) throw new AcademyCertificateAdminError(404)
  if (certificate.status !== 'ACTIVE') {
    await db.marketplaceAuditEvent.create({ data: auditData(actor, certificateId, 'PDF_DOWNLOADED', 'REVOKED') })
    throw new AcademyCertificateAdminError(409)
  }
  try {
    const pdf = await buildLearningCertificatePdf(certificate)
    const current = await db.learningCertificate.findUnique({where:{id:certificateId},select:{status:true}})
    if(current?.status !== 'ACTIVE') throw new AcademyCertificateAdminError(409)
    await db.marketplaceAuditEvent.create({ data: auditData(actor, certificateId, 'PDF_DOWNLOADED', 'SUCCESS') })
    return { pdf, filename: learningCertificateFilename(certificate.firstName, certificate.lastName, certificate.templateVersion === 'WL-001-CERT-1.0' ? undefined : certificate.courseTitle) }
  } catch (error) {
    await db.marketplaceAuditEvent.create({ data: auditData(actor, certificateId, 'PDF_DOWNLOADED', error instanceof AcademyCertificateAdminError && error.status === 409 ? 'REVOKED' : 'FAILED') })
    throw error
  }
}
export async function requestAcademyCertificateResend(input: unknown) {
  const actor = await authorize()
  const parsed = certificateResendSchema.safeParse(input)
  if (!parsed.success) throw new AcademyCertificateAdminError(400)
  const data = parsed.data
  const db = getPrisma()
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async transaction => {
        await transaction.$queryRaw(Prisma.sql(['SELECT "id" FROM "LearningCertificate" WHERE "id"=', '::uuid FOR UPDATE'], data.certificateId))
        const certificate = await transaction.learningCertificate.findUnique({ where: { id: data.certificateId }, select: {
          id: true, userId: true, status: true, user: { select: { email: true, emailVerified: true, status: true } },
        } })
        if (!certificate) throw new AcademyCertificateAdminError(404)
        if (certificate.status !== 'ACTIVE' || certificate.user.status !== 'ACTIVE' || !certificate.user.emailVerified
          || certificateRecipientFingerprint(certificate.id, certificate.user.email) !== data.recipientFingerprint) throw new AcademyCertificateAdminError(409)
        const idempotencyKey = ['EMAIL','ACADEMY_RESEND',certificate.id,actor.userId,data.requestId].join(':')
        const job = await transaction.notificationOutbox.upsert({ where: { idempotencyKey }, update: {}, create: {
          idempotencyKey, eventId: ['ACADEMY_CERTIFICATE_RESEND',certificate.id,data.requestId].join(':'), channel: 'EMAIL',
          recipientUserId: certificate.userId, templateKey: 'LEARNING_CERTIFICATE_RESEND',
          payload: { certificateId: certificate.id, requestedByUserId: actor.userId, platformOrganizationId: actor.platformOrganizationId,
            actorRole: 'PLATFORM_' + actor.membershipRole, recipientFingerprint: data.recipientFingerprint },
        }, select: { id: true, status: true } })
        const correlationKey = 'academy-certificate-resend:' + job.id + ':requested'
        await transaction.marketplaceAuditEvent.upsert({ where: { correlationKey }, update: {},
          create: { ...auditData(actor, certificate.id, 'RESEND_REQUESTED', 'QUEUED'), correlationKey,
            metadata: { result: 'QUEUED', outboxId: job.id } } })
        return { queued: true as const }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code) && attempt < 2) continue
      if(error instanceof AcademyCertificateAdminError && [404,409].includes(error.status)) {
        const correlationKey=['academy-certificate-resend-refused',data.certificateId,actor.userId,data.requestId].join(':')
        await db.marketplaceAuditEvent.upsert({where:{correlationKey},update:{},create:{
          ...auditData(actor,data.certificateId,'RESEND_REQUEST_FAILED','REFUSED'),correlationKey,
          metadata:{result:'REFUSED',status:error.status},
        }})
      }
      throw error
    }
  }
  throw new AcademyCertificateAdminError(409)
}
