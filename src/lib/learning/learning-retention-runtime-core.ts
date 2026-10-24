import type { RetentionKnowledgeSignal, RetentionSelectionHistory } from './learning-retention-selector'
import { selectRetentionWeekQuestions } from './learning-retention-selector'
import { canAnswerRetentionQuestion, evaluateRetentionAnswer, getCurrentRetentionWeek, getRetentionWeekWindow, isRetentionAnswerShapeValid, presentRetentionQuestion, scoreAnnualRetentionCheck } from './learning-retention-policy'
import type { RetentionQuestion } from './learning-retention-content'

export type RetentionRuntimeQuestion = { id: string; question: RetentionQuestion }
export type RetentionParticipation = {
  id: string; userId: string; enrollmentId: string; startedAt: Date; stoppedAt: Date | null
  status: 'ACTIVE' | 'STOPPED' | 'COMPLETED'; consentVersion: string; consentedAt?: Date
}
export type WeeklyCheckSnapshot = {
  id: string; userId: string; participationId: string; weekNumber: number
  availableAt: Date; closesAt: Date; completedAt: Date | null
  questions: Array<{ id: string; position: number; reason: 'PERSONAL' | 'CORE' | 'SPREAD'; question: RetentionRuntimeQuestion }>
  answers: Array<{ weeklyQuestionId: string; answer: string | string[]; correct: boolean; answeredAt: Date }>
}

/** Persistence port keeps the orchestration independently testable; the Prisma adapter owns transactions/constraints. */
export interface RetentionRuntimeRepository {
  eligibleEnrollment(userId: string): Promise<{ id: string; userId: string } | null>
  publishedProgram(): Promise<{ id: string; consentVersion: string } | null>
  participation(enrollmentId: string, programVersionId: string): Promise<RetentionParticipation | null>
  createParticipation(input: { userId: string; enrollmentId: string; programVersionId: string; consentVersion: string; now: Date }): Promise<RetentionParticipation>
  ownedParticipation(userId: string, participationId: string): Promise<RetentionParticipation | null>
  setStopped(participationId: string, stoppedAt: Date): Promise<void>
  publishedQuestions(): Promise<RetentionRuntimeQuestion[]>
  signals(participationId: string): Promise<RetentionKnowledgeSignal[]>
  history(participationId: string): Promise<RetentionSelectionHistory[]>
  check(participationId: string, weekNumber: number): Promise<WeeklyCheckSnapshot | null>
  createCheck(input: { participation: RetentionParticipation; weekNumber: number; availableAt: Date; closesAt: Date; selected: Array<{ question: RetentionRuntimeQuestion; reason: 'PERSONAL' | 'CORE' | 'SPREAD' }> }): Promise<WeeklyCheckSnapshot>
  ownedCheck(userId: string, checkId: string): Promise<WeeklyCheckSnapshot | null>
  saveAnswer(input: { check: WeeklyCheckSnapshot; questionId: string; answer: string | string[]; correct: boolean; answeredAt: Date }): Promise<{ idempotent: boolean; check: WeeklyCheckSnapshot }>
  completeCheck(checkId: string, completedAt: Date): Promise<void>
  queueWeekReadyEmail(check: WeeklyCheckSnapshot): Promise<void>
  activeParticipations(): Promise<RetentionParticipation[]>
}

export async function optInToRetention(repository: RetentionRuntimeRepository, userId: string, explicitConsent: boolean, now = new Date()) {
  if (!explicitConsent) throw new Error('RETENTION_CONSENT_REQUIRED')
  const enrollment = await repository.eligibleEnrollment(userId)
  if (!enrollment) throw new Error('RETENTION_NOT_ELIGIBLE')
  const program = await repository.publishedProgram()
  if (!program) throw new Error('RETENTION_PROGRAM_NOT_AVAILABLE')
  const existing = await repository.participation(enrollment.id, program.id)
  if (existing) return existing
  return repository.createParticipation({ userId, enrollmentId: enrollment.id, programVersionId: program.id, consentVersion: program.consentVersion, now })
}

