import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { analyzeFinalExamAnswerLengths, finalExamDistractorPolishedCodes, finalExamLegalReviewCodes, finalExamV11TextAdjustedCodes, parseFinalExamQuestionBank } from './learning-final-exam-content'

const sourceV10 = readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md', 'utf8')
const sourceV11 = readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8')
const questions = parseFinalExamQuestionBank(sourceV10)
const questionsV11 = parseFinalExamQuestionBank(sourceV11)

describe('WL-001 canonieke eindtoetsbank v1.0', () => {
  it('bevat exact E01–E50 met de vastgelegde hoofdstukverdeling', () => {
    expect(questions.map((question) => question.code)).toEqual(Array.from({ length: 50 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`))
    expect(Array.from({ length: 10 }, (_, index) => questions.filter((question) => question.chapterNumber === index + 1).length))
      .toEqual([3, 4, 5, 6, 6, 5, 5, 4, 4, 8])
  })

  it('heeft unieke antwoordcodes en een volledige, typeconforme juiste set per vraag', () => {
    for (const question of questions) {
      const values = question.options.map((option) => option.value)
      expect(new Set(values).size, question.code).toBe(values.length)
      expect(question.correctAnswer, question.code).toEqual(question.options.filter((option) => option.isCorrect).map((option) => option.value))
      expect(question.type === 'SINGLE_CHOICE' ? question.correctAnswer.length === 1 : question.correctAnswer.length >= 2, question.code).toBe(true)
      expect(question.options.length, question.code).toBeGreaterThanOrEqual(4)
      expect(question.options.some((option) => !option.isCorrect), question.code).toBe(true)
    }
  })

  it('behoudt kritieke actualisatiecopy en de definitieve integrale slotvraag', () => {
    const e35 = questions.find((question) => question.code === 'E35')!
    expect(e35.questionText).toContain('automatisch')
    expect(e35.correctAnswer).toEqual(['C'])
    expect(e35.options.find((option) => option.value === 'B')?.text).toContain('Vijf jaar')
    expect(e35.options.find((option) => option.value === 'C')?.text).toContain('Geen algemene vaste geldigheidsduur')
    const e50 = questions.find((question) => question.code === 'E50')!
    expect(e50.correctAnswer).toEqual(['A'])
    expect(e50.questionText).toContain('twee bijna-aanrijdingen')
    expect(e50.options[0].text).toContain('actualiseer RI&E/PvA')
  })

  it('gebruikt uitsluitend de extern gereviewde definitieve E13 en E39', () => {
    const e13 = questionsV11.find((question) => question.code === 'E13')!
    expect(e13.chapterNumber).toBe(4)
    expect(e13.knowledgeArea).toBe('Beoordelen/prioriteren')
    expect(e13.cognitiveLevel).toBe('T')
    expect(e13.difficulty).toBe(2)
    expect(e13.correctAnswer).toEqual(['B'])
    expect(e13.questionText).toContain('onvoldoende voor een betrouwbare beoordeling van het risico of de blootstelling')
    expect(e13.explanation).toContain('kan aanvullend of verdiepend onderzoek nodig zijn')
    const e39 = questionsV11.find((question) => question.code === 'E39')!
    expect(e39.chapterNumber).toBe(9)
    expect(e39.knowledgeArea).toBe('Borging/praktijk')
    expect(e39.cognitiveLevel).toBe('T')
    expect(e39.difficulty).toBe(2)
    expect(e39.correctAnswer).toEqual(['C'])
    expect(e39.questionText).toContain('uitzendkrachten')
    expect(e39.options.find((option) => option.value === 'C')?.text).toContain('vóór aanvang en gedurende de werkzaamheden')
    expect(e39.explanation).toContain('Het inlenende bedrijf')
    expect(e39.explanation).toContain('ook het uitzendbureau heeft verplichtingen')
  })

  it('classificeert 42 single choice, 8 multi choice en kritieke leerdoelen uit de bron', () => {
    expect(questions.filter((question) => question.type === 'SINGLE_CHOICE')).toHaveLength(42)
    expect(questions.filter((question) => question.type === 'MULTI_CHOICE')).toHaveLength(8)
    expect(questions.filter((question) => question.isCritical)).toHaveLength(20)
  })

  it('markeert juridische review voor toetsingsvragen zonder datamodeluitbreiding', () => {
    expect(finalExamLegalReviewCodes).toEqual(['E31', 'E32', 'E33', 'E34', 'E39', 'E44'])
    expect(questionsV11.filter((question) => finalExamLegalReviewCodes.includes(question.code as typeof finalExamLegalReviewCodes[number])))
      .toHaveLength(6)
  })

  it('behoudt correcte antwoordsets bij de beperkte afleiderpolish', () => {
    expect(finalExamDistractorPolishedCodes).toEqual(['E15', 'E19', 'E24', 'E26', 'E27', 'E29', 'E35', 'E37', 'E38', 'E46', 'E49', 'E50'])
    const stableKeys: Record<string, string[]> = {
      E15: ['A'], E19: ['A'], E24: ['A', 'B', 'C', 'E'], E26: ['C'], E27: ['B'], E29: ['B'],
      E35: ['C'], E37: ['D'], E38: ['A'], E46: ['A'], E49: ['C'], E50: ['A'],
    }
    for (const [code, answer] of Object.entries(stableKeys)) {
      expect(questions.find((question) => question.code === code)?.correctAnswer, code).toEqual(answer)
    }
    expect(questions.find((question) => question.code === 'E13')?.correctAnswer).toEqual(['B'])
    expect(questions.find((question) => question.code === 'E39')?.correctAnswer).toEqual(['C'])
  })

  it('behoudt v1.0 als historische bron en maakt in v1.1 alleen nieuwe vraagversies voor gewijzigde inhoud', () => {
    expect(sourceV10).toContain('WL-001 FINAL EXAM v1.0')
    expect(sourceV11).toContain('WL-001 FINAL EXAM v1.1')
    expect(questionsV11.map((question) => question.code)).toEqual(questions.map((question) => question.code))
    expect(finalExamV11TextAdjustedCodes).toHaveLength(29)
    const changedCodes = questionsV11.filter((question, index) => {
      const previous = questions[index]!
      expect(question.type, `${question.code} question type`).toBe(previous.type)
      expect(question.correctAnswer, `${question.code} correct answer set`).toEqual(previous.correctAnswer)
      return question.title !== previous.title
        || question.chapterNumber !== previous.chapterNumber
        || question.knowledgeArea !== previous.knowledgeArea
        || question.cognitiveLevel !== previous.cognitiveLevel
        || question.difficulty !== previous.difficulty
        || question.type !== previous.type
        || question.isCritical !== previous.isCritical
        || question.criticalObjective !== previous.criticalObjective
        || question.questionText !== previous.questionText
        || question.correctAnswer.join('|') !== previous.correctAnswer.join('|')
        || question.explanation !== previous.explanation
        || JSON.stringify(question.options.map(({ value, text, isCorrect }) => ({ value, text, isCorrect })))
          !== JSON.stringify(previous.options.map(({ value, text, isCorrect }) => ({ value, text, isCorrect })))
    }).map((question) => question.code)
    expect(changedCodes).toHaveLength(40)
    expect(changedCodes).toContain('E44')
    expect(changedCodes).toEqual(expect.arrayContaining([
      ...finalExamV11TextAdjustedCodes, 'E04', 'E06', 'E19', 'E20', 'E24', 'E31', 'E32', 'E33', 'E34', 'E49',
    ]))
  })

  it('vervangt E44 integraal en houdt de H4-onzekerheidsvraag E16 inhoudelijk apart', () => {
    const e16 = questionsV11.find((question) => question.code === 'E16')!
    const e44 = questionsV11.find((question) => question.code === 'E44')!
    expect(e16.chapterNumber).toBe(4)
    expect(e16.questionText).toContain('"middel" scoren')
    expect(e16.correctAnswer).toEqual(['D'])
    expect(e16.options.find((option) => option.value === 'D')?.text).toContain('verzamel')
    expect(e16.options.find((option) => option.value === 'D')?.text).toContain('beoordeel daarna')

    expect(e44.chapterNumber).toBe(10)
    expect(e44.knowledgeArea).toBe('Integrale toepassing / inventariseren / deskundigheid / beheersing')
    expect(e44.cognitiveLevel).toBe('A')
    expect(e44.difficulty).toBe(3)
    expect(e44.type).toBe('SINGLE_CHOICE')
    expect(e44.isCritical).toBe(true)
    expect(e44.title).toBe('Van signaal naar passende vervolgstap')
    expect(e44.questionText).toContain('nieuw productieproces')
    expect(e44.questionText).toContain('hoofdpijn en irritatie aan ogen en luchtwegen')
    expect(e44.correctAnswer).toEqual(['B'])
    expect(e44.options.find((option) => option.value === 'B')?.text).toContain('tijdelijke beheersmaatregelen')
    expect(e44.explanation).toContain('Stilleggen is niet automatisch vereist bij iedere klacht')
    expect(e44.explanation).toContain('tijdelijke beheersing nodig')
  })

  it('houdt de medezeggenschapstekst alleen op optie E van E06', () => {
    const e06 = questionsV11.find((question) => question.code === 'E06')!
    expect(e06.correctAnswer).toEqual(['A', 'B', 'C', 'E'])
    expect(e06.options.find((option) => option.value === 'B')?.text).toBe('De werkgever blijft verantwoordelijk voor de RI&E.')
    expect(e06.options.find((option) => option.value === 'E')?.text)
      .toBe('Werknemersbetrokkenheid en, waar van toepassing, medezeggenschap kunnen relevant zijn binnen het RI&E-proces.')
  })

  it('vermindert antwoordlengtebias zonder vaste antwoordletterreeks', () => {
    const before = analyzeFinalExamAnswerLengths(questions)
    const after = analyzeFinalExamAnswerLengths(questionsV11)
    expect(before).toMatchObject({ count: 42, clearlyLongestCount: 33, tieCount: 1 })
    expect(after.count).toBe(42)
    expect(after.clearlyLongestCount).toBeLessThanOrEqual(21)
    expect(after.clearlyLongestCount).toBe(10)
    expect(after.tieCount).toBe(1)

    const answers = questionsV11.filter((question) => question.type === 'SINGLE_CHOICE').map((question) => question.correctAnswer[0])
    const positions = ['A', 'B', 'C', 'D'].map((letter) => answers.filter((answer) => answer === letter).length)
    expect(positions).toEqual([9, 9, 14, 10])
    let longestRun = 1
    let currentRun = 1
    for (let index = 1; index < answers.length; index += 1) {
      currentRun = answers[index] === answers[index - 1] ? currentRun + 1 : 1
      longestRun = Math.max(longestRun, currentRun)
    }
    expect(longestRun).toBeLessThanOrEqual(2)
  })

  it('markeert E31–E34, E39 en E44 voor juridische contentreview in v1.1', () => {
    expect(finalExamLegalReviewCodes).toEqual(['E31', 'E32', 'E33', 'E34', 'E39', 'E44'])
    expect(questionsV11.filter((question) => finalExamLegalReviewCodes.includes(question.code as typeof finalExamLegalReviewCodes[number])))
      .toHaveLength(6)
    expect(questionsV11.find((question) => question.code === 'E31')?.explanation).toContain('Checklist Gezondheidsrisico’s')
    expect(questionsV11.find((question) => question.code === 'E31')?.explanation).toContain('maximaal 40 uur per week')
    expect(questionsV11.find((question) => question.code === 'E32')?.options.find((option) => option.value === 'A')?.text)
      .toContain('officieel als erkend branche-RI&E-instrument geldt')
    expect(questionsV11.find((question) => question.code === 'E33')?.explanation).toContain('niet automatisch dezelfde rol')
    expect(questionsV11.find((question) => question.code === 'E34')?.explanation).toContain('De werkgever beoordeelt en verwerkt')
  })

  it('behoudt de volledige scoringconfiguratie en multi-choice instructie', () => {
    expect(sourceV11).toContain('**Pass:** 40/50 = 80%')
    expect(sourceV11).toContain('**MULTI_CHOICE:** exact correct set = 1; partial/extra/wrong = 0')
    const multiChoiceCodes = questionsV11.filter((question) => question.type === 'MULTI_CHOICE').map((question) => question.code)
    expect(multiChoiceCodes).toHaveLength(8)
  })
})
