import 'server-only'
import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'

const coursesPath = '/platformbeheer/academy/cursussen'

async function requireAcademyOperator() {
  if (!isLearningRuntimeEnabled()) notFound()
  return requirePlatformOperator(coursesPath)
}

// Same version identity and operator boundary as the Academy authoring service.
export async function readAcademyCourseIndex() {
  await requireAcademyOperator()
  return getPrisma().learningCourse.findMany({
    select: { id: true, title: true, code: true, versions: {
      select: { id: true, version: true }, orderBy: { createdAt: 'desc' },
    } },
    orderBy: { code: 'asc' },
  })
}

export async function readAcademyCourseResults(versionId: string, page: number) {
  await requireAcademyOperator()
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(versionId)
      || !Number.isSafeInteger(page) || page < 1 || page > 100000) notFound()
  const version = await getPrisma().learningCourseVersion.findUnique({
    where: { id: versionId },
    select: {
      version: true, course: { select: { title: true } },
      chapters: { select: { id: true, title: true }, orderBy: { position: 'asc' } },
      _count: { select: { enrollments: true } },
      enrollments: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 25, take: 25,
        select: {
          id: true, user: { select: { displayName: true } },
          progress: { select: { chapterId: true, progressPercentage: true } },
          examAttempts: { where: { submittedAt: { not: null } }, orderBy: { attemptNumber: 'asc' },
            select: { attemptNumber: true, score: true, maxScore: true, passed: true } },
          certificates: { select: { certificateNumber: true, status: true, firstName: true, lastName: true } },
        },
      },
    },
  })
  if (!version) notFound()
  return version
}
