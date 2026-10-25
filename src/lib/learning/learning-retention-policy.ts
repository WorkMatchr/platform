import type { RetentionQuestion } from './learning-retention-content'

export const RETENTION_DURATION_WEEKS = 12
export const RETENTION_QUESTIONS_PER_WEEK = 5
export const RETENTION_OPEN_AFTER_PROGRAM_DAYS = 30
export const RETENTION_WEEK_MS = 7 * 24 * 60 * 60 * 1000
export const RETENTION_DAY_MS = 24 * 60 * 60 * 1000

export type RetentionWeekState = 'SCHEDULED' | 'AVAILABLE' | 'COMPLETED' | 'MISSED' | 'PARTIAL_EXPIRED'

export function getRetentionWeekWindow(startedAt: Date, weekNumber: number) {
  if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > RETENTION_DURATION_WEEKS) {
    throw new Error('INVALID_RETENTION_WEEK')
  }
  const programEndsAt = new Date(startedAt.getTime() + RETENTION_DURATION_WEEKS * RETENTION_WEEK_MS)
  return {
    availableAt: new Date(startedAt.getTime() + (weekNumber - 1) * RETENTION_WEEK_MS),
    programEndsAt,
    closesAt: new Date(programEndsAt.getTime() + RETENTION_OPEN_AFTER_PROGRAM_DAYS * RETENTION_DAY_MS),
  }
}

export function getRetentionParticipationStatus(startedAt: Date, stoppedAt: Date | null, now: Date) {
  if (stoppedAt) return 'STOPPED' as const
  return now.getTime() >= startedAt.getTime() + RETENTION_DURATION_WEEKS * RETENTION_WEEK_MS
    ? 'COMPLETED' as const
    : 'ACTIVE' as const
}

export function getRetentionWeeksToEnsure(startedAt: Date, stoppedAt: Date | null, now: Date) {
  if (stoppedAt || now.getTime() >= getRetentionWeekWindow(startedAt, 1).closesAt.getTime()) return []
  return Array.from({ length: RETENTION_DURATION_WEEKS }, (_, index) => index + 1)
    .filter((week) => getRetentionWeekWindow(startedAt, week).availableAt.getTime() <= now.getTime())
}

export function getCurrentRetentionWeek(startedAt: Date, now: Date) {
  const elapsed = now.getTime() - startedAt.getTime()
  if (elapsed < 0 || elapsed >= RETENTION_DURATION_WEEKS * RETENTION_WEEK_MS) return null
  return Math.floor(elapsed / RETENTION_WEEK_MS) + 1
}

export function shouldQueueRetentionWeekReadyEmail(input: {
  startedAt: Date
  weekNumber: number
  stoppedAt: Date | null
  now: Date
}) {
  return input.stoppedAt === null && getCurrentRetentionWeek(input.startedAt, input.now) === input.weekNumber
}

export function getRetentionWeekState(input: {
  startedAt: Date
  weekNumber: number
  answeredCount: number
  now: Date
}): RetentionWeekState {
  if (!Number.isInteger(input.answeredCount) || input.answeredCount < 0 || input.answeredCount > RETENTION_QUESTIONS_PER_WEEK) {
    throw new Error('INVALID_RETENTION_ANSWER_COUNT')
  }
  const window = getRetentionWeekWindow(input.startedAt, input.weekNumber)
  if (input.answeredCount === RETENTION_QUESTIONS_PER_WEEK) return 'COMPLETED'
  if (input.now.getTime() < window.availableAt.getTime()) return 'SCHEDULED'
  if (input.now.getTime() >= window.closesAt.getTime()) {
    return input.answeredCount === 0 ? 'MISSED' : 'PARTIAL_EXPIRED'
  }
  return 'AVAILABLE'
}

export function canAnswerRetentionQuestion(input: {
  startedAt: Date
  weekNumber: number
  stoppedAt: Date | null
  answeredCount: number
  now: Date
  closesAt?: Date
}) {
  return input.stoppedAt === null
    && input.answeredCount < RETENTION_QUESTIONS_PER_WEEK
    && input.now.getTime() >= getRetentionWeekWindow(input.startedAt, input.weekNumber).availableAt.getTime()
    && input.now.getTime() < (input.closesAt ?? getRetentionWeekWindow(input.startedAt, input.weekNumber).closesAt).getTime()
}

export function addCalendarYear(date: Date) {
  const result = new Date(date)
  const year = result.getUTCFullYear() + 1
  const month = result.getUTCMonth()
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCFullYear(year)
  result.setUTCMonth(month)
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDayOfTargetMonth))
  return result
}

export function isRetentionAnswerShapeValid(question: RetentionQuestion, answer: unknown) {
  const allowed = new Set(question.options.map((option) => option.value))
  if (question.type === 'SINGLE_CHOICE') return typeof answer === 'string' && allowed.has(answer)
  return Array.isArray(answer) && answer.length > 0 && answer.length <= question.options.length &&
    answer.every((value) => typeof value === 'string' && allowed.has(value)) && new Set(answer).size === answer.length
}

