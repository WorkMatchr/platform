import { z } from 'zod'

const code = z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,119}$/)
const reviewStatus = z.enum([
  'PENDING_HUMAN_REVIEW',
  'APPROVED',
  'APPROVED_WITH_CHANGES',
  'REJECTED',
])

const sourceSchema = z.object({
  sourceId: z.string().min(2),
  title: z.string().min(2),
  documentType: z.string().min(2),
  dateOrVersion: z.string().nullable(),
  governanceStatus: z.enum([
    'CURRENT_LIKELY_USABLE',
    'HISTORICAL',
    'DRAFT',
    'UNVALIDATED',
    'REVIEW_REQUIRED',
    'INSUFFICIENTLY_TRACEABLE',
  ]),
  topics: z.array(code).min(1),
  suitability: z.string().min(10),
  locator: z.string().min(2),
  authority: code,
  publicationDate: z.string().min(2),
  currentness: code,
  scope: z.string().min(10),
  applicableScenarios: z.array(z.number().int().min(1).max(10)),
  claimsSupported: z.array(z.string().min(10)),
  claimsNotSupported: z.array(z.string().min(10)).min(1),
  reviewStatus: z.literal('PENDING_HUMAN_REVIEW'),
}).strict()

const contextGoalSchema = z.object({
  code,
  informationNeed: z.string().min(10),
  appliesWhen: z.array(z.string().min(3)).min(1),
  doNotApplyWhen: z.array(z.string().min(3)).min(1),
  resolvesWithFactCodes: z.array(code).min(1),
  reviewStatus: z.literal('PENDING_HUMAN_REVIEW'),
  reviewerNotes: z.string(),
}).strict()

const conditionalExpertiseSchema = z.object({
  discipline: code,
  when: z.string().min(10),
}).strict()

const questionExampleSchema = z.object({
  contextGoal: code,
  type: z.literal('QUESTION_EXAMPLE_FOR_REVIEW'),
  question: z.string().min(10),
  whyThisQuestion: z.string().min(10),
  whatDecisionItChanges: z.string().min(10),
  whatExistingFactWouldSuppressIt: z.string().min(10),
  reviewStatus: z.literal('PENDING_HUMAN_REVIEW'),
  reviewerNotes: z.string(),
}).strict()

const candidateClaimSchema = z.object({
  candidateId: code,
  scenarioCoverage: z.array(z.number().int().min(1).max(10)).min(1),
  conceptCode: code,
  proposedClaim: z.string().min(20),
  claimType: z.string().min(2),
  sourceIds: z.array(z.string().min(2)).min(1),
  sourceEvidence: z.array(z.string().min(10)).min(1),
  applicability: z.array(z.string().min(3)).min(1),
  exclusions: z.array(z.string().min(3)).min(1),
  contextGoals: z.array(code),
  expertiseRequirements: z.array(code).min(1),
  routingIntent: z.string().min(10),
  authorityStatus: z.enum(['AUTHORITATIVE_CANDIDATE', 'SUPPORTING_CANDIDATE', 'INSUFFICIENT']),
  currencyStatus: z.enum(['CURRENT', 'HISTORICAL', 'UNCERTAIN']),
  reviewStatus,
  reviewerNotes: z.string(),
}).strict()

const routingRuleSchema = z.object({
  candidateId: code,
  scenarioCoverage: z.array(z.number().int().min(1).max(10)).min(1),
  routingIntent: z.string().min(10),
  appliesWhen: z.array(z.string().min(3)).min(1),
  doNotApplyWhen: z.array(z.string().min(3)).min(1),
  primaryExpertise: code,
  primaryExpertiseKind: z.enum(['DISCIPLINE', 'SPECIALISM']),
  secondaryDisciplines: z.array(code),
  requiredSpecialisms: z.array(code),
  multidisciplinary: z.enum(['NO', 'YES', 'CONDITIONAL']),
  conditionalExpertise: z.array(conditionalExpertiseSchema),
  supportingClaimIds: z.array(code).min(1),
  reviewStatus,
  reviewerNotes: z.string(),
}).strict()

const scenarioSchema = z.object({
  number: z.number().int().min(1).max(10),
  title: z.string().min(2),
  originalInput: z.string().min(20),
  explicitFacts: z.array(z.string().min(3)).min(1),
  prohibitedAssumptions: z.array(z.string().min(3)).min(1),
  conceptCodes: z.array(code).min(1),
  candidateClaimIds: z.array(code).min(1),
  contextGoals: z.array(code),
  goalsAlreadyResolvedByFacts: z.array(code),
  goalValueRationale: z.array(z.object({ goalCode: code, rationale: z.string().min(10) }).strict()),
  primaryExpertise: code,
  secondaryExpertise: z.array(code),
  requiredSpecialisms: z.array(code),
  multidisciplinary: z.enum(['NO', 'YES', 'CONDITIONAL']),
  multidisciplinaryReason: z.string().min(5),
  conditionalExpertise: z.array(conditionalExpertiseSchema),
  routingRuleIds: z.array(code).min(1),
  knowledgeGaps: z.array(z.string().min(3)),
  questionExamples: z.array(questionExampleSchema),
  humanReviewDecision: z.null(),
}).strict()

