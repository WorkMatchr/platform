import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { toRetentionQuestion } from './learning-retention-annual-service'
import type { RetentionKnowledgeSignal, RetentionSelectionHistory } from './learning-retention-selector'
import { selectRetentionWeekQuestions } from './learning-retention-selector'
import { canAnswerRetentionQuestion, evaluateRetentionAnswer, getCurrentRetentionWeek, getRetentionWeekWindow, getRetentionWeeksToEnsure, isRetentionAnswerShapeValid, presentRetentionQuestion, RETENTION_DURATION_WEEKS } from './learning-retention-policy'
import { isRetentionQuestionSelectable, LEARNING_QUESTION_PUBLISHED_STATUS, RETENTION_BANK_PUBLISHED_STATUS } from './learning-retention-publication'

const COURSE_CODE = 'WL-001'
const PROGRAM_VERSION = 'WL-001-RETENTION-1.0'
const BANK_VERSION = 'WL-001-RETENTION-1.0'
const CONSENT_VERSION = 'WL-001-RETENTION-CONSENT-1.0'
const QUESTION_COUNT = 5
type Db = Prisma.TransactionClient

async function publishedProgram(db: Db) {
  return db.learningRetentionProgramVersion.findFirst({
    where: { version: PROGRAM_VERSION, status: 'PUBLISHED', program: { course: { code: COURSE_CODE, status: 'PUBLISHED' } } },
    select: { id: true, courseId: true, consentVersion: true, durationWeeks: true, questionsPerWeek: true, openAfterProgramDays: true },
  })
}

async function findEligibleEnrollment(db: Db, userId: string) {
  const enrollment = await db.learningEnrollment.findFirst({
    where: {
      userId, courseVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, course: { code: COURSE_CODE, status: 'PUBLISHED' } },
      examAttempts: { some: { status: 'SUBMITTED', passed: true, examVersion: { exam: { code: 'WL-001-FINAL' }, status: { in: ['PUBLISHED', 'RETIRED'] } } } },
    },
    include: {
      courseVersion: {
        include: {
          course: true,
          chapters: { include: { progress: { where: { enrollment: { userId } }, select: { status: true } } } },
        },
      },
      examAttempts: {
        where: { status: 'SUBMITTED', passed: true, examVersion: { exam: { code: 'WL-001-FINAL' }, status: { in: ['PUBLISHED', 'RETIRED'] } } },
        orderBy: [{ submittedAt: 'asc' }, { attemptNumber: 'asc' }], take: 1, select: { submittedAt: true },
      },
    },
  })
  if (!enrollment || enrollment.courseVersion.chapters.length !== 10
    || enrollment.courseVersion.chapters.some((chapter) => chapter.progress[0]?.status !== 'COMPLETED')
    || !enrollment.examAttempts[0]?.submittedAt) return null
  return enrollment
}

export async function getMyRetentionOverview(userId: string, now = new Date()) {
  const db = getPrisma()
  const [enrollment, program] = await Promise.all([
    findEligibleEnrollment(db, userId),
    db.learningRetentionProgramVersion.findFirst({ where: { version: PROGRAM_VERSION, status: { in: ['PUBLISHED', 'RETIRED'] } }, select: { id: true, consentVersion: true, status: true } }),
  ])
  const programAvailable = program?.status === 'PUBLISHED'
  if (!enrollment) return { eligible: false as const, programAvailable, participation: null, weeks: [], annualReminder: null }
  const participation = program ? await db.learningRetentionParticipation.findUnique({ where: { learningEnrollmentId_programVersionId: { learningEnrollmentId: enrollment.id, programVersionId: program.id } }, include: { weeklyChecks: { orderBy: { weekNumber: 'asc' }, include: { _count: { select: { answers: true } } } } } }) : null
  const annualReminder = await db.learningAnnualReminder.findUnique({ where: { enrollmentId: enrollment.id }, select: { id: true, consentedAt: true, consentVersion: true, scheduledFor: true, revokedAt: true, sentAt: true } })
  const weeks = participation?.weeklyChecks.map((check) => ({
    id: check.id, weekNumber: check.weekNumber, available: check.availableAt <= now,
    closed: check.closesAt <= now, completed: check.completedAt !== null,
    answered: check._count.answers, href: `/e-learnings/rie-in-de-praktijk/kennisbehoud/week/${check.id}`,
  })) ?? []
  return { eligible: true as const, programAvailable, participation, weeks, annualReminder }
}

