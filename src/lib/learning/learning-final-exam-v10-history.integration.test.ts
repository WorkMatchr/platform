import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import {
  getFinalExamResult,
  saveFinalExamAnswer,
  startFinalExamAttempt,
  submitFinalExamAttempt,
} from './learning-final-exam-service'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  const disposableLocal = ['localhost', '127.0.0.1'].includes(target.hostname)
    && /^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)
  if (!disposableLocal) throw new Error('Exam history test requires its disposable DB')
}

const prisma = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await prisma?.$disconnect() })

const historyUserId = '17000000-0000-4000-8000-000000000010'
const phase = process.env.LEARNING_TEST_V10_HISTORY_PHASE

describe.skipIf(!databaseUrl)('WL-001 v1.0 → v1.1 historische attempt-runtime', () => {
  it('maakt vóór de upgrade een normale geslaagde v1.0-poging', async () => {
    if (phase !== 'create-v10') return
    const user = await prisma!.user.upsert({
      where: { id: historyUserId }, update: {},
      create: { id: historyUserId, email: 'wl001-explicit-history@example.invalid', displayName: 'WL001 History Test', status: 'ACTIVE' },
    })
    const course = await prisma!.learningCourse.findUniqueOrThrow({ where: { code: 'WL-001' } })
    const courseVersion = await prisma!.learningCourseVersion.findUniqueOrThrow({
      where: { courseId_version: { courseId: course.id, version: 'prototype-0.17' } },
    })
    const enrollment = await prisma!.learningEnrollment.create({
      data: { userId: user.id, courseVersionId: courseVersion.id, status: 'IN_PROGRESS', startedAt: new Date('2026-10-19T12:00:00Z') },
    })
    const chapters = await prisma!.learningChapter.findMany({ where: { courseVersionId: courseVersion.id } })
    await prisma!.learningChapterProgress.createMany({ data: chapters.map((chapter) => ({
      enrollmentId: enrollment.id, courseVersionId: courseVersion.id, chapterId: chapter.id,
      status: 'COMPLETED' as const, progressPercentage: 100,
      startedAt: new Date('2026-10-19T12:00:00Z'), completedAt: new Date('2026-10-19T12:30:00Z'),
    })) })
    await prisma!.learningEnrollment.update({ where: { id: enrollment.id }, data: { status: 'COMPLETED', completedAt: new Date('2026-10-19T12:30:00Z') } })

    const attempt = await startFinalExamAttempt(user.id)
    const version = await prisma!.learningExamVersion.findUniqueOrThrow({ where: { id: attempt.examVersionId }, select: { version: true } })
    expect(version.version).toBe('WL-001-EXAM-1.0')
    const mappings = await prisma!.learningExamQuestion.findMany({
      where: { examVersionId: attempt.examVersionId }, orderBy: { position: 'asc' },
      include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
    })
    expect(mappings).toHaveLength(50)
    for (const [index, mapping] of mappings.entries()) {
      const keys = mapping.question.correctAnswer as string[]
      const value = index < 40
        ? (mapping.question.type === 'SINGLE_CHOICE' ? keys[0]! : keys)
        : (mapping.question.type === 'SINGLE_CHOICE' ? mapping.question.options.find((option) => !keys.includes(option.value))!.value : keys.slice(1))
      await saveFinalExamAnswer(user.id, attempt.id, mapping.questionId, value)
    }
    const result = await submitFinalExamAttempt(user.id, attempt.id)
    expect(result).toMatchObject({ id: attempt.id, status: 'SUBMITTED', score: 40, maxScore: 50, percentage: 80, passed: true })
    expect(await prisma!.learningExamAnswer.count({ where: { attemptId: attempt.id } })).toBe(50)
  }, 90_000)

  it('behoudt v1.0-antwoorden en score na v1.1-upgrade en gebruikt v1.1 voor nieuwe pogingen', async () => {
    if (phase !== 'verify-v11') return
    const user = await prisma!.user.findUniqueOrThrow({ where: { id: historyUserId } })
    const historical = await prisma!.learningExamAttempt.findFirstOrThrow({
      where: { userId: user.id, status: 'SUBMITTED' }, include: { answers: true, examVersion: true },
    })
    expect(historical.examVersion.version).toBe('WL-001-EXAM-1.0')
    expect(historical).toMatchObject({ score: 40, maxScore: 50, percentage: 80, passed: true, status: 'SUBMITTED' })
    expect(historical.answers).toHaveLength(50)
    const historicalResult = await getFinalExamResult(user.id, historical.id)
    expect(historicalResult).toMatchObject({ id: historical.id, score: 40, maxScore: 50, percentage: 80, passed: true })
    const newAttempt = await startFinalExamAttempt(user.id)
    const newVersion = await prisma!.learningExamVersion.findUniqueOrThrow({ where: { id: newAttempt.examVersionId }, select: { version: true } })
    expect(newVersion.version).toBe('WL-001-EXAM-1.1')
    expect(newAttempt.attemptNumber).toBe(2)
    expect(await prisma!.learningExamAnswer.count({ where: { attemptId: newAttempt.id } })).toBe(0)
    const stillHistorical = await prisma!.learningExamAttempt.findUniqueOrThrow({
      where: { id: historical.id }, include: { answers: true, examVersion: true },
    })
    expect(stillHistorical).toEqual(historical)
  }, 90_000)
})
