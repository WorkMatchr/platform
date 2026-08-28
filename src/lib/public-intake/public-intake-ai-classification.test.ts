import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicIntakeDraftView } from './public-intake-types'

const mocks = vi.hoisted(() => ({
  classify: vi.fn(),
  readCached: vi.fn(),
  ensureContextQuestions: vi.fn(),
}))

vi.mock(
  '@/lib/ai-intake-classifier/ai-classification-cache',
  () => ({
    classifyAIIntakeWithCache: mocks.classify,
    readCachedAIClassification: mocks.readCached,
  }),
)

vi.mock('./public-intake-context-question-service', () => ({
  ensurePublicIntakeAIContextQuestions: mocks.ensureContextQuestions,
}))

import { enrichPublicIntakeDraftWithAIClassification } from './public-intake-ai-classification'
import { getAIIntakeUnderstanding } from './public-intake-ai-presentation'

const draft = {
  entryPoint: 'FREE_TEXT',
  originalInput:
    'Ons fictieve bedrijf wil weten hoe het veilig met brandstof kan werken.',
  answers: [],
} as unknown as PublicIntakeDraftView

describe('Public Intake AI-classificatiehandoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readCached.mockResolvedValue(null)
    mocks.ensureContextQuestions.mockResolvedValue([])
    mocks.classify.mockResolvedValue({
      classification: {
        summary:
          'De ondernemer wil weten hoe veilig met brandstof kan worden gewerkt.',
        primarySubject: 'HAZARDOUS_SUBSTANCES',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: ['INCIDENT'],
      },
      fallbackUsed: false,
      fallbackReason: null,
      providerStatusCode: null,
    })
  })

  it('verrijkt alleen een vrije hulpvraag zonder bevestigde onderwerpkeuze', async () => {
    const result = await enrichPublicIntakeDraftWithAIClassification(draft)

    expect(mocks.classify).toHaveBeenCalledWith(
      draft.originalInput,
      { authorizeExternalCall: undefined },
    )
    expect(result.aiClassification?.primarySubject).toBe(
      'HAZARDOUS_SUBSTANCES',
    )
    expect(getAIIntakeUnderstanding(result.aiClassification)).toMatchObject({
      subjectCode: 'HAZARDOUS_SUBSTANCES',
    })
  })

  it('herstelt de bevestigde interpretatie uit cache zonder opnieuw te classificeren', async () => {
    const classification = {
      summary:
        'U wilt weten hoe veilig met brandstof kan worden gewerkt.',
      primarySubject: 'HAZARDOUS_SUBSTANCES',
      secondarySubjects: [],
      confidence: 'HIGH',
      alternatives: ['INCIDENT'],
    } as const
    mocks.readCached.mockResolvedValue(classification)

    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      answers: [
        {
          questionKey: 'guidance_topic',
          disposition: 'ANSWERED',
          source: 'AI_CONFIRMED',
          value: 'HAZARDOUS_SUBSTANCES',
        },
      ],
    } as PublicIntakeDraftView)

    expect(result.aiClassification).toEqual(classification)
    expect(mocks.readCached).toHaveBeenCalledWith(draft.originalInput)
    expect(mocks.classify).not.toHaveBeenCalled()
  })

  it('gebruikt een handmatige onderwerpkeuze nooit als bevestiging van de AI-samenvatting', async () => {
    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      answers: [
        {
          questionKey: 'guidance_topic',
          disposition: 'ANSWERED',
          source: 'USER_CORRECTED',
          value: 'HAZARDOUS_SUBSTANCES',
        },
      ],
    } as PublicIntakeDraftView)

    expect(result.aiClassification).toBeUndefined()
    expect(mocks.readCached).not.toHaveBeenCalled()
    expect(mocks.classify).not.toHaveBeenCalled()
  })

  it('activeert na een veilige fallbackkeuze RI&E alsnog de beheerde contextplanner', async () => {
    const fallbackDraft = {
      ...draft,
      id: 'public-intake-fallback-fixture',
      phase: 'CLARIFYING',
      selectedRequestKey: null,
      flowVersion: 'PUBLIC-HELP-REQUEST-2',
      currentStep: 'guidance_topic',
      version: 2,
      startedAt: new Date('2026-08-28T12:00:00.000Z'),
      lastInteractionAt: new Date('2026-08-28T12:01:00.000Z'),
      expiresAt: new Date('2026-11-26T12:00:00.000Z'),
      contextQuestions: [],
      answers: [
        {
          questionKey: 'guidance_topic',
          questionVersion: 1,
          answerType: 'OPTION',
          disposition: 'ANSWERED',
          source: 'FALLBACK_SELECTION',
          version: 1,
          value: 'RIE',
        },
      ],
    } as PublicIntakeDraftView

    const result = await enrichPublicIntakeDraftWithAIClassification(fallbackDraft)

    expect(mocks.ensureContextQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId: 'public-intake-fallback-fixture',
        originalInput: draft.originalInput,
        fallbackQuestionWasAsked: true,
        classification: expect.objectContaining({
          primarySubject: 'RIE',
          confidence: 'MEDIUM',
        }),
      }),
    )
    expect(result.aiClassification).toBeUndefined()
    expect(mocks.classify).not.toHaveBeenCalled()
  })

  it('activeert geen RI&E-profiel voor een andere handmatige fallbackkeuze', async () => {
    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      id: 'public-intake-other-fixture',
      answers: [
        {
          questionKey: 'guidance_topic',
          disposition: 'ANSWERED',
          source: 'FALLBACK_SELECTION',
          value: 'OTHER',
        },
      ],
    } as PublicIntakeDraftView)

    expect(mocks.ensureContextQuestions).not.toHaveBeenCalled()
    expect(result.aiClassification).toBeUndefined()
  })

  it('laat bij providerfouten de bestaande draft ongewijzigd bruikbaar', async () => {
    mocks.classify.mockResolvedValue({
      classification: null,
      fallbackUsed: true,
      fallbackReason: 'PROVIDER_UNAVAILABLE',
      providerStatusCode: 503,
    })

    await expect(
      enrichPublicIntakeDraftWithAIClassification(draft),
    ).resolves.toMatchObject({
      aiClassification: null,
      entryPoint: 'FREE_TEXT',
      answers: [],
    })
  })

  it('markeert een begrensde AI-call zonder technische details te tonen', async () => {
    mocks.classify.mockResolvedValue({
      classification: null,
      fallbackUsed: true,
      fallbackReason: 'RATE_LIMITED',
      providerStatusCode: null,
    })

    await expect(
      enrichPublicIntakeDraftWithAIClassification(draft),
    ).resolves.toMatchObject({
      aiClassification: null,
      aiClassificationProtection: 'RATE_LIMITED',
    })
  })

  it('gebruikt overeenkomende kenniscontext begrensd bij een lage AI-uitkomst', async () => {
    mocks.classify.mockResolvedValue({
      classification: {
        summary: 'U wilt weten wanneer u een bedrijfsarts moet inschakelen.',
        primarySubject: 'UNKNOWN',
        secondarySubjects: [],
        confidence: 'LOW',
        alternatives: [],
      },
      fallbackUsed: false,
      fallbackReason: null,
      providerStatusCode: null,
    })

    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      originalInput: 'Wij willen weten wanneer wij een bedrijfsarts moeten inschakelen.',
      knowledgeContext: {
        id: 'OCCUPATIONAL_PHYSICIAN',
        version: 1,
        sourceRoute: '/kenniscentrum/wanneer-bedrijfsarts-inschakelen',
        shortLabel: 'Bedrijfsarts',
        title: 'De bedrijfsarts inschakelen',
        suggestedCategory: 'OCCUPATIONAL_HEALTH',
      },
    } as PublicIntakeDraftView)

    expect(result.aiClassification).toMatchObject({
      primarySubject: 'OCCUPATIONAL_HEALTH',
      confidence: 'MEDIUM',
    })
  })

  it('laat een bekende tegenstrijdige AI-uitkomst voorgaan op kenniscontext', async () => {
    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      knowledgeContext: {
        id: 'OCCUPATIONAL_PHYSICIAN',
        version: 1,
        sourceRoute: '/kenniscentrum/wanneer-bedrijfsarts-inschakelen',
        shortLabel: 'Bedrijfsarts',
        title: 'De bedrijfsarts inschakelen',
        suggestedCategory: 'OCCUPATIONAL_HEALTH',
      },
    } as PublicIntakeDraftView)

    expect(result.aiClassification).toMatchObject({
      primarySubject: 'HAZARDOUS_SUBSTANCES',
      confidence: 'HIGH',
    })
  })
})
