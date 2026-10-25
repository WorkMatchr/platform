import { describe, expect, it } from 'vitest'
import { learningChapter2Blocks as blocks, learningChapter2Questions as questions, learningChapter2SourceMetadata } from './learning-chapter2-content'
import { learningQuestions, learningChapter3Questions } from './learning-prototype-content'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'
import { resolvePublicSources } from '../../content/public-sources'

describe('WL-001 hoofdstuk 2', () => {
  it('gebruikt bestaande contenttypen, acht leerdoelen en exact vijf afsluitende oefeningen', () => {
    expect(blocks[0].data).toMatchObject({ title: 'Wie doet wat?', eyebrow: 'Hoofdstuk 2 van 10', estimatedDurationLabel: '12–15 minuten' })
    expect(blocks[0].data.learningObjectives).toHaveLength(8)
    const checkIndex = blocks.findIndex((block) => block.data.title === 'Hoofdstukcheck')
    expect(blocks.slice(checkIndex + 1).map((block) => block.questionCode)).toEqual([
      'WL001-H2-CHECK-01', 'WL001-H2-CHECK-02', 'WL001-H2-CHECK-03', 'WL001-H2-CHECK-04', 'WL001-H2-CHECK-05',
    ])
    const allCodes = [...learningQuestions, ...questions, ...learningChapter3Questions].map((question) => question.code)
    expect(new Set(allCodes).size).toBe(allCodes.length)
    expect(blocks.filter((block) => block.questionCode)).toHaveLength(questions.length)
    for (const block of blocks) expect(['HEADING', 'TEXT', 'CALLOUT', 'PROCESS', 'SUMMARY', 'SINGLE_CHOICE', 'TRUE_FALSE', 'MULTI_CHOICE', 'SORTING', 'CASE_STUDY']).toContain(block.type)
  })

  it('koppelt elke oefening aan de vraagbank en accepteert de volledige correcte antwoorden server-side', () => {
    for (const question of questions) {
      const block = blocks.find((item) => item.questionCode === question.code)!
      expect(block, question.code).toBeDefined()
      expect(block.data.prompt).toBe(question.questionText)
      const values = question.options.map((option) => option.value)
      expect(new Set(values).size).toBe(values.length)
      const answer = ['SINGLE_CHOICE', 'TRUE_FALSE', 'CASE_STUDY'].includes(question.type)
        ? (question.correctAnswer as string[])[0] : question.correctAnswer
      expect(isLearningAnswerShapeValid(question.type, answer, values, question.correctAnswer), question.code).toBe(true)
      expect(isLearningAnswerCorrect(question.type, answer, question.correctAnswer), question.code).toBe(true)
      if (question.type === 'SINGLE_CHOICE' || question.type === 'CASE_STUDY') {
        expect(question.options).toHaveLength(4)
        expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1)
        expect(question.correctAnswer).toHaveLength(1)
        for (const option of question.options.filter((item) => !item.isCorrect)) {
          expect(isLearningAnswerCorrect(question.type, option.value, question.correctAnswer)).toBe(false)
        }
      }
      if (question.type === 'MULTI_CHOICE') {
        expect(question.options.filter((option) => !option.isCorrect).length).toBeGreaterThanOrEqual(1)
        expect(question.options.filter((option) => option.isCorrect).map((option) => option.value).toSorted()).toEqual((question.correctAnswer as string[]).toSorted())
        expect(isLearningAnswerCorrect(question.type, values, question.correctAnswer)).toBe(false)
        expect(isLearningAnswerCorrect(question.type, (question.correctAnswer as string[]).slice(1), question.correctAnswer)).toBe(false)
      }
      if (question.type === 'SORTING') {
        expect(question.questionText).toContain('meest passende primaire rol')
        const categories = (block.data.categories as string[]).map((category) => category.toLowerCase())
        expect(Object.keys(question.correctAnswer).toSorted()).toEqual(values.toSorted())
        for (const category of Object.values(question.correctAnswer)) expect(categories).toContain(category)
        expect(isLearningAnswerShapeValid(question.type, {}, values, question.correctAnswer)).toBe(false)
        expect(isLearningAnswerCorrect(question.type, Object.fromEntries(values.map((value) => [value, 'werkgever'])), question.correctAnswer)).toBe(false)
      }
    }
  })

  it('behoudt bronverwijzingen en juridische nuances zonder een toetsingsprocedure te bouwen', () => {
    expect(resolvePublicSources(learningChapter2SourceMetadata.sourceIds)).toHaveLength(8)
    const content = JSON.stringify(blocks)
    for (const phrase of ['Sinds 1 juli 2026', 'maximaal 25 werknemers', 'onder voorwaarden', 'erkend branche-RI&E-instrument', 'geen vaste rekentabel', 'geen hiërarchie', 'Hoofdstuk 7', 'nog in ontwikkeling', '47 medewerkers', 'medische registratie']) expect(content).toContain(phrase)
    expect(learningChapter2SourceMetadata.reviewStatus).toBe('PROTOTYPE_REQUIRES_CONTENT_AND_LEGAL_REVIEW')
  })
})
