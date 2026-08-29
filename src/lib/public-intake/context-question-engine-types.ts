import type { PublicIntakeAnswerType } from '@/generated/prisma/client'
import { z } from 'zod'

export const KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION =
  'knowledge-grounded-context-engine/1.1.0' as const
export const LEGACY_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION =
  'knowledge-grounded-context-engine/1.0.0' as const

export type IntakeMode = 'DISCOVERY' | 'DIRECT_REQUEST'

export type ExtractedFactStatus =
  | 'EXPLICIT_INPUT'
  | 'RELIABLE_EXTRACTION'
  | 'USER_CONFIRMED'
  | 'HYPOTHESIS'
  | 'SUGGESTED_DIRECTION'

export type ExtractedFact = Readonly<{
  code: string
  value: string | number | boolean | readonly string[]
  status: ExtractedFactStatus
  confidence: number
  sourceQuestionKey?: string
}>

export type KnowledgeConceptCandidate = Readonly<{
  code: string
  confidence: number
  source: 'CLASSIFIER' | 'EXPLICIT_INPUT' | 'KNOWLEDGE_TOPIC'
  supportingKnowledgeIds: readonly string[]
}>

export type ContextGoalAnswerOption = Readonly<{
  code: string
  label: string
}>

export type ContextGoal = Readonly<{
  code: string
  questionKey: string
  purpose: string
  text: string
  answerType: PublicIntakeAnswerType
  options: readonly ContextGoalAnswerOption[]
  category:
    | 'ORGANIZATION'
    | 'WORK'
    | 'EXPOSURE'
    | 'SCOPE'
    | 'EXISTING_CONTROL'
    | 'URGENCY'
  relevantConceptCodes: readonly string[]
  satisfiesFactCodes: readonly string[]
  equivalentGoalCodes: readonly string[]
  groundingPolicy: 'SHARED_CONTEXT' | 'DOMAIN_SPECIFIC'
  applicability: Readonly<{
    requiredFactCodes: readonly string[]
    requiredAnyFactCodes: readonly string[]
    excludedFactValues: readonly Readonly<{
      code: string
      values: readonly (string | number | boolean)[]
    }>[]
  }>
  mandatory: boolean
  universal: boolean
  baseRelevance: number
  informationGain: number
  matchingValue: number
  userBurden: number
}>

export type KnowledgeEvidence = Readonly<{
  knowledgeId: string
  topicCode: string
  confidence: number
  source: 'PUBLISHED_CLAIM' | 'PUBLISHED_ROUTING_RULE' | 'LEGACY_COMPATIBILITY'
}>

export type ContextGoalApplicability = Readonly<{
  applicable: boolean
  reasonCode: string
  evidence: readonly KnowledgeEvidence[]
  skippedByFactCodes: readonly string[]
}>

export type ContextGoalScore = Readonly<{
  relevance: number
  informationGain: number
  matchingValue: number
  evidenceConfidence: number
  userBurden: number
  total: number
}>

export type ContextGoalCandidate = Readonly<{
  goal: ContextGoal
  applicability: ContextGoalApplicability
  score: ContextGoalScore
}>

export type AssignmentReadiness = Readonly<{
  status:
    | 'COMPLETE'
    | 'NEEDS_ESSENTIAL_CONTEXT'
    | 'CAN_ASK_HIGH_VALUE_CONTEXT'
    | 'MAX_QUESTION_BUDGET_REACHED'
    | 'SAFE_FALLBACK'
  reasonCode: string
}>

export type ContextQuestionPlan = Readonly<{
  engineVersion: typeof KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
  mode: IntakeMode
  selected: ContextGoalCandidate | null
  candidates: readonly ContextGoalCandidate[]
  readiness: AssignmentReadiness
  deduplicatedGoalCount: number
  questionBudgetRemaining: number
}>

export type PersistedContextQuestionPlan = Readonly<{
  engineVersion:
    | typeof KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
    | typeof LEGACY_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
  mode: IntakeMode
  contextGoalCode: string
  reasonCode: string
  mandatory: boolean
  score: ContextGoalScore
  relevantConceptCodes: readonly string[]
  supportingKnowledgeIds: readonly string[]
  skippedByFactCodes: readonly string[]
  options: readonly ContextGoalAnswerOption[]
}>

const persistedPlanSchema = z.object({
  engineVersion: z.enum([
    KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    LEGACY_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
  ]),
  mode: z.enum(['DISCOVERY', 'DIRECT_REQUEST']),
  contextGoalCode: z.string(),
  reasonCode: z.string(),
  mandatory: z.boolean().default(false),
  score: z.object({
    relevance: z.number(),
    informationGain: z.number(),
    matchingValue: z.number(),
    evidenceConfidence: z.number(),
    userBurden: z.number(),
    total: z.number(),
  }).strict(),
  relevantConceptCodes: z.array(z.string()),
  supportingKnowledgeIds: z.array(z.string()),
  skippedByFactCodes: z.array(z.string()),
  options: z.array(z.object({ code: z.string(), label: z.string() }).strict()),
}).strict()

export function parsePersistedContextQuestionPlan(value: unknown): PersistedContextQuestionPlan | null {
  const parsed = persistedPlanSchema.safeParse(value)
  return parsed.success ? Object.freeze(parsed.data) : null
}
