import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningChapter4Questions } from './learning-chapter4-content'
import { learningChapter5Questions } from './learning-chapter5-content'
import { learningChapter6Blocks as blocks, learningChapter6Questions as questions, learningChapter6SourceMetadata } from './learning-chapter6-content'
import { learningChapter7Questions } from './learning-chapter7-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H6 — Plan van Aanpak', () => {
  it('publiceert H6 als zesde hoofdstuk in de nieuwe prototypeversie', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'plan-van-aanpak', title: 'Plan van Aanpak: van risico naar actie', position: 6")
    expect(blocks[0].data).toMatchObject({
      title: 'Plan van Aanpak: van risico naar actie',
      estimatedDurationLabel: '15–20 minuten',
      eyebrow: 'Hoofdstuk 6 van 10',
    })
    expect(blocks[0].data.learningObjectives).toHaveLength(12)
    expect(blocks.at(-7)?.data.title).toBe('Hoofdstukcheck')
    expect(blocks.slice(-6, -1).map((block) => block.questionCode)).toEqual(
      Array.from({ length: 5 }, (_, index) => `WL001-H6-CHECK-0${index + 1}`),
    )
    expect(blocks.some((block) => block.type === 'SUMMARY')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'AFRONDING')).toBe(true)
  })

  it('koppelt iedere vraag uniek aan een blok en behoudt volledige feedback en metadata', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions,
      ...learningChapter4Questions, ...learningChapter5Questions, ...questions, ...learningChapter7Questions]
    expect(new Set(all.map((question) => question.code)).size).toBe(all.length)
    expect(new Set(questions.map((question) => question.knowledgeArea)).size).toBeGreaterThanOrEqual(8)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    for (const item of questions) {
      const block = blocks.find((candidate) => candidate.questionCode === item.code)
      expect(block?.data.prompt).toBe(item.questionText)
      expect(item.questionVersion).toBe(['WL001-H6-OPENING', 'WL001-H6-ONDERZOEK', 'WL001-H6-EIGENAAR', 'WL001-H6-EFFECTIEF', 'WL001-H6-WERKT-NIET'].includes(item.code) ? 2 : 1)
      expect([2, 3]).toContain(item.difficulty)
      expect(item.learningObjective.length).toBeGreaterThan(10)
      expect(item.explanation.length).toBeGreaterThan(100)
      if (item.type !== 'MULTI_CHOICE') expect(item.explanation).not.toMatch(/^(?:Nee|Nog niet)[.!]/i)
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

  it('houdt wettelijke kern, praktische borging en methode-afwegingen gescheiden', () => {
    expect(learningChapter6SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    const content = JSON.stringify(blocks)
    for (const phrase of [
      'De Arbeidsomstandighedenwet noemt de maatregelen',
      'praktische borging',
      'Onderzoek kan een noodzakelijke actie zijn',
      'Prioriteit en termijn zijn verbonden, maar niet hetzelfde',
      'geen universele termijnmatrix',
      'tijdelijke beheersmaatregel',
      'Uitgevoerd is niet hetzelfde als effectief',
      'Logistiek Noord',
      'GECONTROLEERD',
    ]) expect(content).toContain(phrase)
    expect(content).not.toContain('H7 is nog niet beschikbaar')
    expect(content).not.toContain('Plan van Aanpak-module')
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'WETTELIJKE EIS')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'GOEDE PRAKTIJK')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'METHODIEK')).toBe(true)
  })
})
