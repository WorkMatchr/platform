import type { RetentionQuestion } from './learning-retention-content'
import { isRetentionQuestionSelectable } from './learning-retention-publication'

export const LEARNING_RETENTION_SELECTION_POLICY_VERSION = 'WL-001-RETENTION-SELECT-1.0'
export const LEARNING_RETENTION_ANNUAL_SELECTION_POLICY_VERSION = 'WL-001-ANNUAL-CHECK-SELECT-1.0'
export const LEARNING_RETENTION_ANNUAL_QUESTION_COUNT = 10

export type RetentionKnowledgeSignal = {
  knowledgeArea: string
  examQuestionCount: number
  examIncorrectCount: number
  retentionAttemptCount: number
  retentionIncorrectCount: number
}

export type RetentionSelectionHistory = {
  questionCode: string
  lastPresentedWeek: number | null
}

export type RetentionSelection = {
  question: RetentionQuestion
  reason: 'PERSONAL' | 'CORE' | 'SPREAD'
}

type SelectorInput = {
  questions: RetentionQuestion[]
  weekNumber: number
  participationKey: string
  participationStatus: 'ACTIVE' | 'STOPPED' | 'COMPLETED'
  knowledgeSignals: RetentionKnowledgeSignal[]
  history: RetentionSelectionHistory[]
  presentedChapterCounts?: Record<number, number>
}

const RECENCY_GUARD_WEEKS = 4
const SLOT_REASONS = ['PERSONAL', 'CORE', 'SPREAD', 'PERSONAL', 'CORE'] as const

function stableHash(value: string) {
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return hash >>> 0
}

function weaknessScore(signal: RetentionKnowledgeSignal | undefined) {
  if (!signal) return 0
  const examRate = signal.examQuestionCount > 0
    ? signal.examIncorrectCount / signal.examQuestionCount
    : 0
  const retentionRate = signal.retentionAttemptCount > 0
    ? signal.retentionIncorrectCount / signal.retentionAttemptCount
    : 0
  return Math.max(0, Math.min(1, examRate * 0.65 + retentionRate * 0.35))
}

function recencyScore(question: RetentionQuestion, weekNumber: number, lastPresentedWeek: number | null) {
  if (lastPresentedWeek === null) return 1
  const weeksSince = Math.max(0, weekNumber - lastPresentedWeek)
  return Math.min(1, weeksSince / RECENCY_GUARD_WEEKS)
}

function cognitiveFit(question: RetentionQuestion, weekNumber: number) {
  if (weekNumber >= 11) return question.cognitiveLevel === 'A' ? 1 : question.cognitiveLevel === 'T' ? 0.6 : 0.2
  return question.cognitiveLevel === 'A' ? 0.6 : question.cognitiveLevel === 'T' ? 1 : 0.65
}

function tieBreak(question: RetentionQuestion, participationKey: string, weekNumber: number) {
  return stableHash(`${participationKey}:${weekNumber}:${question.code}:v${question.questionVersion}`)
}

function sortBy(
  candidates: RetentionQuestion[],
  score: (question: RetentionQuestion) => number,
  input: SelectorInput,
  selected: Set<string>,
) {
  const signalByArea = new Map(input.knowledgeSignals.map((signal) => [signal.knowledgeArea, signal]))
  const chaptersPresented = Object.entries(input.presentedChapterCounts ?? {})
    .reduce<Record<number, number>>((result, [chapter, count]) => {
      result[Number(chapter)] = count
      return result
    }, {})
  return candidates
    .filter((question) => !selected.has(question.code))
    .sort((a, b) => {
      const areaA = weaknessScore(signalByArea.get(a.knowledgeArea))
      const areaB = weaknessScore(signalByArea.get(b.knowledgeArea))
      const coverageA = 1 / (1 + (chaptersPresented[a.chapterNumber] ?? 0))
      const coverageB = 1 / (1 + (chaptersPresented[b.chapterNumber] ?? 0))
      const totalA = score(a) + coverageA * 0.15 + cognitiveFit(a, input.weekNumber) * (input.weekNumber >= 11 ? 0.15 : 0)
      const totalB = score(b) + coverageB * 0.15 + cognitiveFit(b, input.weekNumber) * (input.weekNumber >= 11 ? 0.15 : 0)
      return totalB - totalA || areaB - areaA
        || tieBreak(a, input.participationKey, input.weekNumber) - tieBreak(b, input.participationKey, input.weekNumber)
    })
}

/**
 * Version 1 uses a transparent 2 personal + 2 core + 1 spread slot mix (40/40/20).
 * A four-week repeat guard is applied first and relaxed only if the remaining bank
 * cannot fill a slot. The result is deterministic for the same participant/week/input.
 */
