import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { isExamAnswerCorrect, scoreExam, type ExamQuestionType } from './learning-exam-policy'

const COURSE_CODE = 'WL-001'
const COURSE_SLUG = 'rie-in-de-praktijk'
const COURSE_VERSION = 'prototype-0.17'
const EXAM_CODE = 'WL-001-FINAL'
const EXAM_VERSIONS_IN_PRIORITY_ORDER = ['WL-001-EXAM-1.1', 'WL-001-EXAM-1.0'] as const
const QUESTION_COUNT = 50

type Db = Prisma.TransactionClient

async function completedChapterCount(transaction: Db, enrollmentId: string, courseVersionId: string) {
  const chapters = await transaction.learningChapterProgress.count({
    where: { enrollmentId, courseVersionId, status: 'COMPLETED', chapter: { courseVersionId } },
  })
  const expected = await transaction.learningChapter.count({ where: { courseVersionId } })
  return { chapters, expected }
}

async function findPublishedExam(courseSlug: string) {
  if (courseSlug !== COURSE_SLUG) return null
  for (const version of EXAM_VERSIONS_IN_PRIORITY_ORDER) {
    const examVersion = await getPrisma().learningExamVersion.findFirst({
      where: {
        version,
        status: 'PUBLISHED',
        exam: { code: EXAM_CODE, course: { code: COURSE_CODE, slug: COURSE_SLUG, status: 'PUBLISHED' } },
        courseVersion: { version: COURSE_VERSION, status: 'PUBLISHED' },
      },
      select: {
        id: true, examId: true, courseId: true, courseVersionId: true,
        questionCount: true, maxScore: true, passingScore: true, passingPercentage: true,
        timeLimitMinutes: true, attemptLimit: true, _count: { select: { questions: true } },
      },
    })
    if (!examVersion) continue
    if (examVersion.questionCount !== QUESTION_COUNT || examVersion.maxScore !== QUESTION_COUNT
      || examVersion.passingScore !== 40 || examVersion.passingPercentage !== 80
      || examVersion.timeLimitMinutes !== null || examVersion.attemptLimit !== null
      || examVersion._count.questions !== QUESTION_COUNT) {
      throw new Error('EXAM_NOT_AVAILABLE')
    }
    const { _count, ...publishedVersion } = examVersion
    void _count
    return publishedVersion
  }
  return null
}

export async function getFinalExamOverview(userId: string, courseSlug = COURSE_SLUG) {
  const examVersion = await findPublishedExam(courseSlug)
  if (!examVersion) return null
  const enrollment = await getPrisma().learningEnrollment.findUnique({
    where: { userId_courseVersionId: { userId, courseVersionId: examVersion.courseVersionId } },
    select: {
      id: true,
      status: true,
      courseVersion: {
        select: {
          course: { select: { id: true, slug: true, title: true } },
          chapters: {
            orderBy: { position: 'asc' },
            select: {
              id: true,
              position: true,
              title: true,
              progress: { where: { enrollment: { userId } }, select: { status: true } },
            },
          },
        },
      },
      examAttempts: { where: { examId: examVersion.examId }, orderBy: { attemptNumber: 'asc' }, select: { id: true, attemptNumber: true, status: true, score: true, maxScore: true, percentage: true, passed: true, submittedAt: true, startedAt: true, currentPosition: true } },
    },
  })
  if (!enrollment) return { examVersion, enrollment: null, eligible: false, completedChapters: 0, chapterCount: 10, activeAttempt: null, attempts: [] }
  const chapters = enrollment.courseVersion.chapters
  const completedChapters = chapters.filter((chapter) => chapter.progress[0]?.status === 'COMPLETED').length
  return {
    examVersion,
    enrollment,
    eligible: chapters.length === 10 && completedChapters === 10,
    completedChapters,
    chapterCount: chapters.length,
    activeAttempt: enrollment.examAttempts.find((attempt) => attempt.status === 'IN_PROGRESS') ?? null,
    attempts: enrollment.examAttempts.filter((attempt) => attempt.status === 'SUBMITTED'),
  }
}

