import { beforeEach, describe, expect, it, vi } from 'vitest'
import { compatibilityContextGoals } from './context-goal-catalog'
import { KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION } from './context-question-engine-types'

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), find: vi.fn(), create: vi.fn(), plan: vi.fn(),
  formulate: vi.fn(), activeTransaction: false,
}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('./shared-assignment-context', () => ({
  getSharedSectorOptions: async () => [{ code: 'industrie', label: 'Industrie' }],
  inferSharedSectorCode: () => 'industrie', SHARED_CONTEXT_SECTOR_QUESTION_KEY: 'context_sector',
}))
vi.mock('./knowledge-context-goal-provider', () => ({ loadKnowledgeGroundedContextGoals: async () => ({
  goals: [], evidenceByGoalCode: new Map(), knowledgeConcepts: [],
}) }))
vi.mock('./context-question-engine', () => ({ planNextContextQuestion: mocks.plan }))
vi.mock('./context-question-openai-transport', () => ({ createContextQuestionOpenAITransport: () => null }))
vi.mock('./context-question-formulator', async (original) => ({
  ...await original<typeof import('./context-question-formulator')>(), formulateContextQuestion: mocks.formulate,
}))

import { ensurePublicIntakeAIContextQuestions } from './public-intake-context-question-service'

const goal = {
  ...compatibilityContextGoals[0], code: 'EXISTING_MEASUREMENTS',
  selectedContextRuleId: '11111111-1111-4111-8111-111111111201', ruleVersion: 3, variantKey: 'NOISE:MEASUREMENTS',
  questionGeneration: {
    contractVersion: 2 as const, informationNeed: 'Beschikbare relevante meetinformatie achterhalen.',
    runtimeQuestionInstructions: 'Vraag alleen naar ontbrekende meetinformatie.',
    neutralFallbackQuestion: 'Welke relevante meetinformatie is beschikbaar?',
  },
}
const plan = {
  engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION, mode: 'DIRECT_REQUEST',
  selected: { goal, applicability: { evidence: [], reasonCode: 'KNOWLEDGE_CONTEXT', skippedByFactCodes: [] },
    score: { relevance: 1, informationGain: 1, matchingValue: 1, evidenceConfidence: 1, userBurden: 1, total: 1 } },
  candidates: [], readiness: { status: 'CAN_ASK_HIGH_VALUE_CONTEXT' }, deduplicatedGoalCount: 0, questionBudgetRemaining: 5,
}
const input = {
  draftId: '11111111-1111-4111-8111-111111111001', originalInput: 'Lawaai bij persen in de industrie.',
  classification: { summary: 'Lawaai bij persen.', primarySubject: 'OCCUPATIONAL_HEALTH' as const,
    secondarySubjects: [], confidence: 'HIGH' as const, alternatives: [] },
  answers: [], fallbackQuestionWasAsked: false, mode: 'DIRECT_REQUEST' as const,
}

describe('two-phase context-question persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.activeTransaction = false
    mocks.find.mockResolvedValue([])
    mocks.plan.mockReturnValue(plan)
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      mocks.activeTransaction = true
      try { return await callback({ publicIntakeContextQuestion: { findMany: mocks.find, createMany: mocks.create } }) }
      finally { mocks.activeTransaction = false }
    })
    mocks.formulate.mockImplementation(async () => {
      expect(mocks.activeTransaction).toBe(false)
      expect(mocks.create).not.toHaveBeenCalled()
      return { text: goal.questionGeneration.neutralFallbackQuestion,
        provenance: { status: 'SAFE_FALLBACK', reasonCode: 'GENERATOR_UNAVAILABLE' } }
    })
  })

  it('formulates outside the transaction and persists only after identical replanning', async () => {
    await ensurePublicIntakeAIContextQuestions(input)
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.formulate).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create.mock.calls[0][0].data[0]).toMatchObject({
      textSnapshot: goal.questionGeneration.neutralFallbackQuestion,
      planningSnapshot: { selectedContextRuleId: goal.selectedContextRuleId,
        variantKey: goal.variantKey, knowledgeGroundingApplicableToCase: false },
    })
  })

  it('never persists wording when the selected rule changes during generation', async () => {
    mocks.plan.mockReturnValueOnce(plan).mockReturnValueOnce({ ...plan, selected: {
      ...plan.selected, goal: { ...goal, selectedContextRuleId: '11111111-1111-4111-8111-111111111202' },
    } })
    await ensurePublicIntakeAIContextQuestions(input)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the concurrent existing question instead of writing a duplicate', async () => {
    mocks.find.mockResolvedValueOnce([]).mockResolvedValueOnce([{
      questionKey: 'concurrent_question', catalogVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
      textSnapshot: 'Welke informatie ontbreekt nog?', answerType: 'TEXT', category: 'CONTEXT',
      sequence: 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(), planningSnapshot: null,
    }])
    expect(await ensurePublicIntakeAIContextQuestions(input)).toHaveLength(1)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
