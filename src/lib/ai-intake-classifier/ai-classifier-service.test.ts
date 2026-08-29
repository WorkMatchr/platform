import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AIClassifier } from './ai-classifier-contract'
import {
  AI_INTAKE_MAX_INPUT_CHARACTERS,
  DEFAULT_AI_INTAKE_TIMEOUT_MS,
  MAX_AI_INTAKE_TIMEOUT_MS,
  classifyAIIntakeSafely,
  createConfiguredAIClassifier,
} from './ai-classifier-service'

const fictionalHelpRequest =
  'Bij onze fictieve organisatie vond een bijna-ongeval plaats.'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('veilige AI Intake Classifier-service', () => {
  it('geeft gestructureerde case-understanding begrensd meer tijd dan de legacy classificatie', () => {
    expect(DEFAULT_AI_INTAKE_TIMEOUT_MS).toBe(30_000)
    expect(MAX_AI_INTAKE_TIMEOUT_MS).toBe(45_000)
  })

  it('valt zonder configuratie terug op de deterministische flow', async () => {
    vi.stubEnv('OPENAI_API_KEY', '')
    const logger = vi.fn()

    await expect(
      classifyAIIntakeSafely(fictionalHelpRequest, {
        logger,
        now: () => 10,
      }),
    ).resolves.toEqual({
      classification: null,
      fallbackUsed: true,
      fallbackReason: 'CONFIGURATION_MISSING',
      providerStatusCode: null,
    })
    expect(createConfiguredAIClassifier()).toBeNull()
  })

  it('retourneert gevalideerde classificatie en logt geen hulpvraag', async () => {
    const classifier: AIClassifier = {
      provider: 'fictieve-provider',
      model: 'fictief-model',
      classify: vi.fn(async () =>
        Object.freeze({
          summary: 'De ondernemer meldt een bijna-ongeval.',
          primarySubject: 'INCIDENT',
          secondarySubjects: Object.freeze(['RIE'] as const),
          confidence: 'HIGH',
          alternatives: Object.freeze([] as const),
        }),
      ),
    }
    const logger = vi.fn()

    const result = await classifyAIIntakeSafely(fictionalHelpRequest, {
      classifier,
      logger,
      now: (() => {
        let value = 1_000
        return () => (value += 8)
      })(),
    })

    expect(result.classification?.primarySubject).toBe('INCIDENT')
    expect(result.fallbackUsed).toBe(false)
    expect(result.fallbackReason).toBeNull()
    expect(logger).toHaveBeenCalledWith({
      latencyMs: 8,
      provider: 'fictieve-provider',
      model: 'fictief-model',
      confidence: 'HIGH',
      fallbackUsed: false,
      fallbackReason: null,
      providerStatusCode: null,
    })
    expect(JSON.stringify(logger.mock.calls)).not.toContain(
      fictionalHelpRequest,
    )
  })

  it('categoriseert ongeldige provideroutput zonder inhoud te loggen', async () => {
    const classifier = {
      provider: 'fictieve-provider',
      model: 'fictief-model',
      classify: vi.fn(async () => ({
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: 'NIET_BEKEND',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: [],
      })),
    } as unknown as AIClassifier
    const logger = vi.fn()

    await expect(
      classifyAIIntakeSafely(fictionalHelpRequest, {
        classifier,
        logger,
        now: () => 50,
      }),
    ).resolves.toEqual({
      classification: null,
      fallbackUsed: true,
      fallbackReason: 'OUTPUT_INVALID',
      providerStatusCode: null,
    })
    expect(JSON.stringify(logger.mock.calls)).not.toContain(
      fictionalHelpRequest,
    )
  })

  it('weigert oversized invoer vóór de provider wordt aangeroepen', async () => {
    const classifier: AIClassifier = {
      provider: 'fictieve-provider',
      model: 'fictief-model',
      classify: vi.fn(),
    }

    await expect(classifyAIIntakeSafely(
      'x'.repeat(AI_INTAKE_MAX_INPUT_CHARACTERS + 1),
      { classifier, logger: vi.fn() },
    )).resolves.toMatchObject({
      classification: null,
      fallbackReason: 'INPUT_REJECTED',
    })

    expect(classifier.classify).not.toHaveBeenCalled()
  })
})
