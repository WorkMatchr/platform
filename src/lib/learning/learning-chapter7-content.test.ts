import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningChapter4Questions } from './learning-chapter4-content'
import { learningChapter5Questions } from './learning-chapter5-content'
import { learningChapter6Questions } from './learning-chapter6-content'
import { learningChapter7Blocks as blocks, learningChapter7Questions as questions, learningChapter7SourceMetadata } from './learning-chapter7-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H7 — Toetsing van de RI&E', () => {
  it('plaatst H7 als hoofdstuk 7 in een nieuwe prototypeversie met vijf formatieve checks', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'toetsing-rie', title: 'Toetsing van de RI&E', position: 7")
    expect(blocks[0].data).toMatchObject({
      title: 'Toetsing van de RI&E',
      estimatedDurationLabel: '18–22 minuten',
      eyebrow: 'Hoofdstuk 7 van 10',
    })
    expect(blocks[0].data.learningObjectives).toHaveLength(14)
    expect(blocks.slice(-6, -1).map((block) => block.questionCode)).toEqual(
      Array.from({ length: 5 }, (_, index) => `WL001-H7-CHECK-0${index + 1}`),
    )
    expect(blocks.at(-1)?.data.label).toBe('AFRONDING')
    expect(blocks.some((block) => block.type === 'PROCESS')).toBe(true)
    expect(blocks.some((block) => block.type === 'SUMMARY')).toBe(true)
  })

  it('koppelt iedere Question Bank-vraag uniek en valideert volledige antwoordsets en feedback', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions,
      ...learningChapter4Questions, ...learningChapter5Questions, ...learningChapter6Questions, ...questions]
    expect(new Set(all.map((question) => question.code)).size).toBe(all.length)
    expect(new Set(questions.map((question) => question.knowledgeArea)).size).toBeGreaterThanOrEqual(7)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    for (const item of questions) {
      const block = blocks.find((candidate) => candidate.questionCode === item.code)
      expect(item.code).toMatch(/^WL001-H7-[A-Z0-9-]+$/)
      expect(block?.data.prompt).toBe(item.questionText)
      expect([2, 3]).toContain(item.difficulty)
      expect(item.learningObjective.length).toBeGreaterThan(10)
      expect(item.explanation.length).toBeGreaterThan(100)
      const values = item.options.map((option) => option.value)
      expect(new Set(values).size).toBe(values.length)
      const expected = item.correctAnswer as string[]
      const answer = item.type === 'MULTI_CHOICE' ? expected : expected[0]
      expect(isLearningAnswerShapeValid(item.type, answer, values, item.correctAnswer)).toBe(true)
      expect(isLearningAnswerCorrect(item.type, answer, item.correctAnswer)).toBe(true)
      if (item.type === 'MULTI_CHOICE') {
        expect(item.options.filter((option) => option.isCorrect).map((option) => option.value)).toEqual(expected)
        expect(item.options.some((option) => !option.isCorrect)).toBe(true)
        expect(isLearningAnswerCorrect(item.type, expected.slice(0, -1), expected)).toBe(false)
      } else {
        expect(item.options).toHaveLength(4)
        expect(item.options.filter((option) => option.isCorrect)).toHaveLength(1)
        for (const option of item.options) expect(isLearningAnswerCorrect(item.type, option.value, item.correctAnswer)).toBe(option.isCorrect)
      }
    }
  })

  it('behoudt wettelijke uitzonderingen en bevoegdheidsnuance zonder juridische beslisautomaat', () => {
    expect(learningChapter7SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    expect(learningChapter7SourceMetadata.sources.length).toBeGreaterThanOrEqual(5)
    const content = JSON.stringify(blocks).toLocaleLowerCase('nl-NL')
    for (const phrase of ['maximaal 25 medewerkers', 'ten hoogste 40 uur', 'uitsluitend vrijwilligers', 'erkend branche',
      'bedrijfsspecifieke risico', 'BIG-geregistreerde bedrijfsarts', 'certificering', 'systeemtoets', 'scopetoets',
      'werkgever blijft verantwoordelijk', 'hoofdstuk 8', 'geen automatische juridische beslisboom']) expect(content).toContain(phrase.toLocaleLowerCase('nl-NL'))
    expect(content).not.toContain('tot 25 medewerkers automatisch vrijgesteld')
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'CONTENT REVIEW REQUIRED')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'WETTELIJKE EIS')).toBe(true)
  })
})
