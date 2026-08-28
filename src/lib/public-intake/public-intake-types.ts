import type {
  PublicIntakeAnswerDisposition,
  PublicIntakeAnswerSource,
  PublicIntakeAnswerType,
  PublicIntakeEntryPoint,
  PublicIntakePhase,
} from '@/generated/prisma/client'
import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import type { PublicIntakeGuidanceHandoff } from './public-intake-guidance-handoff'
import type { KnowledgeContextId } from '@/content/knowledge/knowledge-contexts'
import type { PersistedContextQuestionPlan } from './context-question-engine-types'

export type PublicIntakeAnswerView = {
  questionKey: string
  questionVersion: number
  answerType: PublicIntakeAnswerType
  disposition: PublicIntakeAnswerDisposition
  source: PublicIntakeAnswerSource
  version: number
  value: string | number | boolean | readonly string[] | null
}

export type PublicIntakeContextQuestionView = {
  questionKey: string
  catalogVersion: string
  textSnapshot: string
  answerType: PublicIntakeAnswerType
  category: string
  sequence: number
  source: 'AI_CONTEXT_PLANNER'
  createdAt: Date
  options?: readonly Readonly<{ label: string; value: string }>[]
  contextGoalCode?: string | null
  planning?: PersistedContextQuestionPlan | null
}

export type PublicIntakeSharedAssignmentContextView = Readonly<{
  version: string
  sector: Readonly<{
    code: string
    label: string
    source: 'ORIGINAL_INPUT' | 'USER_ANSWER'
  }> | null
}>

export type PublicIntakeDraftView = {
  id?: string
  phase: PublicIntakePhase
  entryPoint: PublicIntakeEntryPoint
  originalInput: string | null
  selectedRequestKey: string | null
  knowledgeContext?: {
    id: KnowledgeContextId
    version: number
    sourceRoute: string
    shortLabel: string
    title: string
    suggestedCategory: string | null
  } | null
  flowVersion: string
  currentStep: string | null
  version: number
  startedAt: Date
  lastInteractionAt: Date
  expiresAt: Date
  answers: PublicIntakeAnswerView[]
  contextQuestions?: readonly PublicIntakeContextQuestionView[]
  sharedAssignmentContext?: PublicIntakeSharedAssignmentContextView
  guidance: PublicIntakeGuidanceHandoff
  aiClassification?: AIClassifierOutput | null
  aiClassificationProtection?: 'RATE_LIMITED' | 'PROTECTION_UNAVAILABLE'
  adviceDossier?: {
    id: string
    dossierCode: string
  } | null
}
