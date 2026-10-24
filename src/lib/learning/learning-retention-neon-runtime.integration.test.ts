import { afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }))

import { learningRetentionQuestions } from './learning-retention-content'
import {
  answerMyRetentionQuestion,
  ensureMyRetentionWeeklyChecks,
  getMyRetentionOverview,
  getMyRetentionWeeklyCheck,
  startMyRetentionParticipation,
  stopMyRetentionParticipation,
} from './learning-retention-service'
import {
  answerMyAnnualRetentionQuestion,
  ensureDueAnnualReminderIntents,
  getMyAnnualRetentionCheck,
  setMyAnnualReminderConsent,
} from './learning-retention-annual-service'
import { addCalendarYear } from './learning-retention-policy'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
import { saveLearningCertificateName } from './learning-certificate-service'

const databaseUrl = process.env.LEARNING_TEST_DATABASE_URL
if (databaseUrl) {
  const target = new URL(databaseUrl)
  const disposableLocal = ['localhost', '127.0.0.1'].includes(target.hostname) && /^\/workmatchr_learning_\d+_\d+$/.test(target.pathname)
  if (!disposableLocal) throw new Error('Retention runtime tests require the disposable Learning DB')
}
const prisma = databaseUrl ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) }) : null
afterAll(async () => { await prisma?.$disconnect() })