export async function startMyRetentionParticipation(userId: string, consent: boolean, now = new Date()) {
  if (!consent) throw new Error('RETENTION_CONSENT_REQUIRED')
  const db = getPrisma()
  const eligibility = await findEligibleEnrollment(db, userId)
  if (!eligibility) throw new Error('RETENTION_NOT_ELIGIBLE')
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "LearningEnrollment" WHERE "id" = ${eligibility.id}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`
      const program = await publishedProgram(tx)
      if (!program || program.durationWeeks !== 12 || program.questionsPerWeek !== 5 || program.openAfterProgramDays !== 30) throw new Error('RETENTION_PROGRAM_NOT_AVAILABLE')
      const existing = await tx.learningRetentionParticipation.findUnique({ where: { learningEnrollmentId_programVersionId: { learningEnrollmentId: eligibility.id, programVersionId: program.id } } })
      if (existing) return existing
      return tx.learningRetentionParticipation.create({ data: {
        userId, learningEnrollmentId: eligibility.id, courseVersionId: eligibility.courseVersionId,
        courseId: eligibility.courseVersion.courseId, programVersionId: program.id,
        status: 'ACTIVE', consentedAt: now, consentVersion: program.consentVersion || CONSENT_VERSION, startedAt: now,
      } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      const program = await db.learningRetentionProgramVersion.findUnique({ where: { version: PROGRAM_VERSION }, select: { id: true } })
      if (program) {
        const existing = await db.learningRetentionParticipation.findUnique({ where: { learningEnrollmentId_programVersionId: { learningEnrollmentId: eligibility.id, programVersionId: program.id } } })
        if (existing) return existing
      }
    }
    throw error
  }
}

async function publishedBank(db: Db) {
  const rows = await db.learningRetentionQuestion.findMany({ where: { bankVersion: BANK_VERSION, status: RETENTION_BANK_PUBLISHED_STATUS, question: { status: LEARNING_QUESTION_PUBLISHED_STATUS } }, include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } })
  return rows.map((row) => ({ id: row.id, question: toRetentionQuestion(row) }))
    .filter(({ question }) => isRetentionQuestionSelectable({ retentionStatus: question.status, learningQuestionStatus: question.learningQuestionStatus }))
}

async function performanceSignals(db: Db, participationId: string, userId: string): Promise<RetentionKnowledgeSignal[]> {
  const [answers, examAnswers] = await Promise.all([
    db.learningRetentionWeeklyAnswer.findMany({ where: { userId, weeklyCheck: { participationId } }, select: { correct: true, weeklyQuestion: { select: { retentionQuestion: { select: { question: { select: { knowledgeArea: true } } } } } } } }),
    db.$queryRaw<Array<{ knowledgeAreas: string[]; answer: Prisma.JsonValue; correctAnswer: Prisma.JsonValue }>>`
      WITH first_pass AS (
        SELECT attempt."id"
        FROM "LearningExamAttempt" attempt
        JOIN "LearningExamVersion" version ON version."id" = attempt."examVersionId"
        JOIN "LearningExam" exam ON exam."id" = version."examId"
        WHERE attempt."userId" = ${userId}::uuid AND attempt."status" = 'SUBMITTED'
          AND attempt."passed" = true AND exam."code" = 'WL-001-FINAL'
        ORDER BY attempt."submittedAt" ASC NULLS LAST, attempt."attemptNumber" ASC
        LIMIT 1
      )
      SELECT exam_question."knowledgeAreas", answer."answer", question."correctAnswer"
      FROM first_pass
      JOIN "LearningExamAnswer" answer ON answer."attemptId" = first_pass."id"
      JOIN "LearningExamQuestion" exam_question ON exam_question."examVersionId" = answer."examVersionId"
        AND exam_question."questionId" = answer."questionId"
      JOIN "LearningQuestion" question ON question."id" = exam_question."questionId"
    `,
  ])
  const byArea = new Map<string, { total: number; incorrect: number; examTotal: number; examIncorrect: number }>()
  for (const answer of answers) {
    const area = answer.weeklyQuestion.retentionQuestion.question.knowledgeArea
    const value = byArea.get(area) ?? { total: 0, incorrect: 0, examTotal: 0, examIncorrect: 0 }; value.total++; if (!answer.correct) value.incorrect++; byArea.set(area, value)
  }
  for (const answer of examAnswers) {
    const selected = Array.isArray(answer.answer) ? answer.answer.filter((item): item is string => typeof item === 'string').sort() : typeof answer.answer === 'string' ? [answer.answer] : []
    const correctValue = answer.correctAnswer
    const expected = Array.isArray(correctValue) ? correctValue.filter((item): item is string => typeof item === 'string').sort() : typeof correctValue === 'string' ? [correctValue] : []
    const correct = selected.length === expected.length && selected.every((value, index) => value === expected[index])
    for (const area of answer.knowledgeAreas) {
      const value = byArea.get(area) ?? { total: 0, incorrect: 0, examTotal: 0, examIncorrect: 0 }; value.examTotal++; if (!correct) value.examIncorrect++; byArea.set(area, value)
    }
  }
  return [...byArea].map(([knowledgeArea, value]) => ({ knowledgeArea, examQuestionCount: value.examTotal, examIncorrectCount: value.examIncorrect, retentionAttemptCount: value.total, retentionIncorrectCount: value.incorrect }))
}

async function questionHistory(db: Db, participationId: string): Promise<RetentionSelectionHistory[]> {
  const checks = await db.learningRetentionWeeklyCheck.findMany({ where: { participationId }, select: { weekNumber: true, questions: { select: { retentionQuestion: { select: { question: { select: { code: true } } } } } } } })
  const last = new Map<string, number>()
  for (const check of checks) for (const question of check.questions) last.set(question.retentionQuestion.question.code, Math.max(last.get(question.retentionQuestion.question.code) ?? 0, check.weekNumber))
  return [...last].map(([questionCode, lastPresentedWeek]) => ({ questionCode, lastPresentedWeek }))
}

async function queueWeekEmail(db: Db, userId: string, participationId: string, checkId: string, weekNumber: number) {
  const eventId = `LEARNING_RETENTION_WEEK_READY:${checkId}`
  const idempotencyKey = `EMAIL:${userId}:${eventId}`
  await db.notificationOutbox.upsert({ where: { idempotencyKey }, create: {
    eventId, channel: 'EMAIL', recipientUserId: userId, templateKey: 'LEARNING_RETENTION_WEEK_READY',
    payload: { participationId, weeklyCheckId: checkId, weekNumber } as Prisma.InputJsonValue, idempotencyKey,
  }, update: {} })
}

async function ensureWeeklyCheckInTransaction(db: Db, userId: string, participationId: string, weekNumber: number, now: Date) {
  const participation = await db.learningRetentionParticipation.findFirst({ where: { id: participationId, userId }, include: { programVersion: true } })
  if (!participation || participation.status === 'STOPPED' || participation.stoppedAt) throw new Error('RETENTION_PARTICIPATION_NOT_AVAILABLE')
  const old = await db.learningRetentionWeeklyCheck.findUnique({ where: { participationId_weekNumber: { participationId, weekNumber } }, include: { questions: true, answers: true } })
  if (old) return { check: old, created: false }
  const dueWeeks = getRetentionWeeksToEnsure(participation.startedAt, participation.stoppedAt, now)
  if (!dueWeeks.includes(weekNumber)) throw new Error('RETENTION_WEEK_NOT_AVAILABLE')
  const closeAt = new Date(participation.startedAt.getTime() + (RETENTION_DURATION_WEEKS * 7 + participation.programVersion.openAfterProgramDays) * 24 * 60 * 60 * 1000)
  const [bank, signals, history] = await Promise.all([publishedBank(db), performanceSignals(db, participationId, userId), questionHistory(db, participationId)])
  const selected = selectRetentionWeekQuestions({ questions: bank.map((row) => row.question), weekNumber, participationKey: participationId, participationStatus: participation.status, knowledgeSignals: signals, history })
  const byVersion = new Map(bank.map((item) => [`${item.question.code}:v${item.question.questionVersion}`, item.id]))
  const rows = selected.map(({ question, reason }, index) => {
    const retentionQuestionId = byVersion.get(`${question.code}:v${question.questionVersion}`)
    if (!retentionQuestionId) throw new Error('RETENTION_QUESTION_VERSION_NOT_FOUND')
    return { retentionQuestionId, position: index + 1, selectionReason: reason }
  })
  if (rows.length !== QUESTION_COUNT) throw new Error('RETENTION_QUESTION_COUNT_INVALID')
  const window = getRetentionWeekWindow(participation.startedAt, weekNumber)
  let check
  try {
    check = await db.learningRetentionWeeklyCheck.create({ data: {
      participationId, userId, weekNumber, availableAt: window.availableAt, closesAt: closeAt,
      questions: { create: rows },
    }, include: { questions: true, answers: true } })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || !['P2002', 'P2034'].includes(error.code)) throw error
    const raced = await db.learningRetentionWeeklyCheck.findUnique({ where: { participationId_weekNumber: { participationId, weekNumber } }, include: { questions: true, answers: true } })
    if (!raced) throw error
    return { check: raced, created: false }
  }
  if (getCurrentRetentionWeek(participation.startedAt, now) === weekNumber) {
    await queueWeekEmail(db, userId, participationId, check.id, weekNumber)
  }
  return { check, created: true }
}

export async function ensureMyRetentionWeeklyChecks(userId: string, participationId: string, now = new Date()) {
  const db = getPrisma()
  const participation = await db.learningRetentionParticipation.findFirst({ where: { id: participationId, userId }, select: { id: true, startedAt: true, stoppedAt: true, status: true } })
  if (!participation || participation.stoppedAt) throw new Error('RETENTION_PARTICIPATION_NOT_AVAILABLE')
  const weeks = getRetentionWeeksToEnsure(participation.startedAt, participation.stoppedAt, now)
  const result = []
  for (const week of weeks) {
    const created = await db.$transaction((tx) => ensureWeeklyCheckInTransaction(tx, userId, participationId, week, now), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20_000 })
    result.push(created.check)
  }
  if (participation.status === 'ACTIVE' && now.getTime() >= participation.startedAt.getTime() + RETENTION_DURATION_WEEKS * 7 * 24 * 60 * 60 * 1000) {
    await db.learningRetentionParticipation.updateMany({ where: { id: participationId, userId, status: 'ACTIVE' }, data: { status: 'COMPLETED', completedAt: now } })
  }
  return result
}

export async function ensureRetentionSchedule(now = new Date()) {
  const db = getPrisma()
  const active = await db.learningRetentionParticipation.findMany({ where: { status: { in: ['ACTIVE', 'COMPLETED'] }, stoppedAt: null, startedAt: { lte: now } }, select: { id: true, userId: true, completedAt: true } })
  const result = { participants: active.length, checksCreated: 0, mailsQueued: 0 }
  for (const item of active) {
    const before = await db.learningRetentionWeeklyCheck.count({ where: { participationId: item.id } })
    await ensureMyRetentionWeeklyChecks(item.userId, item.id, now)
    const after = await db.learningRetentionWeeklyCheck.count({ where: { participationId: item.id } })
    result.checksCreated += after - before
    // The ensure operation creates at most the current week's intent; outbox
    // uniqueness makes repeated maintenance runs harmless.
    if (after > before) result.mailsQueued += 1
  }
  return result
}

export async function runLearningRetentionMaintenance(now = new Date()) {
  const [weekly, annual] = await Promise.all([
    ensureRetentionSchedule(now),
    import('./learning-retention-annual-service').then(({ ensureDueAnnualReminderIntents }) => ensureDueAnnualReminderIntents(now)),
  ])
  return { weekly, annual }
}

export async function stopMyRetentionParticipation(userId: string, participationId: string, now = new Date()) {
  const db = getPrisma()
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "LearningRetentionParticipation" WHERE "id" = ${participationId}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`
    const owned = await tx.learningRetentionParticipation.findFirst({ where: { id: participationId, userId } })
    if (!owned) throw new Error('RETENTION_PARTICIPATION_NOT_FOUND')
    if (owned.stoppedAt) return { stoppedAt: owned.stoppedAt, idempotent: true }
    const stoppedAt = now
    await tx.learningRetentionParticipation.update({ where: { id: participationId }, data: { status: 'STOPPED', stoppedAt } })
    await tx.notificationOutbox.updateMany({
      where: { templateKey: 'LEARNING_RETENTION_WEEK_READY', status: 'PENDING', payload: { path: ['participationId'], equals: participationId } },
      data: { status: 'FAILED', lastErrorCode: 'RETENTION_STOPPED' },
    })
    return { stoppedAt, idempotent: false }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function getMyRetentionWeeklyCheck(userId: string, participationId: string, checkId: string, now = new Date()) {
  const db = getPrisma()
  const participation = await db.learningRetentionParticipation.findFirst({ where: { id: participationId, userId }, select: { stoppedAt: true } })
  if (!participation) return null
  if (!participation.stoppedAt) await ensureMyRetentionWeeklyChecks(userId, participationId, now)
  const check = await db.learningRetentionWeeklyCheck.findFirst({
    where: { id: checkId, userId, participationId, availableAt: { lte: now }, participation: { userId } },
    include: {
      participation: { include: { enrollment: { include: { courseVersion: { include: { course: true, chapters: true } } } } } },
      answers: { where: { userId } },
      questions: {
        orderBy: { position: 'asc' },
        include: { retentionQuestion: { include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } } },
      },
    },
  })
  if (!check || check.questions.length !== QUESTION_COUNT) return null
  const answers = new Map(check.answers.map((answer) => [answer.weeklyQuestionId, answer]))
  const questions = check.questions.map((assignment) => {
    const question = toRetentionQuestion(assignment.retentionQuestion)
    const answer = answers.get(assignment.id)
    return { id: assignment.id, position: assignment.position, answered: Boolean(answer), presentation: presentRetentionQuestion(question, answer ? answer.answer as string | string[] : null) }
  })
  const areaStats = new Map<string, { correct: number; total: number }>()
  for (const assignment of check.questions) {
    const area = assignment.retentionQuestion.question.knowledgeArea
    const stats = areaStats.get(area) ?? { correct: 0, total: 0 }
    stats.total++
    if (answers.get(assignment.id)?.correct) stats.correct++
    areaStats.set(area, stats)
  }
  const totalCorrect = check.answers.filter((answer) => answer.correct).length
  const result = check.completedAt ? {
    title: 'Kennischeck afgerond', score: `${totalCorrect} van 5 goed`,
    correct: totalCorrect, maxScore: 5,
    attentionAreas: [...areaStats].filter(([, stats]) => stats.correct < stats.total).sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total || a[0].localeCompare(b[0], 'nl')).slice(0, 3).map(([area]) => area),
    strongAreas: [...areaStats].filter(([, stats]) => stats.correct === stats.total).sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0], 'nl')).slice(0, 3).map(([area]) => area),
    chapterLinks: check.questions.filter((question) => !answers.get(question.id)?.correct).flatMap((question) => {
      const chapter = check.participation.enrollment.courseVersion.chapters.find((item) => item.position === question.retentionQuestion.chapterNumber)
      return chapter ? [{ knowledgeArea: question.retentionQuestion.question.knowledgeArea, chapterNumber: chapter.position, href: `/e-learnings/${check.participation.enrollment.courseVersion.course.slug}/leren/${encodeURIComponent(chapter.slug)}?version=${encodeURIComponent(check.participation.enrollment.courseVersion.version)}` }] : []
    }),
  } : null
  return { id: check.id, participationId, weekNumber: check.weekNumber, closesAt: check.closesAt, completedAt: check.completedAt, answeringAllowed: !check.completedAt && check.closesAt > now && !check.participation.stoppedAt, answeredCount: answers.size, currentPosition: questions.find((question) => !question.answered)?.position ?? null, questions, result }
}

