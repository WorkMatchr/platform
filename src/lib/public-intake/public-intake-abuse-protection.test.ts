import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  allowPublicIntakeAIClassification,
  assertPublicIntakeRequestAllowed,
  configuredPublicIntakeAbuseLimits,
  DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS,
  PublicIntakeAbuseProtectionError,
  type PublicIntakeAbuseBucketRepository,
} from './public-intake-abuse-protection'

function requestHeaders(ip = '203.0.113.10') {
  return new Headers({ 'x-forwarded-for': ip })
}

function memoryRepository() {
  const counts = new Map<string, number>()
  const seenSubjects: string[] = []
  const bucketDefinitions = new Map<string, {
    subjectType: string
    windowStartedAt: string
    windowEndsAt: string
  }>()
  const repository: PublicIntakeAbuseBucketRepository = {
    async consume(buckets) {
      const candidates = buckets.map((bucket) => {
        const key = [
          bucket.environment,
          bucket.operation,
          bucket.subjectType,
          bucket.subjectHash,
          bucket.windowStartedAt.toISOString(),
          bucket.windowEndsAt.toISOString(),
        ].join(':')
        seenSubjects.push(bucket.subjectHash)
        bucketDefinitions.set(key, {
          subjectType: bucket.subjectType,
          windowStartedAt: bucket.windowStartedAt.toISOString(),
          windowEndsAt: bucket.windowEndsAt.toISOString(),
        })
        return { key, count: (counts.get(key) ?? 0) + 1, limit: bucket.limit }
      })
      if (candidates.some((candidate) => candidate.count > candidate.limit)) return false
      for (const candidate of candidates) counts.set(candidate.key, candidate.count)
      return true
    },
  }
  return { repository, counts, seenSubjects, bucketDefinitions }
}

function subjectBuckets(
  state: ReturnType<typeof memoryRepository>,
  subjectType: 'IP' | 'SESSION' | 'GLOBAL',
) {
  return [...state.bucketDefinitions.entries()]
    .filter(([, bucket]) => bucket.subjectType === subjectType)
    .map(([key, bucket]) => ({ ...bucket, count: state.counts.get(key) }))
}

