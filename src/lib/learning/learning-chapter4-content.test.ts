import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { learningChapter4Blocks as blocks, learningChapter4Questions as questions, learningChapter4SourceMetadata } from './learning-chapter4-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 hoofdstuk 4', () => {
  it('publiceert H4 op positie 4 in een nieuwe versie, zonder H1–H3 te wijzigen', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'risicos-beoordelen', title: 'Risico’s beoordelen', position: 4")
    expect(blocks[0].data).toMatchObject({ title: 'Risico’s beoordelen', estimatedDurationLabel: '15–20 minuten', eyebrow: 'Hoofdstuk 4 van 10' })
    expect(blocks[0].data.learningObjectives).toHaveLength(12)
    expect(blocks[2].questionCode).toBe('WL001-H4-OPENING')
    expect(blocks.findIndex((block) => block.data.title === 'Dit neemt u mee')).toBeLessThan(blocks.findIndex((block) => block.data.title === 'Hoofdstukcheck'))
    expect(blocks.slice(-5).map((block) => block.questionCode)).toEqual(Array.from({ length: 5 }, (_, index) => `WL001-H4-CHECK-0${index + 1}`))
  })

  it('houdt elke vraag uniek, herleidbaar en server-side beoordeelbaar', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...questions]
    expect(new Set(all.map((q) => q.code)).size).toBe(all.length)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    for (const q of questions) {
      expect(blocks.find((b) => b.questionCode === q.code)?.data.prompt).toBe(q.questionText)
      expect(q.questionVersion).toBe(q.code === 'WL001-H4-CHECK-05' ? 2 : 1)
      expect([1, 2, 3]).toContain(q.difficulty)
      expect(q.learningObjective.length).toBeGreaterThan(10)
      expect(q.explanation.length).toBeGreaterThan(100)
      const values = q.options.map((o) => o.value)
      expect(new Set(values).size).toBe(values.length)
      const answer = q.type === 'MULTI_CHOICE' ? q.correctAnswer : (q.correctAnswer as string[])[0]
      expect(isLearningAnswerShapeValid(q.type, answer, values, q.correctAnswer)).toBe(true)
      expect(isLearningAnswerCorrect(q.type, answer, q.correctAnswer)).toBe(true)
      if (q.type === 'MULTI_CHOICE') {
        expect(q.options.filter((o) => o.isCorrect).map((o) => o.value)).toEqual(q.correctAnswer)
        expect(q.options.filter((o) => !o.isCorrect)).toHaveLength(1)
        for (const value of q.correctAnswer as string[]) expect(isLearningAnswerCorrect(q.type, [value], q.correctAnswer)).toBe(false)
        expect(isLearningAnswerCorrect(q.type, values, q.correctAnswer)).toBe(false)
      } else {
        expect(q.options).toHaveLength(q.type === 'TRUE_FALSE' ? 2 : 4)
        expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
        for (const option of q.options) expect(isLearningAnswerCorrect(q.type, option.value, q.correctAnswer)).toBe(option.isCorrect)
      }
    }
  })

  it('bewaakt methodische grenzen en complete beoordelingsonderwerpen', () => {
    expect(learningChapter4SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    const method = blocks.filter((b) => b.type === 'CALLOUT' && b.data.label === 'METHODIEK')
    expect(method).toHaveLength(3)
    expect(JSON.stringify(method)).toContain('didactisch voorbeeld')
    const content = JSON.stringify(blocks)
    for (const term of ['Wie?', 'Hoe vaak / hoe lang?', 'Hoe waarschijnlijk?', 'Wat kan het gevolg zijn?', 'Restrisico', 'verdiepend', 'geen vaste algemene actietermijnen', 'H5 gaat over passende maatregelen.']) expect(content).toContain(term)
    expect(content).not.toContain('H5 gaat over passende maatregelen en is nog niet beschikbaar')
    expect(new Set(questions.map((q) => q.knowledgeArea)).size).toBeGreaterThanOrEqual(8)
    expect(questions.filter((q) => (q.difficulty ?? 1) >= 2).length).toBeGreaterThan(learningQuestions.filter((q) => (q.difficulty ?? 1) >= 2).length)
  })
})
