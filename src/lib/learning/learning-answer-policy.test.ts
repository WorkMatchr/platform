import { describe, expect, it } from 'vitest'
import { isLearningAnswerCorrect, isLearningAnswerShapeValid } from './learning-answer-policy'

describe('Learning-vraagbeleid', () => {
  it('controleert single choice en true/false tegen het opgeslagen antwoord', () => {
    expect(isLearningAnswerCorrect('SINGLE_CHOICE', 'ja', ['ja'])).toBe(true)
    expect(isLearningAnswerCorrect('TRUE_FALSE', 'onwaar', ['onwaar'])).toBe(true)
    expect(isLearningAnswerCorrect('CASE_STUDY', 'nee', ['ja'])).toBe(false)
  })

  it('accepteert meerdere juiste opties in elke gekozen volgorde', () => {
    expect(isLearningAnswerCorrect('MULTI_CHOICE', ['gewicht', 'duur'], ['duur', 'gewicht'])).toBe(true)
    expect(isLearningAnswerCorrect('MULTI_CHOICE', ['gewicht', 'kleur'], ['duur', 'gewicht'])).toBe(false)
    expect(isLearningAnswerShapeValid('MULTI_CHOICE', ['a', 'a'], ['a', 'b'])).toBe(false)
  })

  it('controleert zowel categorieën als vaste volgorde voor sorting', () => {
    const expected = { machine: 'gevaar', blootstelling: 'risico' }
    expect(isLearningAnswerShapeValid('SORTING', expected, ['machine', 'blootstelling'], expected)).toBe(true)
    expect(isLearningAnswerCorrect('SORTING', expected, expected)).toBe(true)
    expect(isLearningAnswerCorrect('SORTING', { machine: 'risico', blootstelling: 'gevaar' }, expected)).toBe(false)
    expect(isLearningAnswerCorrect('SORTING', ['a', 'b'], ['b', 'a'])).toBe(false)
  })

  it('weigert antwoordwaarden buiten de vraagopties', () => {
    expect(isLearningAnswerShapeValid('SINGLE_CHOICE', 'private-value', ['a', 'b'])).toBe(false)
    expect(isLearningAnswerShapeValid('SORTING', ['a', 'a'], ['a', 'b'])).toBe(false)
  })
})