export async function startFinalExamAttempt(userId: string) {
  const examVersion = await findPublishedExam(COURSE_SLUG)
  if (!examVersion) {
    throw new Error('EXAM_NOT_AVAILABLE')
  }
  const prisma = getPrisma()
  try {
    return await prisma.$transaction(async (transaction) => {
      const enrollment = await transaction.learningEnrollment.findUnique({
        where: { userId_courseVersionId: { userId, courseVersionId: examVersion.courseVersionId } },
        select: { id: true, userId: true, courseVersionId: true },
      })
      if (!enrollment) throw new Error('ENROLLMENT_REQUIRED')
      await transaction.$queryRaw`SELECT id FROM "LearningEnrollment" WHERE id = ${enrollment.id}::uuid FOR UPDATE`
      const completion = await completedChapterCount(transaction, enrollment.id, examVersion.courseVersionId)
      if (completion.expected !== 10 || completion.chapters !== 10) throw new Error('CHAPTERS_INCOMPLETE')
      const existing = await transaction.learningExamAttempt.findFirst({
        where: { enrollmentId: enrollment.id, examId: examVersion.examId, status: 'IN_PROGRESS' },
      })
      if (existing) return existing
      const latest = await transaction.learningExamAttempt.aggregate({
        where: { enrollmentId: enrollment.id, examId: examVersion.examId },
        _max: { attemptNumber: true },
      })
      return transaction.learningExamAttempt.create({
        data: {
          userId,
          enrollmentId: enrollment.id,
          examId: examVersion.examId,
          examVersionId: examVersion.id,
          courseVersionId: examVersion.courseVersionId,
          attemptNumber: (latest._max.attemptNumber ?? 0) + 1,
          currentPosition: 1,
          maxScore: examVersion.maxScore,
          passingScore: examVersion.passingScore,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
      const active = await prisma.learningExamAttempt.findFirst({ where: { userId, examId: examVersion.examId, status: 'IN_PROGRESS' } })
      if (active) return active
    }
    throw error
  }
}

async function lockOwnedAttempt(transaction: Db, userId: string, attemptId: string) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "LearningExamAttempt"
    WHERE "id" = ${attemptId}::uuid AND "userId" = ${userId}::uuid
    FOR UPDATE
  `
  if (!rows.length) throw new Error('ATTEMPT_NOT_FOUND')
  const attempt = await transaction.learningExamAttempt.findFirst({
    where: { id: attemptId, userId },
    include: {
      examVersion: {
        include: {
          questions: {
            orderBy: { position: 'asc' },
            include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
          },
        },
      },
    },
  })
  if (!attempt) throw new Error('ATTEMPT_NOT_FOUND')
  return attempt
}

export async function getFinalExamPlayer(userId: string, attemptId: string) {
  const attempt = await getPrisma().learningExamAttempt.findFirst({
    where: { id: attemptId, userId, status: 'IN_PROGRESS', examVersion: { status: { in: ['PUBLISHED', 'RETIRED'] } } },
    include: {
      examVersion: {
        include: {
          questions: {
            orderBy: { position: 'asc' },
            include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
          },
        },
      },
      answers: true,
    },
  })
  if (!attempt || attempt.examVersion.questions.length !== QUESTION_COUNT) return null
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    currentPosition: Math.min(Math.max(attempt.currentPosition, 1), QUESTION_COUNT),
    startedAt: attempt.startedAt,
    questionCount: QUESTION_COUNT,
    answers: Object.fromEntries(attempt.answers.map((answer) => [answer.questionId, answer.answer as unknown])),
    questions: attempt.examVersion.questions.map((mapping) => ({
      id: mapping.questionId,
      code: mapping.code,
      position: mapping.position,
      type: mapping.question.type as ExamQuestionType,
      questionText: mapping.question.questionText,
      options: mapping.question.options.map(({ value, text }) => ({ value, text })),
    })),
  }
}

export async function saveFinalExamAnswer(userId: string, attemptId: string, questionId: string, answer: unknown | null) {
  return getPrisma().$transaction(async (transaction) => {
    const attempt = await lockOwnedAttempt(transaction, userId, attemptId)
    if (attempt.status !== 'IN_PROGRESS') throw new Error('ATTEMPT_SUBMITTED')
    const mapping = attempt.examVersion.questions.find((item) => item.questionId === questionId)
    if (!mapping) throw new Error('QUESTION_NOT_IN_EXAM')
    if (answer === null || (mapping.question.type === 'MULTI_CHOICE' && Array.isArray(answer) && answer.length === 0)) {
      await transaction.learningExamAnswer.deleteMany({ where: { attemptId, questionId } })
      return { saved: true }
    }
    const values = new Set(mapping.question.options.map((option) => option.value))
    if (mapping.question.type === 'SINGLE_CHOICE') {
      if (typeof answer !== 'string' || !values.has(answer)) throw new Error('INVALID_ANSWER')
    } else {
      if (!Array.isArray(answer) || !answer.every((value) => typeof value === 'string' && values.has(value)) || new Set(answer).size !== answer.length) {
        throw new Error('INVALID_ANSWER')
      }
    }
    await transaction.learningExamAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      update: { answer: answer as Prisma.InputJsonValue },
      create: { attemptId, examVersionId: attempt.examVersionId, questionId, answer: answer as Prisma.InputJsonValue },
    })
    return { saved: true }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}

export async function updateFinalExamPosition(userId: string, attemptId: string, position: number) {
  if (!Number.isInteger(position) || position < 1 || position > QUESTION_COUNT) throw new Error('INVALID_POSITION')
  return getPrisma().$transaction(async (transaction) => {
    const attempt = await lockOwnedAttempt(transaction, userId, attemptId)
    if (attempt.status !== 'IN_PROGRESS') throw new Error('ATTEMPT_SUBMITTED')
    await transaction.learningExamAttempt.update({ where: { id: attemptId }, data: { currentPosition: position } })
    return { saved: true }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

function knowledgeAreaResults(questions: Array<{ questionId: string; chapterNumber: number; knowledgeAreas: string[]; question: { type: string; correctAnswer: Prisma.JsonValue } }>, answers: Array<{ questionId: string; answer: Prisma.JsonValue }>) {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]))
  const incorrect = questions.filter((question) => !isExamAnswerCorrect(
    question.question.type as ExamQuestionType,
    answerMap.get(question.questionId),
    question.question.correctAnswer,
  ))
  const grouped = new Map<string, { count: number; chapters: Set<number> }>()
  for (const question of incorrect) for (const area of question.knowledgeAreas) {
    const current = grouped.get(area) ?? { count: 0, chapters: new Set<number>() }
    current.count += 1
    current.chapters.add(question.chapterNumber)
    grouped.set(area, current)
  }
  return [...grouped.entries()]
    .map(([knowledgeArea, value]) => ({ knowledgeArea, incorrectCount: value.count, chapters: [...value.chapters].sort((a, b) => a - b) }))
    .sort((a, b) => b.incorrectCount - a.incorrectCount || a.knowledgeArea.localeCompare(b.knowledgeArea))
    .slice(0, 3)
}

export async function submitFinalExamAttempt(userId: string, attemptId: string) {
  const prisma = getPrisma()
  try {
    return await prisma.$transaction(async (transaction) => {
      const attempt = await lockOwnedAttempt(transaction, userId, attemptId)
      if (attempt.status === 'SUBMITTED') return attempt
      if (attempt.status !== 'IN_PROGRESS' || attempt.examVersion.questions.length !== QUESTION_COUNT) throw new Error('ATTEMPT_NOT_SUBMITTABLE')
      const answers = await transaction.learningExamAnswer.findMany({ where: { attemptId } })
      const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer as unknown]))
      const result = scoreExam(attempt.examVersion.questions.map((mapping) => ({
        type: mapping.question.type as ExamQuestionType,
        answer: answerMap.get(mapping.questionId) ?? null,
        correctAnswer: mapping.question.correctAnswer as unknown,
      })), attempt.passingScore)
      const submitted = await transaction.learningExamAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'SUBMITTED',
          score: result.score,
          percentage: result.percentage,
          passed: result.passed,
          submittedAt: new Date(),
        },
      })
      if (result.passed) {
        await transaction.learningEnrollment.updateMany({
          where: { id: attempt.enrollmentId, userId, courseVersionId: attempt.courseVersionId, status: 'IN_PROGRESS' },
          data: { status: 'COMPLETED', completedAt: submitted.submittedAt },
        })
      }
      return { ...submitted, knowledgeAreas: knowledgeAreaResults(attempt.examVersion.questions, answers) }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2010', 'P2034'].includes(error.code)) {
      const submitted = await prisma.learningExamAttempt.findFirst({ where: { id: attemptId, userId, status: 'SUBMITTED' } })
      if (submitted) return submitted
    }
    throw error
  }
}

export async function getFinalExamResult(userId: string, attemptId: string) {
  const attempt = await getPrisma().learningExamAttempt.findFirst({
    where: { id: attemptId, userId, status: 'SUBMITTED' },
    include: { examVersion: { include: { questions: { include: { question: true } } } }, answers: true },
  })
  if (!attempt) return null
  return {
    id: attempt.id,
    attemptNumber: attempt.attemptNumber,
    score: attempt.score!,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage!,
    passed: attempt.passed!,
    submittedAt: attempt.submittedAt!,
    knowledgeAreas: knowledgeAreaResults(attempt.examVersion.questions, attempt.answers),
  }
}

export async function getFinalExamAttemptHistory(userId: string, courseVersionId: string, examId: string) {
  return getPrisma().learningExamAttempt.findMany({
    where: { userId, courseVersionId, examId, status: 'SUBMITTED' },
    orderBy: { attemptNumber: 'asc' },
    select: { id: true, attemptNumber: true, score: true, maxScore: true, percentage: true, passed: true, submittedAt: true },
  })
}
