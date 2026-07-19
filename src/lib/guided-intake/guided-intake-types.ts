import type { PublicRoute } from '@/content/public-routes'

export type GuidedQuestionId =
  | 'START_SITUATION'
  | 'EMPLOYEE_COUNT'
  | 'RIE_STATUS'
  | 'DECISION_GOAL'
  | 'DESIRED_TIMING'

export type GuidedAnswerValue =
  | 'HAS_EMPLOYEES'
  | 'ONE'
  | 'TWO_TO_TWENTY_FIVE'
  | 'MORE_THAN_TWENTY_FIVE'
  | 'CURRENT'
  | 'OUTDATED'
  | 'NONE'
  | 'UNKNOWN'
  | 'LEGAL_CLARITY'
  | 'RISKS'
  | 'IMPROVE_RIE'
  | 'PRACTICAL_SUPPORT'
  | 'ORIENTING'
  | 'SOON'
  | 'SPECIFIC_DATE'

export type GuidedAnswers = Partial<Record<GuidedQuestionId, GuidedAnswerValue>> & {
  desiredDate?: string
}

export type GuidedFactKey =
  | 'HAS_EMPLOYEES'
  | 'EMPLOYEE_COUNT'
  | 'RIE_STATUS'
  | 'DECISION_GOAL'
  | 'DESIRED_TIMING'
  | 'DESIRED_DATE'

export type GuidedQuestionOption = {
  value: GuidedAnswerValue
  label: string
  description?: string
}

export type GuidedQuestion = {
  id: GuidedQuestionId
  title: string
  helpText: string
  decisionPurpose: string
  factKey: GuidedFactKey
  options: readonly GuidedQuestionOption[]
  dateRefinement?: {
    when: GuidedAnswerValue
    label: string
    helpText: string
  }
}

export type GuidedFact = {
  key: GuidedFactKey
  value: string | boolean
  label: string
  sourceQuestionId: GuidedQuestionId
}

export type RecommendationLink = {
  label: string
  href: PublicRoute
}

export type GuidedRecommendation = {
  id: string
  title: string
  summary: string
  reasons: readonly string[]
  nextActions: readonly string[]
  knowledgeLinks: readonly RecommendationLink[]
  serviceLinks: readonly RecommendationLink[]
}

export type GuidedIntakeResult = {
  facts: readonly GuidedFact[]
  recommendation: GuidedRecommendation
  disclaimer: string
}
