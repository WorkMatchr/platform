import { describe, expect, it } from 'vitest'
import {
  learningChapter3Blocks,
  learningChapter3Questions,
  learningChapterBlocks,
  learningQuestions,
} from './learning-prototype-content'

const allQuestions = [...learningQuestions, ...learningChapter3Questions]

describe('WL-001 hoofdstuk 3 prototypecontent', () => {
  it('houdt hoofdstuk 3 op positie 3 met de afgesproken titel, slug en duur', () => {
    const intro = learningChapter3Blocks[0]
    expect(intro?.type).toBe('HEADING')
    expect(intro?.data).toMatchObject({
      eyebrow: 'Hoofdstuk 3 van 10',
      title: 'Risico’s inventariseren',
      estimatedDurationLabel: '12–15 minuten',
    })
    expect(learningChapter3Blocks.some((block) => block.data.title === 'Wie kan worden blootgesteld?')).toBe(true)
  })

  it('behandelt de afgesproken leerdoelen en alle verplichte inhoudsonderdelen', () => {
    const content = JSON.stringify(learningChapter3Blocks)
    for (const topic of [
      'Een eerste rondgang', 'werkdruk', 'bijna-aanrijdingen', 'Ontvangst van goederen',
      'storingen', 'uitzendkrachten', 'gehoorbescherming', 'PSYCHOSOCIALE ARBEIDSBELASTING',
      'Logistiek Noord', 'INVENTARISEREN', 'BEOORDELEN',
    ]) expect(content).toContain(topic)
    expect(learningChapter3Blocks.some((block) => block.type === 'PROCESS')).toBe(true)
    expect(learningChapter3Blocks.some((block) => block.type === 'CASE_STUDY')).toBe(true)
    expect(learningChapter3Blocks.some((block) => block.type === 'MULTI_CHOICE')).toBe(true)
    expect(learningChapter3Blocks.some((block) => block.type === 'SORTING')).toBe(true)
    expect(learningChapter3Blocks.map((block) => block.type as string)).not.toContain('RISK_SPOTTING')
  })

  it('heeft vijf uniek gecodeerde hoofdstukcheckvragen en geen vraagcodebotsingen', () => {
    const codes = allQuestions.map((question) => question.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(learningChapter3Questions.filter((question) => question.code.startsWith('WL001-H3-CHECK-'))).toHaveLength(5)
    expect(learningChapter3Blocks.filter((block) => block.questionCode?.startsWith('WL001-H3-CHECK-'))).toHaveLength(5)
    expect(learningChapter3Questions.find((question) => question.code === 'WL001-H3-CHECK-05')?.type).toBe('MULTI_CHOICE')
  })

  it('gebruikt geen foutfeedbackformulering in de uitleg bij het juiste antwoord', () => {
    const invisibleRiskQuestion = learningChapter3Questions.find((question) => question.code === 'WL001-H3-ONZICHTBAAR')
    expect(invisibleRiskQuestion?.explanation).not.toMatch(/^Nog niet[.!]/)
  })

  it('heeft valide opties, correcte multi-selectsets en één sortingdoelvolgorde', () => {
    for (const question of learningChapter3Questions) {
      const optionValues = question.options.map((option) => option.value)
      expect(new Set(optionValues).size, question.code).toBe(optionValues.length)
      const correctValues = question.options.filter((option) => option.isCorrect).map((option) => option.value)
      const expectedValues = Array.isArray(question.correctAnswer) ? question.correctAnswer : Object.keys(question.correctAnswer)
      expect(correctValues.toSorted(), question.code).toEqual(expectedValues.toSorted())
      if (question.type === 'MULTI_CHOICE') {
        expect(Array.isArray(question.correctAnswer), question.code).toBe(true)
        expect((question.correctAnswer as string[]).length, question.code).toBeGreaterThan(1)
      }
      if (question.type === 'SORTING') {
        expect(Array.isArray(question.correctAnswer), question.code).toBe(true)
        expect(question.correctAnswer).toHaveLength(question.options.length)
        expect(new Set(question.correctAnswer as string[]).size).toBe(question.options.length)
      }
      expect(question.difficulty ?? 1).toBeGreaterThanOrEqual(1)
      expect(question.difficulty ?? 1).toBeLessThanOrEqual(5)
      expect(question.explanation.length, question.code).toBeGreaterThan(40)
    }
  })

  it('bewaart de bestaande hoofdstuk-1-content als aparte, ongewijzigde seedbron', () => {
    expect(learningChapterBlocks[0]?.data).toMatchObject({ title: 'Waarom een RI&E?' })
    expect(learningQuestions).toHaveLength(10)
  })
})
