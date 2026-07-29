import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicIntakeDraftView } from './public-intake-types'

const mocks = vi.hoisted(() => ({
  classify: vi.fn(),
}))

vi.mock(
  '@/lib/ai-intake-classifier/ai-classification-cache',
  () => ({
    classifyAIIntakeWithCache: mocks.classify,
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

  it('classificeert niet opnieuw na gebruikersbevestiging', async () => {
    const result = await enrichPublicIntakeDraftWithAIClassification({
      ...draft,
      answers: [
        {
          questionKey: 'guidance_topic',
          disposition: 'ANSWERED',
        },
      ],
    } as PublicIntakeDraftView)

    expect(result.aiClassification).toBeUndefined()
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
})
