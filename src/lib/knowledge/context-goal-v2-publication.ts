import { z } from 'zod'
import { parseCaseUnderstandingKnowledgeReview } from './case-understanding-review-schema'
import { contextQuestionGenerationInstructionsSchema } from '../public-intake/context-question-generation-contract'
import { INTAKE_ROUTING_KNOWLEDGE_SCOPE } from '../public-intake/case-understanding'

const generationPackageSchema = z.object({
  contractVersion: z.literal(2), runtimeQuestionInstructions: z.string().min(10).max(1000),
  neutralFallbackQuestions: z.record(z.string(), z.string()),
}).strict()
const existingOutputSchema = z.object({
  kind: z.literal('CONTEXT_GOAL'), scope: z.literal(INTAKE_ROUTING_KNOWLEDGE_SCOPE),
  code: z.string(), supportingKnowledgeIds: z.array(z.string().uuid()).min(1),
  questionKey: z.string(), category: z.string(),
}).passthrough()

/** Builds successors only. The caller must preserve all existing records. */
export function buildContextGoalV2Successors(input: {
  review: unknown
  generationPackage: unknown
  existingRules: readonly { code: string; ruleVersion: number; outputSchema: unknown }[]
}) {
  const review = parseCaseUnderstandingKnowledgeReview(input.review)
  const generation = generationPackageSchema.parse(input.generationPackage)
  return review.scenarios.flatMap((scenario) => scenario.questionExamples.map((example) => {
    const code = `CASE_GOAL_${example.contextGoal}_S${scenario.number}`
    const previous = input.existingRules.find((rule) => rule.code === code && rule.ruleVersion === 2)
    if (!previous) throw new Error('CONTEXT_GOAL_V2_PREDECESSOR_MISSING')
    const old = existingOutputSchema.parse(previous.outputSchema)
    if (old.code !== example.contextGoal) throw new Error('CONTEXT_GOAL_V2_PREDECESSOR_MISMATCH')
    const definition = review.contextGoals.find((goal) => goal.code === example.contextGoal)
    if (!definition) throw new Error('CONTEXT_GOAL_V2_DEFINITION_MISSING')
    const instructions = contextQuestionGenerationInstructionsSchema.parse({
      contractVersion: 2, informationNeed: definition.informationNeed,
      runtimeQuestionInstructions: generation.runtimeQuestionInstructions,
      neutralFallbackQuestion: generation.neutralFallbackQuestions[definition.code],
    })
    // The first reviewed specialism is the domain anchor, never the union of
    // every shared claim concept. Contractor variants additionally require
    // the existing contractor concept as case evidence.
    const domain = scenario.requiredSpecialisms[0]
    if (!domain) throw new Error('CONTEXT_GOAL_V2_DOMAIN_ANCHOR_MISSING')
    const requiredAllConceptCodes = [domain, ...(scenario.requiredSpecialisms.includes('CONTRACTOR_SAFETY')
      ? ['CONTRACTOR_INTERFACE'] : [])]
    return {
      code, ruleVersion: 3, title: definition.informationNeed.slice(0, 240),
      outputSchema: {
        ...instructions, kind: 'CONTEXT_GOAL', scope: INTAKE_ROUTING_KNOWLEDGE_SCOPE,
        code: definition.code, variantKey: `CASE:S${scenario.number}:${definition.code}`,
        questionKey: old.questionKey, exampleQuestionForReview: example.question,
        answerType: 'TEXT', options: [], category: old.category,
        relevantConceptCodes: requiredAllConceptCodes,
        satisfiesFactCodes: [`CONTEXT_ANSWERED_S${scenario.number}_${definition.code}`],
        equivalentGoalCodes: [], groundingPolicy: 'DOMAIN_SPECIFIC',
        applicability: {
          requiredAllConceptCodes, requiredAnyConceptCodes: [], requiredFactCodes: [], requiredAnyFactCodes: [],
          excludedFactCodes: [], excludedFactValues: [],
        },
        mandatory: false, universal: false,
        weights: { relevance: 0.9, informationGain: 0.85, matchingValue: 0.9, userBurden: 0.35 },
        supportingKnowledgeIds: old.supportingKnowledgeIds,
      },
    }
  }))
}
