import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findQuestions: vi.fn(), createQuestions: vi.fn(), findSectorMappings: vi.fn(),
  findClaims: vi.fn(), findRules: vi.fn(), transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))

import { ensurePublicIntakeAIContextQuestions, toPublicIntakeContextQuestionView } from './public-intake-context-question-service'
import { KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION } from './context-question-engine-types'

const classification = {
  summary: 'Rugklachten tijdens het werk.', primarySubject: 'OCCUPATIONAL_HEALTH',
  secondarySubjects: [], confidence: 'HIGH', alternatives: [],
} as const

const storedQuestion = {
  questionKey: 'context_sector', catalogVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
  textSnapshot: 'In welke sector is uw organisatie actief?', answerType: 'OPTION' as const,
  category: 'ORGANIZATION', sequence: 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
  contextGoalCode: 'SECTOR', planningSnapshot: {
    engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION, mode: 'DIRECT_REQUEST',
    contextGoalCode: 'SECTOR', reasonCode: 'MANDATORY_CONTEXT',
    score: { relevance: 1, informationGain: 0.9, matchingValue: 1, evidenceConfidence: 1, userBurden: 0.2, total: 101 },
    relevantConceptCodes: [], supportingKnowledgeIds: ['legacy:SECTOR'], skippedByFactCodes: [], options: [],
  },
} as const

describe('public intake context-question persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findSectorMappings.mockResolvedValue([
      { sector: { slug: 'industrie' }, term: { label: 'Industrie', sortOrder: 1 } },
      { sector: { slug: 'logistiek' }, term: { label: 'Logistiek', sortOrder: 2 } },
    ])
    mocks.findClaims.mockResolvedValue([])
    mocks.findRules.mockResolvedValue([])
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({
      publicIntakeContextQuestion: { findMany: mocks.findQuestions, createMany: mocks.createQuestions },
      providerSectorTaxonomyMap: { findMany: mocks.findSectorMappings },
      knowledgeClaim: { findMany: mocks.findClaims }, knowledgeRule: { findMany: mocks.findRules },
    }))
  })

  it('maps planning provenance and managed sector options to the stable view', () => {
    expect(toPublicIntakeContextQuestionView(storedQuestion, [{ code: 'industrie', label: 'Industrie' }])).toMatchObject({
      source: 'AI_CONTEXT_PLANNER', contextGoalCode: 'SECTOR',
      options: [{ label: 'Industrie', value: 'industrie' }],
      planning: { engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION },
    })
  })

  it('persists only the highest-ranked next question and replans after an answer', async () => {
    mocks.findQuestions.mockResolvedValueOnce([]).mockResolvedValueOnce([storedQuestion])
    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST',
    })).resolves.toMatchObject([{ questionKey: 'context_sector' }])
    expect(mocks.createQuestions).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true, data: [expect.objectContaining({
        contextGoalCode: 'SECTOR', catalogVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION, sequence: 1,
      })],
    }))
  })

  it('does not append a second question while the current planned question is unanswered', async () => {
    mocks.findQuestions.mockResolvedValue([storedQuestion])
    const result = await ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answers: [], fallbackQuestionWasAsked: false, mode: 'DISCOVERY',
    })
    expect(result).toHaveLength(1)
    expect(mocks.createQuestions).not.toHaveBeenCalled()
  })

  it('stops fail-safe when the total five-answer budget is exhausted', async () => {
    mocks.findQuestions.mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({
      ...storedQuestion, questionKey: `context_${index}`, sequence: index + 1, planningSnapshot: null,
    })))
    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Wij hebben een RI&E nodig.',
      classification: { ...classification, primarySubject: 'RIE' }, answers: [],
      fallbackQuestionWasAsked: true, mode: 'DIRECT_REQUEST',
    })).resolves.toHaveLength(4)
    expect(mocks.createQuestions).not.toHaveBeenCalled()
  })

  it('fails closed for an unexpected persisted source value', async () => {
    mocks.findQuestions.mockResolvedValue(Array.from({ length: 5 }, (_, index) => ({
      ...storedQuestion, questionKey: `context_${index}`, sequence: index + 1,
      source: index === 0 ? 'UNEXPECTED_SOURCE' : 'AI_CONTEXT_PLANNER',
    })))
    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST',
    })).rejects.toThrow('PUBLIC_INTAKE_CONTEXT_QUESTION_SOURCE_INVARIANT')
  })
})
