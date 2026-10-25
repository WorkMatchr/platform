import { beforeEach, describe, expect, it } from 'vitest'
import { learningRetentionQuestions } from './learning-retention-content'
import { answerRetentionQuestion, ensureWeeklyCheck, getRetentionCheckReadModel, optInToRetention, runRetentionMaintenance, stopRetention, type RetentionParticipation, type RetentionRuntimeQuestion, type RetentionRuntimeRepository, type WeeklyCheckSnapshot } from './learning-retention-runtime-core'
import type { RetentionKnowledgeSignal, RetentionSelectionHistory } from './learning-retention-selector'

class MemoryRetentionRepository implements RetentionRuntimeRepository {
  eligible = true
  available = true
  program = { id: 'program-1', consentVersion: 'CONSENT-1' }
  person: RetentionParticipation | null = null
  bank: RetentionRuntimeQuestion[] = learningRetentionQuestions.map((question, index) => ({ id: `rq-${index}`, question: { ...question, status: 'PUBLISHED', learningQuestionStatus: 'PUBLISHED_PROTOTYPE' } }))
  checks: WeeklyCheckSnapshot[] = []
  signalRows: RetentionKnowledgeSignal[] = []
  mailKeys = new Set<string>()
  async eligibleEnrollment(userId: string) { return this.eligible ? { id: 'enrollment-1', userId } : null }
  async publishedProgram() { return this.available ? this.program : null }
  async participation() { return this.person }
  async createParticipation(input: { userId: string; enrollmentId: string; programVersionId: string; consentVersion: string; now: Date }) {
    this.person = { id: 'participant-1', userId: input.userId, enrollmentId: input.enrollmentId, startedAt: input.now, stoppedAt: null, status: 'ACTIVE', consentVersion: input.consentVersion, consentedAt: input.now }
    return this.person
  }
  async ownedParticipation(userId: string, participationId: string) { return this.person?.userId === userId && this.person.id === participationId ? this.person : null }
  async setStopped(_id: string, stoppedAt: Date) { if (this.person) this.person = { ...this.person, status: 'STOPPED', stoppedAt } }
  async publishedQuestions() { return this.bank }
  async signals() { return this.signalRows }
  async history(participationId: string): Promise<RetentionSelectionHistory[]> {
    return this.checks.filter((check) => check.participationId === participationId).flatMap((check) => check.questions.map((question) => ({ questionCode: question.question.question.code, lastPresentedWeek: check.weekNumber })))
  }
  async check(participationId: string, weekNumber: number) { return this.checks.find((check) => check.participationId === participationId && check.weekNumber === weekNumber) ?? null }
  async createCheck(input: { participation: RetentionParticipation; weekNumber: number; availableAt: Date; closesAt: Date; selected: Array<{ question: RetentionRuntimeQuestion; reason: 'PERSONAL' | 'CORE' | 'SPREAD' }> }) {
    const existing = await this.check(input.participation.id, input.weekNumber)
    if (existing) return existing
    const check: WeeklyCheckSnapshot = { id: `check-${input.weekNumber}`, userId: input.participation.userId, participationId: input.participation.id, weekNumber: input.weekNumber, availableAt: input.availableAt, closesAt: input.closesAt, completedAt: null, questions: input.selected.map((item, index) => ({ id: `assignment-${input.weekNumber}-${index + 1}`, position: index + 1, reason: item.reason, question: item.question })), answers: [] }
    this.checks.push(check)
    return check
  }
  async ownedCheck(userId: string, checkId: string) { return this.checks.find((check) => check.id === checkId && check.userId === userId) ?? null }
  async saveAnswer(input: { check: WeeklyCheckSnapshot; questionId: string; answer: string | string[]; correct: boolean; answeredAt: Date }) {
    const check = this.checks.find((item) => item.id === input.check.id)!
    const old = check.answers.find((answer) => answer.weeklyQuestionId === input.questionId)
    if (old) return { idempotent: true, check }
    check.answers.push({ weeklyQuestionId: input.questionId, answer: input.answer, correct: input.correct, answeredAt: input.answeredAt })
    return { idempotent: false, check }
  }
  async completeCheck(checkId: string, completedAt: Date) { const check = this.checks.find((item) => item.id === checkId); if (check) check.completedAt = completedAt }
  async queueWeekReadyEmail(check: WeeklyCheckSnapshot) { this.mailKeys.add(`${check.participationId}:${check.weekNumber}`) }
  async activeParticipations() { return this.person ? [this.person] : [] }
}

const start = new Date('2026-01-01T12:00:00.000Z')
let repo: MemoryRetentionRepository

beforeEach(() => { repo = new MemoryRetentionRepository() })

