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
  completedAt: Date | null
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
          completedAt: null,
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
          completedAt: new Date(),
        })
      },
      async reclaimTechnicalFallback(input) {
        const record = records.get(input.inputFingerprint)
        if (!record || record.status !== 'COMPLETED' || record.completedAt?.getTime() !== input.completedAt?.getTime()) return false
        records.set(input.inputFingerprint, { ...record, status: 'PROCESSING', classificationJson: null, fallbackReason: null, providerStatusCode: null, completedAt: null })
        return true
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

const authorizeExternalCall = async () => ({ allowed: true as const })

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
      authorizeExternalCall,
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
      authorizeExternalCall,
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
      authorizeExternalCall,
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
      authorizeExternalCall,
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

  it('hergebruikt een tijdelijke providerfallback binnen de retrytermijn', async () => {
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
      authorizeExternalCall,
      now: () => 1_000,
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

  it('classificeert een oud configuratiefallbackrecord opnieuw zodra configuratie beschikbaar is', async () => {
    const { repository, records } = createRepository()
    const helpRequest = 'Een fictieve hulpvraag met een eerdere configuratiefout.'
    const fingerprint = createAIClassificationFingerprint(helpRequest, 'classifier/1', 'model/1')
    records.set(fingerprint, { inputFingerprint: fingerprint, status: 'COMPLETED', classificationJson: null, fallbackReason: 'CONFIGURATION_MISSING', providerStatusCode: null, completedAt: new Date(1_000) })
    const classify = vi.fn().mockResolvedValue(successfulResult)
    await expect(classifyAIIntakeWithCache(helpRequest, { repository, classify, logger: vi.fn(), classifierVersion: 'classifier/1', model: 'model/1', now: () => 2_000, authorizeExternalCall })).resolves.toEqual(successfulResult)
    expect(classify).toHaveBeenCalledTimes(1)
  })

  it('laat precies één parallelle retry een verlopen providerfallback herclaimen', async () => {
    const { repository, records } = createRepository()
    const helpRequest = 'Een fictieve hulpvraag met een verlopen providerfout.'
    const fingerprint = createAIClassificationFingerprint(helpRequest, 'classifier/1', 'model/1')
    records.set(fingerprint, { inputFingerprint: fingerprint, status: 'COMPLETED', classificationJson: null, fallbackReason: 'PROVIDER_UNAVAILABLE', providerStatusCode: 503, completedAt: new Date(1_000) })
    const classify = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); return successfulResult })
    const options = { repository, classify, logger: vi.fn(), classifierVersion: 'classifier/1', model: 'model/1', now: () => 1_000 + 5 * 60 * 1_000, authorizeExternalCall } as const
    await expect(Promise.all([classifyAIIntakeWithCache(helpRequest, options), classifyAIIntakeWithCache(helpRequest, options)])).resolves.toEqual([successfulResult, successfulResult])
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
      authorizeExternalCall,
    })

    const serializedLogs = JSON.stringify(logger.mock.calls)
    expect(serializedLogs).not.toContain(helpRequest)
    expect(serializedLogs).not.toContain('inputFingerprint')
    expect(logger).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'EXTERNAL_CALL' }),
    )
  })

  it('blokkeert een cachemiss vóór de provider wanneer abusebescherming weigert', async () => {
    const { repository, records } = createRepository()
    const classify = vi.fn().mockResolvedValue(successfulResult)

    await expect(classifyAIIntakeWithCache('Een unieke geblokkeerde hulpvraag.', {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
      authorizeExternalCall: async () => ({ allowed: false, reason: 'RATE_LIMITED' }),
    })).resolves.toMatchObject({
      classification: null,
      fallbackReason: 'RATE_LIMITED',
    })

    expect(classify).not.toHaveBeenCalled()
    expect(records.size).toBe(0)
  })

  it('faalt gesloten vóór de provider wanneer abusebescherming zelf uitvalt', async () => {
    const { repository } = createRepository()
    const classify = vi.fn().mockResolvedValue(successfulResult)

    await expect(classifyAIIntakeWithCache('Een hulpvraag bij limiteruitval.', {
      repository,
      classify,
      logger: vi.fn(),
      classifierVersion: 'classifier/1',
      model: 'model/1',
      authorizeExternalCall: async () => { throw new Error('limiter unavailable') },
    })).resolves.toMatchObject({
      classification: null,
      fallbackReason: 'ABUSE_PROTECTION_UNAVAILABLE',
    })

    expect(classify).not.toHaveBeenCalled()
  })
})