export const caseUnderstandingKnowledgeReviewSchema = z.object({
  schemaVersion: z.literal('2.0'),
  packageId: z.literal('CASE_UNDERSTANDING_10_SCENARIOS_REVIEW_V2'),
  reviewStatus: z.literal('PENDING_HUMAN_REVIEW'),
  sources: z.array(sourceSchema).min(1),
  contextGoals: z.array(contextGoalSchema).min(1),
  candidateClaims: z.array(candidateClaimSchema).min(1),
  routingRules: z.array(routingRuleSchema).min(1),
  specialismProposal: z.object({
    code,
    label: z.string().min(2),
    kind: z.literal('SPECIALISM'),
    parentDisciplines: z.array(code),
    compatibleProfessionalBackgrounds: z.array(z.string().min(10)).min(2),
    recommendedModel: z.string().min(20),
    currentLimitation: z.string().min(20),
    migrationImpact: z.string().min(20),
    matchingImpact: z.string().min(20),
    meaning: z.string().min(20),
    inclusions: z.array(z.string().min(3)).min(1),
    exclusions: z.array(z.string().min(3)).min(1),
    evidenceExpected: z.array(z.string().min(3)).min(1),
    rationale: z.string().min(20),
    reviewStatus: z.literal('PENDING_HUMAN_REVIEW'),
  }).strict(),
  scenarios: z.array(scenarioSchema).length(10),
}).strict()

export type CaseUnderstandingKnowledgeReview = z.infer<
  typeof caseUnderstandingKnowledgeReviewSchema
>

export function parseCaseUnderstandingKnowledgeReview(
  value: unknown,
): CaseUnderstandingKnowledgeReview {
  const parsed = caseUnderstandingKnowledgeReviewSchema.parse(value)
  const unique = (values: readonly string[], label: string) => {
    if (new Set(values).size !== values.length) {
      throw new Error(`${label} bevat dubbele codes.`)
    }
  }

  unique(parsed.sources.map((item) => item.sourceId), 'sources')
  unique(parsed.contextGoals.map((item) => item.code), 'contextGoals')
  unique(parsed.candidateClaims.map((item) => item.candidateId), 'candidateClaims')
  unique(parsed.routingRules.map((item) => item.candidateId), 'routingRules')
  unique(parsed.scenarios.map((item) => String(item.number)), 'scenarios')

  const sourceIds = new Set(parsed.sources.map((item) => item.sourceId))
  const goalCodes = new Set(parsed.contextGoals.map((item) => item.code))
  const claimIds = new Set(parsed.candidateClaims.map((item) => item.candidateId))
  const ruleIds = new Set(parsed.routingRules.map((item) => item.candidateId))
  for (const claim of parsed.candidateClaims) {
    if (claim.sourceIds.some((id) => !sourceIds.has(id))) {
      throw new Error(`${claim.candidateId} verwijst naar een onbekende bron.`)
    }
    if (claim.contextGoals.some((id) => !goalCodes.has(id))) {
      throw new Error(`${claim.candidateId} verwijst naar een onbekend Context Goal.`)
    }
  }
  for (const rule of parsed.routingRules) {
    if (rule.supportingClaimIds.some((id) => !claimIds.has(id))) {
      throw new Error(`${rule.candidateId} verwijst naar een onbekende kandidaatclaim.`)
    }
  }
  for (const scenario of parsed.scenarios) {
    if (scenario.candidateClaimIds.some((id) => !claimIds.has(id))) {
      throw new Error(`Scenario ${scenario.number} verwijst naar een onbekende kandidaatclaim.`)
    }
    if (scenario.contextGoals.some((id) => !goalCodes.has(id))) {
      throw new Error(`Scenario ${scenario.number} verwijst naar een onbekend Context Goal.`)
    }
    if (scenario.goalsAlreadyResolvedByFacts.some((id) => !goalCodes.has(id))) {
      throw new Error(`Scenario ${scenario.number} markeert een onbekend Context Goal als SATISFIED.`)
    }
    if (scenario.contextGoals.some((id) => scenario.goalsAlreadyResolvedByFacts.includes(id))) {
      throw new Error(`Scenario ${scenario.number} markeert een Context Goal tegelijk als ontbrekend en SATISFIED.`)
    }
    if (scenario.questionExamples.some((item) => !scenario.contextGoals.includes(item.contextGoal))) {
      throw new Error(`Scenario ${scenario.number} bevat een voorbeeldvraag zonder resterend Context Goal.`)
    }
    if (new Set(scenario.questionExamples.map((item) => item.contextGoal)).size !== scenario.questionExamples.length) {
      throw new Error(`Scenario ${scenario.number} bevat dubbele voorbeeldvragen voor een Context Goal.`)
    }
    if (scenario.contextGoals.some((id) => !scenario.questionExamples.some((item) => item.contextGoal === id))) {
      throw new Error(`Scenario ${scenario.number} mist een voorbeeldvraag voor een resterend Context Goal.`)
    }
    if (scenario.routingRuleIds.some((id) => !ruleIds.has(id))) {
      throw new Error(`Scenario ${scenario.number} verwijst naar een onbekende routingregel.`)
    }
  }
  return parsed
}
