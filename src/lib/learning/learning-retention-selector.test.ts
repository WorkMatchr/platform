import { describe, expect, it } from 'vitest'
import { learningRetentionQuestions, type RetentionQuestion } from './learning-retention-content'
import {
  getRetentionQuestionWeakness,
  LEARNING_RETENTION_ANNUAL_QUESTION_COUNT,
  LEARNING_RETENTION_SELECTION_POLICY_VERSION,
  selectRetentionAnnualQuestions,
  selectRetentionWeekQuestions,
  type RetentionKnowledgeSignal,
} from './learning-retention-selector'

const publishedBank = learningRetentionQuestions.map((question) => ({ ...question, status: 'PUBLISHED' as const }))
const input = (overrides: Partial<Parameters<typeof selectRetentionWeekQuestions>[0]> = {}) => ({
  questions: publishedBank,
  weekNumber: 1,
  participationKey: 'participation-test',
  participationStatus: 'ACTIVE' as const,
  knowledgeSignals: [],
  history: [],
  ...overrides,
})

describe('WL-001 retention selector v1', () => {
  it('selecteert vijf verschillende gepubliceerde retention-questionversions met 40/40/20 slotmix', () => {
    const selected = selectRetentionWeekQuestions(input())
    expect(LEARNING_RETENTION_SELECTION_POLICY_VERSION).toBe('WL-001-RETENTION-SELECT-1.0')
    expect(selected).toHaveLength(5)
    expect(selected.map((entry) => entry.reason)).toEqual(['PERSONAL', 'CORE', 'SPREAD', 'PERSONAL', 'CORE'])
    expect(new Set(selected.map((entry) => entry.question.code)).size).toBe(5)
    expect(selected.every((entry) => publishedBank.some((question) =>
      question.code === entry.question.code && question.questionVersion === entry.question.questionVersion,
    ))).toBe(true)
  })

  it('blijft reproduceerbaar voor dezelfde deelname, week en signalen', () => {
    const args = input({
      weekNumber: 6,
      knowledgeSignals: [{
        knowledgeArea: 'Verkeersveiligheid', examQuestionCount: 3, examIncorrectCount: 2,
        retentionAttemptCount: 2, retentionIncorrectCount: 1,
      }],
    })
    expect(selectRetentionWeekQuestions(args).map((item) => item.question.code))
      .toEqual(selectRetentionWeekQuestions(args).map((item) => item.question.code))
  })

  it('geeft een aantoonbaar zwak kennisgebied extra persoonlijke aandacht', () => {
    const weakAreaQuestion = publishedBank.find((question) => question.knowledgeArea === 'Verkeersveiligheid')!
    const signal: RetentionKnowledgeSignal = {
      knowledgeArea: weakAreaQuestion.knowledgeArea,
      examQuestionCount: 1,
      examIncorrectCount: 1,
      retentionAttemptCount: 1,
      retentionIncorrectCount: 1,
    }
    expect(getRetentionQuestionWeakness(weakAreaQuestion, [signal])).toBe(1)
    const selected = selectRetentionWeekQuestions(input({ knowledgeSignals: [signal] }))
    expect(selected.filter((item) => item.reason === 'PERSONAL').some((item) =>
      item.question.knowledgeArea === weakAreaQuestion.knowledgeArea,
    )).toBe(true)
  })

  it('houdt brede hoofdstukdekking en verhoogt application/analyse aan het einde', () => {
    const early = selectRetentionWeekQuestions(input({ weekNumber: 2 }))
    const late = selectRetentionWeekQuestions(input({ weekNumber: 12 }))
    expect(new Set([...early, ...late].map((item) => item.question.chapterNumber)).size).toBeGreaterThanOrEqual(4)
    expect(late.filter((item) => item.question.cognitiveLevel === 'A').length)
      .toBeGreaterThanOrEqual(early.filter((item) => item.question.cognitiveLevel === 'A').length)
  })

  it('voorkomt dezelfde vraag binnen vier weken en ontspant de guard alleen als nodig', () => {
    const recentHistory = publishedBank.slice(0, 95).map((question) => ({
      questionCode: question.code,
      lastPresentedWeek: 5,
    }))
    const selected = selectRetentionWeekQuestions(input({ weekNumber: 8, history: recentHistory }))
    expect(selected.every((item) => !recentHistory.some((entry) => entry.questionCode === item.question.code))).toBe(true)

    const impossibleHistory = publishedBank.slice(0, 100).map((question) => ({
      questionCode: question.code,
      lastPresentedWeek: 7,
    }))
    const fallback = selectRetentionWeekQuestions(input({ weekNumber: 8, history: impossibleHistory }))
    expect(fallback).toHaveLength(5)
    expect(new Set(fallback.map((item) => item.question.code)).size).toBe(5)
  })

  it('weigert selectie voor gestopte deelname maar ondersteunt catch-up na programmavoltooiing', () => {
    expect(() => selectRetentionWeekQuestions(input({ participationStatus: 'STOPPED' })))
      .toThrow('RETENTION_PARTICIPATION_NOT_ACTIVE')
    expect(selectRetentionWeekQuestions(input({ participationStatus: 'COMPLETED', weekNumber: 12 }))).toHaveLength(5)
    expect(() => selectRetentionWeekQuestions(input({ questions: publishedBank.slice(0, 4) })))
      .toThrow('RETENTION_BANK_TOO_SMALL')
  })

  it('past dezelfde publication policy toe op weekselectie en jaarselectie', () => {
    const wrongLearningStatus = publishedBank.map((question) => ({ ...question, learningQuestionStatus: 'DRAFT' as const }))
    expect(() => selectRetentionWeekQuestions(input({ questions: wrongLearningStatus }))).toThrow('RETENTION_QUESTION_NOT_PUBLISHED')
    expect(() => selectRetentionAnnualQuestions({ questions: wrongLearningStatus, reminderKey: 'draft-status', knowledgeSignals: [] }))
      .toThrow('RETENTION_QUESTION_NOT_PUBLISHED')
  })

  it('selecteert geen draftvraag, dubbele code of week buiten 1–12', () => {
    const draftBank: RetentionQuestion[] = [...publishedBank]
    draftBank[0] = { ...draftBank[0]!, status: 'DRAFT' }
    expect(() => selectRetentionWeekQuestions(input({ questions: draftBank })))
      .toThrow('RETENTION_QUESTION_NOT_PUBLISHED')
    expect(() => selectRetentionWeekQuestions(input({ questions: [...publishedBank, publishedBank[0]!] })))
      .toThrow('DUPLICATE_RETENTION_QUESTION')
    expect(() => selectRetentionWeekQuestions(input({ weekNumber: 13 })))
      .toThrow('INVALID_RETENTION_WEEK')
  })

  it('selecteert voor de jaarcheck exact tien gepubliceerde vragen met één vraag uit ieder hoofdstuk H1–H10', () => {
    const questions = selectRetentionAnnualQuestions({
      questions: publishedBank,
      reminderKey: 'annual-reminder-test',
      knowledgeSignals: [{ knowledgeArea: 'Deskundigheidsscope', examQuestionCount: 1, examIncorrectCount: 1, retentionAttemptCount: 0, retentionIncorrectCount: 0 }],
    })
    expect(LEARNING_RETENTION_ANNUAL_QUESTION_COUNT).toBe(10)
    expect(questions).toHaveLength(10)
    expect(questions.map((question) => question.chapterNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(new Set(questions.map((question) => question.code)).size).toBe(10)
    expect(questions.every((question) => question.status === 'PUBLISHED')).toBe(true)
  })

  it('houdt de jaarcheck breed en reproduceerbaar; zwaktes wegen alleen binnen de hoofdstukdekking', () => {
    const args = { questions: publishedBank, reminderKey: 'annual-reminder-stable', knowledgeSignals: [] }
    const first = selectRetentionAnnualQuestions(args)
    expect(selectRetentionAnnualQuestions(args).map((question) => question.code)).toEqual(first.map((question) => question.code))
    const concentratedWeakness = selectRetentionAnnualQuestions({
      ...args,
      knowledgeSignals: [{ knowledgeArea: 'Deskundigheidsscope', examQuestionCount: 1, examIncorrectCount: 1, retentionAttemptCount: 0, retentionIncorrectCount: 0 }],
    })
    expect(concentratedWeakness.map((question) => question.chapterNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(() => selectRetentionAnnualQuestions({ ...args, questions: publishedBank.filter((question) => question.chapterNumber !== 10) }))
      .toThrow('RETENTION_CHAPTER_10_NOT_COVERED')
  })
})
