import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicIntakeDraftView } from './public-intake-types'

const mocks = vi.hoisted(() => ({
  classify: vi.fn(),
  readCached: vi.fn(),
}))

vi.mock(
  '@/lib/ai-intake-classifier/ai-classification-cache',
  () => ({
    classifyAIIntakeWithCache: mocks.classify,
    readCachedAIClassification: mocks.readCached,
  }),
)

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

    expect(mocks.classify).toHaveBeenCalledWith(draft.originalInput)
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
