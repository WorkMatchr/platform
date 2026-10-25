export type ExamQuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE'

export interface ExamScoringItem {
  type: ExamQuestionType
  answer: unknown | null
  correctAnswer: unknown
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function sameSet(actual: string[], expected: string[]) {
  if (actual.length !== expected.length) return false
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return actualSet.size === actual.length && expectedSet.size === expected.length && expected.every((value) => actualSet.has(value))
}

export function isExamAnswerCorrect(type: ExamQuestionType, answer: unknown, correctAnswer: unknown) {
  if (type === 'SINGLE_CHOICE') {
    return typeof answer === 'string' && isStringList(correctAnswer) && correctAnswer.length === 1 && answer === correctAnswer[0]
  }
  return isStringList(answer) && isStringList(correctAnswer) && sameSet(answer, correctAnswer)
}

export function scoreExam(questions: ExamScoringItem[], passingScore: number) {
  const score = questions.reduce((total, question) => total + Number(
    question.answer !== null && isExamAnswerCorrect(question.type, question.answer, question.correctAnswer),
  ), 0)
  const maxScore = questions.length
  return {
    score,
    maxScore,
    percentage: maxScore === 0 ? 0 : Math.floor((score * 100) / maxScore),
    passed: maxScore > 0 && score >= passingScore,
  }
}

export function sanitizeExamQuestion<T extends {
  correctAnswer: unknown
  explanation: string
  options: Array<{ isCorrect: boolean; [key: string]: unknown }>
}>(question: T) {
  const safeQuestion = Object.fromEntries(
    Object.entries(question).filter(([key]) => key !== 'correctAnswer' && key !== 'explanation'),
  )
  return {
    ...safeQuestion,
    options: question.options.map((option) => Object.fromEntries(
      Object.entries(option).filter(([key]) => key !== 'isCorrect'),
    )),
  }
}
