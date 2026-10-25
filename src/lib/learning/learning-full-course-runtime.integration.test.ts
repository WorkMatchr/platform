import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const actor = vi.hoisted(() => ({ id: '' }))
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => actor }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`) } }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
import { startLearningCourseAction, finishLearningBlockAction, submitLearningAnswerAction, completeLearningChapterAction } from '@/app/e-learnings/actions'
import { startFinalExamAttempt, saveFinalExamAnswer, submitFinalExamAttempt, getFinalExamResult } from './learning-final-exam-service'
import { getMyLearningEnrollments } from './learning-query-service'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  if (target.hostname !== '127.0.0.1' || !/^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)) throw new Error('Disposable local database required')
}
const db = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await db?.$disconnect() })

describe.skipIf(!databaseUrl)('Complete course through production services', () => {
  it('persists all chapters, failed/passed exam, one completion and owner-isolated result', async () => {
    actor.id = process.env.LEARNING_TEST_FLOW_USER_ID ?? randomUUID()
    if (!process.env.LEARNING_TEST_FLOW_USER_ID) await db!.user.create({ data: { id: actor.id, email: `${actor.id}@example.invalid`, status: 'ACTIVE' } })
    const ownerId = actor.id
    const form = new FormData()
    form.set('courseSlug', 'rie-in-de-praktijk')
    await expect(startLearningCourseAction(form)).rejects.toThrow('REDIRECT:')
    const enrollment = await db!.learningEnrollment.findFirstOrThrow({ where: { userId: ownerId } })
    const chapters = await db!.learningChapter.findMany({ where: { courseVersionId: enrollment.courseVersionId }, orderBy: { position: 'asc' } })
    expect(chapters).toHaveLength(10)
    for (const chapter of chapters) {
      const blocks = await db!.learningContentBlock.findMany({ where: { chapterId: chapter.id }, include: { question: true }, orderBy: { position: 'asc' } })
      for (const block of blocks) {
        if (block.question) {
          const key = block.question.correctAnswer
          const answer = ['SORTING', 'MULTI_CHOICE'].includes(block.question.type) ? key : (key as string[])[0]
          expect(await submitLearningAnswerAction(block.id, answer)).toMatchObject({ ok: true, correct: true })
        } else expect(await finishLearningBlockAction(block.id)).toEqual({ ok: true })
      }
      expect(await completeLearningChapterAction(chapter.id)).toEqual({ ok: true })
    }
    expect(await db!.learningChapterProgress.count({ where: { enrollmentId: enrollment.id, status: 'COMPLETED', progressPercentage: 100 } })).toBe(10)
    expect(await db!.learningEnrollment.findUnique({ where: { id: enrollment.id } })).toMatchObject({ status: 'IN_PROGRESS', completedAt: null })
    const failed = await startFinalExamAttempt(ownerId)
    expect(await submitFinalExamAttempt(ownerId, failed.id)).toMatchObject({ score: 0, passed: false })
    expect(await db!.learningEnrollment.findUnique({ where: { id: enrollment.id } })).toMatchObject({ status: 'IN_PROGRESS', completedAt: null })
    const passed = await startFinalExamAttempt(ownerId)
    const mappings = await db!.learningExamQuestion.findMany({ where: { examVersionId: passed.examVersionId }, include: { question: true } })
    expect(mappings).toHaveLength(50)
    for (const mapping of mappings) {
      const key = mapping.question.correctAnswer as string[]
      await saveFinalExamAnswer(ownerId, passed.id, mapping.questionId, mapping.question.type === 'SINGLE_CHOICE' ? key[0] : key)
    }
    const submissions = await Promise.all([submitFinalExamAttempt(ownerId, passed.id), submitFinalExamAttempt(ownerId, passed.id)])
    expect(submissions.every((item) => item.score === 50 && item.passed)).toBe(true)
    const completed = await db!.learningEnrollment.findUniqueOrThrow({ where: { id: enrollment.id } })
    expect(completed).toMatchObject({ status: 'COMPLETED', completedAt: submissions[0].submittedAt })
    await submitFinalExamAttempt(ownerId, passed.id)
    await submitFinalExamAttempt(ownerId, failed.id)
    expect(await db!.learningEnrollment.findUnique({ where: { id: enrollment.id } })).toEqual(completed)
    expect(await getFinalExamResult(randomUUID(), passed.id)).toBeNull()
    expect(await getFinalExamResult(ownerId, passed.id)).toMatchObject({ score: 50, passed: true })
    expect((await getMyLearningEnrollments(ownerId))[0]).toMatchObject({ status: 'COMPLETED', completedAt: completed.completedAt })
  }, 300_000)
})
