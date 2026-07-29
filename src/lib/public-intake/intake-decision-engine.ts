import type {
  PublicIntakeEntryPoint,
  PublicIntakePhase,
} from '@/generated/prisma/client'
import {
  publicIntakeQuestions,
  type PublicIntakeDecisionCategory,
  type PublicIntakeQuestionCondition,
  type PublicIntakeQuestionDefinition,
} from './public-intake-questions'
import type { PublicIntakeAnswerView } from './public-intake-types'

export type IntakeDecisionStep =
  | PublicIntakeDecisionCategory
  | 'SUMMARY'
  | 'LIMITED_ROUTE'

export type IntakeDecisionInput = {
  entryPoint: PublicIntakeEntryPoint
  selectedRequestKey: string | null
  answers: readonly PublicIntakeAnswerView[]
  lifecycle: PublicIntakePhase
  questionDefinitions?: readonly PublicIntakeQuestionDefinition[]
}

export type IntakeDecisionOutput = {
  nextQuestionKey: string | null
  currentStep: IntakeDecisionStep
  remainingQuestions: readonly string[]
  isReadyForSummary: boolean
  missingRequiredInformation: readonly string[]
  optionalQuestions: readonly string[]
}

const RIE_ENTRY_POINTS = new Set(['rie_needed', 'rie_update', 'rie_uncertain'])
const CLOSED_LIFECYCLE_PHASES = new Set<PublicIntakePhase>([
  'SUMMARY_PRESENTED',
  'REGISTRATION_STARTED',
  'ACCOUNT_LINKED',
  'SUBMITTED',
  'ABANDONED',
  'ABANDONED_BY_USER',
  'ABANDONED_TIMEOUT',
  'EXPIRED',
])

function answerMatchesCondition(
  answer: PublicIntakeAnswerView | undefined,
  condition: PublicIntakeQuestionCondition,
): boolean {
  if (!answer) return false
  if (
    condition.dispositions &&
    !condition.dispositions.includes(answer.disposition)
  ) {
    return false
  }
  if (!condition.values) return true
  if (answer.disposition === 'UNKNOWN') {
    return condition.dispositions?.includes('UNKNOWN') ?? false
  }
  return (
    answer.value !== null &&
    condition.values.some((value) => value === answer.value)
  )
}

function isVisible(
  question: PublicIntakeQuestionDefinition,
  answersByKey: ReadonlyMap<string, PublicIntakeAnswerView>,
): boolean {
  if (!question.decision.enabled) return false
  if (
    question.decision.dependsOn.some(
      (questionKey) => !answersByKey.has(questionKey),
    )
  ) {
    return false
  }
  return question.decision.visibleWhen.every((condition) =>
    answerMatchesCondition(answersByKey.get(condition.questionKey), condition),
  )
}

function isResolved(
  question: PublicIntakeQuestionDefinition,
  answer: PublicIntakeAnswerView | undefined,
): boolean {
  if (!answer) return false
  if (answer.disposition === 'ANSWERED') return true
  return !question.decision.repeatIfUnknown
}

export function decidePublicIntake(
  input: IntakeDecisionInput,
): IntakeDecisionOutput {
  if (
    input.entryPoint === 'RECOGNIZABLE_REQUEST' &&
    input.selectedRequestKey !== null &&
    !RIE_ENTRY_POINTS.has(input.selectedRequestKey)
  ) {
    return {
      nextQuestionKey: null,
      currentStep: 'LIMITED_ROUTE',
      remainingQuestions: [],
      isReadyForSummary: false,
      missingRequiredInformation: [],
      optionalQuestions: [],
    }
  }

  if (CLOSED_LIFECYCLE_PHASES.has(input.lifecycle)) {
    return {
      nextQuestionKey: null,
      currentStep: 'SUMMARY',
      remainingQuestions: [],
      isReadyForSummary: true,
      missingRequiredInformation: [],
      optionalQuestions: [],
    }
  }

  const answersByKey = new Map(
    input.answers.map((answer) => [answer.questionKey, answer]),
  )
  const visibleQuestions = [
    ...(input.questionDefinitions ?? publicIntakeQuestions),
  ]
    .filter((question) => isVisible(question, answersByKey))
    .sort(
      (left, right) =>
        left.decision.order - right.decision.order ||
        left.questionKey.localeCompare(right.questionKey),
    )

  const unanswered = visibleQuestions.filter(
    (question) => !answersByKey.has(question.questionKey),
  )
  const deferredRequired = visibleQuestions.filter((question) => {
    const answer = answersByKey.get(question.questionKey)
    return (
      answer !== undefined &&
      answer.disposition !== 'ANSWERED' &&
      question.decision.required &&
      question.decision.repeatIfUnknown
    )
  })
  const remainingQuestions = [...unanswered, ...deferredRequired].map(
    (question) => question.questionKey,
  )
  const missingRequiredInformation = visibleQuestions
    .filter(
      (question) =>
        question.decision.required &&
        !isResolved(question, answersByKey.get(question.questionKey)),
    )
    .map((question) => question.questionKey)
  const optionalQuestions = visibleQuestions
    .filter(
      (question) =>
        question.decision.optional &&
        !isResolved(question, answersByKey.get(question.questionKey)),
    )
    .map((question) => question.questionKey)
  const nextQuestion = [...unanswered, ...deferredRequired][0] ?? null

  return {
    nextQuestionKey: nextQuestion?.questionKey ?? null,
    currentStep: nextQuestion?.decision.category ?? 'SUMMARY',
    remainingQuestions,
    isReadyForSummary:
      nextQuestion === null && missingRequiredInformation.length === 0,
    missingRequiredInformation,
    optionalQuestions,
  }
}
