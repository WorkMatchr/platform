import type {
  PublicIntakeAnswerDisposition,
  PublicIntakeAnswerSource,
  PublicIntakeAnswerType,
  PublicIntakeEntryPoint,
  PublicIntakePhase,
} from '@/generated/prisma/client'
import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import type { PublicIntakeGuidanceHandoff } from './public-intake-guidance-handoff'

export type PublicIntakeAnswerView = {
  questionKey: string
  questionVersion: number
  answerType: PublicIntakeAnswerType
  disposition: PublicIntakeAnswerDisposition
  source: PublicIntakeAnswerSource
  version: number
  value: string | number | boolean | null
}

export type PublicIntakeDraftView = {
  phase: PublicIntakePhase
  entryPoint: PublicIntakeEntryPoint
  originalInput: string | null
  selectedRequestKey: string | null
  flowVersion: string
  currentStep: string | null
  version: number
  startedAt: Date
  lastInteractionAt: Date
  expiresAt: Date
  answers: PublicIntakeAnswerView[]
  guidance: PublicIntakeGuidanceHandoff
  aiClassification?: AIClassifierOutput | null
}
