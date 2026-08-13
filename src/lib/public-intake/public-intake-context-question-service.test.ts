import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: mocks.transaction,
  }),
}))

import { ensurePublicIntakeAIContextQuestions } from './public-intake-context-question-service'
import { AI_CONTEXT_QUESTION_CATALOG_VERSION } from '@/lib/ai-intake-classifier/ai-context-question-catalog'

const classification = {
  summary: 'Rugklachten tijdens het werk.',
  primarySubject: 'OCCUPATIONAL_HEALTH',
  secondarySubjects: [],
  confidence: 'HIGH',
  alternatives: [],
} as const

describe('public intake context-question persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({
      publicIntakeContextQuestion: {
        findMany: mocks.findMany,
        createMany: mocks.createMany,
      },
    }))
  })

  it('stores immutable catalog snapshots once with version, order and planner source', async () => {
    const stored = [{
      questionKey: 'context_work_activity', catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
      textSnapshot: 'Om wat voor werkzaamheden gaat het vooral?', answerType: 'OPTION',
      category: 'WORK', sequence: 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
    }]
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(stored)

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answeredQuestionKeys: [], fallbackQuestionWasAsked: false,
    })).resolves.toEqual(stored)

    expect(mocks.createMany).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
      data: expect.arrayContaining([expect.objectContaining({
        catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
        source: 'AI_CONTEXT_PLANNER', sequence: 1,
      })]),
    }))
  })

  it('reuses existing snapshots without rewriting them', async () => {
    const existing = Array.from({ length: 5 }, (_, index) => ({
      questionKey: 'context_work_activity', catalogVersion: 'ai-context-questions/old',
      textSnapshot: 'Historische vraagtekst', answerType: 'OPTION', category: 'WORK',
      sequence: index + 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
    }))
    mocks.findMany.mockResolvedValueOnce(existing).mockResolvedValueOnce(existing)

    const result = await ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answeredQuestionKeys: [], fallbackQuestionWasAsked: false,
    })

    expect(result[0]?.textSnapshot).toBe('Historische vraagtekst')
    expect(mocks.createMany).not.toHaveBeenCalled()
  })

  it('fails closed for an unexpected persisted source value', async () => {
    const existing = Array.from({ length: 5 }, (_, index) => ({
      questionKey: `context_${index}`, catalogVersion: 'ai-context-questions/1.0.0',
      textSnapshot: 'Historische vraagtekst', answerType: 'OPTION', category: 'WORK',
      sequence: index + 1, source: index === 0 ? 'UNEXPECTED_SOURCE' : 'AI_CONTEXT_PLANNER', createdAt: new Date(),
    }))
    mocks.findMany.mockResolvedValue(existing)

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Rugklachten tijdens het werk.',
      classification, answeredQuestionKeys: [], fallbackQuestionWasAsked: false,
    })).rejects.toThrow('PUBLIC_INTAKE_CONTEXT_QUESTION_SOURCE_INVARIANT')
  })
})
