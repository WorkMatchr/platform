import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { currentKnowledgeImportClaimWhere } from '@/lib/knowledge/knowledge-import-visibility'
import { compatibilityContextGoals } from './context-goal-catalog'
import type {
  ContextGoal,
  KnowledgeConceptCandidate,
  KnowledgeEvidence,
} from './context-question-engine-types'
import { INTAKE_ROUTING_KNOWLEDGE_SCOPE } from './case-understanding'
import { contextQuestionGenerationInstructionsSchema } from './context-question-generation-contract'

type KnowledgeGroundingReader = Pick<Prisma.TransactionClient, 'knowledgeClaim' | 'knowledgeRule'>

const ruleGoalSchema = z.object({
  kind: z.literal('CONTEXT_GOAL'),
  scope: z.literal(INTAKE_ROUTING_KNOWLEDGE_SCOPE),
  code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
  variantKey: z.string().regex(/^[A-Z0-9_:.-]{2,160}$/).optional(),
  questionKey: z.string().regex(/^context_[a-z0-9_]{2,90}$/),
  purpose: z.string().min(10).max(500),
  text: z.string().min(10).max(500),
  // The current approved public UX renders managed options, booleans and
  // numbers. Unsupported input types fail closed instead of producing an
  // unusable runtime question.
  answerType: z.enum(['OPTION', 'MULTI_OPTION', 'NUMBER', 'BOOLEAN', 'TEXT', 'PERIOD']),
  options: z.array(z.object({ code: z.string().min(1).max(120), label: z.string().min(1).max(200) }).strict()).max(20),
  category: z.enum(['ORGANIZATION', 'WORK', 'EXPOSURE', 'SCOPE', 'EXISTING_CONTROL', 'URGENCY']),
  relevantConceptCodes: z.array(z.string().regex(/^[A-Z0-9_-]{2,160}$/)).max(20),
  satisfiesFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).min(1).max(20),
  equivalentGoalCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
  groundingPolicy: z.enum(['SHARED_CONTEXT', 'DOMAIN_SPECIFIC']).default('DOMAIN_SPECIFIC'),
  applicability: z.object({
    requiredAllConceptCodes: z.array(z.string().regex(/^[A-Z0-9_-]{2,160}$/)).max(30).default([]),
    requiredAnyConceptCodes: z.array(z.string().regex(/^[A-Z0-9_-]{2,160}$/)).max(30).default([]),
    requiredFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
    requiredAnyFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
    excludedFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
    excludedFactValues: z.array(z.object({
      code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
      values: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1).max(20),
    }).strict()).max(20).default([]),
  }).strict().default({ requiredAllConceptCodes: [], requiredAnyConceptCodes: [], requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactCodes: [], excludedFactValues: [] }),
  mandatory: z.boolean().default(false),
  universal: z.boolean().default(false),
  weights: z.object({
    relevance: z.number().min(0).max(1),
    informationGain: z.number().min(0).max(1),
    matchingValue: z.number().min(0).max(1),
    userBurden: z.number().min(0.05).max(1),
  }).strict(),
  supportingKnowledgeIds: z.array(z.string().uuid()).min(1).max(30),
}).strict()

// v1 remains readable. A v2 runtime projection deliberately drops the
// editorial example instead of letting a goal-code lookup retrieve it later.
const ruleGoalV2Schema = ruleGoalSchema.omit({ purpose: true, text: true }).extend({
  contractVersion: z.literal(2),
  informationNeed: contextQuestionGenerationInstructionsSchema.shape.informationNeed,
  runtimeQuestionInstructions: contextQuestionGenerationInstructionsSchema.shape.runtimeQuestionInstructions,
  neutralFallbackQuestion: contextQuestionGenerationInstructionsSchema.shape.neutralFallbackQuestion,
  exampleQuestionForReview: z.string().min(10).max(1000),
}).strict()

function parseRuntimeGoal(value: unknown) {
  const v2 = ruleGoalV2Schema.safeParse(value)
  if (v2.success) {
    const { exampleQuestionForReview: _example, ...data } = v2.data
    void _example
    return {
      ...data,
      purpose: data.informationNeed,
      text: data.neutralFallbackQuestion,
      questionGeneration: contextQuestionGenerationInstructionsSchema.parse({
        contractVersion: data.contractVersion,
        informationNeed: data.informationNeed,
        runtimeQuestionInstructions: data.runtimeQuestionInstructions,
        neutralFallbackQuestion: data.neutralFallbackQuestion,
      }),
    }
  }
  const legacy = ruleGoalSchema.safeParse(value)
  return legacy.success ? { ...legacy.data, questionGeneration: undefined } : null
}

function conceptSearchTerms(concepts: readonly KnowledgeConceptCandidate[]) {
  return [...new Set(concepts.flatMap((concept) => concept.code.toLocaleLowerCase('nl-NL').split(/[_-]/)).filter((term) => term.length >= 3))]
}

const KNOWLEDGE_SEARCH_STOP_WORDS = new Set([
  'aan', 'als', 'bij', 'dat', 'de', 'een', 'en', 'er', 'het', 'hun', 'in', 'is',
  'kan', 'met', 'niet', 'of', 'om', 'onze', 'ons', 'voor', 'van', 'wat', 'we',
  'wij', 'worden', 'zijn',
])

