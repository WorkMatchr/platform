import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { currentKnowledgeImportClaimWhere } from '@/lib/knowledge/knowledge-import-visibility'
import { compatibilityContextGoals } from './context-goal-catalog'
import type {
  ContextGoal,
  KnowledgeConceptCandidate,
  KnowledgeEvidence,
} from './context-question-engine-types'

type KnowledgeGroundingReader = Pick<Prisma.TransactionClient, 'knowledgeClaim' | 'knowledgeRule'>

const ruleGoalSchema = z.object({
  kind: z.literal('CONTEXT_GOAL'),
  code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
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
    requiredFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
    requiredAnyFactCodes: z.array(z.string().regex(/^[A-Z0-9_]{2,120}$/)).max(20).default([]),
    excludedFactValues: z.array(z.object({
      code: z.string().regex(/^[A-Z0-9_]{2,120}$/),
      values: z.array(z.union([z.string(), z.number(), z.boolean()])).min(1).max(20),
    }).strict()).max(20).default([]),
  }).strict().default({ requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] }),
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
    .slice(0, 12)
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
  const terms = [...new Set([...conceptSearchTerms(input.concepts), ...inputSearchTerms(input.originalInput)])].slice(0, 16)
  const claims = terms.length === 0 ? [] : await input.database.knowledgeClaim.findMany({
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
      topic: { status: 'ACTIVE' },
      citations: { some: { supportType: { in: ['DIRECT_SUPPORT', 'PARTIAL_SUPPORT', 'CONTEXT'] } } },
    },
    select: {
      id: true,
      confidenceLevel: true,
      topic: { select: { slug: true } },
    },
    take: 30,
  })

  const publishedEvidence = claims.map((claim): KnowledgeEvidence => Object.freeze({
    knowledgeId: claim.id,
    topicCode: claim.topic.slug,
    confidence: claim.confidenceLevel === 'HIGH' ? 1 : claim.confidenceLevel === 'MEDIUM' ? 0.8 : 0.65,
    source: 'PUBLISHED_CLAIM',
  }))
  const eligibleClaimIds = new Set(claims.map((claim) => claim.id))
  const rules = await input.database.knowledgeRule.findMany({
    where: {
      ruleType: 'ROUTING_RULE',
      publicationStatus: 'PUBLISHED',
      validationStatus: 'VALIDATED',
      accessTier: 'PUBLIC_BASIC',
    },
    select: { id: true, outputSchema: true },
    take: 50,
  })
  const dynamicGoals: ContextGoal[] = []
  const dynamicEvidence = new Map<string, readonly KnowledgeEvidence[]>()
  for (const rule of rules) {
    const parsed = ruleGoalSchema.safeParse(rule.outputSchema)
    if (!parsed.success || parsed.data.supportingKnowledgeIds.some((id) => !eligibleClaimIds.has(id))) continue
    const data = parsed.data
    dynamicGoals.push(Object.freeze({
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
        requiredFactCodes: Object.freeze(data.applicability.requiredFactCodes),
        requiredAnyFactCodes: Object.freeze(data.applicability.requiredAnyFactCodes),
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
    dynamicEvidence.set(data.code, Object.freeze([
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
    evidenceByGoalCode.set(goal.code, matchingEvidence.length > 0
      ? Object.freeze(matchingEvidence)
      : Object.freeze([Object.freeze({ knowledgeId: `legacy:${goal.code}`, topicCode: 'legacy-context-catalog', confidence: 0.65, source: 'LEGACY_COMPATIBILITY' })]))
  }
  const byCode = new Map<string, ContextGoal>()
  for (const goal of compatibilityContextGoals) byCode.set(goal.code, goal)
  for (const goal of dynamicGoals) byCode.set(goal.code, goal)
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
    const evidence = dynamicEvidence.get(goal.code) ?? []
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
    goals: Object.freeze([...byCode.values()]),
    evidenceByGoalCode,
    knowledgeConcepts: Object.freeze([...knowledgeConcepts.values()]),
  })
}
