import { describe, expect, it, vi } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { buildKnowledgeGroundedMatchingProfile } from './knowledge-expert-routing-provider'

const claimId = '11111111-1111-4111-8111-111111111101'

describe('Knowledge-grounded expert routing', () => {
  it('activeert een domeinregel niet door concepten uit een niet-toepasselijk Context Goal', async () => {
    const findClaims = vi.fn()
    const profile = await buildKnowledgeGroundedMatchingProfile({
      database: {
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          outputSchema: {
            kind: 'EXPERT_ROUTING', scope: 'INTAKE_ROUTING_KNOWLEDGE',
            requiredConceptCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS'], requiredFactCodes: [], excludedFactCodes: [],
            primaryExpertise: 'PROCESS_SAFETY_MAJOR_HAZARDS', conditionalExpertise: [],
            requiredSpecialisms: ['PROCESS_SAFETY_MAJOR_HAZARDS'], assignmentType: 'INVESTIGATION_AND_ADVICE',
            relevantSectorExperience: ['Aantoonbare procesveiligheidservaring.'], multidisciplinary: true,
            matchingCodes: ['PROCESS_SAFETY_MAJOR_HAZARDS'], supportingKnowledgeIds: [claimId], priority: 100,
          },
        }]) },
        knowledgeClaim: { findMany: findClaims },
      } as never,
      understanding: emptyCaseUnderstanding(),
      facts: [],
      concepts: [{ code: 'INDOOR_ENVIRONMENT', confidence: 0.95, source: 'CLASSIFIER', supportingKnowledgeIds: [] }],
    })

    expect(profile).toBeNull()
    expect(findClaims).not.toHaveBeenCalled()
  })
})
