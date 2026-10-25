import { describe, expect, it } from 'vitest'
import { learningRetentionQuestions } from './learning-retention-content'
import {
  addCalendarYear,
  canRevealRetentionFeedback,
  canAnswerRetentionQuestion,
  evaluateRetentionAnswer,
  getCurrentRetentionWeek,
  getNextRetentionQuestionPosition,
  getRetentionParticipationStatus,
  getRetentionWeekState,
  getRetentionWeekWindow,
  getRetentionWeeksToEnsure,
  isRetentionAnswerShapeValid,
  presentRetentionQuestion,
  shouldQueueRetentionWeekReadyEmail,
  scoreAnnualRetentionCheck,
} from './learning-retention-policy'

const start = new Date('2026-01-04T12:30:00.000Z')
const day = 24 * 60 * 60 * 1000
const week = 7 * day

describe('WL-001 retention weekly-check policy', () => {
  it('berekent vaste UTC-weekvensters en een gedeelde sluitdatum na 12 weken plus 30 dagen', () => {
    const first = getRetentionWeekWindow(start, 1)
    const second = getRetentionWeekWindow(start, 2)
    const twelfth = getRetentionWeekWindow(start, 12)
    expect(first.availableAt).toEqual(start)
    expect(second.availableAt.getTime() - first.availableAt.getTime()).toBe(week)
    expect(twelfth.availableAt.getTime() - first.availableAt.getTime()).toBe(11 * week)
    expect(first.closesAt.getTime()).toBe(start.getTime() + 12 * week + 30 * day)
    expect(twelfth.closesAt).toEqual(first.closesAt)
    expect(() => getRetentionWeekWindow(start, 13)).toThrow('INVALID_RETENTION_WEEK')
  })

  it('houdt weekgrenzen op zeven etmalen over de zomertijdsovergang', () => {
    const beforeDst = new Date('2026-03-28T12:30:00.000Z')
    const nextWeek = getRetentionWeekWindow(beforeDst, 2).availableAt
    expect(nextWeek).toEqual(new Date('2026-04-04T12:30:00.000Z'))
    expect(nextWeek.getTime() - beforeDst.getTime()).toBe(week)
  })

  it('maakt week 1 direct beschikbaar, laat geen toekomstige week toe en accepteert exact de weekgrens', () => {
    expect(getCurrentRetentionWeek(start, start)).toBe(1)
    expect(getCurrentRetentionWeek(start, new Date(start.getTime() + week - 1))).toBe(1)
    expect(getCurrentRetentionWeek(start, new Date(start.getTime() + week))).toBe(2)
    expect(getRetentionWeekState({ startedAt: start, weekNumber: 2, answeredCount: 0, now: start })).toBe('SCHEDULED')
    expect(canAnswerRetentionQuestion({ startedAt: start, weekNumber: 2, stoppedAt: null, answeredCount: 0, now: start })).toBe(false)
    expect(canAnswerRetentionQuestion({ startedAt: start, weekNumber: 2, stoppedAt: null, answeredCount: 0, now: new Date(start.getTime() + week) })).toBe(true)
  })

  it('maakt beschikbare inhaalweken aan maar begrenst de staart op 30 dagen', () => {
    expect(getRetentionWeeksToEnsure(start, null, new Date(start.getTime() + 3 * week))).toEqual([1, 2, 3, 4])
    expect(getRetentionWeeksToEnsure(start, new Date(start.getTime() + day), new Date(start.getTime() + 5 * week))).toEqual([])
    expect(getRetentionWeeksToEnsure(start, null, new Date(start.getTime() + 12 * week + 30 * day))).toEqual([])
  })

  it('markeert afgeronde, gemiste en gedeeltelijk verlopen checks zonder voldoendegrens', () => {
    const expiry = new Date(start.getTime() + 12 * week + 30 * day)
    expect(getRetentionWeekState({ startedAt: start, weekNumber: 1, answeredCount: 5, now: start })).toBe('COMPLETED')
    expect(getRetentionWeekState({ startedAt: start, weekNumber: 1, answeredCount: 0, now: expiry })).toBe('MISSED')
    expect(getRetentionWeekState({ startedAt: start, weekNumber: 1, answeredCount: 2, now: expiry })).toBe('PARTIAL_EXPIRED')
    expect(getRetentionWeekState({ startedAt: start, weekNumber: 1, answeredCount: 3, now: start })).toBe('AVAILABLE')
  })

  it('plant alleen de actuele weekmail en nooit catch-upmail of mail na stoppen', () => {
    expect(shouldQueueRetentionWeekReadyEmail({ startedAt: start, weekNumber: 3, stoppedAt: null, now: new Date(start.getTime() + 2 * week) })).toBe(true)
    expect(shouldQueueRetentionWeekReadyEmail({ startedAt: start, weekNumber: 1, stoppedAt: null, now: new Date(start.getTime() + 3 * week) })).toBe(false)
    expect(shouldQueueRetentionWeekReadyEmail({ startedAt: start, weekNumber: 3, stoppedAt: new Date(start.getTime() + 2 * week), now: new Date(start.getTime() + 2 * week) })).toBe(false)
    expect(shouldQueueRetentionWeekReadyEmail({ startedAt: start, weekNumber: 12, stoppedAt: null, now: new Date(start.getTime() + 12 * week) })).toBe(false)
  })

  it('bepaalt programmastatus op elapsed UTC-dagen, behoudt stopstatus en ondersteunt catch-up na einde', () => {
    expect(getRetentionParticipationStatus(start, null, new Date(start.getTime() + 12 * week))).toBe('COMPLETED')
    expect(getRetentionParticipationStatus(start, start, new Date(start.getTime() + 12 * week))).toBe('STOPPED')
    expect(getRetentionWeeksToEnsure(start, null, new Date(start.getTime() + 12 * week))).toHaveLength(12)
  })

  it('geeft kalenderjaardatum met schrikkeljaarafhandeling', () => {
    expect(addCalendarYear(new Date('2024-02-29T09:00:00.000Z'))).toEqual(new Date('2025-02-28T09:00:00.000Z'))
    expect(addCalendarYear(new Date('2025-03-01T09:00:00.000Z'))).toEqual(new Date('2026-03-01T09:00:00.000Z'))
  })

  it('onthult vraagfeedback pas nadat een definitief antwoord is opgeslagen', () => {
    expect(canRevealRetentionFeedback(null)).toBe(false)
    expect(canRevealRetentionFeedback(new Date('2026-09-30T12:00:00.000Z'))).toBe(true)
    const question = learningRetentionQuestions.find((item) => item.type === 'MULTI_CHOICE')!
    const inProgress = presentRetentionQuestion(question)
    expect(inProgress.multiSelectInstruction).toBe('Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')
    expect(inProgress.feedback).toBeNull()
    expect(JSON.stringify(inProgress)).not.toMatch(/isCorrect|correctAnswer|correctFeedback|incorrectFeedback/)
    const answered = presentRetentionQuestion(question, question.correctAnswer)
    expect(answered.feedback?.label).toBe('Goed')
    expect(answered.options.some((option) => option.review === 'CORRECT')).toBe(true)
  })

  it('berekent de jaarcheck als binaire score 0–10 zonder cesuur en koppelt fouten aan H-hoofdstukken', () => {
    const items = Array.from({ length: 10 }, (_, index) => ({
      position: index + 1,
      chapterNumber: index + 1,
      chapterTitle: `Hoofdstuk ${index + 1}`,
      chapterSlug: `hoofdstuk-${index + 1}`,
      knowledgeArea: `Gebied ${index + 1}`,
      correct: index > 1,
    }))
    const result = scoreAnnualRetentionCheck(items)
    expect(result.score).toBe(8)
    expect(result.maxScore).toBe(10)
    expect(result).not.toHaveProperty('passed')
    expect(result.interpretation).not.toContain('competent')
    expect(result.attentionAreas).toEqual(['Gebied 1', 'Gebied 2'])
    expect(result.chapterLinks).toEqual([
      { knowledgeArea: 'Gebied 1', chapterTitle: 'Hoofdstuk 1', href: '/e-learnings/rie-in-de-praktijk/leren/hoofdstuk-1' },
      { knowledgeArea: 'Gebied 2', chapterTitle: 'Hoofdstuk 2', href: '/e-learnings/rie-in-de-praktijk/leren/hoofdstuk-2' },
    ])
    expect(scoreAnnualRetentionCheck(items.map((item) => ({ ...item, correct: false }))).score).toBe(0)
    expect(scoreAnnualRetentionCheck(items.map((item) => ({ ...item, correct: true }))).score).toBe(10)
    expect(() => scoreAnnualRetentionCheck(items.slice(1))).toThrow('INVALID_ANNUAL_RETENTION_CHECK')
  })

  it('valideert antwoordvorm en geeft multi-select detailfeedback zonder deelpunten', () => {
    const question = learningRetentionQuestions.find((item) => item.type === 'MULTI_CHOICE')!
    const correct = question.correctAnswer
    const extra = question.options.find((option) => !correct.includes(option.value))!.value
    const partial = [correct[0]!]
    expect(isRetentionAnswerShapeValid(question, partial)).toBe(true)
    expect(isRetentionAnswerShapeValid(question, [...partial, partial[0]!])).toBe(false)
    expect(isRetentionAnswerShapeValid(question, ['not-an-option'])).toBe(false)
    const feedback = evaluateRetentionAnswer(question, [...partial, extra])
    expect(feedback.isCorrect).toBe(false)
    expect(feedback.selectedCorrectOptions).toEqual(partial)
    expect(feedback.missedCorrectOptions).toEqual(correct.slice(1))
    expect(feedback.selectedIncorrectOptions).toEqual([extra])
    expect(feedback.explanation).toBe(question.incorrectFeedback)
    expect(evaluateRetentionAnswer(question, correct).isCorrect).toBe(true)
  })

  it('scoort jaarcheck single- en multi-select binair met exacte multi-set', () => {
    const single = learningRetentionQuestions.find((question) => question.type === 'SINGLE_CHOICE')!
    const multi = learningRetentionQuestions.find((question) => question.type === 'MULTI_CHOICE')!
    const correctSingle = single.correctAnswer[0]!
    const wrongSingle = single.options.find((option) => !option.isCorrect)!.value
    const oneCorrectMulti = [multi.correctAnswer[0]!]
    expect(evaluateRetentionAnswer(single, correctSingle).isCorrect).toBe(true)
    expect(evaluateRetentionAnswer(single, wrongSingle).isCorrect).toBe(false)
    expect(evaluateRetentionAnswer(multi, multi.correctAnswer).isCorrect).toBe(true)
    expect(evaluateRetentionAnswer(multi, oneCorrectMulti).isCorrect).toBe(false)
  })

  it('hervat bij de eerste nog onbeantwoorde positie en sluit na vraag 5 af', () => {
    expect(getNextRetentionQuestionPosition(5, [])).toBe(1)
    expect(getNextRetentionQuestionPosition(5, [1, 2, 4])).toBe(3)
    expect(getNextRetentionQuestionPosition(5, [1, 2, 3, 4, 5])).toBeNull()
    expect(getNextRetentionQuestionPosition(10, [1, 2, 3, 4, 5])).toBe(6)
    expect(() => getNextRetentionQuestionPosition(6, [])).toThrow('INVALID_RETENTION_CHECK_SIZE')
  })
})
