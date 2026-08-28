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

import { ensurePublicIntakeAIContextQuestions, toPublicIntakeContextQuestionView } from './public-intake-context-question-service'
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
    vi.resetAllMocks()
    mocks.transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) => callback({
      publicIntakeContextQuestion: {
        findMany: mocks.findMany,
        createMany: mocks.createMany,
      },
    }))
  })

  it('maps a valid Prisma-shaped planner record to the stable view', () => {
    expect(toPublicIntakeContextQuestionView({
      questionKey: 'context_work_activity', catalogVersion: 'ai-context-questions/1.0.0',
      textSnapshot: 'Om wat voor werkzaamheden gaat het vooral?', answerType: 'OPTION',
      category: 'WORK', sequence: 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
    }).source).toBe('AI_CONTEXT_PLANNER')
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

  it('stopt fail-safe wanneer de totale contextvraagbegroting van vijf is bereikt', async () => {
    const existing = Array.from({ length: 4 }, (_, index) => ({
      questionKey: `context_${index}`, catalogVersion: 'ai-context-questions/1.1.0',
      textSnapshot: 'Historische vraagtekst', answerType: 'OPTION', category: 'SCOPE',
      sequence: index + 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
    }))
    mocks.findMany.mockResolvedValue(existing)

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000001', originalInput: 'Wij hebben een RI&E nodig.',
      classification: { ...classification, primarySubject: 'RIE' },
      answeredQuestionKeys: ['guidance_topic'], fallbackQuestionWasAsked: true,
    })).resolves.toEqual(existing)

    expect(mocks.createMany).not.toHaveBeenCalled()
  })

  it('plant na een fallbackkeuze RI&E de beheerde vragen voor een bestaand risico', async () => {
    const stored = [
      {
        questionKey: 'context_existing_investigation', catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
        textSnapshot: 'Is deze situatie al onderzocht of opgenomen in een RI&E?', answerType: 'OPTION',
        category: 'EXISTING_CONTROL', sequence: 1, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
      },
      {
        questionKey: 'context_affected_scope', catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
        textSnapshot: 'Bij hoeveel medewerkers speelt dit?', answerType: 'OPTION',
        category: 'SCOPE', sequence: 2, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
      },
      {
        questionKey: 'context_preferred_start', catalogVersion: AI_CONTEXT_QUESTION_CATALOG_VERSION,
        textSnapshot: 'Wanneer wilt u bij voorkeur starten?', answerType: 'OPTION',
        category: 'URGENCY', sequence: 3, source: 'AI_CONTEXT_PLANNER', createdAt: new Date(),
      },
    ]
    mocks.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce(stored)

    await expect(ensurePublicIntakeAIContextQuestions({
      draftId: '00000000-0000-0000-0000-000000000002',
      originalInput: 'Wij hebben veel lawaai in onze werkplaats en weten niet of dit goed in onze RI&E staat.',
      classification: {
        summary: 'Handmatig gekozen RI&E-richting.',
        primarySubject: 'RIE',
        secondarySubjects: [],
        confidence: 'MEDIUM',
        alternatives: [],
      },
      answeredQuestionKeys: ['guidance_topic'],
      fallbackQuestionWasAsked: true,
    })).resolves.toEqual(stored)

    expect(mocks.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: stored.map((question) => expect.objectContaining({
        questionKey: question.questionKey,
      })),
    }))
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
