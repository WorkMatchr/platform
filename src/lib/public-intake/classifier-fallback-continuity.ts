import type { AIClassifierFallbackReason } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { isReliableConcept } from './context-goal-applicability'
import type { KnowledgeConceptCandidate } from './context-question-engine-types'

const TECHNICAL_CLASSIFIER_FALLBACK_REASONS = new Set<AIClassifierFallbackReason>([
  'CONFIGURATION_MISSING',
  'CACHE_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_REQUEST_REJECTED',
  'OUTPUT_INVALID',
  'UNKNOWN_ERROR',
])

export function isTechnicalClassifierFallback(
  fallbackReason: AIClassifierFallbackReason | null,
): boolean {
  return fallbackReason !== null && TECHNICAL_CLASSIFIER_FALLBACK_REASONS.has(fallbackReason)
}

export function hasReliableDeterministicContinuityEvidence(
  concepts: readonly KnowledgeConceptCandidate[],
): boolean {
  return concepts.some(isReliableConcept)
}
