import { describe, expect, it } from 'vitest'
import { intakeQuestionnaireV1 } from './intake-questionnaire-v1'

describe('vraagset Arbo en veiligheid versie 1', () => {
  it('heeft stabiele unieke vragen en opties', () => {
    const questions = intakeQuestionnaireV1.questions
    const options = questions.flatMap((question) => ('options' in question && question.options ? question.options : []))

    expect(questions).toHaveLength(12)
    expect(options).toHaveLength(35)
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length)
    expect(new Set(questions.map((question) => question.key)).size).toBe(questions.length)
    expect(new Set(questions.map((question) => question.sortOrder)).size).toBe(questions.length)
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length)
  })

  it('bevat de verplichte kern voor gereedmelden', () => {
    const requiredKeys = intakeQuestionnaireV1.questions.filter((question) => question.isRequired).map((question) => question.key)

    expect(requiredKeys).toEqual([
      'HELP_REQUEST_DESCRIPTION',
      'HELP_REQUEST_TOPICS',
      'DESIRED_OUTCOME_DESCRIPTION',
      'SITUATION_DESCRIPTION',
      'SUPPORT_URGENCY',
      'PREFERRED_WORK_MODE',
    ])
    expect(intakeQuestionnaireV1.questions.find((question) => question.key === 'PRIMARY_LOCATION')?.isRequired).toBe(false)
  })

  it('ondersteunt alle antwoordvormen uit het goedgekeurde voorstel', () => {
    const inputTypes = new Set(intakeQuestionnaireV1.questions.map((question) => question.inputType))

    expect(inputTypes).toEqual(new Set(['LONG_TEXT', 'MULTI_SELECT', 'NUMBER', 'SINGLE_SELECT', 'ORGANIZATION_LOCATION', 'DATE']))
  })

  it('maakt onzekerheidsopties exclusief bij meerkeuzevragen', () => {
    const multiSelectQuestions = intakeQuestionnaireV1.questions.filter((question) => question.inputType === 'MULTI_SELECT')

    for (const question of multiSelectQuestions) {
      const notSure = 'options' in question ? question.options.find((option) => option.value === 'NOT_SURE') : undefined
      expect(notSure?.isExclusive).toBe(true)
    }
  })
})
