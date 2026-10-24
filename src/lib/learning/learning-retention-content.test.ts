import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseFinalExamQuestionBank } from './learning-final-exam-content'
import { learningRetentionQuestions, retentionLegalReviewCodes } from './learning-retention-content'

const exam = parseFinalExamQuestionBank(
  readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8'),
)
const normalize = (value: string) => value.toLocaleLowerCase('nl-NL').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

describe('WL-001 kennisbehoudbank v1 (draft)', () => {
  it('bevat exact R001–R100 met de vastgelegde hoofdstukverdeling', () => {
    expect(learningRetentionQuestions.map((question) => question.code))
      .toEqual(Array.from({ length: 100 }, (_, index) => `R${String(index + 1).padStart(3, '0')}`))
    expect(Array.from({ length: 10 }, (_, index) => learningRetentionQuestions.filter((question) => question.chapterNumber === index + 1).length))
      .toEqual([5, 10, 10, 15, 15, 10, 10, 8, 8, 9])
  })

  it('heeft versieerbare metadata, feedback en alleen single-/multi-choicevragen', () => {
    for (const question of learningRetentionQuestions) {
      expect(question.questionVersion, question.code).toBe(1)
      expect(question.status, question.code).toBe('DRAFT')
      expect(question.learningQuestionStatus, question.code).toBe('PUBLISHED_PROTOTYPE')
      expect(question.chapterNumber, question.code).toBeGreaterThanOrEqual(1)
      expect(question.chapterNumber, question.code).toBeLessThanOrEqual(10)
      expect(question.knowledgeArea, question.code).toBeTruthy()
      expect(['B', 'T', 'A'], question.code).toContain(question.cognitiveLevel)
      expect([1, 2, 3], question.code).toContain(question.difficulty)
      expect(['SINGLE_CHOICE', 'MULTI_CHOICE'], question.code).toContain(question.type)
      expect(question.correctFeedback, question.code).toBeTruthy()
      expect(question.incorrectFeedback, question.code).toBeTruthy()
      expect(question.options.length, question.code).toBeGreaterThanOrEqual(4)
      expect(new Set(question.options.map((option) => option.value)).size, question.code).toBe(question.options.length)
      expect(question.options.filter((option) => option.isCorrect).map((option) => option.value).sort(), question.code)
        .toEqual([...question.correctAnswer].sort())
      expect(question.options.some((option) => !option.isCorrect), question.code).toBe(true)
      expect(question.type === 'SINGLE_CHOICE' ? question.correctAnswer.length === 1 : question.correctAnswer.length >= 2, question.code).toBe(true)
    }
  })

  it('dekt kritieke en juridisch gevoelige onderwerpen expliciet af', () => {
    expect(learningRetentionQuestions.filter((question) => question.criticalConcept).length).toBeGreaterThan(0)
    expect(retentionLegalReviewCodes.length).toBeGreaterThan(0)
    expect(retentionLegalReviewCodes).toContain('R006')
    expect(retentionLegalReviewCodes).toContain('R071')
    expect(retentionLegalReviewCodes).toContain('R090')
    expect(learningRetentionQuestions.filter((question) => question.legalReview).every((question) => question.status === 'DRAFT')).toBe(true)
    expect(learningRetentionQuestions.some((question) => /RI&E.{0,30}(?:standaard|altijd).{0,20}vijf jaar geldig/i.test(
      [question.questionText, question.correctFeedback, ...question.options.filter((option) => option.isCorrect).map((option) => option.text)].join(' '),
    ))).toBe(false)
  })

  it('gebruikt niet letterlijk de examstammen of complete antwoordsets', () => {
    const examStems = new Set(exam.map((question) => normalize(question.questionText)))
    const retentionStems = learningRetentionQuestions.map((question) => normalize(question.questionText))
    expect(new Set(retentionStems).size).toBe(retentionStems.length)
    for (const question of learningRetentionQuestions) {
      expect(examStems.has(normalize(question.questionText)), question.code).toBe(false)
      const retentionOptionSet = question.options.map((option) => normalize(option.text)).sort().join('|')
      expect(exam.some((examQuestion) =>
        examQuestion.chapterNumber === question.chapterNumber
        && normalize(examQuestion.questionText) === normalize(question.questionText)
        && examQuestion.options.map((option) => normalize(option.text)).sort().join('|') === retentionOptionSet,
      ), question.code).toBe(false)
    }
  })

  it('benadert de cognitieve richtlijn en varieert correcte posities deterministisch', () => {
    const levels = Object.fromEntries(['B', 'T', 'A'].map((level) => [
      level, learningRetentionQuestions.filter((question) => question.cognitiveLevel === level).length,
    ]))
    expect(levels).toEqual({ B: 20, T: 55, A: 25 })
    const singleChoice = learningRetentionQuestions.filter((question) => question.type === 'SINGLE_CHOICE')
    const correctPositions = ['A', 'B', 'C', 'D'].map((_, position) =>
      singleChoice.filter((question) => question.options.findIndex((option) => option.isCorrect) === position).length,
    )
    expect(correctPositions.every((count) => count >= 10)).toBe(true)
    expect(Math.max(...correctPositions) - Math.min(...correctPositions)).toBeLessThanOrEqual(6)
    const correctIsLongest = singleChoice.filter((question) => {
      const correctLength = question.options.find((option) => option.isCorrect)!.text.length
      const longestDistractor = Math.max(...question.options.filter((option) => !option.isCorrect).map((option) => option.text.length))
      return correctLength > longestDistractor
    })
    expect(correctIsLongest.map((question) => question.code)).toHaveLength(21)
    expect(correctIsLongest.length / singleChoice.length).toBeLessThanOrEqual(0.4)
  })
})
