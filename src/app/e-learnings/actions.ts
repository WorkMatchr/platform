'use server'

import { Prisma } from '@/generated/prisma/client'
import { redirect } from 'next/navigation'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from '@/lib/learning/learning-answer-policy'
import { getPrisma } from '@/lib/prisma'

const coursePath = (slug: string) => `/e-learnings/${encodeURIComponent(slug)}`

export type LearningAnswerResult = { ok: true; correct: boolean; feedback: string } | { ok: false; message: string }

export async function startLearningCourseAction(formData: FormData) {
  const courseSlug = formData.get('courseSlug')
  if (typeof courseSlug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(courseSlug)) return
  const requestedChapterSlug = formData.get('chapterSlug')
  if (requestedChapterSlug !== null && (typeof requestedChapterSlug !== 'string' || !/^[a-z0-9-]{1,120}$/.test(requestedChapterSlug))) return
  const user = await requireLearningUser(coursePath(courseSlug))
  const prisma = getPrisma()
  const version = await prisma.learningCourseVersion.findFirst({
    where: { status: 'PUBLISHED', course: { slug: courseSlug, status: 'PUBLISHED' } },
    orderBy: { publishedAt: 'desc' },
    include: { chapters: { orderBy: { position: 'asc' } } },
  })
  if (!version) redirect('/e-learnings/aanbod')
  const firstChapter = version.chapters[0]
  const selectedChapter = requestedChapterSlug
    ? version.chapters.find((chapter) => chapter.slug === requestedChapterSlug)
    : firstChapter
  if (requestedChapterSlug && !selectedChapter) redirect(coursePath(courseSlug))

  await prisma.$transaction(async (transaction) => {
    // Serialize enrollment initialization for this user, including the first chapter.
    await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR UPDATE`
    await transaction.learningProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } })
    const enrollment = await transaction.learningEnrollment.upsert({
      where: { userId_courseVersionId: { userId: user.id, courseVersionId: version.id } },
      update: {},
      create: { userId: user.id, courseVersionId: version.id, status: 'IN_PROGRESS', startedAt: new Date() },
    })
    if (enrollment.status === 'NOT_STARTED') {
      await transaction.learningEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      })
    }
    if (selectedChapter) {
      const progress = await transaction.learningChapterProgress.findUnique({
        where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId: selectedChapter.id } },
      })
      if (!progress) {
        await transaction.learningChapterProgress.create({
          data: { enrollmentId: enrollment.id, courseVersionId: version.id, chapterId: selectedChapter.id, status: 'IN_PROGRESS', startedAt: new Date(), lastVisitedAt: new Date() },
        })
      } else if (progress.status === 'NOT_STARTED') {
        await transaction.learningChapterProgress.update({
          where: { id: progress.id },
          data: { status: 'IN_PROGRESS', startedAt: new Date(), lastVisitedAt: new Date() },
        })
      }
    }
  })
  if (selectedChapter) {
    redirect(`${coursePath(courseSlug)}/leren/${encodeURIComponent(selectedChapter.slug)}?version=${encodeURIComponent(version.version)}`)
  }
  redirect(coursePath(courseSlug))
}

async function recordCompletedBlock(
  transaction: Prisma.TransactionClient,
  input: { userId: string; enrollmentId: string; chapterId: string; courseVersionId: string; blockId: string },
) {
  const now = new Date()
  // Count and project progress after preceding block completions have committed.
  await transaction.$queryRaw`SELECT id FROM "LearningEnrollment" WHERE id = ${input.enrollmentId}::uuid FOR UPDATE`
  await transaction.learningInteractionAttempt.upsert({
    where: { enrollmentId_contentBlockId: { enrollmentId: input.enrollmentId, contentBlockId: input.blockId } },
    update: {},
    create: { enrollmentId: input.enrollmentId, contentBlockId: input.blockId },
  })
  const total = await transaction.learningContentBlock.count({ where: { chapterId: input.chapterId } })
  const completed = await transaction.learningInteractionAttempt.count({
    where: { enrollmentId: input.enrollmentId, contentBlock: { chapterId: input.chapterId } },
  })
  const percentage = total ? Math.min(100, Math.floor((completed / total) * 100)) : 0
  const existingProgress = await transaction.learningChapterProgress.findUnique({
    where: { enrollmentId_chapterId: { enrollmentId: input.enrollmentId, chapterId: input.chapterId } },
  })
  if (existingProgress) {
    await transaction.learningChapterProgress.update({
      where: { id: existingProgress.id },
      data: {
        status: existingProgress.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        progressPercentage: existingProgress.status === 'COMPLETED' ? 100 : percentage,
        startedAt: existingProgress.startedAt ?? now,
        completedAt: existingProgress.status === 'COMPLETED' ? existingProgress.completedAt : null,
        lastVisitedAt: now,
        lastCompletedBlockId: input.blockId,
      },
    })
  } else {
    await transaction.learningChapterProgress.create({
      data: {
      enrollmentId: input.enrollmentId,
      courseVersionId: input.courseVersionId,
      chapterId: input.chapterId,
      status: 'IN_PROGRESS',
      progressPercentage: percentage,
      startedAt: now,
      lastVisitedAt: now,
      lastCompletedBlockId: input.blockId,
      },
    })
  }
}

export async function finishLearningBlockAction(blockId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(blockId)) return { ok: false, message: 'Dit onderdeel kon niet worden opgeslagen.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  const result = await getPrisma().$transaction(async (transaction) => {
    const block = await transaction.learningContentBlock.findFirst({
      where: { id: blockId, chapter: { courseVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, course: { status: 'PUBLISHED' } } } },
      include: { chapter: true },
    })
    if (!block || block.questionId) return null
    const enrollment = await transaction.learningEnrollment.findFirst({
      where: { userId: user.id, courseVersionId: block.chapter.courseVersionId, status: 'IN_PROGRESS' },
      select: { id: true },
    })
    if (!enrollment) return null
    await recordCompletedBlock(transaction, {
      userId: user.id,
      enrollmentId: enrollment.id,
      chapterId: block.chapterId,
      courseVersionId: block.chapter.courseVersionId,
      blockId: block.id,
    })
    return { ok: true as const }
  })
  return result ?? { ok: false, message: 'Uw inschrijving of dit onderdeel is niet beschikbaar.' }
}

export async function submitLearningAnswerAction(blockId: string, answer: unknown): Promise<LearningAnswerResult> {
  if (!/^[0-9a-f-]{36}$/i.test(blockId)) return { ok: false, message: 'Uw antwoord kon niet worden opgeslagen.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    return await getPrisma().$transaction(async (transaction) => {
      const block = await transaction.learningContentBlock.findFirst({
        where: { id: blockId, chapter: { courseVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, course: { status: 'PUBLISHED' } } } },
        include: { chapter: true, question: { include: { options: { orderBy: { position: 'asc' } } } } },
      })
      if (!block?.question) return { ok: false as const, message: 'Deze oefenvraag is niet beschikbaar.' }
      const enrollment = await transaction.learningEnrollment.findFirst({
        where: { userId: user.id, courseVersionId: block.chapter.courseVersionId, status: 'IN_PROGRESS' },
        select: { id: true },
      })
      if (!enrollment) return { ok: false as const, message: 'Uw inschrijving is niet beschikbaar.' }
      const values = block.question.options.map((option) => option.value)
      if (!isLearningAnswerShapeValid(block.question.type, answer, values, block.question.correctAnswer)) {
        return { ok: false as const, message: 'Kies een geldig antwoord voordat u verdergaat.' }
      }
      const correct = isLearningAnswerCorrect(block.question.type, answer, block.question.correctAnswer)
      const previousAttempts = await transaction.learningQuestionAttempt.count({
        where: { enrollmentId: enrollment.id, questionId: block.question.id },
      })
      const safeAnswer = Array.isArray(answer) ? answer : answer as string
      await transaction.learningQuestionAttempt.create({
        data: {
          enrollmentId: enrollment.id,
          userId: user.id,
          questionId: block.question.id,
          chapterId: block.chapterId,
          attemptNumber: previousAttempts + 1,
          answer: safeAnswer as Prisma.InputJsonValue,
          correct,
        },
      })
      await recordCompletedBlock(transaction, {
        userId: user.id,
        enrollmentId: enrollment.id,
        chapterId: block.chapterId,
        courseVersionId: block.chapter.courseVersionId,
        blockId: block.id,
      })
      return {
        ok: true as const,
        correct,
        feedback: block.question.explanation,
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch {
    return { ok: false, message: 'Uw antwoord kon tijdelijk niet worden opgeslagen. Probeer het opnieuw.' }
  }
}

export async function completeLearningChapterAction(chapterId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(chapterId)) return { ok: false, message: 'Dit hoofdstuk kan niet worden afgerond.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  const result = await getPrisma().$transaction(async (transaction) => {
    const chapter = await transaction.learningChapter.findFirst({
      where: { id: chapterId, courseVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, course: { status: 'PUBLISHED' } } },
      select: { id: true, courseVersionId: true },
    })
    if (!chapter) return null
    const enrollment = await transaction.learningEnrollment.findFirst({
      where: { userId: user.id, courseVersionId: chapter.courseVersionId, status: 'IN_PROGRESS' },
      select: { id: true },
    })
    if (!enrollment) return null
    const total = await transaction.learningContentBlock.count({ where: { chapterId } })
    const completed = await transaction.learningInteractionAttempt.count({
      where: { enrollmentId: enrollment.id, contentBlock: { chapterId } },
    })
    if (total === 0 || completed < total) return { ok: false as const, message: 'Doorloop eerst de onderdelen van dit hoofdstuk.' }
    await transaction.learningChapterProgress.update({
      where: { enrollmentId_chapterId: { enrollmentId: enrollment.id, chapterId } },
      data: { status: 'COMPLETED', progressPercentage: 100, completedAt: new Date(), lastVisitedAt: new Date() },
    })
    return { ok: true as const }
  })
  return result ?? { ok: false, message: 'Uw inschrijving of dit hoofdstuk is niet beschikbaar.' }
}