export type RetentionAnswerFeedback = {
  isCorrect: boolean
  selectedCorrectOptions: string[]
  missedCorrectOptions: string[]
  selectedIncorrectOptions: string[]
  explanation: string
}

export function evaluateRetentionAnswer(question: RetentionQuestion, answer: string | string[]): RetentionAnswerFeedback {
  if (!isRetentionAnswerShapeValid(question, answer)) throw new Error('INVALID_RETENTION_ANSWER')
  const selected = new Set(Array.isArray(answer) ? answer : [answer])
  const correct = new Set(question.correctAnswer)
  return {
    isCorrect: selected.size === correct.size && [...selected].every((value) => correct.has(value)),
    selectedCorrectOptions: [...selected].filter((value) => correct.has(value)),
    missedCorrectOptions: [...correct].filter((value) => !selected.has(value)),
    selectedIncorrectOptions: [...selected].filter((value) => !correct.has(value)),
    explanation: selected.size === correct.size && [...selected].every((value) => correct.has(value))
      ? question.correctFeedback
      : question.incorrectFeedback,
  }
}

export function canRevealRetentionFeedback(answeredAt: Date | null) {
  return answeredAt !== null
}

export function presentRetentionQuestion(question: RetentionQuestion, finalAnswer: string | string[] | null = null) {
  const feedback = finalAnswer === null ? null : evaluateRetentionAnswer(question, finalAnswer)
  const selected = new Set(finalAnswer === null ? [] : Array.isArray(finalAnswer) ? finalAnswer : [finalAnswer])
  return {
    code: question.code,
    chapterNumber: question.chapterNumber,
    knowledgeArea: question.knowledgeArea,
    type: question.type,
    questionText: question.questionText,
    multiSelectInstruction: question.type === 'MULTI_CHOICE'
      ? 'Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.'
      : null,
    options: question.options.map(({ value, text, isCorrect }) => ({
      value,
      text,
      selected: selected.has(value),
      ...(feedback && (selected.has(value) || isCorrect)
        ? { review: selected.has(value) ? (isCorrect ? 'CORRECT' as const : 'INCORRECT' as const) : 'MISSED' as const }
        : {}),
    })),
    feedback: feedback ? {
      isCorrect: feedback.isCorrect,
      label: feedback.isCorrect ? 'Goed' as const : 'Niet helemaal' as const,
      explanation: feedback.explanation,
      missedCorrectOptions: feedback.missedCorrectOptions,
      selectedIncorrectOptions: feedback.selectedIncorrectOptions,
    } : null,
  }
}

export type AnnualRetentionResultItem = {
  position: number
  chapterNumber: number
  chapterTitle: string
  chapterSlug: string
  knowledgeArea: string
  correct: boolean
}

export function scoreAnnualRetentionCheck(items: AnnualRetentionResultItem[]) {
  if (items.length !== 10 || new Set(items.map((item) => item.position)).size !== 10
    || new Set(items.map((item) => item.chapterNumber)).size !== 10
    || items.some((item) => !Number.isInteger(item.position) || item.position < 1 || item.position > 10
      || !Number.isInteger(item.chapterNumber) || item.chapterNumber < 1 || item.chapterNumber > 10)) {
    throw new Error('INVALID_ANNUAL_RETENTION_CHECK')
  }
  const score = items.filter((item) => item.correct).length
  const areas = new Map<string, { correct: number; total: number; chapters: Map<string, string> }>()
  for (const item of items) {
    const entry = areas.get(item.knowledgeArea) ?? { correct: 0, total: 0, chapters: new Map<string, string>() }
    entry.total += 1
    if (item.correct) entry.correct += 1
    entry.chapters.set(item.chapterTitle, item.chapterSlug)
    areas.set(item.knowledgeArea, entry)
  }
  const ranked = [...areas.entries()].sort(([areaA, a], [areaB, b]) =>
    (a.correct / a.total) - (b.correct / b.total) || areaA.localeCompare(areaB, 'nl'),
  )
  const attention = ranked.filter(([, result]) => result.correct < result.total).slice(0, 3)
  const strong = ranked.filter(([, result]) => result.correct === result.total).slice(-3).reverse()
  return {
    score,
    maxScore: 10 as const,
    interpretation: 'Deze korte kennischeck geeft u een momentopname van wat u zich nu herinnert.',
    strongAreas: strong.map(([knowledgeArea]) => knowledgeArea),
    attentionAreas: attention.map(([knowledgeArea]) => knowledgeArea),
    chapterLinks: attention.flatMap(([knowledgeArea, result]) => [...result.chapters.entries()].map(([chapterTitle, chapterSlug]) => ({
      knowledgeArea,
      chapterTitle,
      href: `/e-learnings/rie-in-de-praktijk/leren/${encodeURIComponent(chapterSlug)}`,
    }))),
  }
}

export function getNextRetentionQuestionPosition(questionCount: number, answeredPositions: number[]) {
  if (questionCount !== RETENTION_QUESTIONS_PER_WEEK && questionCount !== 10) throw new Error('INVALID_RETENTION_CHECK_SIZE')
  const answered = new Set(answeredPositions)
  for (let position = 1; position <= questionCount; position += 1) {
    if (!answered.has(position)) return position
  }
  return null
}
