import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolvePublicSources } from '../../content/public-sources'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { learningChapter2Questions } from './learning-chapter2-content'
import { learningChapter4Questions } from './learning-chapter4-content'
import { learningChapter5Questions } from './learning-chapter5-content'
import { learningChapter6Questions } from './learning-chapter6-content'
import { learningChapter7Questions } from './learning-chapter7-content'
import { learningChapter8Questions } from './learning-chapter8-content'
import { learningChapter9Blocks as blocks, learningChapter9Questions as questions, learningChapter9SourceMetadata } from './learning-chapter9-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('WL-001 H9 — Van papier naar praktijk', () => {
  it('plaatst H9 op positie 9 van een immutable nieuwe versie met H1–H9', () => {
    const seed = readFileSync(new URL('../../../scripts/seed-learning.ts', import.meta.url), 'utf8')
    expect(seed).toContain("const learningCourseVersion = 'prototype-0.17'")
    expect(seed).toContain("slug: 'van-papier-naar-praktijk', title: 'Van papier naar praktijk', position: 9")
    expect(blocks[0].data).toMatchObject({ title: 'Van papier naar praktijk', eyebrow: 'Hoofdstuk 9 van 10', estimatedDurationLabel: '15–20 minuten' })
    expect(blocks[0].data.learningObjectives).toHaveLength(12)
    expect(blocks.slice(-6, -1).map((block) => block.questionCode)).toEqual(
      Array.from({ length: 5 }, (_, index) => `WL001-H9-CHECK-0${index + 1}`),
    )
    expect(blocks.at(-1)?.data).toMatchObject({ label: 'AFRONDING', title: 'Van papier naar praktijk' })
    expect(seed).toContain("slug: 'integrale-praktijkcasus', title: 'Integrale praktijkcasus', position: 10")
  })

  it('bevat de praktijkroute, Logistiek Noord, work-as-done en de gevraagde leeronderwerpen', () => {
    const content = JSON.stringify({ blocks, questions }).toLocaleLowerCase('nl-NL')
    for (const phrase of ['logistiek noord', '80 meter', 'work as imagined', 'work as done', 'tilhulpmiddel',
      'voorlichting, onderricht en toezicht', 'nieuwe medewerkers', 'persoonlijke beschermingsmiddelen', 'toezicht',
      'werkplekrondgang', 'bijna-ongeval', 'lessons learned', 'leading en lagging', 'plan van aanpak']) {
      expect(content).toContain(phrase)
    }
    expect(blocks.some((block) => block.type === 'PROCESS' && JSON.stringify(block.data).includes('MAATREGEL GEBORGD'))).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'METHODIEK')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'GOEDE PRAKTIJK')).toBe(true)
    expect(blocks.some((block) => block.type === 'CALLOUT' && block.data.label === 'WETTELIJKE EIS')).toBe(true)
    expect(blocks.some((block) => block.type === 'SUMMARY')).toBe(true)
    expect(blocks.filter((block) => block.type === 'CALLOUT' && block.data.label === 'WETTELIJKE EIS')[0].data.sourceUrl)
      .toBe('https://wetten.overheid.nl/BWBR0010346/Hoofdstuk2_Artikel8')
    expect(learningChapter9SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
    expect(resolvePublicSources(learningChapter9SourceMetadata.sourceIds)).toHaveLength(2)
  })

  it('houdt gedrag, omstandigheden, instructie en borging in balans', () => {
    const content = JSON.stringify({ blocks, questions }).toLocaleLowerCase('nl-NL')
    expect(content).toContain('individuele verantwoordelijkheid blijft bestaan')
    expect(content).toContain('direct gevaar')
    expect(content).toContain('oorzaak')
    expect(content).toContain('praktisch beschikbaar')
    expect(content).toContain('effectiviteit')
    expect(content).toContain('geen universeel wettelijk voorgeschreven format')
    expect(content).not.toContain('alle medewerkers zijn lui')
    expect(content).not.toContain('medewerkers geven niets om veiligheid')
  })

  it('heeft unieke Question Bank-codes, complete antwoordsets en vijf formatieve checks', () => {
    const all = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...learningChapter4Questions,
      ...learningChapter5Questions, ...learningChapter6Questions, ...learningChapter7Questions, ...learningChapter8Questions, ...questions]
    expect(new Set(all.map((item) => item.code)).size).toBe(all.length)
    expect(new Set(questions.map((item) => item.code)).size).toBe(questions.length)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    expect(blocks.filter((block) => block.questionCode?.startsWith('WL001-H9-CHECK-'))).toHaveLength(5)
    expect(new Set(questions.map((item) => item.knowledgeArea).filter(Boolean)).size).toBeGreaterThanOrEqual(8)
    const correctOptionPositions = questions.filter((item) => item.type === 'SINGLE_CHOICE')
      .map((item) => item.options.findIndex((option) => option.isCorrect))
    expect(new Set(correctOptionPositions).size).toBeGreaterThan(1)

    for (const item of questions) {
      expect(item.code).toMatch(/^WL001-H9-[A-Z0-9-]+$/)
      expect(item.explanation.length).toBeGreaterThan(60)
      expect(new Set(item.options.map((option) => option.value)).size).toBe(item.options.length)
      expect(item.options.filter((option) => option.isCorrect).map((option) => option.value)).toEqual(item.correctAnswer)
      const expected = item.correctAnswer as string[]
      const answer = item.type === 'MULTI_CHOICE' ? expected : expected[0]
      expect(isLearningAnswerShapeValid(item.type, answer, item.options.map((option) => option.value), item.correctAnswer)).toBe(true)
      expect(isLearningAnswerCorrect(item.type, answer, item.correctAnswer)).toBe(true)
      if (item.type === 'MULTI_CHOICE') {
        expect(item.options.some((option) => !option.isCorrect)).toBe(true)
        expect(isLearningAnswerCorrect(item.type, expected.slice(0, -1), expected)).toBe(false)
      } else {
        expect(item.type).toBe('SINGLE_CHOICE')
        expect(item.options).toHaveLength(4)
        expect(item.options.filter((option) => option.isCorrect)).toHaveLength(1)
      }
    }
  })
})
