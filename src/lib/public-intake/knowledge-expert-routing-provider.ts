import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import type { CaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import {
  INTAKE_ROUTING_KNOWLEDGE_SCOPE,
  matchingReadyProfileSchema,
  buildNeutralAssignmentSummary,
  type MatchingReadyProfile,
} from './case-understanding'
import type { ExtractedFact, KnowledgeConceptCandidate } from './context-question-engine-types'
import { isDiscoverableConcept, isReliableConcept, isReliablePresentFact } from './context-goal-applicability'

type RoutingReader = Pick<Prisma.TransactionClient, 'knowledgeClaim' | 'knowledgeRule'>

const ruleSchema = z.object({
  kind: z.literal('EXPERT_ROUTING'),
  scope: z.literal(INTAKE_ROUTING_KNOWLEDGE_SCOPE),
  requiredConceptCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20),
  discoveryConceptCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
  requiredFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
  excludedFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
  primaryExpertise: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  conditionalExpertise: z.array(z.object({
    code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
    when: z.string().min(5).max(500),
  }).strict()).max(10),
  requiredSpecialisms: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(10),
  assignmentType: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  relevantSectorExperience: z.array(z.string().min(2).max(240)).max(10),
  multidisciplinary: z.boolean(),
  matchingCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).min(1).max(20),
  supportingKnowledgeIds: z.array(z.string().uuid()).min(1).max(30),
  priority: z.number().int().min(0).max(100),
}).strict()

function safeValues(understanding: CaseUnderstanding, key: keyof CaseUnderstanding) {
  const element = understanding[key]
  return element.status === 'HYPOTHESIS' || element.status === 'UNKNOWN'
    ? []
    : [...element.value]
}

export async function buildKnowledgeGroundedMatchingProfile(input: {
  database: RoutingReader
  understanding: CaseUnderstanding
  facts: readonly ExtractedFact[]
  concepts: readonly KnowledgeConceptCandidate[]
}): Promise<MatchingReadyProfile | null> {
  const rules = await input.database.knowledgeRule.findMany({
    where: {
      ruleType: 'ROUTING_RULE',
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
      accessTier: 'PUBLIC_BASIC',
      usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
    },
    select: { code: true, ruleVersion: true, outputSchema: true },
    take: 100,
  })
  const factCodes = new Set(input.facts.filter(isReliablePresentFact).map((fact) => fact.code))
  const conceptCodes = new Set(input.concepts.filter(isReliableConcept).map((concept) => concept.code))
  const discoveryCodes = new Set(input.concepts.filter(isDiscoverableConcept).map((concept) => concept.code))
  const latestRules = new Map<string, (typeof rules)[number]>()
  for (const rule of rules) {
    const current = latestRules.get(rule.code)
    if (!current || rule.ruleVersion > current.ruleVersion) latestRules.set(rule.code, rule)
  }
  const eligible = [...latestRules.values()]
    .map((rule) => ruleSchema.safeParse(rule.outputSchema))
    .filter((result): result is z.ZodSafeParseSuccess<z.infer<typeof ruleSchema>> => result.success)
    .map((result) => result.data)
    .filter((rule) => rule.requiredConceptCodes.length > 0 || rule.requiredFactCodes.length > 0)
    .filter((rule) => rule.discoveryConceptCodes.every((code) => discoveryCodes.has(code)))
    .filter((rule) => rule.discoveryConceptCodes.length === 0 || rule.requiredFactCodes.length > 0)
    .filter((rule) => rule.requiredConceptCodes.every((code) => conceptCodes.has(code)))
    .filter((rule) => rule.requiredFactCodes.every((code) => factCodes.has(code)))
    .filter((rule) => rule.excludedFactCodes.every((code) => !factCodes.has(code)))
    .sort((left, right) => right.priority - left.priority)
  const selected = eligible[0]
  if (!selected) return null

  const eligibleClaims = await input.database.knowledgeClaim.findMany({
    where: {
      id: { in: selected.supportingKnowledgeIds },
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
      temporalStatus: 'CURRENT',
      sourceControlStatus: 'CONTROL_COMPLETE',
      accessTier: 'PUBLIC_BASIC',
      usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
    },
    select: { id: true },
  })
  if (eligibleClaims.length !== selected.supportingKnowledgeIds.length) return null

  return matchingReadyProfileSchema.parse({
    version: 'matching-ready-profile/1.0.0',
    scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE,
    assignmentSummary: buildNeutralAssignmentSummary(input.understanding, input.facts),
    primaryExpertise: selected.primaryExpertise,
    conditionalExpertise: selected.conditionalExpertise,
    requiredSpecialisms: selected.requiredSpecialisms,
    assignmentType: selected.assignmentType,
    relevantSectorExperience: selected.relevantSectorExperience,
    riskContext: [
      ...safeValues(input.understanding, 'hazards'),
      ...safeValues(input.understanding, 'exposureSignals'),
      ...safeValues(input.understanding, 'incidentContext'),
    ],
    locationContext: safeValues(input.understanding, 'locationContext'),
    urgency: safeValues(input.understanding, 'urgency'),
    multidisciplinary: selected.multidisciplinary,
    matchingCodes: selected.matchingCodes,
    supportingKnowledgeIds: selected.supportingKnowledgeIds,
  })
}
