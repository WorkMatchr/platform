import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  abandon: vi.fn(),
  cookieGet: vi.fn(),
  cookieSet: vi.fn(),
  getDraft: vi.fn(),
  record: vi.fn(),
  enrich: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mocks.cookieGet,
    set: mocks.cookieSet,
  })),
}))

vi.mock('@/lib/public-intake/public-intake-service', () => ({
  abandonPublicIntakeDraftByUser: mocks.abandon,
  changePublicIntakePhase: vi.fn(),
  createPublicIntakeDraft: vi.fn(),
  getPublicIntakeDraftForSession: mocks.getDraft,
  recordPublicIntakeAnswer: mocks.record,
  resumePublicIntakeDraft: vi.fn(),
}))

vi.mock(
  '@/lib/public-intake/public-intake-ai-classification',
  () => ({
    enrichPublicIntakeDraftWithAIClassification: mocks.enrich,
  }),
)

import {
  abandonPublicIntakeDraftAction,
  confirmPublicIntakeAIClassificationAction,
  recordPublicIntakeTopicSelectionAction,
} from './advieswijzer/actions'

describe('publieke conceptintake bewust beëindigen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookieGet.mockReturnValue({ value: 'fictief-publiek-sessietoken' })
  })

  it.each(['ABANDONED', 'ALREADY_ABANDONED'] as const)(
    'verwijdert de conceptsessiecookie na service-uitkomst %s',
    async (outcome) => {
      mocks.abandon.mockResolvedValue({ outcome })

      await expect(abandonPublicIntakeDraftAction()).resolves.toEqual({ ok: true })
      expect(mocks.abandon).toHaveBeenCalledWith('fictief-publiek-sessietoken')
      expect(mocks.cookieSet).toHaveBeenCalledWith(
        'wm_public_intake',
        '',
        expect.objectContaining({
          httpOnly: true,
          path: '/advieswijzer',
          maxAge: 0,
          expires: new Date(0),
        }),
      )
    },
  )

  it('behoudt de cookie en toont geen technisch detail wanneer de service faalt', async () => {
    mocks.abandon.mockRejectedValue(new Error('fictieve databasefout'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(abandonPublicIntakeDraftAction()).resolves.toEqual({
      ok: false,
      message: 'Wij konden uw huidige concept niet afsluiten. Probeer het opnieuw.',
    })
    expect(mocks.cookieSet).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      '[public-intake] Concept afsluiten mislukt.',
      { errorType: 'Error' },
    )
    consoleError.mockRestore()
  })
})

describe('AI-begripsbevestiging in de publieke intake', () => {
  const classifiedDraft = {
    entryPoint: 'FREE_TEXT',
    originalInput: 'Een fictieve vraag over een incident op de werkvloer.',
    answers: [],
    aiClassification: {
      summary: 'De ondernemer meldt een incident op de werkvloer.',
      primarySubject: 'INCIDENT',
      secondarySubjects: [],
      confidence: 'HIGH',
      alternatives: [],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookieGet.mockReturnValue({ value: 'fictief-publiek-sessietoken' })
    mocks.getDraft.mockResolvedValue(classifiedDraft)
    mocks.enrich.mockResolvedValue(classifiedDraft)
    mocks.record.mockResolvedValue({ ...classifiedDraft, answers: [{}] })
  })

  it('slaat een bevestigd AI-onderwerp server-side op zonder clientbron', async () => {
    await expect(
      confirmPublicIntakeAIClassificationAction(),
    ).resolves.toMatchObject({ ok: true })

    expect(mocks.record).toHaveBeenCalledWith(
      'fictief-publiek-sessietoken',
      {
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'INCIDENT',
      },
      { answerSource: 'AI_CONFIRMED' },
    )
  })

  it('legt een afwijkende handmatige keuze vast als gebruikerscorrectie', async () => {
    const input = {
      questionKey: 'guidance_topic',
      questionVersion: 1,
      disposition: 'ANSWERED' as const,
      value: 'RIE',
    }

    await expect(
      recordPublicIntakeTopicSelectionAction(input),
    ).resolves.toMatchObject({ ok: true })

    expect(mocks.record).toHaveBeenCalledWith(
      'fictief-publiek-sessietoken',
      input,
      { answerSource: 'USER_CORRECTED' },
    )
  })

  it('legt een keuze zonder bruikbare AI-uitkomst vast als fallbackselectie', async () => {
    mocks.enrich.mockResolvedValue({
      ...classifiedDraft,
      aiClassification: null,
    })
    const input = {
      questionKey: 'guidance_topic',
      questionVersion: 1,
      disposition: 'ANSWERED' as const,
      value: 'OTHER',
    }

    await recordPublicIntakeTopicSelectionAction(input)

    expect(mocks.record).toHaveBeenCalledWith(
      'fictief-publiek-sessietoken',
      input,
      { answerSource: 'FALLBACK_SELECTION' },
    )
  })
})