function inputSearchTerms(originalInput: string) {
  return [...new Set(originalInput
    .toLocaleLowerCase('nl-NL')
    .normalize('NFKD')
    .replace(/[^a-z0-9&\s-]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length >= 4 && !KNOWLEDGE_SEARCH_STOP_WORDS.has(term)))]
    .slice(0, 24)
}

function goalIdentity(goal: ContextGoal) {
  return goal.variantKey ?? goal.code
}

function latestRulesByCode<T extends { code: string; ruleVersion: number }>(rules: readonly T[]) {
  const latest = new Map<string, T>()
  for (const rule of rules) {
    const current = latest.get(rule.code)
    if (!current || rule.ruleVersion > current.ruleVersion) latest.set(rule.code, rule)
  }
  return [...latest.values()]
}

export async function loadKnowledgeGroundedContextGoals(input: {
  database: KnowledgeGroundingReader
  concepts: readonly KnowledgeConceptCandidate[]
  originalInput: string
}): Promise<Readonly<{
  goals: readonly ContextGoal[]
  evidenceByGoalCode: ReadonlyMap<string, readonly KnowledgeEvidence[]>
  knowledgeConcepts: readonly KnowledgeConceptCandidate[]
}>> {
  const terms = [...new Set([...conceptSearchTerms(input.concepts), ...inputSearchTerms(input.originalInput)])].slice(0, 48)
  const discoveredClaims = terms.length === 0 ? [] : await input.database.knowledgeClaim.findMany({
    where: {
      AND: [
        currentKnowledgeImportClaimWhere,
        { OR: terms.flatMap((term) => [
          { topic: { slug: { contains: term, mode: 'insensitive' as const } } },
          { topic: { title: { contains: term, mode: 'insensitive' as const } } },
          { normalizedStatement: { contains: term, mode: 'insensitive' as const } },
        ]) },
      ],
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
      temporalStatus: 'CURRENT',
      sourceControlStatus: 'CONTROL_COMPLETE',
      accessTier: 'PUBLIC_BASIC',
      usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
      topic: { status: 'ACTIVE' },
      citations: { some: { supportType: { in: ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTEXT'] } } },
    },
    select: {
      id: true,
      confidenceLevel: true,
      normalizedStatement: true,
      topic: { select: { slug: true } },
    },
    take: 30,
  })

  const rules = latestRulesByCode(await input.database.knowledgeRule.findMany({
    where: {
      ruleType: 'ROUTING_RULE', publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED',
      accessTier: 'PUBLIC_BASIC', usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE },
    },
    select: { id: true, code: true, ruleVersion: true, outputSchema: true },
    take: 200,
  }))
  const parsedRules = rules.flatMap((rule) => {
    const data = parseRuntimeGoal(rule.outputSchema)
    if (!data) return []
    const conceptGate = data.applicability.requiredAnyConceptCodes.length > 0
      ? data.applicability.requiredAnyConceptCodes
      : data.relevantConceptCodes
    const reliableConcepts = input.concepts.filter((concept) => concept.confidence >= 0.8)
    const applies = data.applicability.requiredAllConceptCodes.every((code) => reliableConcepts.some((concept) => concept.code === code))
      && (conceptGate.length === 0 || reliableConcepts.some((concept) => conceptGate.includes(concept.code)))
    return applies ? [{ rule, data }] : []
  })
  const referencedIds = [...new Set(parsedRules.flatMap(({ data }) => data.supportingKnowledgeIds))]
  const hydratedClaims = referencedIds.length === 0 ? [] : await input.database.knowledgeClaim.findMany({
    where: {
      AND: [currentKnowledgeImportClaimWhere, { id: { in: referencedIds } }],
      publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', temporalStatus: 'CURRENT',
      sourceControlStatus: 'CONTROL_COMPLETE', accessTier: 'PUBLIC_BASIC',
      usageScopes: { has: INTAKE_ROUTING_KNOWLEDGE_SCOPE }, topic: { status: 'ACTIVE' },
      citations: { some: { supportType: { in: ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTEXT'] } } },
    },
    select: { id: true, confidenceLevel: true, normalizedStatement: true, topic: { select: { slug: true } } },
  })
  const claimsById = new Map([...discoveredClaims, ...hydratedClaims].map((claim) => [claim.id, claim]))
  const claims = [...claimsById.values()]
  const publishedEvidence = claims.map((claim): KnowledgeEvidence => Object.freeze({
    knowledgeId: claim.id,
    statement: claim.normalizedStatement ?? undefined,
    topicCode: claim.topic.slug,
    confidence: claim.confidenceLevel === 'HIGH' ? 1 : claim.confidenceLevel === 'MEDIUM' ? 0.8 : 0.65,
    source: 'PUBLISHED_CLAIM',
  }))
  const eligibleClaimIds = new Set(hydratedClaims.map((claim) => claim.id))
  const dynamicGoals: ContextGoal[] = []
  const dynamicEvidence = new Map<string, readonly KnowledgeEvidence[]>()
  for (const { rule, data } of parsedRules) {
    if (data.supportingKnowledgeIds.some((id) => !eligibleClaimIds.has(id))) continue
    const variantKey = data.variantKey ?? data.code
    dynamicGoals.push(Object.freeze({
      selectedContextRuleId: rule.id,
      supportingKnowledgeIds: Object.freeze([...data.supportingKnowledgeIds]),
      ...(data.questionGeneration ? { questionGeneration: data.questionGeneration } : {}),
      ruleVersion: rule.ruleVersion,
      variantKey,
      code: data.code,
      questionKey: data.questionKey,
      purpose: data.purpose,
      text: data.text,
      answerType: data.answerType,
      options: Object.freeze(data.options.map((option) => Object.freeze(option))),
      category: data.category,
      relevantConceptCodes: Object.freeze(data.relevantConceptCodes),
      satisfiesFactCodes: Object.freeze(data.satisfiesFactCodes),
      equivalentGoalCodes: Object.freeze(data.equivalentGoalCodes),
      groundingPolicy: data.groundingPolicy,
      applicability: Object.freeze({
        requiredAllConceptCodes: Object.freeze(data.applicability.requiredAllConceptCodes),
        requiredAnyConceptCodes: Object.freeze(data.applicability.requiredAnyConceptCodes),
        requiredFactCodes: Object.freeze(data.applicability.requiredFactCodes),
        requiredAnyFactCodes: Object.freeze(data.applicability.requiredAnyFactCodes),
        excludedFactCodes: Object.freeze(data.applicability.excludedFactCodes),
        excludedFactValues: Object.freeze(data.applicability.excludedFactValues.map((item) => Object.freeze({
          code: item.code,
          values: Object.freeze(item.values),
        }))),
      }),
      mandatory: data.mandatory,
      universal: data.universal,
      baseRelevance: data.weights.relevance,
      informationGain: data.weights.informationGain,
      matchingValue: data.weights.matchingValue,
      userBurden: data.weights.userBurden,
    }))
    dynamicEvidence.set(variantKey, Object.freeze([
      Object.freeze({ knowledgeId: rule.id, topicCode: 'context-goal-routing-rule', confidence: 1, source: 'PUBLISHED_ROUTING_RULE' }),
      ...publishedEvidence.filter((evidence) => data.supportingKnowledgeIds.includes(evidence.knowledgeId)),
    ]))
  }

  const evidenceByGoalCode = new Map<string, readonly KnowledgeEvidence[]>(dynamicEvidence)
  for (const goal of compatibilityContextGoals) {
    const goalTerms = new Set(goal.relevantConceptCodes.flatMap((code) => code.toLocaleLowerCase('nl-NL').split(/[_-]/)))
    const matchingEvidence = publishedEvidence.filter((evidence) =>
      [...goalTerms].some((term) => term.length >= 3 && evidence.topicCode.toLocaleLowerCase('nl-NL').includes(term)),
    )
    if ([...dynamicGoals].some((candidate) => candidate.code === goal.code)) continue
    evidenceByGoalCode.set(goalIdentity(goal), matchingEvidence.length > 0
      ? Object.freeze(matchingEvidence)
      : Object.freeze([Object.freeze({ knowledgeId: `legacy:${goal.code}`, topicCode: 'legacy-context-catalog', confidence: 0.65, source: 'LEGACY_COMPATIBILITY' })]))
  }
  const byIdentity = new Map<string, ContextGoal>()
  for (const goal of compatibilityContextGoals) byIdentity.set(goalIdentity(goal), goal)
  for (const goal of dynamicGoals) byIdentity.set(goalIdentity(goal), goal)
  const knowledgeConcepts = new Map<string, KnowledgeConceptCandidate>()
  for (const claim of claims) {
    knowledgeConcepts.set(claim.topic.slug.toLocaleUpperCase('nl-NL').replace(/-/g, '_'), Object.freeze({
      code: claim.topic.slug.toLocaleUpperCase('nl-NL').replace(/-/g, '_'),
      confidence: claim.confidenceLevel === 'HIGH' ? 1 : claim.confidenceLevel === 'MEDIUM' ? 0.8 : 0.65,
      source: 'KNOWLEDGE_TOPIC',
      supportingKnowledgeIds: Object.freeze([claim.id]),
    }))
  }
  for (const goal of dynamicGoals) {
    const evidence = dynamicEvidence.get(goalIdentity(goal)) ?? []
    if (evidence.length === 0) continue
    for (const code of goal.relevantConceptCodes) {
      knowledgeConcepts.set(code, Object.freeze({
        code,
        confidence: Math.max(...evidence.map((item) => item.confidence)),
        source: 'KNOWLEDGE_TOPIC',
        supportingKnowledgeIds: Object.freeze(evidence.map((item) => item.knowledgeId)),
      }))
    }
  }
  return Object.freeze({
    goals: Object.freeze([...byIdentity.values()]),
    evidenceByGoalCode,
    knowledgeConcepts: Object.freeze([...knowledgeConcepts.values()]),
  })
}
