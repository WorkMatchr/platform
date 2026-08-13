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

export type PublicIntakeAnswerView = {
  questionKey: string
  questionVersion: number
  answerType: PublicIntakeAnswerType
  disposition: PublicIntakeAnswerDisposition
  source: 'AI_CONTEXT_PLANNER'
  version: number
  value: string | number | boolean | null
}

export type PublicIntakeContextQuestionView = {
  questionKey: string
  catalogVersion: string
  textSnapshot: string
  answerType: PublicIntakeAnswerType
  category: string
  sequence: number
  source: PublicIntakeAnswerSource
  createdAt: Date
}

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
  guidance: PublicIntakeGuidanceHandoff
  aiClassification?: AIClassifierOutput | null
  adviceDossier?: {
    id: string
    dossierCode: string
  } | null
}
