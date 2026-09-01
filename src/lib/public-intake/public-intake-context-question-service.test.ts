import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findQuestions: vi.fn(), createQuestions: vi.fn(), findSectorMappings: vi.fn(),
  findClaims: vi.fn(), findRules: vi.fn(), updateDraft: vi.fn(), transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./context-question-openai-transport', () => ({ createContextQuestionOpenAITransport: () => null }))

import { ensurePublicIntakeAIContextQuestions, selectQuestionPlanningConcepts, toPublicIntakeContextQuestionView } from './public-intake-context-question-service'
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
      publicIntakeDraft: { update: mocks.updateDraft },
      providerSectorTaxonomyMap: { findMany: mocks.findSectorMappings },
      knowledgeClaim: { findMany: mocks.findClaims }, knowledgeRule: { findMany: mocks.findRules },
    }))
  })

  it('behandelt domeinconcepten uit andere gepubliceerde regels niet als casusevidence', () => {
    const concepts = selectQuestionPlanningConcepts({
      initialConcepts: [{ code: 'MACHINE_SAFETY', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }],
      knowledgeConcepts: [{ code: 'PROCESS_INTEGRITY', confidence: 1, source: 'KNOWLEDGE_TOPIC', supportingKnowledgeIds: ['rule-from-another-domain'] }],
    })

    expect(concepts.map((concept) => concept.code)).toEqual(['MACHINE_SAFETY'])
  })

  it('maps planning provenance and managed sector options to the stable view', () => {
    expect(toPublicIntakeContextQuestionView(storedQuestion, [{ code: 'industrie', label: 'Industrie' }])).toMatchObject({
      source: 'AI_CONTEXT_PLANNER', contextGoalCode: 'SECTOR',
      options: [{ label: 'Industrie', value: 'industrie' }],
      planning: { engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION },
    })
  })

  it('blijft een historische 1.0-planningssnapshot hervatbaar weergeven', () => {
    const historical = {
      ...storedQuestion,
      planningSnapshot: {
        ...storedQuestion.planningSnapshot,
        engineVersion: 'knowledge-grounded-context-engine/1.0.0',
      },
    }
    expect(toPublicIntakeContextQuestionView(historical)).toMatchObject({
      planning: { engineVersion: 'knowledge-grounded-context-engine/1.0.0' },
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

  it('start bij technische uitval de bestaande engine op expliciet deterministisch bewijs', async () => {
    mocks.findQuestions.mockResolvedValueOnce([]).mockResolvedValueOnce([storedQuestion])

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000005',
      originalInput: 'Medewerkers noemen hoge werkdruk en onderlinge spanningen.',
      classification: null,
      classifierAvailability: 'TECHNICALLY_UNAVAILABLE',
      answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST',
    })).resolves.toMatchObject([{ questionKey: 'context_sector' }])

    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '00000000-0000-0000-0000-000000000005' },
    }))
  })

  it('start de bestaande engine bij technische uitval op expliciete re-integratiecontext', async () => {
    mocks.findQuestions.mockResolvedValueOnce([]).mockResolvedValueOnce([storedQuestion])

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000007',
      originalInput: 'Een werknemer hervat het werk gedeeltelijk; er is verschil over de inzetbare uren en wij vragen geen medische informatie op.',
      classification: null,
      classifierAvailability: 'TECHNICALLY_UNAVAILABLE',
      answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST',
    })).resolves.toMatchObject([{ questionKey: 'context_sector' }])

    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(mocks.updateDraft).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: '00000000-0000-0000-0000-000000000007' },
    }))
  })

  it('houdt zonder betrouwbaar expliciet bewijs de generieke fallback intact', async () => {
    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000006',
      originalInput: 'Wij willen graag ondersteuning.',
      classification: null,
      classifierAvailability: 'TECHNICALLY_UNAVAILABLE',
      answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST',
    })).resolves.toEqual([])

    expect(mocks.transaction).not.toHaveBeenCalled()
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
