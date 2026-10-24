import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import type { RetentionQuestion } from './learning-retention-content'
import { addCalendarYear, evaluateRetentionAnswer, getNextRetentionQuestionPosition, presentRetentionQuestion, scoreAnnualRetentionCheck } from './learning-retention-policy'
import { selectRetentionAnnualQuestions } from './learning-retention-selector'
import { isRetentionQuestionSelectable, LEARNING_QUESTION_PUBLISHED_STATUS, RETENTION_BANK_PUBLISHED_STATUS } from './learning-retention-publication'

const COURSE_SLUG = 'rie-in-de-praktijk'
const RETENTION_BANK_VERSION = 'WL-001-RETENTION-1.0'
const ANNUAL_CHECK_VERSION = 'WL-001-ANNUAL-CHECK-1.0'
const ANNUAL_CONSENT_VERSION = 'WL-001-ANNUAL-REMINDER-CONSENT-1.0'

type Db = Prisma.TransactionClient

export function toRetentionQuestion(row: {
  bankVersion: string
  chapterNumber: number
  cognitiveLevel: string
  criticalConcept: boolean
  legalReviewRequired: boolean
  status: string
  correctFeedback: string
  incorrectFeedback: string
  question: {
    code: string
    status: string
    version: number
    knowledgeArea: string
    difficulty: number
    type: string
    questionText: string
    correctAnswer: Prisma.JsonValue
    options: Array<{ value: string; text: string; isCorrect: boolean }>
  }
}): RetentionQuestion {
  if (!Array.isArray(row.question.correctAnswer) || !row.question.correctAnswer.every((value) => typeof value === 'string')) {
    throw new Error('INVALID_RETENTION_ANSWER_KEY')
  }
  if (row.question.type !== 'SINGLE_CHOICE' && row.question.type !== 'MULTI_CHOICE') throw new Error('INVALID_RETENTION_QUESTION_TYPE')
  if (row.question.status !== 'DRAFT' && row.question.status !== LEARNING_QUESTION_PUBLISHED_STATUS) throw new Error('INVALID_LEARNING_QUESTION_STATUS')
  if (!['B', 'T', 'A'].includes(row.cognitiveLevel) || ![1, 2, 3].includes(row.question.difficulty)) throw new Error('INVALID_RETENTION_QUESTION_METADATA')
  return {
    code: row.question.code as `R${string}`,
    questionVersion: row.question.version,
    chapterNumber: row.chapterNumber,
    knowledgeArea: row.question.knowledgeArea,
    cognitiveLevel: row.cognitiveLevel as RetentionQuestion['cognitiveLevel'],
    difficulty: row.question.difficulty as RetentionQuestion['difficulty'],
    type: row.question.type,
    criticalConcept: row.criticalConcept,
    legalReview: row.legalReviewRequired,
    status: row.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    learningQuestionStatus: row.question.status as 'DRAFT' | 'PUBLISHED_PROTOTYPE',
    questionText: row.question.questionText,
    options: row.question.options.map(({ value, text, isCorrect }) => ({ value, text, isCorrect })),
    correctAnswer: row.question.correctAnswer,
    correctFeedback: row.correctFeedback,
    incorrectFeedback: row.incorrectFeedback,
  }
}

async function getPublishedBank(transaction: Db) {
  const rows = await transaction.learningRetentionQuestion.findMany({
    where: {
      bankVersion: RETENTION_BANK_VERSION,
      status: RETENTION_BANK_PUBLISHED_STATUS,
      question: { status: LEARNING_QUESTION_PUBLISHED_STATUS },
    },
    include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
  })
  return rows.map((row) => ({ id: row.id, question: toRetentionQuestion(row) }))
    .filter(({ question }) => isRetentionQuestionSelectable({ retentionStatus: question.status, learningQuestionStatus: question.learningQuestionStatus }))
}

