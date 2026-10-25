import { describe, expect, it } from 'vitest'
import { isExamAnswerCorrect, sanitizeExamQuestion, scoreExam } from './learning-exam-policy'

describe('WL-001 eindtoetsbeleid', () => {
  it('scoret single choice, exacte multi-selectsets en onbeantwoord als nul', () => {
    expect(isExamAnswerCorrect('SINGLE_CHOICE', 'b', ['b'])).toBe(true)
    expect(isExamAnswerCorrect('SINGLE_CHOICE', 'a', ['b'])).toBe(false)
    expect(isExamAnswerCorrect('MULTI_CHOICE', ['b', 'a'], ['a', 'b'])).toBe(true)
    expect(isExamAnswerCorrect('MULTI_CHOICE', ['a'], ['a', 'b'])).toBe(false)
    expect(isExamAnswerCorrect('MULTI_CHOICE', ['a', 'c'], ['a', 'b'])).toBe(false)
    expect(scoreExam([
      { type: 'SINGLE_CHOICE', answer: 'yes', correctAnswer: ['yes'] },
      { type: 'MULTI_CHOICE', answer: ['a'], correctAnswer: ['a', 'b'] },
      { type: 'SINGLE_CHOICE', answer: null, correctAnswer: ['yes'] },
    ], 2)).toEqual({ score: 1, maxScore: 3, percentage: 33, passed: false })
  })

  it('hanteert de 39/40 cesuurgrens reproduceerbaar', () => {
    expect(scoreExam(Array.from({ length: 50 }, (_, index) => ({
      type: 'SINGLE_CHOICE' as const,
      answer: index < 39 ? 'correct' : 'wrong',
      correctAnswer: ['correct'],
    })), 40)).toMatchObject({ score: 39, percentage: 78, passed: false })
    expect(scoreExam(Array.from({ length: 50 }, (_, index) => ({
      type: 'SINGLE_CHOICE' as const,
      answer: index < 40 ? 'correct' : 'wrong',
      correctAnswer: ['correct'],
    })), 40)).toMatchObject({ score: 40, percentage: 80, passed: true })
    expect(scoreExam(Array.from({ length: 50 }, (_, index) => ({
      type: 'SINGLE_CHOICE' as const,
      answer: index < 41 ? 'correct' : 'wrong',
      correctAnswer: ['correct'],
    })), 40)).toMatchObject({ score: 41, percentage: 82, passed: true })
    expect(scoreExam(Array.from({ length: 50 }, () => ({
      type: 'SINGLE_CHOICE' as const,
      answer: 'correct',
      correctAnswer: ['correct'],
    })), 40)).toMatchObject({ score: 50, percentage: 100, passed: true })
    expect(scoreExam(Array.from({ length: 50 }, () => ({
      type: 'SINGLE_CHOICE' as const,
      answer: null,
      correctAnswer: ['correct'],
    })), 40)).toMatchObject({ score: 0, percentage: 0, passed: false })
  })

  it('verwijdert antwoordkey, correctheidsvlaggen en uitleg uit de studentvraag', () => {
    const safe = sanitizeExamQuestion({
      code: 'E01',
      questionText: 'Vraag',
      correctAnswer: ['b'],
      explanation: 'De uitleg verraadt het antwoord.',
      options: [{ value: 'a', text: 'Optie A', isCorrect: false }, { value: 'b', text: 'Optie B', isCorrect: true }],
    })
    expect(safe).toEqual({
      code: 'E01',
      questionText: 'Vraag',
      options: [{ value: 'a', text: 'Optie A' }, { value: 'b', text: 'Optie B' }],
    })
    expect(JSON.stringify(safe)).not.toMatch(/correctAnswer|isCorrect|explanation/)
  })
})