describe.skipIf(!databaseUrl)('WL-001 kennisbehoud runtime op geïsoleerde PostgreSQL', () => {
  it('controleert publicatie, opt-in, weekchecks, stop, jaarreminder en jaarcheck', async () => {
    const course = await prisma!.learningCourse.findUniqueOrThrow({ where: { code: 'WL-001' } })
    const bankVersion = 'WL-001-RETENTION-1.0'
    for (const item of learningRetentionQuestions) {
      let question = await prisma!.learningQuestion.findUnique({ where: { code_version: { code: item.code, version: item.questionVersion } } })
      if (!question) {
        question = await prisma!.learningQuestion.create({ data: {
          code: item.code, knowledgeArea: item.knowledgeArea, learningObjective: item.knowledgeArea,
          difficulty: item.difficulty, type: item.type, questionText: item.questionText,
          explanation: item.correctFeedback, correctAnswer: item.correctAnswer,
          status: 'PUBLISHED_PROTOTYPE', version: item.questionVersion,
          options: { create: item.options.map((option, position) => ({ ...option, position: position + 1 })) },
        } })
      }
      let metadata = await prisma!.learningRetentionQuestion.findUnique({ where: { questionId: question.id } })
      if (!metadata) metadata = await prisma!.learningRetentionQuestion.create({ data: {
        questionId: question.id, bankVersion, chapterNumber: item.chapterNumber,
        cognitiveLevel: item.cognitiveLevel, criticalConcept: item.criticalConcept,
        legalReviewRequired: item.legalReview, correctFeedback: item.correctFeedback,
        incorrectFeedback: item.incorrectFeedback, status: 'PUBLISHED',
      } })
      expect(metadata).toMatchObject({ bankVersion, chapterNumber: item.chapterNumber, status: 'PUBLISHED' })
      expect(question.status).toBe('PUBLISHED_PROTOTYPE')
    }

    const program = await prisma!.learningRetentionProgram.upsert({
      where: { code: 'WL-001-RETENTION' }, update: {},
      create: { code: 'WL-001-RETENTION', title: 'WL-001 kennisbehoud', courseId: course.id },
    })
    let programVersion = await prisma!.learningRetentionProgramVersion.findUnique({ where: { version: 'WL-001-RETENTION-1.0' } })
    if (!programVersion) programVersion = await prisma!.learningRetentionProgramVersion.create({ data: {
      programId: program.id, courseId: course.id, version: 'WL-001-RETENTION-1.0', status: 'PUBLISHED',
      durationWeeks: 12, questionsPerWeek: 5, openAfterProgramDays: 30,
      selectionPolicyVersion: 'WL-001-RETENTION-SELECTION-1.0', consentVersion: 'WL-001-RETENTION-CONSENT-1.0',
      consentCopy: 'Test-only publication in the isolated Neon runtime database.', publishedAt: new Date(),
    } })
    expect(programVersion.status).toBe('PUBLISHED')

    const eligibleTestUsers = await prisma!.$queryRaw<Array<{ userId: string }>>`
      SELECT attempt."userId"
      FROM "LearningExamAttempt" attempt
      JOIN "LearningExamVersion" version ON version."id" = attempt."examVersionId"
      JOIN "LearningEnrollment" enrollment ON enrollment."id" = attempt."enrollmentId"
      WHERE attempt."status" = 'SUBMITTED' AND attempt."passed" = true
        AND version."version" = 'WL-001-EXAM-1.1'
        AND NOT EXISTS (SELECT 1 FROM "LearningRetentionParticipation" participation WHERE participation."userId" = attempt."userId")
        AND NOT EXISTS (SELECT 1 FROM "LearningAnnualReminder" reminder WHERE reminder."enrollmentId" = enrollment."id")
      GROUP BY attempt."userId"
      ORDER BY MAX(attempt."submittedAt") DESC
      LIMIT 2
    `
    expect(eligibleTestUsers).toHaveLength(2)
    const userId = eligibleTestUsers[0]!.userId
    const revocationUserId = eligibleTestUsers[1]!.userId
    // The full-course fixture may have passed without requesting its certificate yet.
    // Complete that normal service step before asserting certificate immutability.
    for (const fixture of eligibleTestUsers) {
      await saveLearningCertificateName(fixture.userId, 'Synthetische', 'Testdeelnemer')
    }
    const outsiderId = '00000000-0000-4000-8000-000000000001'
    await expect(startMyRetentionParticipation(userId, false)).rejects.toThrow('RETENTION_CONSENT_REQUIRED')
    await expect(getMyRetentionOverview(outsiderId)).resolves.toMatchObject({ eligible: false })
    const startAt = new Date()
    const [participation, repeated] = await Promise.all([
      startMyRetentionParticipation(userId, true, startAt),
      startMyRetentionParticipation(userId, true, startAt),
    ])
    expect(repeated.id).toBe(participation.id)
    expect(participation).toMatchObject({ status: 'ACTIVE', consentVersion: 'WL-001-RETENTION-CONSENT-1.0' })

    const checks = await ensureMyRetentionWeeklyChecks(userId, participation.id, startAt)
    expect(checks).toHaveLength(1)
    const [againA, againB] = await Promise.all([
      ensureMyRetentionWeeklyChecks(userId, participation.id, startAt),
      ensureMyRetentionWeeklyChecks(userId, participation.id, startAt),
    ])
    expect(againA).toHaveLength(1)
    expect(againB).toHaveLength(1)
    const week1 = await prisma!.learningRetentionWeeklyCheck.findUniqueOrThrow({
      where: { participationId_weekNumber: { participationId: participation.id, weekNumber: 1 } },
      include: { questions: { orderBy: { position: 'asc' }, include: { retentionQuestion: { include: { question: true } } } } },
    })
    expect(week1.questions).toHaveLength(5)
    expect(new Set(week1.questions.map((row) => row.retentionQuestion.questionId)).size).toBe(5)
    const player = await getMyRetentionWeeklyCheck(userId, participation.id, week1.id, startAt)
    expect(player?.questions).toHaveLength(5)
    expect(JSON.stringify(player)).not.toMatch(/correctAnswer|isCorrect|correctOption/i)
    expect(player?.questions.every((question) => question.presentation.feedback === null)).toBe(true)
    await expect(getMyRetentionWeeklyCheck(outsiderId, participation.id, week1.id, startAt)).resolves.toBeNull()
    expect(await prisma!.notificationOutbox.count({ where: { templateKey: 'LEARNING_RETENTION_WEEK_READY', payload: { path: ['weeklyCheckId'], equals: week1.id } } })).toBe(1)

    let sawMulti = false
    let sawSingle = false
    for (const [index, assignment] of week1.questions.entries()) {
      const q = assignment.retentionQuestion.question
      const correct = q.correctAnswer as string[]
      const rawAnswer = q.type === 'SINGLE_CHOICE' ? correct[0]! : correct
      if (q.type === 'SINGLE_CHOICE') sawSingle = true
      if (q.type === 'MULTI_CHOICE') sawMulti = true
      const saved = await answerMyRetentionQuestion(userId, participation.id, week1.id, assignment.id, rawAnswer, startAt)
      expect(saved.idempotent).toBe(false)
      expect(saved.correct).toBe(true)
      expect(saved.feedback.length).toBeGreaterThan(0)
      if (index === 0) {
        const retry = await answerMyRetentionQuestion(userId, participation.id, week1.id, assignment.id, rawAnswer, startAt)
        expect(retry.idempotent).toBe(true)
        const resumed = await getMyRetentionWeeklyCheck(userId, participation.id, week1.id, startAt)
        expect(resumed?.questions[0]).toMatchObject({ answered: true })
        expect(resumed?.questions[0]?.presentation.feedback).toBeTruthy()
        expect(resumed?.questions[1]).toMatchObject({ answered: false, presentation: { feedback: null } })
      }
    }
    expect(sawSingle).toBe(true)
    expect(sawMulti).toBe(true)
    const completedWeek = await getMyRetentionWeeklyCheck(userId, participation.id, week1.id, startAt)
    expect(completedWeek?.result).toMatchObject({ correct: 5, maxScore: 5, score: '5 van 5 goed' })

    const week2At = new Date(startAt.getTime() + 8 * 24 * 60 * 60 * 1000)
    const week2Checks = await ensureMyRetentionWeeklyChecks(userId, participation.id, week2At)
    expect(week2Checks).toHaveLength(2)
    const week2 = await prisma!.learningRetentionWeeklyCheck.findUniqueOrThrow({ where: { participationId_weekNumber: { participationId: participation.id, weekNumber: 2 } }, include: { questions: true } })
    expect(week2.questions).toHaveLength(5)
    expect(week2.questions.every((question) => question.selectionReason.length > 0)).toBe(true)
    await expect(ensureMyRetentionWeeklyChecks(outsiderId, participation.id, week2At)).rejects.toThrow('RETENTION_PARTICIPATION_NOT_AVAILABLE')
    const stopped = await stopMyRetentionParticipation(userId, participation.id, week2At)
    expect(stopped.idempotent).toBe(false)
    await expect(ensureMyRetentionWeeklyChecks(userId, participation.id, new Date(week2At.getTime() + 8 * 24 * 60 * 60 * 1000))).rejects.toThrow('RETENTION_PARTICIPATION_NOT_AVAILABLE')
    expect(await prisma!.learningRetentionWeeklyCheck.count({ where: { participationId: participation.id } })).toBe(2)
    expect(await prisma!.notificationOutbox.count({ where: { templateKey: 'LEARNING_RETENTION_WEEK_READY', status: 'PENDING', payload: { path: ['participationId'], equals: participation.id } } })).toBe(0)

    const certificateBefore = await prisma!.learningCertificate.findFirstOrThrow({ where: { userId, courseId: course.id } })
    const firstPass = await prisma!.learningExamAttempt.findFirstOrThrow({ where: { userId, passed: true, status: 'SUBMITTED' }, orderBy: [{ submittedAt: 'asc' }, { attemptNumber: 'asc' }] })
    const consentAt = new Date()
    const revoked = await setMyAnnualReminderConsent(revocationUserId, true, consentAt)
    expect(revoked.enabled).toBe(true)
    const dueAt = new Date(revoked.scheduledFor!.getTime() + 1)
    expect((await ensureDueAnnualReminderIntents(dueAt)).queued).toBe(1)
    await setMyAnnualReminderConsent(revocationUserId, false, consentAt)
    expect((await ensureDueAnnualReminderIntents(new Date(revoked.scheduledFor!.getTime() + 1))).queued).toBe(0)
    const fakeSend = vi.fn().mockResolvedValue({ status: 'ACCEPTED', messageId: 'test-only-not-delivered' })
    await expect(deliverLearningRetentionEmails({ now: () => dueAt, send: fakeSend })).resolves.toMatchObject({ sent: 0, failed: 1 })
    expect(fakeSend).not.toHaveBeenCalled()
    const reconsentedAt = new Date(consentAt.getTime() + 1_000)
    const reconsented = await setMyAnnualReminderConsent(revocationUserId, true, reconsentedAt)
    expect(reconsented).toEqual({ enabled: true, scheduledFor: revoked.scheduledFor })
    const consentHistory = await prisma!.learningAnnualReminderConsentEvent.findMany({
      where: { reminder: { enrollment: { userId: revocationUserId } } }, orderBy: { occurredAt: 'asc' },
    })
    expect(consentHistory.map((event) => event.eventType)).toEqual(['CONSENTED', 'REVOKED', 'CONSENTED'])
    expect(consentHistory[2]).toMatchObject({ occurredAt: reconsentedAt, consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0' })
    const revokedAttempt = await prisma!.learningExamAttempt.findFirstOrThrow({ where: { userId: revocationUserId, passed: true }, select: { enrollmentId: true } })
    const revokedReminder = await prisma!.learningAnnualReminder.findUniqueOrThrow({ where: { enrollmentId: revokedAttempt.enrollmentId }, select: { id: true } })
    const originalIntent = await prisma!.notificationOutbox.findFirstOrThrow({ where: { templateKey: 'LEARNING_RETENTION_ANNUAL_READY', payload: { path: ['annualReminderId'], equals: revokedReminder.id } } })
    expect(originalIntent.status).toBe('PENDING')
    const annual = await setMyAnnualReminderConsent(userId, true, consentAt)
    expect(annual.scheduledFor).toEqual(addCalendarYear(firstPass.submittedAt!))
    const queued1 = await ensureDueAnnualReminderIntents(new Date(annual.scheduledFor!.getTime() + 1))
    const queued2 = await ensureDueAnnualReminderIntents(new Date(annual.scheduledFor!.getTime() + 1))
    expect(queued1.queued).toBe(1)
    expect(queued2.queued).toBe(0)
    const annualView = await getMyAnnualRetentionCheck(userId, new Date(annual.scheduledFor!.getTime() + 1))
    expect(annualView?.questions).toHaveLength(10)
    const annualCheck = await prisma!.learningRetentionAnnualCheck.findFirstOrThrow({
      where: { userId }, include: { questions: { include: { retentionQuestion: { include: { question: true } } } } },
    })
    expect(new Set(annualCheck.questions.map((row) => row.retentionQuestion.chapterNumber))).toEqual(new Set([1,2,3,4,5,6,7,8,9,10]))
    for (let position = 1; position <= 10; position++) {
      const row = annualCheck.questions.find((question) => question.position === position)!
      const q = await prisma!.learningQuestion.findUniqueOrThrow({ where: { id: row.retentionQuestion.questionId }, include: { options: true } })
      const correct = q.correctAnswer as string[]
      const answer = q.type === 'SINGLE_CHOICE' ? correct[0]! : correct
      const result = await answerMyAnnualRetentionQuestion(userId, position, answer, new Date(annual.scheduledFor!.getTime() + 1))
      expect(result.saved).toBe(true)
      expect(result.feedback).toBeTruthy()
    }
    const annualResult = await getMyAnnualRetentionCheck(userId, new Date(annual.scheduledFor!.getTime() + 1))
    expect(annualResult).toMatchObject({ score: 10, maxScore: 10, result: { score: 10, maxScore: 10 } })
    const certificateAfter = await prisma!.learningCertificate.findFirstOrThrow({ where: { userId, courseId: course.id } })
    const passAfter = await prisma!.learningExamAttempt.findFirstOrThrow({ where: { id: firstPass.id } })
    expect(certificateAfter).toEqual(certificateBefore)
    expect(passAfter).toEqual(firstPass)
  }, 240_000)
})
