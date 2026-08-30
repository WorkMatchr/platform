import { z } from 'zod'

const predecessorSchema = z.object({
  kind: z.enum(['CONTEXT_GOAL', 'EXPERT_ROUTING']),
  scope: z.literal('INTAKE_ROUTING_KNOWLEDGE'),
  supportingKnowledgeIds: z.array(z.string().uuid()).min(1),
}).passthrough()

export const indoorDiscoveryPredecessors = Object.freeze([
  { code: 'CASE_GOAL_LOCATION_PATTERN_S1', ruleVersion: 3 },
  { code: 'CASE_GOAL_WORK_ENVIRONMENT_FACTORS_S1', ruleVersion: 3 },
  { code: 'ROUTE_INDOOR_ENVIRONMENT', ruleVersion: 2 },
])

/** Reviewed environment investigation: a discovery family plus actual group/context signals.
 * This publication projection is not a scenario switch in the runtime engine.
 */
export function buildIndoorDiscoverySuccessor(rule: { code: string; ruleVersion: number; outputSchema: unknown }) {
  if (!indoorDiscoveryPredecessors.some((item) => item.code === rule.code && item.ruleVersion === rule.ruleVersion)) {
    throw new Error('CONTEXT_PUBLICATION_PREDECESSOR_MISMATCH')
  }
  const old = predecessorSchema.parse(rule.outputSchema)
  const requiredFactCodes = ['WORK_LOCATION_MENTIONED', 'HEALTH_COMPLAINT', 'WORK_ENVIRONMENT_CHANGE_SIGNAL', 'AFFECTED_SCOPE']
  const discoveryConceptCodes = ['INDOOR_ENVIRONMENT']
  if (old.kind === 'EXPERT_ROUTING') {
    if (old.primaryExpertise !== 'ARBEIDSHYGIENIST') throw new Error('CONTEXT_PUBLICATION_PREDECESSOR_MISMATCH')
    return { code: rule.code, ruleVersion: rule.ruleVersion + 1, outputSchema: {
      ...old, discoveryConceptCodes, requiredConceptCodes: [],
      requiredFactCodes: [...new Set([...z.array(z.string()).parse(old.requiredFactCodes ?? []), ...requiredFactCodes])],
    } }
  }
  const applicability = z.object({
    requiredAllConceptCodes: z.array(z.string()), requiredFactCodes: z.array(z.string()),
  }).passthrough().parse(old.applicability)
  if (old.contractVersion !== 2 || !applicability.requiredAllConceptCodes.includes('INDOOR_ENVIRONMENT')) {
    throw new Error('CONTEXT_PUBLICATION_PREDECESSOR_MISMATCH')
  }
  return { code: rule.code, ruleVersion: rule.ruleVersion + 1, outputSchema: {
    ...old, discoveryConceptCodes,
    relevantConceptCodes: z.array(z.string()).parse(old.relevantConceptCodes).filter((code) => code !== 'INDOOR_ENVIRONMENT'),
    applicability: { ...applicability,
      requiredAllConceptCodes: applicability.requiredAllConceptCodes.filter((code) => code !== 'INDOOR_ENVIRONMENT'),
      requiredFactCodes: [...new Set([...applicability.requiredFactCodes, ...requiredFactCodes])],
    },
  } }
}
