import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import {
  getFinalExamOverview,
  getFinalExamPlayer,
  getFinalExamResult,
  saveFinalExamAnswer,
  startFinalExamAttempt,
  submitFinalExamAttempt,
  updateFinalExamPosition,
} from './learning-final-exam-service'
import { ensureCertificateForPassedExam, getMyLearningCertificate, getOwnedLearningCertificate, getPublicLearningCertificate, saveLearningCertificateName } from './learning-certificate-service'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  const disposableLocal = ['localhost', '127.0.0.1'].includes(target.hostname) && /^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)
  if (!disposableLocal) {
    throw new Error('Final exam runtime tests require the disposable database created by test-learning-database.ts')
  }
}
const prisma = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await prisma?.$disconnect() })

describe.skipIf(!databaseUrl)('WL-001 eindtoets runtime op geïsoleerde database', () => {
  it('handhaaft toegang, geheimhouding, eigenaarschap, exacte scoring, poginghistorie en herkansing', async () => {
    const expectedVersion = process.env.LEARNING_TEST_EXPECT_EXAM_VERSION ?? 'WL-001-EXAM-1.1'
    const ownerId = randomUUID()
    const outsiderId = randomUUID()
    for (const id of [ownerId, outsiderId]) {
      const email = expectedVersion === 'WL-001-EXAM-1.0' && id === ownerId
        ? 'wl001-v10-history@example.invalid' : `${id}@example.invalid`
      await prisma!.user.create({ data: { id, email, displayName: 'Exam test', status: 'ACTIVE' } })
    }

    const course = await prisma!.learningCourse.findUniqueOrThrow({ where: { code: 'WL-001' } })
    const courseVersion = await prisma!.learningCourseVersion.findUniqueOrThrow({ where: { courseId_version: { courseId: course.id, version: 'prototype-0.17' } } })
    const enrollment = await prisma!.learningEnrollment.create({ data: { userId: ownerId, courseVersionId: courseVersion.id, status: 'IN_PROGRESS', startedAt: new Date() } })
    await expect(startFinalExamAttempt(ownerId)).rejects.toThrow('CHAPTERS_INCOMPLETE')
    const chapters = await prisma!.learningChapter.findMany({ where: { courseVersionId: courseVersion.id } })
    expect(chapters).toHaveLength(10)
    await prisma!.learningChapterProgress.createMany({ data: chapters.map((chapter) => ({
      enrollmentId: enrollment.id,
      courseVersionId: courseVersion.id,
      chapterId: chapter.id,
      status: 'COMPLETED' as const,
      progressPercentage: 100,
      startedAt: new Date(),
      completedAt: new Date(),
    })) })
    await prisma!.learningEnrollment.update({ where: { id: enrollment.id }, data: { status: 'COMPLETED', completedAt: new Date() } })

    const [attempt1, duplicateStart] = await Promise.all([startFinalExamAttempt(ownerId), startFinalExamAttempt(ownerId)])
    const usedVersion = await prisma!.learningExamVersion.findUniqueOrThrow({ where: { id: attempt1.examVersionId }, select: { version: true } })
    expect(usedVersion.version).toBe(expectedVersion)
    expect(attempt1.attemptNumber).toBe(1)
    expect(duplicateStart.id).toBe(attempt1.id)
    expect(await prisma!.learningExamAttempt.count({ where: { enrollmentId: enrollment.id, status: 'IN_PROGRESS' } })).toBe(1)
    const player = await getFinalExamPlayer(ownerId, attempt1.id)
    expect(player?.questions).toHaveLength(50)
    expect(JSON.stringify(player?.questions)).not.toMatch(/correctAnswer|isCorrect|explanation|feedback/i)
    expect(await getFinalExamPlayer(outsiderId, attempt1.id)).toBeNull()
    expect((await getFinalExamOverview(outsiderId))?.enrollment).toBeNull()
    await updateFinalExamPosition(ownerId, attempt1.id, 12)
    expect((await getFinalExamPlayer(ownerId, attempt1.id))?.currentPosition).toBe(12)
    await expect(updateFinalExamPosition(ownerId, attempt1.id, 51)).rejects.toThrow('INVALID_POSITION')

    const mappings = await prisma!.learningExamQuestion.findMany({
      where: { examVersionId: attempt1.examVersionId },
      orderBy: { position: 'asc' },
      include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
    })
    const correctAnswer = (mapping: (typeof mappings)[number]) => mapping.question.correctAnswer as string[]
    const answerFor = (mapping: (typeof mappings)[number], correct: boolean): string | string[] => {
      const key = correctAnswer(mapping)
      if (correct) return mapping.question.type === 'SINGLE_CHOICE' ? key[0] : key
      if (mapping.question.type === 'SINGLE_CHOICE') return mapping.question.options.find((option) => !key.includes(option.value))!.value
      return key.slice(1)
    }

    const firstMapping = mappings[0]!
    const answer1 = answerFor(firstMapping, true)
    const firstQuestion = await prisma!.learningQuestion.findFirstOrThrow({ where: { code: { startsWith: 'WL001-H10-' } } })
    await expect(saveFinalExamAnswer(outsiderId, attempt1.id, firstMapping.questionId, answer1)).rejects.toThrow('ATTEMPT_NOT_FOUND')
    await expect(saveFinalExamAnswer(ownerId, attempt1.id, firstQuestion.id, 'A')).rejects.toThrow('QUESTION_NOT_IN_EXAM')
    await expect(saveFinalExamAnswer(ownerId, attempt1.id, firstMapping.questionId, '__not_an_option__')).rejects.toThrow('INVALID_ANSWER')
    await saveFinalExamAnswer(ownerId, attempt1.id, firstMapping.questionId, answer1)
    await saveFinalExamAnswer(ownerId, attempt1.id, firstMapping.questionId, answer1)
    expect(await prisma!.learningExamAnswer.count({ where: { attemptId: attempt1.id } })).toBe(1)

    for (const [index, mapping] of mappings.entries()) {
      await saveFinalExamAnswer(ownerId, attempt1.id, mapping.questionId, answerFor(mapping, index < 39))
    }
    const submissions = await Promise.all([submitFinalExamAttempt(ownerId, attempt1.id), submitFinalExamAttempt(ownerId, attempt1.id)])
    expect(submissions).toHaveLength(2)
    expect(submissions.every((submission) => submission.score === 39 && submission.passed === false)).toBe(true)
    const failed = submissions[0]!
    expect(failed).toMatchObject({ status: 'SUBMITTED', score: 39, maxScore: 50, percentage: 78, passed: false })
    expect(await prisma!.learningExamAttempt.count({ where: { id: attempt1.id, status: 'SUBMITTED' } })).toBe(1)
    expect((await submitFinalExamAttempt(ownerId, attempt1.id)).score).toBe(39)
    await expect(saveFinalExamAnswer(ownerId, attempt1.id, firstMapping.questionId, answer1)).rejects.toThrow('ATTEMPT_SUBMITTED')
    await expect(prisma!.learningExamAttempt.update({ where: { id: attempt1.id }, data: { score: 50 } })).rejects.toThrow()
    await expect(prisma!.learningExamAnswer.update({
      where: { attemptId_questionId: { attemptId: attempt1.id, questionId: firstMapping.questionId } },
      data: { answer: 'A' },
    })).rejects.toThrow()
    expect(await getFinalExamResult(outsiderId, attempt1.id)).toBeNull()
    expect(await getFinalExamResult(ownerId, attempt1.id)).toMatchObject({ score: 39, passed: false })

    const attempt2 = await startFinalExamAttempt(ownerId)
    expect(attempt2.attemptNumber).toBe(2)
    expect(await prisma!.learningExamAnswer.count({ where: { attemptId: attempt2.id } })).toBe(0)
    for (const [index, mapping] of mappings.entries()) await saveFinalExamAnswer(ownerId, attempt2.id, mapping.questionId, answerFor(mapping, index < 40))
    const passedAttempt2 = await submitFinalExamAttempt(ownerId, attempt2.id)
    expect(passedAttempt2).toMatchObject({ status: 'SUBMITTED', score: 40, maxScore: 50, percentage: 80, passed: true })

    expect(await ensureCertificateForPassedExam(ownerId)).toMatchObject({ certificate: null, needsName: true })
    const issued = await saveLearningCertificateName(ownerId, 'Ada', 'Voorbeeld')
    expect(issued.needsName).toBe(false)
    expect(issued.certificate).toMatchObject({
      userId: ownerId, examAttemptId: attempt2.id, firstName: 'Ada', lastName: 'Voorbeeld',
      issuedAt: passedAttempt2.submittedAt, templateVersion: 'WL-001-CERT-1.0', status: 'ACTIVE',
    })
    const certificate = issued.certificate!
    expect(certificate.certificateNumber).toMatch(/^WM-RIE-\d{4}-[0-9A-F]{24}$/)
    expect((await ensureCertificateForPassedExam(ownerId)).certificate?.id).toBe(certificate.id)
    expect(await getMyLearningCertificate(ownerId)).toMatchObject({ id: certificate.id, firstName: 'Ada' })
    expect(await getOwnedLearningCertificate(outsiderId, certificate.id)).toBeNull()
    expect(await getPublicLearningCertificate(certificate.certificateNumber)).toEqual({
      certificateNumber: certificate.certificateNumber, firstName: 'Ada', lastName: 'Voorbeeld', courseTitle: 'RI&E in de praktijk', issuedAt: passedAttempt2.submittedAt, status: 'ACTIVE',
    })
    expect(await prisma!.notificationOutbox.count({ where: { eventId: `LEARNING_CERTIFICATE_ISSUED:${certificate.id}` } })).toBe(1)
    const pdf = await buildLearningCertificatePdf(certificate)
    expect(Buffer.from(pdf).subarray(0, 5).toString('ascii')).toBe('%PDF-')
    expect(Buffer.from(pdf).toString('latin1')).toContain('/StructTreeRoot')
    await expect(prisma!.learningCertificate.update({ where: { id: certificate.id }, data: { firstName: 'Changed' } })).rejects.toThrow()
    expect(await prisma!.learningCertificate.count({ where: { courseId: certificate.courseId, userId: ownerId } })).toBe(1)

    const attempt3 = await startFinalExamAttempt(ownerId)
    expect(attempt3.attemptNumber).toBe(3)
    expect(await submitFinalExamAttempt(ownerId, attempt3.id)).toMatchObject({ score: 0, percentage: 0, passed: false })
    expect((await getFinalExamOverview(ownerId))?.attempts.find((attempt) => attempt.id === attempt2.id)?.passed).toBe(true)
    expect((await getFinalExamResult(ownerId, attempt2.id))?.knowledgeAreas.length).toBeGreaterThan(0)
    expect(await prisma!.learningExamAttempt.count({ where: { enrollmentId: enrollment.id } })).toBe(3)

    if (expectedVersion === 'WL-001-EXAM-1.1') {
      const historicalV10Attempt = await prisma!.learningExamAttempt.findFirst({
        where: process.env.LEARNING_TEST_EXPECT_V10_HISTORY === '1'
          ? { status: 'SUBMITTED', passed: true, user: { email: 'wl001-v10-history@example.invalid' }, examVersion: { version: 'WL-001-EXAM-1.0' } }
          : { status: 'SUBMITTED', examVersion: { version: 'WL-001-EXAM-1.0' } },
        orderBy: { startedAt: 'asc' },
        include: { answers: true, examVersion: true },
      })
      if (process.env.LEARNING_TEST_EXPECT_V10_HISTORY === '1') {
        expect(historicalV10Attempt).toMatchObject({ score: 40, maxScore: 50, percentage: 80, passed: true, examVersion: { version: 'WL-001-EXAM-1.0' } })
        expect(historicalV10Attempt?.answers).toHaveLength(50)
      } else {
        expect(historicalV10Attempt).toBeNull()
      }
      if (historicalV10Attempt) {
        expect(await getFinalExamResult(historicalV10Attempt.userId, historicalV10Attempt.id)).toMatchObject({
          id: historicalV10Attempt.id,
          score: historicalV10Attempt.score,
          maxScore: historicalV10Attempt.maxScore,
          passed: historicalV10Attempt.passed,
        })
      }
    }
  }, 90_000)
})
