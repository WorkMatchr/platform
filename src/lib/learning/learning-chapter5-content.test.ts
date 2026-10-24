import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { learningChapter5Blocks as blocks, learningChapter5Questions as questions, learningChapter5SourceMetadata } from './learning-chapter5-content'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningChapter4Questions } from './learning-chapter4-content'
import { learningChapter6Questions } from './learning-chapter6-content'
import { learningChapter7Questions } from './learning-chapter7-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H5', () => {
  it('plaatst de volledige route en vijf formatieve vragen in versie 0.9 op positie 5', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'maatregelen-bepalen', title: 'Maatregelen bepalen', position: 5")
    expect(blocks).toHaveLength(40)
    expect(blocks[0].data.learningObjectives).toHaveLength(12)
    expect(blocks[2].questionCode).toBe('WL001-H5-OPENING')
    expect(blocks.slice(-5).map((b) => b.questionCode)).toEqual(Array.from({ length: 5 }, (_, i) => `WL001-H5-CHECK-0${i + 1}`))
    expect(blocks.findIndex((b) => b.type === 'SUMMARY')).toBeLessThan(blocks.findIndex((b) => b.data.title === 'Hoofdstukcheck'))
    expect(blocks.filter((b) => b.questionCode)).toHaveLength(17)
    for (const q of questions) expect(blocks.find((b) => b.questionCode === q.code)?.data.prompt).toBe(q.questionText)
  })

  it('houdt codes, metadata en de volledige antwoordsets eenduidig', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...learningChapter4Questions, ...questions, ...learningChapter6Questions, ...learningChapter7Questions]
    expect(new Set(all.map((q) => q.code)).size).toBe(all.length)
    expect(new Set(questions.map((q) => q.knowledgeArea)).size).toBeGreaterThanOrEqual(8)
    for (const q of questions) {
      expect(q.questionVersion).toBe(1)
      expect([2, 3]).toContain(q.difficulty)
      expect(q.learningObjective.length).toBeGreaterThan(10)
      expect(q.explanation.length).toBeGreaterThan(100)
      const values = q.options.map((o) => o.value)
      expect(new Set(values).size).toBe(values.length)
      const correct = q.correctAnswer as string[]
      const answer = ['MULTI_CHOICE', 'SORTING'].includes(q.type) ? correct : correct[0]
      expect(isLearningAnswerShapeValid(q.type, answer, values, correct)).toBe(true)
      expect(isLearningAnswerCorrect(q.type, answer, correct)).toBe(true)
      if (q.type === 'SORTING') {
        // Canonical seed order is intentionally reversed by the generic renderer.
        expect(values).toEqual(correct)
        expect(isLearningAnswerCorrect(q.type, [...values].reverse(), correct)).toBe(false)
      } else if (q.type === 'MULTI_CHOICE') {
        expect(q.options.some((o) => !o.isCorrect)).toBe(true)
        for (const value of correct) expect(isLearningAnswerCorrect(q.type, [value], correct)).toBe(false)
        expect(isLearningAnswerCorrect(q.type, values, correct)).toBe(false)
      } else {
        expect(q.options).toHaveLength(q.type === 'TRUE_FALSE' ? 2 : 4)
        expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1)
      }
    }
  })

  it('bewaakt STOP, specifieke wettelijke grenzen en de overgang naar H6', () => {
    expect(learningChapter5SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    const content = JSON.stringify(blocks)
    for (const term of ['S — Substitutie', 'T — Technische', 'O — Organisatorische', 'P — Persoonlijke', 'geen concurrerend', 'niet automatisch voldoende', 'nieuwe', 'restrisico', 'H6 leert u']) expect(content).toContain(term)
    const cmr = blocks.find((b) => b.data.label === 'VERDIEPING')!
    expect(cmr.questionCode).toBeUndefined()
    expect(questions.slice(-5).some((q) => q.questionText.includes('CMR'))).toBe(false)
    expect(blocks.find((b) => b.data.title === 'De maatregelenhiërarchie')?.data.steps).toHaveLength(4)
  })
})
