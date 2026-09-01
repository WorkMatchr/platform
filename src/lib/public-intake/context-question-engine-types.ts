import type { PublicIntakeAnswerType } from '@/generated/prisma/client'
import { z } from 'zod'
import { contextQuestionGenerationProvenanceSchema, type ContextQuestionGenerationInstructions, type ContextQuestionGenerationProvenance } from './context-question-generation-contract'

export const KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION =
  'knowledge-grounded-context-engine/1.3.0' as const
export const PREVIOUS_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION =
  'knowledge-grounded-context-engine/1.2.0' as const
export const INTERMEDIATE_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION =
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
  evidence?: readonly string[]
  /** Explicit unqualified absence: answer resolution only, never presence evidence. */
  resolution?: 'CASE_WIDE_ABSENCE'
}>

export type KnowledgeConceptCandidate = Readonly<{
  code: string
  /** Absent only for legacy callers; new semantic candidates preserve epistemic status. */
  status?: ExtractedFactStatus | 'UNKNOWN'
  confidence: number
  source: 'CLASSIFIER' | 'EXPLICIT_INPUT' | 'KNOWLEDGE_TOPIC'
  supportingKnowledgeIds: readonly string[]
}>

export type ContextGoalAnswerOption = Readonly<{
  code: string
  label: string
}>

export type ContextGoal = Readonly<{
  questionGeneration?: ContextQuestionGenerationInstructions
  supportingKnowledgeIds?: readonly string[]
  selectedContextRuleId?: string
  ruleVersion?: number
  /** Stable internal identity. Multiple domain variants may share `code`. */
  variantKey?: string
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
  /** Discovery anchors are not applicability evidence. Requires independent fact gates. */
  discoveryConceptCodes?: readonly string[]
  satisfiesFactCodes: readonly string[]
  equivalentGoalCodes: readonly string[]
  groundingPolicy: 'SHARED_CONTEXT' | 'DOMAIN_SPECIFIC'
  applicability: Readonly<{
    requiredAllConceptCodes?: readonly string[]
    requiredAnyConceptCodes?: readonly string[]
    requiredFactCodes: readonly string[]
    requiredAnyFactCodes: readonly string[]
    excludedFactCodes?: readonly string[]
    excludedFactValues: readonly Readonly<{
      code: string
      values: readonly (string | number | boolean)[]
    }>[]
  }>
  mandatory: boolean
  /** Must be answered before the intake can complete, but need not be next. */
  requiredBeforeCompletion?: boolean
  /** Reserved for a proven dependency that blocks safe continuation. */
  mustBeNextQuestion?: boolean
  universal: boolean
  baseRelevance: number
  informationGain: number
  matchingValue: number
  userBurden: number
}>

export type KnowledgeEvidence = Readonly<{
  statement?: string
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
  selectedContextRuleId?: string
  ruleVersion?: number
  variantKey?: string
  applicableConcepts?: readonly string[]
  knowledgeGroundingPresent?: boolean
  knowledgeGroundingApplicableToCase?: boolean
  applicabilityResult?: boolean
  questionGenerationProvenance?: ContextQuestionGenerationProvenance
  engineVersion:
    | typeof KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
    | typeof PREVIOUS_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
    | typeof INTERMEDIATE_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
    | typeof LEGACY_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION
  mode: IntakeMode
  contextGoalCode: string
  reasonCode: string
  mandatory: boolean
  requiredBeforeCompletion?: boolean
  mustBeNextQuestion?: boolean
  score: ContextGoalScore
  relevantConceptCodes: readonly string[]
  supportingKnowledgeIds: readonly string[]
  skippedByFactCodes: readonly string[]
  options: readonly ContextGoalAnswerOption[]
}>

const persistedPlanSchema = z.object({
  selectedContextRuleId: z.string().uuid().optional(),
  ruleVersion: z.number().int().positive().optional(),
  variantKey: z.string().optional(),
  applicableConcepts: z.array(z.string()).optional(),
  knowledgeGroundingPresent: z.boolean().optional(),
  knowledgeGroundingApplicableToCase: z.boolean().optional(),
  applicabilityResult: z.boolean().optional(),
  questionGenerationProvenance: contextQuestionGenerationProvenanceSchema.optional(),
  engineVersion: z.enum([
    KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    PREVIOUS_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    INTERMEDIATE_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
    LEGACY_KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
  ]),
  mode: z.enum(['DISCOVERY', 'DIRECT_REQUEST']),
  contextGoalCode: z.string(),
  reasonCode: z.string(),
  mandatory: z.boolean().default(false),
  requiredBeforeCompletion: z.boolean().optional(),
  mustBeNextQuestion: z.boolean().optional(),
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
