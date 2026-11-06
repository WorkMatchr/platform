import { currentAcademyAccess } from './academy-access-policy'
import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { resolveAcademyDefinition } from './academy-course-definition'

export async function findAcademyEnrollment(userId: string, input: { courseCode?: string; courseSlug?: string; courseVersionId?: string }, db: Prisma.TransactionClient = getPrisma()) {
  const enrollment = await db.learningEnrollment.findFirst({
    where: {
      userId, ...currentAcademyAccess(),
      ...(input.courseVersionId ? { courseVersionId: input.courseVersionId } : {}),
      courseVersion: {
        status: { in: ['PUBLISHED', 'RETIRED'] },
        course: { status: 'PUBLISHED', ...(input.courseCode ? { code: input.courseCode } : {}), ...(input.courseSlug ? { slug: input.courseSlug } : {}) },
      },
    },
    orderBy: [{ courseVersion: { publishedAt: 'desc' } }, { createdAt: 'desc' }],
    include: { courseVersion: { include: { course: true } } },
  })
  if (!enrollment) return null
  const definition = resolveAcademyDefinition(enrollment.courseVersion.course, enrollment.courseVersion.sourceMetadata)
  return { enrollment, definition }
}

export async function findAcademyCourseByAttempt(userId: string, attemptId: string) {
  const attempt = await getPrisma().learningExamAttempt.findFirst({
    where: { id: attemptId, userId },
    select: { courseVersionId: true, examVersion: { select: { exam: { select: { course: { select: { code: true, slug: true, title: true } } } } } } },
  })
  return attempt ? { ...attempt.examVersion.exam.course, courseVersionId: attempt.courseVersionId } : null
}
