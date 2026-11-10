import 'server-only'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext, PlatformAdminAccessError } from '@/lib/platform-admin/platform-admin-authorization'
import { buildLearningCertificatePdf, learningCertificateFilename } from './learning-certificate-pdf'
import { certificateDateBoundary, certificateFilterSchema, type CertificateList } from './academy-certificate-admin-model'

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
} satisfies Prisma.LearningCertificateSelect

export async function readAcademyCertificate(certificateId: string) {
  const actor = await authorize(); validateId(certificateId)
  const db = getPrisma()
  const certificate = await db.learningCertificate.findUnique({ where: { id: certificateId }, select: detailSelect })
  if (!certificate) throw new AcademyCertificateAdminError(404)
  await db.marketplaceAuditEvent.create({ data: auditData(actor, certificateId, 'DETAIL_VIEWED', 'SUCCESS') })
  return { ...certificate, issuedAt: certificate.issuedAt.toISOString() }
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
