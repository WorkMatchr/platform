import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolvePublicSources } from '../../content/public-sources'
import { learningChapter10Blocks as blocks, learningChapter10Questions as questions, learningChapter10SourceMetadata } from './learning-chapter10-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H10 — Integrale praktijkcasus', () => {
  it('publiceert een nieuwe prototypeversie met H1–H10 en positioneert H10 als laatste hoofdstuk', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'integrale-praktijkcasus', title: 'Integrale praktijkcasus', position: 10")
    expect(blocks[0].data).toMatchObject({ title: 'Integrale praktijkcasus', eyebrow: 'Hoofdstuk 10 van 10', estimatedDurationLabel: '25–30 minuten' })
    expect(blocks[0].data.learningObjectives).toHaveLength(11)
    expect(blocks.slice(-10, -2).map((block) => block.questionCode)).toEqual(
      Array.from({ length: 8 }, (_, index) => `WL001-H10-CHECK-0${index + 1}`),
    )
    expect(blocks.at(-2)?.data).toMatchObject({ label: 'REFLECTIE', title: 'Wat neemt u mee?' })
    expect(blocks.at(-1)?.data).toMatchObject({ label: 'AFRONDING', title: 'Hoofdstuk 10 afgerond' })
    expect(seed).not.toContain("slug: 'integrale-praktijkcasus', title: 'Integrale praktijkcasus', position: 11")
  })

  it('bouwt de integrale Logistiek Noord-casus op met dossier, rondgang, veranderingen en bijna-ongeval', () => {
    const content = JSON.stringify({ blocks, questions }).toLocaleLowerCase('nl-NL')
    for (const phrase of ['logistiek noord', '38 medewerkers', 'drie bijna-aanrijdingen', '18–22 kg', 'nieuw schoonmaakmiddel',
      'orderpickinstallatie', 'avonddienst', 'work as imagined', 'work as done', 'plan van aanpak', 'bijna-ongeval',
      'maatregelenhiërarchie', 'deskundigheid en scope', 'effect controleren', 'h3 helpt', 'h4 helpt', 'h8 helpt']) {
      expect(content).toContain(phrase)
    }
    expect(content).toContain('geen algemene regel dat de ri&e vijf jaar geldig is')
    expect(content).not.toContain('de ri&e is altijd vijf jaar geldig')
    expect(content).not.toContain('iedere verandering vereist automatisch een volledig nieuwe ri&e')
    expect(blocks.some((block) => block.type === 'PROCESS' && JSON.stringify(block.data).includes('ACTUALISEREN'))).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'METHODIEK')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'GOEDE PRAKTIJK')).toBe(true)
    expect(blocks.some((block) => block.type === 'SUMMARY')).toBe(true)
    expect(blocks.at(-2)?.type).toBe('CALLOUT')
    expect(blocks.at(-2)?.questionCode).toBeUndefined()
    expect(JSON.stringify(blocks.at(-2)?.data)).toContain('wordt niet beoordeeld of opgeslagen')
    expect(JSON.stringify(blocks.at(-1)?.data)).toContain('gecertificeerd arbokerndeskundige')
    expect(learningChapter10SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    expect(resolvePublicSources(learningChapter10SourceMetadata.sourceIds)).toHaveLength(2)
  })

  it('koppelt iedere vraagblok exact één keer aan de juiste Question Bank-vraag', () => {
    const questionBlocks = blocks.filter((block) => block.questionCode)
    expect(questionBlocks).toHaveLength(questions.length)
    expect(new Set(questionBlocks.map((block) => block.questionCode)).size).toBe(questions.length)
    for (const block of questionBlocks) {
      const question = questions.find((item) => item.code === block.questionCode)
      expect(question).toBeDefined()
      expect(block.type).toBe(question!.type)
      expect((block.data as { prompt?: string }).prompt).toBe(question!.questionText)
    }
  })

  it('heeft acht formatieve checks zonder cesuur, unieke codes en gevarieerde juiste posities', () => {
    const allCodes = questions.map((item) => item.code)
    expect(new Set(allCodes).size).toBe(questions.length)
    expect(new Set(questions.map((item) => item.knowledgeArea)).size).toBeGreaterThanOrEqual(8)
    const singleCorrectPositions = questions.filter((item) => item.type === 'SINGLE_CHOICE')
      .map((item) => item.options.findIndex((option) => option.isCorrect))
    expect(new Set(singleCorrectPositions).size).toBeGreaterThan(1)
    const singleQuestions = questions.filter((item) => item.type === 'SINGLE_CHOICE')
    const correctAnswersThatAreLongest = singleQuestions.filter((item) => {
      const correctLength = item.options.find((option) => option.isCorrect)!.text.length
      return correctLength === Math.max(...item.options.map((option) => option.text.length))
    })
    expect(correctAnswersThatAreLongest.length).toBeLessThanOrEqual(Math.ceil(singleQuestions.length * 0.1))

    for (const item of questions) {
      expect(item.code).toMatch(/^WL001-H10-[A-Z0-9-]+$/)
      expect(item.explanation.length).toBeGreaterThan(60)
      expect(new Set(item.options.map((option) => option.value)).size).toBe(item.options.length)
      expect(item.options.filter((option) => option.isCorrect).map((option) => option.value)).toEqual(item.correctAnswer)
      const correct = item.correctAnswer as string[]
      const answer = item.type === 'MULTI_CHOICE' ? correct : correct[0]
      expect(isLearningAnswerShapeValid(item.type, answer, item.options.map((option) => option.value), item.correctAnswer)).toBe(true)
      expect(isLearningAnswerCorrect(item.type, answer, item.correctAnswer)).toBe(true)
      if (item.type === 'MULTI_CHOICE') {
        expect(item.options.some((option) => !option.isCorrect)).toBe(true)
        expect(isLearningAnswerCorrect(item.type, correct.slice(0, -1), correct)).toBe(false)
      } else {
        expect(item.type).toBe('SINGLE_CHOICE')
        expect(item.options).toHaveLength(4)
        expect(item.options.filter((option) => option.isCorrect)).toHaveLength(1)
      }
    }
  })
})