async function findDueReminder(transaction: Db, userId: string, now: Date) {
  return transaction.learningAnnualReminder.findFirst({
    where: {
      userId,
      revokedAt: null,
      scheduledFor: { lte: now },
      enrollment: { userId, courseVersion: { course: { slug: COURSE_SLUG, status: 'PUBLISHED' } } },
    },
    orderBy: [{ scheduledFor: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, userId: true, scheduledFor: true },
  })
}

async function createAnnualCheck(transaction: Db, reminder: { id: string; userId: string; scheduledFor: Date }, now: Date) {
  const existing = await transaction.learningRetentionAnnualCheck.findUnique({ where: { reminderId: reminder.id }, select: { id: true } })
  if (existing) return existing.id
  if (reminder.scheduledFor > now) throw new Error('ANNUAL_CHECK_NOT_AVAILABLE')
    const locked = await transaction.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "LearningAnnualReminder" WHERE "id" = ${reminder.id}::uuid AND "userId" = ${reminder.userId}::uuid AND "revokedAt" IS NULL AND "scheduledFor" <= ${now} FOR UPDATE`
  if (!locked.length) throw new Error('ANNUAL_CHECK_NOT_AVAILABLE')
  const questions = await getPublishedBank(transaction)
  const selected = selectRetentionAnnualQuestions({ questions: questions.map(({ question }) => question), reminderKey: reminder.id, knowledgeSignals: [] })
  const idByCode = new Map(questions.map(({ id, question }) => [question.code, id]))
  const check = await transaction.learningRetentionAnnualCheck.create({
    data: {
      reminderId: reminder.id,
      userId: reminder.userId,
      checkVersion: ANNUAL_CHECK_VERSION,
      availableAt: reminder.scheduledFor,
      questions: { create: selected.map((question, index) => {
        const retentionQuestionId = idByCode.get(question.code)
        if (!retentionQuestionId) throw new Error('RETENTION_QUESTION_NOT_FOUND')
        return { retentionQuestionId, position: index + 1 }
      }) },
    },
    select: { id: true },
  })
  return check.id
}

function finalAnswerValue(value: Prisma.JsonValue | undefined): string | string[] | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value
  return null
}

export async function getMyAnnualRetentionCheck(userId: string, now = new Date()) {
  const prisma = getPrisma()
  const reminder = await findDueReminder(prisma, userId, now)
  if (!reminder) return null
  let checkId: string
  try {
    checkId = await prisma.$transaction(async (transaction) => createAnnualCheck(transaction, reminder, now), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15_000,
    })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const concurrent = await prisma.learningRetentionAnnualCheck.findUnique({ where: { reminderId: reminder.id }, select: { id: true } })
    if (!concurrent) throw error
    checkId = concurrent.id
  }
  const check = await prisma.learningRetentionAnnualCheck.findFirst({
    where: {
      id: checkId,
      userId,
      availableAt: { lte: now },
      reminder: { userId, revokedAt: null, enrollment: { userId, courseVersion: { course: { slug: COURSE_SLUG } } } },
    },
    include: {
      reminder: {
        include: {
          enrollment: {
            include: {
              courseVersion: {
                include: {
                  course: true,
                  chapters: { orderBy: { position: 'asc' } },
                },
              },
            },
          },
        },
      },
      questions: {
        orderBy: { position: 'asc' },
        include: {
          retentionQuestion: {
            include: {
              question: {
                include: {
                  options: { orderBy: { position: 'asc' } },
                },
              },
            },
          },
          answers: { where: { userId }, select: { answer: true, correct: true, answeredAt: true } },
        },
      },
    },
  })
  if (!check || check.questions.length !== 10) return null
  const chapterByPosition = new Map(check.reminder.enrollment.courseVersion.chapters.map((chapter) => [chapter.position, chapter]))
  const questions = check.questions.map((assignment) => {
    const metadata = assignment.retentionQuestion
    const question = toRetentionQuestion(metadata)
    const answer = assignment.answers[0]
    return {
      position: assignment.position,
      presentation: presentRetentionQuestion(question, answer ? finalAnswerValue(answer.answer) : null),
      answered: Boolean(answer),
      answeredAt: answer?.answeredAt ?? null,
      chapter: chapterByPosition.get(metadata.chapterNumber) ? {
        title: chapterByPosition.get(metadata.chapterNumber)!.title,
        href: `/e-learnings/${check.reminder.enrollment.courseVersion.course.slug}/leren/${encodeURIComponent(chapterByPosition.get(metadata.chapterNumber)!.slug)}?version=${encodeURIComponent(check.reminder.enrollment.courseVersion.version)}`,
      } : null,
    }
  })
  const completed = check.completedAt !== null
  const result = completed ? scoreAnnualRetentionCheck(check.questions.map((assignment) => {
    const chapter = chapterByPosition.get(assignment.retentionQuestion.chapterNumber)
    if (!chapter) throw new Error('ANNUAL_CHECK_CHAPTER_NOT_FOUND')
    return {
      position: assignment.position,
      chapterNumber: assignment.retentionQuestion.chapterNumber,
      chapterTitle: chapter.title,
      chapterSlug: chapter.slug,
      knowledgeArea: assignment.retentionQuestion.question.knowledgeArea,
      correct: Boolean(assignment.answers[0]?.correct),
    }
  })) : null
  return {
    checkVersion: check.checkVersion,
    startedAt: check.startedAt,
    completedAt: check.completedAt,
    score: completed ? check.score : null,
    maxScore: 10,
    nextPosition: completed ? null : getNextRetentionQuestionPosition(10, questions.filter((item) => item.answered).map((item) => item.position)),
    questions,
    result,
  }
}

export async function answerMyAnnualRetentionQuestion(userId: string, position: number, rawAnswer: unknown, now = new Date()) {
  if (!Number.isInteger(position) || position < 1 || position > 10) throw new Error('INVALID_ANNUAL_QUESTION_POSITION')
  const prisma = getPrisma()
  const reminder = await findDueReminder(prisma, userId, now)
  if (!reminder) throw new Error('ANNUAL_CHECK_NOT_AVAILABLE')
  const check = await prisma.learningRetentionAnnualCheck.findFirst({ where: { reminderId: reminder.id, userId, availableAt: { lte: now } }, select: { id: true } })
  if (!check) throw new Error('ANNUAL_CHECK_NOT_AVAILABLE')
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "LearningRetentionAnnualCheck" WHERE "id" = ${check.id}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`
    const ownedCheck = await transaction.learningRetentionAnnualCheck.findFirst({
      where: { id: check.id, userId, availableAt: { lte: now }, reminder: { userId, revokedAt: null, scheduledFor: { lte: now } } },
      include: {
        questions: {
          where: { position },
          include: {
            retentionQuestion: {
              include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
            },
            answers: { where: { userId } },
          },
        },
      },
    })
    if (!ownedCheck || ownedCheck.questions.length !== 1) throw new Error('ANNUAL_CHECK_NOT_AVAILABLE')
    const assignment = ownedCheck.questions[0]!
    const question = toRetentionQuestion(assignment.retentionQuestion)
    const finalAnswer = typeof rawAnswer === 'string' ? rawAnswer : Array.isArray(rawAnswer) && rawAnswer.every((value) => typeof value === 'string') ? rawAnswer : null
    if (finalAnswer === null) throw new Error('INVALID_ANSWER')
    const evaluation = evaluateRetentionAnswer(question, finalAnswer)
    const normalizedAnswer = Array.isArray(finalAnswer) ? [...finalAnswer].sort() : finalAnswer
    const existing = assignment.answers[0]
    if (existing) {
      const previousAnswer = finalAnswerValue(existing.answer)
      const normalizedPrevious = Array.isArray(previousAnswer) ? [...previousAnswer].sort() : previousAnswer
      if (JSON.stringify(normalizedPrevious) !== JSON.stringify(normalizedAnswer)) throw new Error('ANNUAL_ANSWER_ALREADY_FINAL')
      const answeredCount = await transaction.learningRetentionAnnualAnswer.count({ where: { annualCheckId: ownedCheck.id, userId } })
      return {
        saved: true as const,
        idempotent: true as const,
        isCorrect: existing.correct,
        feedback: evaluation.explanation,
        progress: { answered: answeredCount, total: 10 as const, completed: ownedCheck.completedAt !== null },
      }
    }
    if (ownedCheck.completedAt !== null) throw new Error('ANNUAL_CHECK_COMPLETED')
    await transaction.learningRetentionAnnualAnswer.create({
      data: {
        annualCheckId: ownedCheck.id,
        annualQuestionId: assignment.id,
        userId,
        answer: normalizedAnswer as Prisma.InputJsonValue,
        correct: evaluation.isCorrect,
      },
    })
    const answers = await transaction.learningRetentionAnnualAnswer.findMany({ where: { annualCheckId: ownedCheck.id, userId }, select: { correct: true } })
    let completed = false
    if (answers.length === 10) {
      await transaction.learningRetentionAnnualCheck.update({
        where: { id: ownedCheck.id },
        data: { completedAt: now, score: answers.filter((item) => item.correct).length },
      })
      completed = true
    }
    return {
      saved: true as const,
      idempotent: false as const,
      isCorrect: evaluation.isCorrect,
      feedback: evaluation.explanation,
      progress: { answered: answers.length, total: 10, completed },
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
}

export async function setMyAnnualReminderConsent(userId: string, consent: boolean, now = new Date()) {
  const db = getPrisma()
  const attempt = await db.learningExamAttempt.findFirst({
    where: { userId, status: 'SUBMITTED', passed: true, submittedAt: { not: null }, examVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, exam: { code: 'WL-001-FINAL', course: { code: 'WL-001', status: 'PUBLISHED' } }, courseVersion: { status: { in: ['PUBLISHED', 'RETIRED'] } } } },
    orderBy: [{ submittedAt: 'asc' }, { attemptNumber: 'asc' }],
    select: { id: true, userId: true, enrollmentId: true, submittedAt: true, courseVersionId: true },
  })
  if (!attempt?.submittedAt) throw new Error('ANNUAL_REMINDER_NOT_ELIGIBLE')
  const [completed, total] = await Promise.all([
    db.learningChapterProgress.count({ where: { enrollmentId: attempt.enrollmentId, courseVersionId: attempt.courseVersionId, status: 'COMPLETED' } }),
    db.learningChapter.count({ where: { courseVersionId: attempt.courseVersionId } }),
  ])
  if (completed !== 10 || total !== 10) throw new Error('ANNUAL_REMINDER_NOT_ELIGIBLE')
  try {
    return await db.$transaction(async (transaction) => {
      const existing = await transaction.learningAnnualReminder.findUnique({ where: { enrollmentId: attempt.enrollmentId } })
      if (!consent) {
        if (existing && !existing.revokedAt && !existing.sentAt) {
          await transaction.learningAnnualReminderConsentEvent.create({ data: {
            reminderId: existing.id, eventType: 'REVOKED', occurredAt: now, consentVersion: existing.consentVersion,
          } })
          await transaction.learningAnnualReminder.update({ where: { id: existing.id }, data: { revokedAt: now } })
        }
        return { enabled: false, scheduledFor: existing?.scheduledFor ?? null }
      }
      if (existing) {
        if (existing.sentAt) return { enabled: false, scheduledFor: existing.scheduledFor }
        if (!existing.revokedAt) return { enabled: true, scheduledFor: existing.scheduledFor }
        await transaction.learningAnnualReminderConsentEvent.create({ data: {
          reminderId: existing.id, eventType: 'CONSENTED', occurredAt: now, consentVersion: ANNUAL_CONSENT_VERSION,
        } })
        const restored = await transaction.learningAnnualReminder.update({ where: { id: existing.id }, data: {
          revokedAt: null, consentedAt: now, consentVersion: ANNUAL_CONSENT_VERSION,
        } })
        await transaction.notificationOutbox.updateMany({
          where: {
            idempotencyKey: `EMAIL:${existing.userId}:LEARNING_RETENTION_ANNUAL_READY:${existing.id}`,
            templateKey: 'LEARNING_RETENTION_ANNUAL_READY', status: 'FAILED',
            lastErrorCode: 'RETENTION_NOT_DELIVERABLE', attemptCount: { lt: 5 },
          },
          data: { status: 'PENDING', availableAt: existing.scheduledFor, processedAt: null, lastErrorCode: null, leaseToken: null, leaseUntil: null },
        })
        return { enabled: true, scheduledFor: restored.scheduledFor }
      }
      const reminder = await transaction.learningAnnualReminder.create({ data: {
        userId, enrollmentId: attempt.enrollmentId, qualifyingAttemptId: attempt.id,
        consentedAt: now, consentVersion: ANNUAL_CONSENT_VERSION, scheduledFor: addCalendarYear(attempt.submittedAt!),
      } })
      await transaction.learningAnnualReminderConsentEvent.create({ data: {
        reminderId: reminder.id, eventType: 'CONSENTED', occurredAt: now, consentVersion: ANNUAL_CONSENT_VERSION,
      } })
      return { enabled: true, scheduledFor: reminder.scheduledFor }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) {
      const concurrent = await db.learningAnnualReminder.findUnique({ where: { enrollmentId: attempt.enrollmentId } })
      if (concurrent) return { enabled: consent ? !concurrent.revokedAt && !concurrent.sentAt : Boolean(concurrent.revokedAt) || Boolean(concurrent.sentAt), scheduledFor: concurrent.scheduledFor }
    }
    throw error
  }
}

/** Schedule-agnostic hook: creates at most one outbox intent; it never sends mail itself. */
export async function ensureDueAnnualReminderIntents(now = new Date()) {
  const db = getPrisma()
  const due = await db.learningAnnualReminder.findMany({ where: { revokedAt: null, sentAt: null, scheduledFor: { lte: now } }, select: { id: true, userId: true, scheduledFor: true } })
  let queued = 0
  for (const reminder of due) {
    const eventId = `LEARNING_RETENTION_ANNUAL_READY:${reminder.id}`
    const idempotencyKey = `EMAIL:${reminder.userId}:${eventId}`
    try {
      await db.notificationOutbox.create({ data: {
        eventId, channel: 'EMAIL', recipientUserId: reminder.userId, templateKey: 'LEARNING_RETENTION_ANNUAL_READY',
        payload: { annualReminderId: reminder.id } as Prisma.InputJsonValue, idempotencyKey, availableAt: reminder.scheduledFor,
      } })
      queued++
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    }
  }
  return { due: due.length, queued }
}