export async function ensureWeeklyCheck(repository: RetentionRuntimeRepository, userId: string, participationId: string, weekNumber: number, now = new Date()) {
  const participation = await repository.ownedParticipation(userId, participationId)
  if (!participation || participation.status === 'STOPPED' || participation.stoppedAt) throw new Error('RETENTION_PARTICIPATION_NOT_AVAILABLE')
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 12) throw new Error('INVALID_RETENTION_WEEK')
  const existing = await repository.check(participation.id, weekNumber)
  if (existing) return existing
  const currentWeek = getCurrentRetentionWeek(participation.startedAt, now)
  const window = getRetentionWeekWindow(participation.startedAt, weekNumber)
  const closeAt = new Date(participation.startedAt.getTime() + (12 * 7 + 30) * 24 * 60 * 60 * 1000)
  if (!currentWeek || weekNumber > currentWeek || now < window.availableAt || now >= closeAt) throw new Error('RETENTION_WEEK_NOT_AVAILABLE')
  const [questions, signals, history] = await Promise.all([
    repository.publishedQuestions(), repository.signals(participation.id), repository.history(participation.id),
  ])
  const selected = selectRetentionWeekQuestions({
    questions: questions.map(({ question }) => question), weekNumber, participationKey: participation.id,
    participationStatus: participation.status, knowledgeSignals: signals, history,
  })
  const byIdentity = new Map(questions.map((item) => [`${item.question.code}:v${item.question.questionVersion}`, item]))
  return repository.createCheck({
    participation, weekNumber, availableAt: window.availableAt, closesAt: closeAt,
    selected: selected.map(({ question, reason }) => {
      const record = byIdentity.get(`${question.code}:v${question.questionVersion}`)
      if (!record) throw new Error('RETENTION_QUESTION_VERSION_NOT_FOUND')
      return { question: record, reason }
    }),
  })
}

export async function getRetentionCheckReadModel(repository: RetentionRuntimeRepository, userId: string, checkId: string) {
  const check = await repository.ownedCheck(userId, checkId)
  if (!check) return null
  const answers = new Map(check.answers.map((answer) => [answer.weeklyQuestionId, answer]))
  const questions = check.questions.map((assignment) => {
    const answer = answers.get(assignment.id)
    return {
      id: assignment.id, position: assignment.position, answered: Boolean(answer),
      presentation: presentRetentionQuestion(assignment.question.question, answer?.answer ?? null),
    }
  })
  const correct = check.answers.filter((answer) => answer.correct).length
  const areas = new Map<string, { correct: number; total: number; chapters: Set<number> }>()
  for (const assignment of check.questions) {
    const area = assignment.question.question.knowledgeArea
    const item = areas.get(area) ?? { correct: 0, total: 0, chapters: new Set<number>() }
    item.total += 1
    item.chapters.add(assignment.question.question.chapterNumber)
    if (answers.get(assignment.id)?.correct) item.correct += 1
    areas.set(area, item)
  }
  const ranked = [...areas.entries()].sort(([aName, a], [bName, b]) => a.correct / a.total - b.correct / b.total || aName.localeCompare(bName, 'nl'))
  const attentionAreas = ranked.filter(([, value]) => value.correct < value.total).slice(0, 3).map(([name]) => name)
  const strongAreas = ranked.filter(([, value]) => value.correct === value.total).slice(-3).reverse().map(([name]) => name)
  return {
    id: check.id, weekNumber: check.weekNumber, completedAt: check.completedAt, answeredCount: check.answers.length,
    currentPosition: questions.find((question) => !question.answered)?.position ?? null,
    questions, result: check.completedAt ? { title: 'Kennischeck afgerond', score: `${correct} van 5 goed`, correct, maxScore: 5, strongAreas, attentionAreas } : null,
  }
}