describe('retention vertical slice orchestration', () => {
  it('requires explicit consent and eligibility, stores consent version, and duplicate opt-in returns the same participation', async () => {
    await expect(optInToRetention(repo, 'user-1', false, start)).rejects.toThrow('RETENTION_CONSENT_REQUIRED')
    repo.eligible = false
    await expect(optInToRetention(repo, 'user-1', true, start)).rejects.toThrow('RETENTION_NOT_ELIGIBLE')
    repo.eligible = true
    const first = await optInToRetention(repo, 'user-1', true, start)
    const retry = await optInToRetention(repo, 'user-1', true, start)
    expect(first).toMatchObject({ status: 'ACTIVE', consentedAt: start, startedAt: start, consentVersion: 'CONSENT-1' })
    expect(retry.id).toBe(first.id)
  })

  it('creates a persistent five-question week 1 once and blocks a future week', async () => {
    const participant = await optInToRetention(repo, 'user-1', true, start)
    const first = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    const again = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    expect(first.id).toBe(again.id)
    expect(first.questions).toHaveLength(5)
    expect(new Set(first.questions.map((question) => question.question.question.code)).size).toBe(5)
    await expect(ensureWeeklyCheck(repo, 'user-1', participant.id, 2, start)).rejects.toThrow('RETENTION_WEEK_NOT_AVAILABLE')
  })

  it('does not leak answer keys before submission and gives feedback only after an immutable server answer', async () => {
    const participant = await optInToRetention(repo, 'user-1', true, start)
    const check = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    const question = check.questions.find((item) => item.question.question.type === 'SINGLE_CHOICE')!
    const before = await getRetentionCheckReadModel(repo, 'user-1', check.id)
    expect(JSON.stringify(before)).not.toMatch(/correctAnswer|isCorrect|isCorrectOption/)
    const correct = question.question.question.correctAnswer[0]!
    const saved = await answerRetentionQuestion(repo, { userId: 'user-1', checkId: check.id, weeklyQuestionId: question.id, answer: correct, now: start })
    expect(saved).toMatchObject({ correct: true, progress: { answered: 1, total: 5, completed: false } })
    expect(saved.feedback).toBeTruthy()
    const retry = await answerRetentionQuestion(repo, { userId: 'user-1', checkId: check.id, weeklyQuestionId: question.id, answer: correct, now: start })
    expect(retry.idempotent).toBe(true)
    await expect(answerRetentionQuestion(repo, { userId: 'user-1', checkId: check.id, weeklyQuestionId: question.id, answer: 'bad-option', now: start })).rejects.toThrow('RETENTION_ANSWER_ALREADY_FINAL')
    await expect(answerRetentionQuestion(repo, { userId: 'other-user', checkId: check.id, weeklyQuestionId: question.id, answer: correct, now: start })).rejects.toThrow('RETENTION_CHECK_NOT_FOUND')
  })

  it('scores multi-select as exact set only and completes with X/5 plus area result', async () => {
    const participant = await optInToRetention(repo, 'user-1', true, start)
    const check = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    const multiPosition = check.questions.find((item) => item.question.question.type === 'MULTI_CHOICE')?.position
    for (const assignment of check.questions) {
      const question = assignment.question.question
      const answer = question.type === 'MULTI_CHOICE'
        ? assignment.position === multiPosition ? [question.options.find((option) => !question.correctAnswer.includes(option.value))!.value] : question.correctAnswer
        : question.correctAnswer[0]!
      await answerRetentionQuestion(repo, { userId: 'user-1', checkId: check.id, weeklyQuestionId: assignment.id, answer, now: start })
    }
    const result = await getRetentionCheckReadModel(repo, 'user-1', check.id)
    expect(result?.result).toMatchObject({ title: 'Kennischeck afgerond', score: '4 van 5 goed', correct: 4, maxScore: 5 })
    expect(result?.answeredCount).toBe(5)
  })

  it('resumes at the first unanswered question, adapts next week using performance, and idempotently queues only the current-week mail', async () => {
    const participant = await optInToRetention(repo, 'user-1', true, start)
    const week1 = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    for (const assignment of week1.questions.slice(0, 2)) {
      const question = assignment.question.question
      const wrong = question.options.find((option) => !question.correctAnswer.includes(option.value))!
      await answerRetentionQuestion(repo, { userId: 'user-1', checkId: week1.id, weeklyQuestionId: assignment.id, answer: question.type === 'MULTI_CHOICE' ? [wrong.value] : wrong.value, now: start })
    }
    const resumed = await getRetentionCheckReadModel(repo, 'user-1', week1.id)
    expect(resumed?.currentPosition).toBe(3)
    expect(resumed?.questions.slice(0, 2).every((question) => question.presentation.feedback)).toBe(true)
    repo.signalRows = [{ knowledgeArea: week1.questions[0]!.question.question.knowledgeArea, examQuestionCount: 0, examIncorrectCount: 0, retentionAttemptCount: 1, retentionIncorrectCount: 1 }]
    const nextTime = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    const schedule1 = await runRetentionMaintenance(repo, nextTime)
    const schedule2 = await runRetentionMaintenance(repo, nextTime)
    expect(schedule1.checksCreated).toBe(1)
    expect(schedule1.mailIntentsCreated).toBe(1)
    expect(schedule2.checksCreated).toBe(0)
    expect(repo.mailKeys).toEqual(new Set([`${participant.id}:2`]))
    const week2 = await ensureWeeklyCheck(repo, 'user-1', participant.id, 2, nextTime)
    expect(week2.questions).toHaveLength(5)
    expect(week2.questions.map((item) => item.question.question.code).length).toBe(5)
  })

  it('stopping is idempotent, prevents future checks and leaves already saved history readable', async () => {
    const participant = await optInToRetention(repo, 'user-1', true, start)
    const check = await ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)
    await stopRetention(repo, 'user-1', participant.id, start)
    expect(await stopRetention(repo, 'user-1', participant.id, start)).toMatchObject({ stopped: true, idempotent: true })
    await expect(ensureWeeklyCheck(repo, 'user-1', participant.id, 1, start)).rejects.toThrow('RETENTION_PARTICIPATION_NOT_AVAILABLE')
    expect(await getRetentionCheckReadModel(repo, 'user-1', check.id)).not.toBeNull()
  })
})
