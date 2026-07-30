import { describe, expect, it, vi } from 'vitest'
import type { SafeAIClassificationResult } from './ai-classifier-contract'
import {
  classifyAIIntakeWithCache,
  createAIClassificationFingerprint,
  readCachedAIClassification,
  serializeAIClassifierOutput,
  type AIClassificationCacheRepository,
} from './ai-classification-cache'

type StoredRecord = {
  inputFingerprint: string
  status: 'PROCESSING' | 'COMPLETED'
  classificationJson: unknown
  fallbackReason: string | null
  providerStatusCode: number | null
}

function createRepository(): {
  repository: AIClassificationCacheRepository
  records: Map<string, StoredRecord>
} {
  const records = new Map<string, StoredRecord>()

  return {
    records,
    repository: {
      async find(inputFingerprint) {
        return records.get(inputFingerprint) ?? null
      },
      async claim(input) {
        if (records.has(input.inputFingerprint)) return false
        records.set(input.inputFingerprint, {
          inputFingerprint: input.inputFingerprint,
          status: 'PROCESSING',
          classificationJson: null,
          fallbackReason: null,
          providerStatusCode: null,
        })
        return true
      },
      async complete(inputFingerprint, result) {
        records.set(inputFingerprint, {
          inputFingerprint,
          status: 'COMPLETED',
          classificationJson: result.classification,
          fallbackReason: result.fallbackReason,
          providerStatusCode: result.providerStatusCode,
        })
      },
    },
  }
}

const successfulResult: SafeAIClassificationResult = {
  classification: {
    summary: 'De ondernemer meldt een incident op de werkvloer.',
    primarySubject: 'INCIDENT',
    secondarySubjects: [],
    confidence: 'HIGH',
    alternatives: ['OCCUPATIONAL_HEALTH'],
  },
  fallbackUsed: false,
  fallbackReason: null,
  providerStatusCode: null,
}

describe('AI Intake-classificatiecache', () => {
  it('bewaart het volledige gevalideerde begrip inclusief samenvatting', () => {
    expect(
      serializeAIClassifierOutput(successfulResult.classification!),
    ).toEqual(successfulResult.classification)
  })

  it('normaliseert dezelfde ongewijzigde hulpvraag naar dezelfde fingerprint', () => {
    expect(
      createAIClassificationFingerprint(
        '  Een medewerker is gevallen. ',
        'classifier/1',
        'model/1',
      ),
    ).toBe(
      createAIClassificationFingerprint(
        'een   medewerker is gevallen.',
        'classifier/1',
        'model/1',
      ),
    )
  })

  it('voert voor dezelfde hulpvraag bij reload of resume maar één classificatie uit', async () => {
    const { repository } = createRepository()
    const classify = vi.fn().mockResolvedValue(successfulResult)
    const options = {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
    } as const

    const first = await classifyAIIntakeWithCache(
      'Een fictieve medewerker is gevallen.',
      options,
    )
    const resumed = await classifyAIIntakeWithCache(
      '  EEN fictieve medewerker is gevallen. ',
      options,
    )

    expect(first).toEqual(successfulResult)
    expect(resumed).toEqual(successfulResult)
    expect(classify).toHaveBeenCalledTimes(1)
  })

  it('leest een bestaande bevestigde classificatie zonder een providercall te starten', async () => {
    const { repository } = createRepository()
    const classify = vi.fn().mockResolvedValue(successfulResult)
    const options = {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
    } as const
    const helpRequest = 'Een fictieve medewerker is gevallen.'

    await classifyAIIntakeWithCache(helpRequest, options)
    classify.mockClear()

    await expect(
      readCachedAIClassification(helpRequest, options),
    ).resolves.toEqual(successfulResult.classification)
    expect(classify).not.toHaveBeenCalled()
  })

  it('classificeert eenmaal opnieuw wanneer de oorspronkelijke hulpvraag inhoudelijk wijzigt', async () => {
    const { repository } = createRepository()
    const classify = vi.fn().mockResolvedValue(successfulResult)
    const options = {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
    } as const

    await classifyAIIntakeWithCache('Een incident op locatie.', options)
    await classifyAIIntakeWithCache(
      'Een incident met letsel op locatie.',
      options,
    )

    expect(classify).toHaveBeenCalledTimes(2)
  })

  it('coalescet twee gelijktijdige misses naar één externe classificatie', async () => {
    const { repository } = createRepository()
    const classify = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
      return successfulResult
    })
    const options = {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
    } as const

    const results = await Promise.all([
      classifyAIIntakeWithCache(
        'Een gelijktijdige fictieve hulpvraag.',
        options,
      ),
      classifyAIIntakeWithCache(
        'Een gelijktijdige fictieve hulpvraag.',
        options,
      ),
    ])

    expect(results).toEqual([successfulResult, successfulResult])
    expect(classify).toHaveBeenCalledTimes(1)
  })

  it('bewaart een providerfallback zodat latere reads niet opnieuw proberen', async () => {
    const { repository } = createRepository()
    const fallback: SafeAIClassificationResult = {
      classification: null,
      fallbackUsed: true,
      fallbackReason: 'PROVIDER_UNAVAILABLE',
      providerStatusCode: 503,
    }
    const classify = vi.fn().mockResolvedValue(fallback)
    const options = {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
    } as const

    expect(
      await classifyAIIntakeWithCache(
        'Een fictieve vraag bij provideruitval.',
        options,
      ),
    ).toEqual(fallback)
    expect(
      await classifyAIIntakeWithCache(
        'Een fictieve vraag bij provideruitval.',
        options,
      ),
    ).toEqual(fallback)
    expect(classify).toHaveBeenCalledTimes(1)
  })

  it('logt alleen technische cachegebeurtenissen zonder de hulpvraag', async () => {
    const { repository } = createRepository()
    const logger = vi.fn()
    const helpRequest = 'Een unieke fictieve hulpvraag die niet in logs mag komen.'

    await classifyAIIntakeWithCache(helpRequest, {
      repository,
      classify: vi.fn().mockResolvedValue(successfulResult),
      logger,
      classifierVersion: 'classifier/1',
      model: 'model/1',
    })

    const serializedLogs = JSON.stringify(logger.mock.calls)
    expect(serializedLogs).not.toContain(helpRequest)
    expect(serializedLogs).not.toContain('inputFingerprint')
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'EXTERNAL_CALL' }),
    )
  })
})