export async function answerMyRetentionQuestion(userId: string, participationId: string, checkId: string, weeklyQuestionId: string, rawAnswer: unknown, now = new Date()) {
  const db = getPrisma()
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "LearningRetentionWeeklyCheck" WHERE "id" = ${checkId}::uuid AND "userId" = ${userId}::uuid AND "participationId" = ${participationId}::uuid FOR UPDATE`
    const check = await tx.learningRetentionWeeklyCheck.findFirst({
      where: { id: checkId, userId, participationId },
      include: {
        participation: true,
        answers: { where: { userId } },
        questions: {
          where: { id: weeklyQuestionId },
          include: {
            retentionQuestion: { include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } },
            answers: { where: { userId } },
          },
        },
      },
    })
    if (!check || check.questions.length !== 1) throw new Error('RETENTION_QUESTION_NOT_IN_CHECK')
    const assignment = check.questions[0]!
    const question = toRetentionQuestion(assignment.retentionQuestion)
    const answer = typeof rawAnswer === 'string' ? rawAnswer : Array.isArray(rawAnswer) && rawAnswer.every((item) => typeof item === 'string') ? rawAnswer as string[] : null
    if (answer === null || !isRetentionAnswerShapeValid(question, answer)) throw new Error('INVALID_RETENTION_ANSWER')
    const normalized = Array.isArray(answer) ? [...answer].sort() : answer
    const evaluation = evaluateRetentionAnswer(question, normalized)
    const previous = assignment.answers[0]
    if (previous) {
      const prior = Array.isArray(previous.answer) ? [...previous.answer as string[]].sort() : previous.answer
      if (JSON.stringify(prior) !== JSON.stringify(normalized)) throw new Error('RETENTION_ANSWER_ALREADY_FINAL')
      return { idempotent: true, correct: previous.correct, feedback: evaluation.explanation, selectedCorrectOptions: evaluation.selectedCorrectOptions, missedCorrectOptions: evaluation.missedCorrectOptions, selectedIncorrectOptions: evaluation.selectedIncorrectOptions, progress: { answered: check.answers.length, total: QUESTION_COUNT, completed: check.completedAt !== null } }
    }
    if (check.completedAt || check.closesAt <= now || !canAnswerRetentionQuestion({ startedAt: check.participation.startedAt, weekNumber: check.weekNumber, stoppedAt: check.participation.stoppedAt, answeredCount: check.answers.length, now, closesAt: check.closesAt })) throw new Error('RETENTION_CHECK_CLOSED')
    await tx.learningRetentionWeeklyAnswer.create({ data: { weeklyCheckId: checkId, weeklyQuestionId, userId, answer: normalized as Prisma.InputJsonValue, correct: evaluation.isCorrect, answeredAt: now } })
    const answers = await tx.learningRetentionWeeklyAnswer.findMany({ where: { weeklyCheckId: checkId, userId }, select: { correct: true } })
    let completed = false
    if (answers.length === QUESTION_COUNT) {
      await tx.learningRetentionWeeklyCheck.update({ where: { id: checkId }, data: { completedAt: now } })
      const participation = await tx.learningRetentionParticipation.findUnique({ where: { id: participationId }, select: { startedAt: true } })
      if (participation && now.getTime() >= participation.startedAt.getTime() + RETENTION_DURATION_WEEKS * 7 * 24 * 60 * 60 * 1000) {
        await tx.learningRetentionParticipation.updateMany({ where: { id: participationId, status: 'ACTIVE' }, data: { status: 'COMPLETED', completedAt: now } })
      }
      completed = true
    }
    return { idempotent: false, correct: evaluation.isCorrect, feedback: evaluation.explanation, selectedCorrectOptions: evaluation.selectedCorrectOptions, missedCorrectOptions: evaluation.missedCorrectOptions, selectedIncorrectOptions: evaluation.selectedIncorrectOptions, progress: { answered: answers.length, total: QUESTION_COUNT, completed } }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
}

export async function ensureMyRetentionWeeklyCheck(userId: string, participationId: string, weekNumber: number, now = new Date()) {
  await ensureMyRetentionWeeklyChecks(userId, participationId, now)
  const db = getPrisma()
  return db.learningRetentionWeeklyCheck.findFirst({ where: { participationId, userId, weekNumber }, select: { id: true } })
}