export async function answerRetentionQuestion(repository: RetentionRuntimeRepository, input: { userId: string; checkId: string; weeklyQuestionId: string; answer: unknown; now?: Date }) {
  const now = input.now ?? new Date()
  const check = await repository.ownedCheck(input.userId, input.checkId)
  if (!check) throw new Error('RETENTION_CHECK_NOT_FOUND')
  const assignment = check.questions.find((item) => item.id === input.weeklyQuestionId)
  if (!assignment) throw new Error('RETENTION_QUESTION_NOT_IN_CHECK')
  const participation = await repository.ownedParticipation(input.userId, check.participationId)
  if (!participation) throw new Error('RETENTION_PARTICIPATION_NOT_AVAILABLE')
  const existing = check.answers.find((answer) => answer.weeklyQuestionId === assignment.id)
  if (existing) {
    const normalized = Array.isArray(input.answer) ? [...input.answer].sort() : input.answer
    const prior = Array.isArray(existing.answer) ? [...existing.answer].sort() : existing.answer
    if (JSON.stringify(normalized) !== JSON.stringify(prior)) throw new Error('RETENTION_ANSWER_ALREADY_FINAL')
    return { idempotent: true, correct: existing.correct, feedback: evaluateRetentionAnswer(assignment.question.question, existing.answer).explanation }
  }
  const answeredCount = check.answers.length
  if (check.completedAt || !canAnswerRetentionQuestion({ startedAt: participation.startedAt, weekNumber: check.weekNumber, stoppedAt: participation.stoppedAt, answeredCount, now, closesAt: check.closesAt })) {
    throw new Error('RETENTION_CHECK_CLOSED')
  }
  if (!isRetentionAnswerShapeValid(assignment.question.question, input.answer)) throw new Error('INVALID_RETENTION_ANSWER')
  const normalizedAnswer = Array.isArray(input.answer) ? [...input.answer].sort() : input.answer as string
  const evaluation = evaluateRetentionAnswer(assignment.question.question, normalizedAnswer)
  const saved = await repository.saveAnswer({ check, questionId: assignment.id, answer: normalizedAnswer, correct: evaluation.isCorrect, answeredAt: now })
  if (saved.check.answers.length === 5) await repository.completeCheck(check.id, now)
  return { idempotent: saved.idempotent, correct: evaluation.isCorrect, feedback: evaluation.explanation, progress: { answered: saved.check.answers.length, total: 5, completed: saved.check.answers.length === 5 } }
}

export async function stopRetention(repository: RetentionRuntimeRepository, userId: string, participationId: string, now = new Date()) {
  const participation = await repository.ownedParticipation(userId, participationId)
  if (!participation) throw new Error('RETENTION_PARTICIPATION_NOT_FOUND')
  if (participation.status === 'STOPPED' || participation.stoppedAt) return { stopped: true, idempotent: true }
  await repository.setStopped(participation.id, now)
  return { stopped: true, idempotent: false }
}

export async function runRetentionMaintenance(repository: RetentionRuntimeRepository, now = new Date()) {
  const report = { checksCreated: 0, mailIntentsCreated: 0, stoppedSkipped: 0 }
  for (const participation of await repository.activeParticipations()) {
    const currentWeek = getCurrentRetentionWeek(participation.startedAt, now)
    if (!currentWeek || participation.status === 'STOPPED' || participation.stoppedAt) { report.stoppedSkipped++; continue }
    const weeks = Array.from({ length: currentWeek }, (_, index) => index + 1)
    for (const weekNumber of weeks) {
      const existed = await repository.check(participation.id, weekNumber)
      const check = existed ?? await ensureWeeklyCheck(repository, participation.userId, participation.id, weekNumber, now)
      if (!existed) report.checksCreated++
      if (weekNumber === currentWeek && !existed && await repository.check(participation.id, weekNumber)) {
        await repository.queueWeekReadyEmail(check)
        report.mailIntentsCreated++
      }
    }
  }
  return report
}

export function getRetentionRuntimeWeek(startedAt: Date, weekNumber: number) { return getRetentionWeekWindow(startedAt, weekNumber) }

export function buildRetentionResult(items: Parameters<typeof scoreAnnualRetentionCheck>[0]) {
  return scoreAnnualRetentionCheck(items)
}