export function selectRetentionWeekQuestions(input: SelectorInput): RetentionSelection[] {
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1 || input.weekNumber > 12) throw new Error('INVALID_RETENTION_WEEK')
  if (!input.participationKey) throw new Error('MISSING_RETENTION_PARTICIPATION_KEY')
  // COMPLETED programs may still need deterministic catch-up checks inside the
  // 30-day close window. STOPPED participation can never create more checks.
  if (input.participationStatus === 'STOPPED') throw new Error('RETENTION_PARTICIPATION_NOT_ACTIVE')
  if (input.questions.length < SLOT_REASONS.length) throw new Error('RETENTION_BANK_TOO_SMALL')
  const byCode = new Map(input.questions.map((question) => [question.code, question]))
  if (byCode.size !== input.questions.length) throw new Error('DUPLICATE_RETENTION_QUESTION')
  if (input.questions.some((question) => !isRetentionQuestionSelectable({ retentionStatus: question.status, learningQuestionStatus: question.learningQuestionStatus }))) throw new Error('RETENTION_QUESTION_NOT_PUBLISHED')
  const historyByCode = new Map(input.history.map((entry) => [entry.questionCode, entry]))
  const selected = new Set<string>()
  const result: RetentionSelection[] = []
  const recentCodes = new Set(input.history
    .filter((entry) => entry.lastPresentedWeek !== null && input.weekNumber - entry.lastPresentedWeek < RECENCY_GUARD_WEEKS)
    .map((entry) => entry.questionCode))

  for (const reason of SLOT_REASONS) {
    const remaining = input.questions.filter((question) => !selected.has(question.code))
    let candidates = remaining.filter((question) => !recentCodes.has(question.code))
    if (candidates.length === 0) candidates = remaining
    if (candidates.length === 0) throw new Error('RETENTION_QUESTION_SELECTION_EXHAUSTED')
    const score = (question: RetentionQuestion) => {
      const signal = input.knowledgeSignals.find((entry) => entry.knowledgeArea === question.knowledgeArea)
      const personal = weaknessScore(signal)
      const recent = recencyScore(question, input.weekNumber, historyByCode.get(question.code)?.lastPresentedWeek ?? null)
      const coverage = question.criticalConcept ? 1 : 0.45
      const cognitive = cognitiveFit(question, input.weekNumber)
      if (reason === 'PERSONAL') {
        const examEmphasis = input.weekNumber <= 2 ? 1.35 : input.weekNumber <= 10 ? 1 : 0.75
        return personal * examEmphasis + coverage * 0.08 + recent * 0.12
      }
      if (reason === 'CORE') return coverage * 0.7 + personal * 0.12 + recent * 0.18 + cognitive * (input.weekNumber >= 11 ? 0.25 : 0)
      return recent * 0.78 + personal * 0.08 + coverage * 0.14 + cognitive * (input.weekNumber >= 11 ? 0.25 : 0)
    }
    const chosen = sortBy(candidates, score, input, selected)[0]
    if (!chosen) throw new Error('RETENTION_QUESTION_SELECTION_EXHAUSTED')
    selected.add(chosen.code)
    result.push({ question: chosen, reason })
  }
  return result
}

export function getRetentionQuestionWeakness(question: RetentionQuestion, signals: RetentionKnowledgeSignal[]) {
  return weaknessScore(signals.find((signal) => signal.knowledgeArea === question.knowledgeArea))
}

/**
 * A yearly check is a broad review, not an adaptive retest. It takes exactly
 * one published retention item from each H1–H10 chapter; weakness only lightly
 * affects which item is chosen within a chapter. The reminder key makes the
 * persisted selection reproducible before it is attached to an AnnualCheck.
 */
export function selectRetentionAnnualQuestions(input: {
  questions: RetentionQuestion[]
  reminderKey: string
  knowledgeSignals: RetentionKnowledgeSignal[]
}) {
  if (!input.reminderKey.trim()) throw new Error('MISSING_ANNUAL_REMINDER_KEY')
  if (input.questions.length < LEARNING_RETENTION_ANNUAL_QUESTION_COUNT) throw new Error('RETENTION_BANK_TOO_SMALL')
  const byCode = new Map(input.questions.map((question) => [question.code, question]))
  if (byCode.size !== input.questions.length) throw new Error('DUPLICATE_RETENTION_QUESTION')
  if (input.questions.some((question) => !isRetentionQuestionSelectable({ retentionStatus: question.status, learningQuestionStatus: question.learningQuestionStatus }))) throw new Error('RETENTION_QUESTION_NOT_PUBLISHED')
  const selected: RetentionQuestion[] = []
  for (let chapterNumber = 1; chapterNumber <= LEARNING_RETENTION_ANNUAL_QUESTION_COUNT; chapterNumber += 1) {
    const candidates = input.questions.filter((question) => question.chapterNumber === chapterNumber)
    if (candidates.length === 0) throw new Error(`RETENTION_CHAPTER_${chapterNumber}_NOT_COVERED`)
    candidates.sort((a, b) => {
      const weaknessA = weaknessScore(input.knowledgeSignals.find((signal) => signal.knowledgeArea === a.knowledgeArea))
      const weaknessB = weaknessScore(input.knowledgeSignals.find((signal) => signal.knowledgeArea === b.knowledgeArea))
      // Personal performance is a small within-chapter tie-breaker; it can
      // never remove a chapter from this deliberately broad annual check.
      const scoreA = weaknessA * 0.2 + (a.criticalConcept ? 0.05 : 0)
      const scoreB = weaknessB * 0.2 + (b.criticalConcept ? 0.05 : 0)
      return scoreB - scoreA || stableHash(`${input.reminderKey}:${chapterNumber}:${a.code}:v${a.questionVersion}`)
        - stableHash(`${input.reminderKey}:${chapterNumber}:${b.code}:v${b.questionVersion}`)
    })
    selected.push(candidates[0]!)
  }
  return selected
}
