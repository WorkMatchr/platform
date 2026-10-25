import 'server-only'
import { randomBytes } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'

export { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'
const COURSE_CODE = 'WL-001'
const EXAM_CODE = 'WL-001-FINAL'

function newCertificateNumber(issuedAt: Date) {
  return `WM-RIE-${issuedAt.getUTCFullYear()}-${randomBytes(12).toString('hex').toUpperCase()}`
}

export async function ensureCertificateForPassedExam(userId: string) {
  const db = getPrisma()
  const eligibility = await db.learningExamAttempt.findFirst({
    where: {
      userId, status: 'SUBMITTED', passed: true, submittedAt: { not: null },
      examVersion: { exam: { code: EXAM_CODE, course: { code: COURSE_CODE, slug: 'rie-in-de-praktijk' } } },
    },
    orderBy: [{ submittedAt: 'asc' }, { attemptNumber: 'asc' }],
    select: {
      id: true, userId: true, enrollmentId: true, courseVersionId: true, examVersionId: true, submittedAt: true,
      examVersion: {
        select: {
          version: true,
          courseVersion: {
            select: {
              version: true,
              course: { select: { id: true, code: true, title: true } },
            },
          },
        },
      },
    },
  })
  if (!eligibility || eligibility.examVersion.courseVersion.course.code !== COURSE_CODE) return { certificate: null, needsName: false }
  const [completedChapters, expectedChapters] = await Promise.all([
    db.learningChapterProgress.count({ where: { enrollmentId: eligibility.enrollmentId, courseVersionId: eligibility.courseVersionId, status: 'COMPLETED' } }),
    db.learningChapter.count({ where: { courseVersionId: eligibility.courseVersionId } }),
  ])
  if (completedChapters !== 10 || expectedChapters !== 10) return { certificate: null, needsName: false }

  const existing = await db.learningCertificate.findUnique({ where: { courseId_userId: { courseId: eligibility.examVersion.courseVersion.course.id, userId } } })
  if (existing) return { certificate: existing, needsName: false }

  const profile = await db.learningProfile.findUnique({ where: { userId }, select: { firstName: true, lastName: true } })
  const firstName = profile?.firstName?.trim() ?? ''
  const lastName = profile?.lastName?.trim() ?? ''
  if (!firstName || !lastName) return { certificate: null, needsName: true }

  try {
    const certificate = await db.$transaction(async (transaction) => {
      const current = await transaction.learningCertificate.findUnique({ where: { courseId_userId: { courseId: eligibility.examVersion.courseVersion.course.id, userId } } })
      if (current) return current
      const created = await transaction.learningCertificate.create({
        data: {
          userId,
          courseId: eligibility.examVersion.courseVersion.course.id,
          enrollmentId: eligibility.enrollmentId,
          examAttemptId: eligibility.id,
          certificateNumber: newCertificateNumber(eligibility.submittedAt!),
          firstName,
          lastName,
          courseTitle: eligibility.examVersion.courseVersion.course.title,
          courseVersion: eligibility.examVersion.courseVersion.version,
          examVersion: eligibility.examVersion.version,
          templateVersion: LEARNING_CERTIFICATE_TEMPLATE_VERSION,
          issuedAt: eligibility.submittedAt!,
        },
      })
      const eventId = `LEARNING_CERTIFICATE_ISSUED:${created.id}`
      await transaction.notificationOutbox.upsert({
        where: { idempotencyKey: `EMAIL:${userId}:${eventId}` },
        create: {
          eventId, channel: 'EMAIL', recipientUserId: userId, templateKey: 'LEARNING_CERTIFICATE_ISSUED',
          payload: { certificateId: created.id } as Prisma.InputJsonValue,
          idempotencyKey: `EMAIL:${userId}:${eventId}`,
        },
        update: {},
      })
      return created
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return { certificate, needsName: false }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      const certificate = await db.learningCertificate.findUnique({ where: { courseId_userId: { courseId: eligibility.examVersion.courseVersion.course.id, userId } } })
      if (certificate) return { certificate, needsName: false }
    }
    throw error
  }
}

export async function getMyLearningCertificate(userId: string, courseCode = COURSE_CODE) {
  return getPrisma().learningCertificate.findFirst({
    where: { userId, course: { code: courseCode }, status: 'ACTIVE' },
    select: { id: true, certificateNumber: true, firstName: true, lastName: true, courseTitle: true, issuedAt: true, status: true, templateVersion: true },
  })
}

export async function getOwnedLearningCertificate(userId: string, certificateId: string) {
  return getPrisma().learningCertificate.findFirst({ where: { id: certificateId, userId, status: 'ACTIVE' } })
}

export async function getPublicLearningCertificate(certificateNumber: string) {
  const canonical = certificateNumber.toUpperCase()
  if (!/^WM-RIE-\d{4}-[0-9A-F]{24}$/.test(canonical)) return null
  return getPrisma().learningCertificate.findUnique({
    where: { certificateNumber: canonical },
    select: { certificateNumber: true, firstName: true, lastName: true, courseTitle: true, issuedAt: true, status: true },
  })
}

export async function saveLearningCertificateName(userId: string, firstName: string, lastName: string) {
  const eligibility = await ensureCertificateForPassedExam(userId)
  if (!eligibility.needsName) return eligibility
  const data = { firstName: firstName.trim(), lastName: lastName.trim() }
  if (!data.firstName || !data.lastName || data.firstName.length > 100 || data.lastName.length > 100) throw new Error('CERTIFICATE_NAME_INVALID')
  await getPrisma().learningProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data })
  return ensureCertificateForPassedExam(userId)
}