describe('publieke AI-intake abusebescherming', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-with-at-least-thirty-two-characters')
  })

  it('laat normaal intakegebruik toe zonder ruwe IP- of sessiewaarden te bewaren', async () => {
    const state = memoryRepository()
    const context = {
      requestHeaders: requestHeaders(),
      sessionToken: 'fictieve-sessie-die-niet-mag-worden-opgeslagen',
    }

    await expect(assertPublicIntakeRequestAllowed(context, {
      repository: state.repository,
      at: new Date('2026-08-19T10:00:00Z'),
    })).resolves.toBeUndefined()

    expect(state.seenSubjects).toHaveLength(6)
    expect(state.seenSubjects.every((value) => /^[0-9a-f]{64}$/.test(value))).toBe(true)
    expect(JSON.stringify(state.seenSubjects)).not.toContain('203.0.113.10')
    expect(JSON.stringify(state.seenSubjects)).not.toContain(context.sessionToken)
  })

  it('beheert alle limiterwaarden via één server-side configuratiepunt met veilige defaults', () => {
    expect(configuredPublicIntakeAbuseLimits()).toBe(DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS)

    const configured = {
      ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS,
      ai: {
        ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai,
        sessionBurst: { limit: 2, windowMs: 15 * 60_000 },
      },
    }
    vi.stubEnv('PUBLIC_INTAKE_ABUSE_LIMITS_JSON', JSON.stringify(configured))

    expect(configuredPublicIntakeAbuseLimits().ai.sessionBurst).toEqual({
      limit: 2,
      windowMs: 15 * 60_000,
    })
  })

  it('behoudt in Production exact de bestaande limiter, ook met een Preview-override', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('PUBLIC_INTAKE_AI_E2E_PREVIEW_LIMIT', '100')

    expect(configuredPublicIntakeAbuseLimits()).toBe(DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS)
  })

  it('behoudt in Preview zonder expliciete override exact de bestaande limiter', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')

    expect(configuredPublicIntakeAbuseLimits()).toBe(DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS)
  })

  it('verruimt uitsluitend in Vercel Preview expliciet de bestaande AI-buckets', () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('PUBLIC_INTAKE_AI_E2E_PREVIEW_LIMIT', '100')

    const configured = configuredPublicIntakeAbuseLimits()
    expect(configured.request).toBe(DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.request)
    expect(configured.ai).toEqual({
      ipBurst: { ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.ipBurst, limit: 100 },
      ipDaily: { ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.ipDaily, limit: 100 },
      sessionBurst: { ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.sessionBurst, limit: 100 },
      sessionDaily: { ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.sessionDaily, limit: 100 },
      globalBurst: { ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.globalBurst, limit: 100 },
      globalDaily: DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.globalDaily,
    })
  })

  it('houdt onder de Preview E2E-limiet alle beveiligingschecks fail-closed actief', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('PUBLIC_INTAKE_AI_E2E_PREVIEW_LIMIT', '100')

    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
    }, { repository: memoryRepository().repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })

    await expect(allowPublicIntakeAIClassification({
      requestHeaders: new Headers({ 'x-forwarded-for': 'ongeldig-ip' }),
      sessionToken: 'preview-e2e-sessie',
    }, { repository: memoryRepository().repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })
  })

  it('faalt gesloten bij een te ruime Preview E2E-override', async () => {
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('PUBLIC_INTAKE_AI_E2E_PREVIEW_LIMIT', '101')

    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'preview-e2e-sessie',
    }, { repository: memoryRepository().repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })
  })

  it('faalt gesloten bij ongeldige configuratie of overschrijding van harde veiligheidsgrenzen', async () => {
    vi.stubEnv('PUBLIC_INTAKE_ABUSE_LIMITS_JSON', '{ongeldig')
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'sessie-configuratiefout',
    }, { repository: memoryRepository().repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })

    const unsafe = {
      ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS,
      ai: {
        ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai,
        globalDaily: {
          ...DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS.ai.globalDaily,
          limit: 501,
        },
      },
    }
    vi.stubEnv('PUBLIC_INTAKE_ABUSE_LIMITS_JSON', JSON.stringify(unsafe))
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'sessie-onveilige-configuratie',
    }, { repository: memoryRepository().repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })
  })

  it('begrensd de AI-burst per anonieme sessie vóór een externe call', async () => {
    const state = memoryRepository()
    const context = { requestHeaders: requestHeaders(), sessionToken: 'sessie-a' }
    const at = new Date('2026-08-19T10:00:00Z')

    for (let request = 0; request < 3; request += 1) {
      await expect(allowPublicIntakeAIClassification(context, {
        repository: state.repository,
        at,
      })).resolves.toEqual({ allowed: true })
    }
    await expect(allowPublicIntakeAIClassification(context, {
      repository: state.repository,
      at,
    })).resolves.toEqual({ allowed: false, reason: 'RATE_LIMITED' })
  })

  it('laat steeds unieke sessies de per-IP-limiet niet omzeilen', async () => {
    const state = memoryRepository()
    const at = new Date('2026-08-19T10:00:00Z')

    for (let request = 0; request < 6; request += 1) {
      await expect(allowPublicIntakeAIClassification({
        requestHeaders: requestHeaders(),
        sessionToken: `unieke-sessie-${request}`,
      }, { repository: state.repository, at })).resolves.toEqual({ allowed: true })
    }
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'nog-een-unieke-sessie',
    }, { repository: state.repository, at })).resolves.toEqual({
      allowed: false,
      reason: 'RATE_LIMITED',
    })
  })

  it('activeert de globale AI-circuitbreaker bij onverwacht verspreid verkeer', async () => {
    const state = memoryRepository()
    const at = new Date('2026-08-19T10:00:00Z')

    for (let request = 0; request < 30; request += 1) {
      await expect(allowPublicIntakeAIClassification({
        requestHeaders: requestHeaders(`203.0.113.${request + 1}`),
        sessionToken: `sessie-${request}`,
      }, { repository: state.repository, at })).resolves.toEqual({ allowed: true })
    }
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders('198.51.100.1'),
      sessionToken: 'sessie-boven-globale-grens',
    }, { repository: state.repository, at })).resolves.toEqual({
      allowed: false,
      reason: 'RATE_LIMITED',
    })
  })

  it('houdt IP-burst- en dagbucket om 00:00 UTC onafhankelijk', async () => {
    const state = memoryRepository()
    const at = new Date('2026-08-20T00:00:00.000Z')

    for (let request = 0; request < 6; request += 1) {
      await expect(allowPublicIntakeAIClassification({
        requestHeaders: requestHeaders(),
        sessionToken: `middernacht-ip-sessie-${request}`,
      }, { repository: state.repository, at })).resolves.toEqual({ allowed: true })
    }

    expect(subjectBuckets(state, 'IP')).toEqual([
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-20T00:10:00.000Z', count: 6 }),
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-21T00:00:00.000Z', count: 6 }),
    ])
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'middernacht-ip-boven-grens',
    }, { repository: state.repository, at })).resolves.toEqual({ allowed: false, reason: 'RATE_LIMITED' })
    expect(subjectBuckets(state, 'IP').map((bucket) => bucket.count)).toEqual([6, 6])
  })

  it('houdt sessie-burst- en dagbucket om 00:00 UTC onafhankelijk', async () => {
    const state = memoryRepository()
    const at = new Date('2026-08-20T00:00:00.000Z')
    const context = { requestHeaders: requestHeaders(), sessionToken: 'middernacht-sessie' }

    for (let request = 0; request < 3; request += 1) {
      await expect(allowPublicIntakeAIClassification(context, {
        repository: state.repository,
        at,
      })).resolves.toEqual({ allowed: true })
    }

    expect(subjectBuckets(state, 'SESSION')).toEqual([
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-20T00:10:00.000Z', count: 3 }),
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-21T00:00:00.000Z', count: 3 }),
    ])
    await expect(allowPublicIntakeAIClassification(context, {
      repository: state.repository,
      at,
    })).resolves.toEqual({ allowed: false, reason: 'RATE_LIMITED' })
    expect(subjectBuckets(state, 'SESSION').map((bucket) => bucket.count)).toEqual([3, 3])
  })

  it('houdt globale burst- en dagbucket om 00:00 UTC onafhankelijk', async () => {
    const state = memoryRepository()
    const at = new Date('2026-08-20T00:00:00.000Z')

    for (let request = 0; request < 30; request += 1) {
      await expect(allowPublicIntakeAIClassification({
        requestHeaders: requestHeaders(`203.0.113.${request + 1}`),
        sessionToken: `middernacht-globaal-${request}`,
      }, { repository: state.repository, at })).resolves.toEqual({ allowed: true })
    }

    expect(subjectBuckets(state, 'GLOBAL')).toEqual([
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-20T00:10:00.000Z', count: 30 }),
      expect.objectContaining({ windowStartedAt: at.toISOString(), windowEndsAt: '2026-08-21T00:00:00.000Z', count: 30 }),
    ])
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders('198.51.100.1'),
      sessionToken: 'middernacht-globaal-boven-grens',
    }, { repository: state.repository, at })).resolves.toEqual({ allowed: false, reason: 'RATE_LIMITED' })
    expect(subjectBuckets(state, 'GLOBAL').map((bucket) => bucket.count)).toEqual([30, 30])
  })

  it('begrenst request flooding vóór kostbaar intakewerk', async () => {
    const state = memoryRepository()
    const context = { requestHeaders: requestHeaders(), sessionToken: 'sessie-a' }
    const at = new Date('2026-08-19T10:00:00Z')

    for (let request = 0; request < 40; request += 1) {
      await assertPublicIntakeRequestAllowed(context, { repository: state.repository, at })
    }
    await expect(assertPublicIntakeRequestAllowed(context, {
      repository: state.repository,
      at,
    })).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  it('faalt gesloten bij ontbrekende vertrouwde IP-, sessie- of secretcontext', async () => {
    const repository = memoryRepository().repository
    await expect(assertPublicIntakeRequestAllowed({
      requestHeaders: new Headers(),
    }, { repository })).rejects.toMatchObject({ code: 'PROTECTION_UNAVAILABLE' })

    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
    }, { repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })

    vi.stubEnv('BETTER_AUTH_SECRET', '')
    await expect(assertPublicIntakeRequestAllowed({
      requestHeaders: requestHeaders(),
    }, { repository })).rejects.toBeInstanceOf(PublicIntakeAbuseProtectionError)
  })

  it('faalt gesloten wanneer de persistente limiter niet beschikbaar is', async () => {
    const repository: PublicIntakeAbuseBucketRepository = {
      async consume() { throw new Error('database unavailable') },
    }
    await expect(allowPublicIntakeAIClassification({
      requestHeaders: requestHeaders(),
      sessionToken: 'sessie-a',
    }, { repository })).resolves.toEqual({
      allowed: false,
      reason: 'PROTECTION_UNAVAILABLE',
    })
  })

  it('scheidt limiterkeys cryptografisch per Vercel-environment', async () => {
    const state = memoryRepository()
    const context = { requestHeaders: requestHeaders(), sessionToken: 'sessie-a' }
    const at = new Date('2026-08-19T10:00:00Z')

    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_ENV', 'preview')
    await assertPublicIntakeRequestAllowed(context, { repository: state.repository, at })
    const previewKeys = [...state.seenSubjects]

    state.seenSubjects.length = 0
    vi.stubEnv('VERCEL_ENV', 'production')
    await assertPublicIntakeRequestAllowed(context, { repository: state.repository, at })

    expect(state.seenSubjects).not.toEqual(previewKeys)
  })
})
