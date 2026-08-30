import { describe, expect, it, vi } from 'vitest'
import { contextQuestionGenerationInstructionsSchema } from './context-question-generation-contract'
import { loadKnowledgeGroundedContextGoals } from './knowledge-context-goal-provider'

const instructions = {
  contractVersion: 2,
  informationNeed: 'Bepaal welke relevante metingen beschikbaar zijn.',
  runtimeQuestionInstructions: 'Vraag alleen naar nog ontbrekende informatie over relevante metingen; neem niet aan dat er al gemeten is.',
  neutralFallbackQuestion: 'Zijn er relevante metingen beschikbaar en zo ja, wat is daarbij onderzocht?',
}
const claimId = '11111111-1111-4111-8111-111111111101'

describe('context-question contract v2', () => {
  it('weigert redactionele voorbeeldtekst in het generatorcontract', () => {
    expect(contextQuestionGenerationInstructionsSchema.safeParse({
      ...instructions, exampleQuestionForReview: 'Wanneer lekten de twaalf installaties?',
    }).success).toBe(false)
  })

  it('vereist expliciete neutrale fallback en één vraag', () => {
    expect(contextQuestionGenerationInstructionsSchema.safeParse(instructions).success).toBe(true)
    expect(contextQuestionGenerationInstructionsSchema.safeParse({ ...instructions, neutralFallbackQuestion: 'Wat? Wanneer?' }).success).toBe(false)
    expect(contextQuestionGenerationInstructionsSchema.safeParse({ ...instructions, neutralFallbackQuestion: undefined }).success).toBe(false)
  })

  it('projecteert de regelvariant zonder voorbeeldvraag naar de runtime', async () => {
    const result = await loadKnowledgeGroundedContextGoals({
      database: {
        knowledgeClaim: { findMany: vi.fn().mockResolvedValue([{ id: claimId, confidenceLevel: 'HIGH', topic: { slug: 'noise' } }]) },
        knowledgeRule: { findMany: vi.fn().mockResolvedValue([{
          id: '11111111-1111-4111-8111-111111111201', code: 'CASE_GOAL_NOISE_MEASUREMENTS', ruleVersion: 3,
          outputSchema: {
            ...instructions,
            kind: 'CONTEXT_GOAL', scope: 'INTAKE_ROUTING_KNOWLEDGE', code: 'EXISTING_MEASUREMENTS',
            variantKey: 'NOISE:MEASUREMENTS', questionKey: 'context_noise_measurements',
            exampleQuestionForReview: 'Wanneer lekten de twaalf installaties?',
            answerType: 'TEXT', options: [], category: 'EXISTING_CONTROL',
            relevantConceptCodes: ['NOISE'], satisfiesFactCodes: ['MEASUREMENT_CONTEXT_ANSWERED'],
            applicability: { requiredAllConceptCodes: ['NOISE'] },
            weights: { relevance: 1, informationGain: 1, matchingValue: 1, userBurden: 0.2 },
            supportingKnowledgeIds: [claimId],
          },
        }]) },
      } as never,
      concepts: [{ code: 'NOISE', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
      originalInput: 'Lawaai bij persen.',
    })
    const goal = result.goals.find((item) => item.variantKey === 'NOISE:MEASUREMENTS')
    expect(goal).toMatchObject({ ruleVersion: 3, questionGeneration: instructions, text: instructions.neutralFallbackQuestion })
    expect(JSON.stringify(goal)).not.toContain('twaalf')
    expect(JSON.stringify(goal)).not.toContain('exampleQuestionForReview')
  })
})
