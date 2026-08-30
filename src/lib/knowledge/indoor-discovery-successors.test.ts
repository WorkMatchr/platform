import { describe, expect, it } from 'vitest'
import { buildIndoorDiscoverySuccessor } from './indoor-discovery-successors'

describe('additive indoor discovery governance', () => {
  it('preserves predecessor, exclusions, supports and neutral question provenance', () => {
    const old = { code: 'CASE_GOAL_WORK_ENVIRONMENT_FACTORS_S1', ruleVersion: 3, outputSchema: {
      kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', contractVersion: 2,
      supportingKnowledgeIds: ['11111111-1111-4111-8111-111111111101'], relevantConceptCodes: ['INDOOR_ENVIRONMENT'],
      neutralFallbackQuestion: 'Wat is nog onbekend over de werkomgeving?', variantKey: 'CASE:S1:WORK_ENVIRONMENT_FACTORS',
      applicability: { requiredAllConceptCodes: ['INDOOR_ENVIRONMENT'], requiredFactCodes: ['EXISTING_REQUIRED_FACT'], excludedFactCodes: ['EXCLUDED'] },
    } }
    const before = JSON.stringify(old)
    const next = buildIndoorDiscoverySuccessor(old)
    expect(JSON.stringify(old)).toBe(before)
    expect(next).toMatchObject({ ruleVersion: 4, outputSchema: {
      discoveryConceptCodes: ['INDOOR_ENVIRONMENT'], relevantConceptCodes: [],
      neutralFallbackQuestion: old.outputSchema.neutralFallbackQuestion,
      supportingKnowledgeIds: old.outputSchema.supportingKnowledgeIds,
      applicability: { requiredAllConceptCodes: [], excludedFactCodes: ['EXCLUDED'],
        requiredFactCodes: expect.arrayContaining(['EXISTING_REQUIRED_FACT', 'HEALTH_COMPLAINT', 'WORK_ENVIRONMENT_CHANGE_SIGNAL', 'WORK_LOCATION_MENTIONED', 'AFFECTED_SCOPE']),
      },
    } })
    expect(() => buildIndoorDiscoverySuccessor({ ...old, ruleVersion: 4 })).toThrow()
  })
})
