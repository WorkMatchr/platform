import type { CaseUnderstanding } from './case-understanding-contract'

export const AI_INTAKE_SUBJECT_CODES = [
  'RIE',
  'INCIDENT',
  'HAZARDOUS_SUBSTANCES',
  'OCCUPATIONAL_HEALTH',
  'EMERGENCY_RESPONSE',
  'UNKNOWN',
] as const

export const AI_INTAKE_CONFIDENCE_LEVELS = [
  'HIGH',
  'MEDIUM',
  'LOW',
] as const

export const AI_CLASSIFIER_FALLBACK_REASONS = [
  'CONFIGURATION_MISSING',
  'CACHE_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_REQUEST_REJECTED',
  'OUTPUT_INVALID',
  'RATE_LIMITED',
  'ABUSE_PROTECTION_UNAVAILABLE',
  'INPUT_REJECTED',
  'UNKNOWN_ERROR',
] as const

export const AI_INTAKE_CLASSIFIER_VERSION =
  'ai-intake-classifier/2.0.0' as const

export type AIIntakeSubjectCode =
  (typeof AI_INTAKE_SUBJECT_CODES)[number]

export type AIIntakeConfidence =
  (typeof AI_INTAKE_CONFIDENCE_LEVELS)[number]

export type AIClassifierFallbackReason =
  (typeof AI_CLASSIFIER_FALLBACK_REASONS)[number]

export type AIClassifierInput = Readonly<{
  helpRequest: string
}>

export type AIClassifierOutput = Readonly<{
  summary: string
  primarySubject: AIIntakeSubjectCode
  secondarySubjects: readonly AIIntakeSubjectCode[]
  confidence: AIIntakeConfidence
  alternatives: readonly AIIntakeSubjectCode[]
  caseUnderstanding?: CaseUnderstanding
}>

export interface AIClassifier {
  readonly provider: string
  readonly model: string
  classify(input: AIClassifierInput): Promise<AIClassifierOutput>
}

export type AIClassifierLogEntry = Readonly<{
  latencyMs: number
  provider: string
  model: string
  confidence: AIIntakeConfidence | null
  fallbackUsed: boolean
  fallbackReason: AIClassifierFallbackReason | null
  providerStatusCode: number | null
}>

export type AIClassifierLogger = (entry: AIClassifierLogEntry) => void

export type SafeAIClassificationResult = Readonly<{
  classification: AIClassifierOutput | null
  fallbackUsed: boolean
  fallbackReason: AIClassifierFallbackReason | null
  providerStatusCode: number | null
}>
