import type { LearningQuestionType } from '@/generated/prisma/enums'

function sameValues(actual: string[], expected: string[], ordered: boolean) {
  if (actual.length !== expected.length) return false
  if (ordered) return actual.every((value, index) => value === expected[index])
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return actualSet.size === actual.length && actualSet.size === expectedSet.size && expected.every((value) => actualSet.has(value))
}

export function isLearningAnswerCorrect(
  type: LearningQuestionType,
  answer: unknown,
  correctAnswer: unknown,
): boolean {
  if (type === 'SORTING') {
    if (answer && !Array.isArray(answer) && typeof answer === 'object' && !Array.isArray(correctAnswer) && correctAnswer && typeof correctAnswer === 'object') {
      return JSON.stringify(answer, Object.keys(answer as Record<string, unknown>).sort()) ===
        JSON.stringify(correctAnswer, Object.keys(correctAnswer as Record<string, unknown>).sort())
    }
    if (!Array.isArray(answer) || !answer.every((value) => typeof value === 'string')) return false
    if (!Array.isArray(correctAnswer) || !correctAnswer.every((value) => typeof value === 'string')) return false
    return sameValues(answer, correctAnswer, true)
  }

  if (type === 'MULTI_CHOICE') {
    if (!Array.isArray(answer) || !answer.every((value) => typeof value === 'string')) return false
    if (!Array.isArray(correctAnswer) || !correctAnswer.every((value) => typeof value === 'string')) return false
    return sameValues(answer, correctAnswer, false)
  }

  if (typeof answer !== 'string' || !Array.isArray(correctAnswer)) return false
  return correctAnswer.length === 1 && correctAnswer[0] === answer
}

export function isLearningAnswerShapeValid(type: LearningQuestionType, answer: unknown, optionValues: string[], correctAnswer?: unknown) {
  const allowed = new Set(optionValues)
  if (type === 'SORTING' && answer && !Array.isArray(answer) && typeof answer === 'object') {
    const record = answer as Record<string, unknown>
    const expected = correctAnswer && typeof correctAnswer === 'object' && !Array.isArray(correctAnswer)
      ? Object.values(correctAnswer as Record<string, unknown>)
      : []
    const categories = new Set(expected.filter((value): value is string => typeof value === 'string'))
    return Object.keys(record).length === optionValues.length && optionValues.every((value) => typeof record[value] === 'string' && categories.has(record[value] as string))
  }
  if (type === 'SORTING' || type === 'MULTI_CHOICE') {
    return Array.isArray(answer) && answer.length > 0 && answer.length <= 20 &&
      answer.every((value) => typeof value === 'string' && allowed.has(value)) &&
      new Set(answer).size === answer.length
  }
  return typeof answer === 'string' && answer.length <= 100 && allowed.has(answer)
}
