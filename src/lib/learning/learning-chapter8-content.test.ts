import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningChapter4Questions } from './learning-chapter4-content'
import { learningChapter5Questions } from './learning-chapter5-content'
import { learningChapter6Questions } from './learning-chapter6-content'
import { learningChapter7Questions } from './learning-chapter7-content'
import { learningChapter8Blocks as blocks, learningChapter8Questions as questions, learningChapter8SourceMetadata } from './learning-chapter8-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H8 — RI&E actueel houden', () => {
  it('plaatst H8 op positie 8 in een nieuwe prototypeversie en bevat vijf formatieve checks', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'rie-actueel-houden', title: 'RI&E actueel houden', position: 8")
    expect(blocks[0].data).toMatchObject({ title: 'RI&E actueel houden', eyebrow: 'Hoofdstuk 8 van 10', estimatedDurationLabel: '15–20 minuten' })
    expect(blocks[0].data.learningObjectives).toHaveLength(10)
    expect(blocks.slice(-6, -1).map((block) => block.questionCode)).toEqual(
      Array.from({ length: 5 }, (_, index) => `WL001-H8-CHECK-0${index + 1}`),
    )
    expect(blocks.at(-1)?.data.label).toBe('AFRONDING')
  })

  it('bedient alle verplichte inhoud met generieke blokken en correcte methodieklabels', () => {
    const content = JSON.stringify({ blocks, questions }).toLocaleLowerCase('nl-NL')
    for (const phrase of ['vijf jaar geldig', 'nieuwe productielijn', 'bijna-ongeval', 'werknemers raadplegen', 'plan van aanpak',
      'management of change', 'pdca', 'logistiek noord', 'periodieke review', 'hybride werken', 'nieuwe technologie']) {
      expect(content).toContain(phrase)
    }
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'METHODIEK')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'WETTELIJKE EIS')).toBe(true)
    expect(blocks.some((block) => block.type === 'PROCESS')).toBe(true)
    expect(blocks.some((block) => block.type === 'SUMMARY')).toBe(true)
    expect(learningChapter8SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    expect(learningChapter8SourceMetadata.sources.length).toBeGreaterThanOrEqual(2)
  })

  it('behoudt juridische en didactische invarianten zonder universele termijnen of automatische herziening', () => {
    const content = JSON.stringify({ blocks, questions }).toLocaleLowerCase('nl-NL')
    expect(content).not.toContain('een ri&e is standaard vijf jaar geldig')
    expect(content).not.toContain('moet ieder jaar volledig opnieuw')
    expect(content).not.toContain('iedere verandering vereist automatisch een volledige')
    expect(content).not.toContain('zonder ongeval hoeft')
    expect(content).not.toContain('alleen fysieke veranderingen')
    expect(content).not.toContain('uitgevoerd is hetzelfde als effectief')
    expect(content).toContain('impact')
    expect(content).toContain('verbreed de beoordeling')
  })

  it('markeert bij de vijfjaarsmisvatting alleen impactgerichte beoordeling als correct', () => {
    const opening = questions.find((item) => item.code === 'WL001-H8-OPENING')!
    expect(opening.correctAnswer).toEqual(['impact'])
    expect(opening.options.find((option) => option.value === 'vijf')?.isCorrect).toBe(false)
    expect(opening.options.find((option) => option.value === 'impact')?.isCorrect).toBe(true)
  })

  it('heeft unieke Question Bank-codes, complete antwoordsets en een niet vooraf geordende PDCA-vraag', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...learningChapter4Questions,
      ...learningChapter5Questions, ...learningChapter6Questions, ...learningChapter7Questions, ...questions]
    expect(new Set(all.map((item) => item.code)).size).toBe(all.length)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    expect(new Set(questions.map((item) => item.knowledgeArea)).size).toBeGreaterThanOrEqual(7)
    for (const item of questions) {
      expect(item.code).toMatch(/^WL001-H8-[A-Z0-9-]+$/)
      expect(item.explanation.length).toBeGreaterThan(60)
      expect(new Set(item.options.map((option) => option.value)).size).toBe(item.options.length)
      expect(item.options.filter((option) => option.isCorrect).map((option) => option.value)).toEqual(item.correctAnswer)
      const expected = item.correctAnswer as string[]
      const answer = item.type === 'MULTI_CHOICE' || item.type === 'SORTING' ? expected : expected[0]
      expect(isLearningAnswerShapeValid(item.type, answer, item.options.map((option) => option.value), item.correctAnswer)).toBe(true)
      expect(isLearningAnswerCorrect(item.type, answer, item.correctAnswer)).toBe(true)
      if (item.type === 'MULTI_CHOICE') {
        expect(item.options.some((option) => !option.isCorrect)).toBe(true)
        expect(isLearningAnswerCorrect(item.type, expected.slice(0, -1), expected)).toBe(false)
      } else if (item.type === 'SORTING') {
        expect(item.options).toHaveLength(4)
        expect(item.correctAnswer).toEqual(['plan', 'do', 'check', 'act'])
      } else {
        expect(item.options).toHaveLength(4)
        expect(item.options.filter((option) => option.isCorrect)).toHaveLength(1)
      }
    }
  })
})
