import 'server-only'
import { getPrisma } from '@/lib/prisma'

export const LEARNING_COURSE_SLUG = 'rie-in-de-praktijk'
export const LEARNING_CHAPTER_SLUG = 'waarom-een-rie'

export async function getPublishedLearningCourses(userId: string) {
  return getPrisma().learningCourse.findMany({
    where: { status: 'PUBLISHED', versions: { some: { status: 'PUBLISHED' } } },
    orderBy: { title: 'asc' },
    include: {
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 1,
        include: {
          chapters: {
            orderBy: { position: 'asc' },
            include: { progress: { where: { enrollment: { userId } } } },
          },
          enrollments: { where: { userId }, take: 1 },
        },
      },
    },
  })
}

export async function getPublishedLearningCourse(slug: string, userId: string) {
  return getPrisma().learningCourse.findFirst({
    where: { slug, status: 'PUBLISHED', versions: { some: { status: 'PUBLISHED' } } },
    include: {
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 1,
        include: {
          chapters: {
            orderBy: { position: 'asc' },
            include: {
              progress: { where: { enrollment: { userId } } },
              contentBlocks: { where: { position: 1 }, select: { data: true } },
            },
          },
          enrollments: { where: { userId }, take: 1 },
        },
      },
    },
  })
}

export async function getMyLearningEnrollments(userId: string) {
  return getPrisma().learningEnrollment.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      courseVersion: {
        include: {
          course: true,
          chapters: {
            orderBy: { position: 'asc' },
            include: { progress: { where: { enrollment: { userId } } } },
          },
        },
      },
    },
  })
}

export async function getLearningChapter(slug: string, chapterSlug: string, userId: string, version?: string) {
  const chapter = await getPrisma().learningChapter.findFirst({
    where: {
      slug: chapterSlug,
      courseVersion: {
        status: { in: ['PUBLISHED', 'RETIRED'] },
        ...(version ? { version } : {}),
        course: { slug, status: 'PUBLISHED' },
      },
    },
    orderBy: [{ courseVersion: { publishedAt: 'desc' } }, { position: 'asc' }],
    include: {
      courseVersion: {
        include: {
          course: true,
          chapters: {
            orderBy: { position: 'asc' },
            include: { progress: { where: { enrollment: { userId } } } },
          },
        },
      },
      contentBlocks: {
        orderBy: { position: 'asc' },
        include: {
          question: {
            select: {
              id: true,
              type: true,
              options: { orderBy: { position: 'asc' }, select: { value: true, text: true } },
            },
          },
        },
      },
      progress: { where: { enrollment: { userId } }, take: 1 },
    },
  })
  if (!chapter) return null

  const enrollment = await getPrisma().learningEnrollment.findFirst({
    where: { userId, courseVersionId: chapter.courseVersionId },
    include: { questionAttempts: { where: { chapterId: chapter.id }, orderBy: { answeredAt: 'asc' } } },
  })
  if (!enrollment) return null

  return { chapter, enrollment }
}
