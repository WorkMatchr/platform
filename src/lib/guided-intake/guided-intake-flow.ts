import { guidedIntakeQuestions } from './guided-intake-questions'
import type { GuidedAnswers, GuidedQuestionId } from './guided-intake-types'

export function getGuidedQuestion(index: number) {
  return guidedIntakeQuestions[index]
}

export function getGuidedQuestionIndex(questionId: GuidedQuestionId) {
  return guidedIntakeQuestions.findIndex((question) => question.id === questionId)
}

export function validateGuidedAnswer(
  questionId: GuidedQuestionId,
  answers: GuidedAnswers,
  today = new Date().toISOString().slice(0, 10),
) {
  const answer = answers[questionId]
  if (!answer) return 'Kies een antwoord om verder te gaan.'

  if (questionId === 'DESIRED_TIMING' && answer === 'SPECIFIC_DATE') {
    if (!answers.desiredDate) return 'Vul de gewenste datum in.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(answers.desiredDate)) return 'Vul een geldige datum in.'
    if (answers.desiredDate < today) return 'Kies vandaag of een datum in de toekomst.'
  }

  return null
}

export function validateCompleteGuidedIntake(answers: GuidedAnswers, today?: string) {
  return guidedIntakeQuestions
    .map((question) => ({ questionId: question.id, message: validateGuidedAnswer(question.id, answers, today) }))
    .filter((issue): issue is { questionId: GuidedQuestionId; message: string } => Boolean(issue.message))
}
