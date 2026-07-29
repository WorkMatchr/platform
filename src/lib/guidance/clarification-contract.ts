import type { GuidanceConfirmationStatus } from './guidance-domain'

export const CLARIFICATION_RESULT_SCHEMA_VERSION =
  'clarification-result/1.0.0' as const

export const clarificationCompletionReasons = [
  'NEXT_QUESTION_AVAILABLE',
  'REQUIRED_INFORMATION_AVAILABLE',
  'QUESTION_BUDGET_EXHAUSTED',
  'NO_FURTHER_QUESTION_AVAILABLE',
  'UNSUPPORTED_SITUATION',
] as const

export type ClarificationCompletionReason =
  (typeof clarificationCompletionReasons)[number]

export type ClarificationQuestion = Readonly<{
  key: string
  text: string
  answerType: 'BOOLEAN' | 'OPTION'
  resultingFactKey: string
}>

export type ClarificationProvenance = Readonly<{
  contract: Readonly<{
    schemaVersion: string
    id: string
    version: number
  }>
  helpRequestConfirmationStatus: GuidanceConfirmationStatus
  ruleSetVersion: string
  engineVersion: string
  appliedRuleCodes: readonly string[]
}>

export type ClarificationResult = Readonly<{
  schemaVersion: typeof CLARIFICATION_RESULT_SCHEMA_VERSION
  isComplete: boolean
  nextQuestion: ClarificationQuestion | null
  missingFacts: readonly string[]
  missingUncertainties: readonly string[]
  completionReason: ClarificationCompletionReason
  askedQuestionKeys: readonly string[]
  questionLimit: number
  remainingQuestionBudget: number
  provenance: ClarificationProvenance
}>
