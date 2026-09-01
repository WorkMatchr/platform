import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

export const PUBLIC_INTAKE_RATE_LIMIT_MESSAGE =
  'Er zijn tijdelijk te veel aanvragen gedaan. Probeer het later opnieuw.'

type PublicIntakeOperation = 'INTAKE_REQUEST' | 'AI_CLASSIFICATION'
type PublicIntakeSubjectType = 'IP' | 'SESSION' | 'GLOBAL'
type PublicIntakeEnvironment = 'production' | 'preview' | 'development' | 'test'

type LimitRule = Readonly<{
  subjectType: PublicIntakeSubjectType
  subject: string
  windowMs: number
  limit: number
}>

type ConfiguredLimit = Readonly<{ windowMs: number; limit: number }>
type OperationLimits = Readonly<{
  ipBurst: ConfiguredLimit
  ipDaily: ConfiguredLimit
  sessionBurst: ConfiguredLimit
  sessionDaily: ConfiguredLimit
  globalBurst: ConfiguredLimit
  globalDaily: ConfiguredLimit
}>

export type PublicIntakeAbuseLimits = Readonly<{
  request: OperationLimits
  ai: OperationLimits
}>

type Bucket = Readonly<{
  environment: PublicIntakeEnvironment
  operation: PublicIntakeOperation
  subjectType: PublicIntakeSubjectType
  subjectHash: string
  windowStartedAt: Date
  windowEndsAt: Date
  expiresAt: Date
  limit: number
}>

export type PublicIntakeAbuseContext = Readonly<{
  requestHeaders: Headers
  sessionToken?: string
}>

export type PublicIntakeAIAllowance =
  | Readonly<{ allowed: true }>
  | Readonly<{ allowed: false; reason: 'RATE_LIMITED' | 'PROTECTION_UNAVAILABLE' }>

export type PublicIntakeAbuseBucketRepository = Readonly<{
  consume(buckets: readonly Bucket[], now: Date): Promise<boolean>
}>

export class PublicIntakeAbuseProtectionError extends Error {
  constructor(public readonly code: 'RATE_LIMITED' | 'PROTECTION_UNAVAILABLE') {
    super(PUBLIC_INTAKE_RATE_LIMIT_MESSAGE)
    this.name = 'PublicIntakeAbuseProtectionError'
  }
}

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE
const RETENTION_AFTER_WINDOW_MS = 2 * DAY

export const DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS: PublicIntakeAbuseLimits = Object.freeze({
  request: Object.freeze({
    ipBurst: { windowMs: 5 * MINUTE, limit: 40 },
    ipDaily: { windowMs: DAY, limit: 300 },
    sessionBurst: { windowMs: 5 * MINUTE, limit: 60 },
    sessionDaily: { windowMs: DAY, limit: 500 },
    globalBurst: { windowMs: 5 * MINUTE, limit: 600 },
    globalDaily: { windowMs: DAY, limit: 10_000 },
  }),
  ai: Object.freeze({
    ipBurst: { windowMs: 10 * MINUTE, limit: 6 },
    ipDaily: { windowMs: DAY, limit: 20 },
    sessionBurst: { windowMs: 10 * MINUTE, limit: 3 },
    sessionDaily: { windowMs: DAY, limit: 8 },
    globalBurst: { windowMs: 10 * MINUTE, limit: 30 },
    globalDaily: { windowMs: DAY, limit: 300 },
  }),
})

const PUBLIC_INTAKE_LIMIT_HARD_BOUNDS = Object.freeze({
  request: Object.freeze({
    ipBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 100 },
    ipDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 500 },
    sessionBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 100 },
    sessionDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 1_000 },
    globalBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 1_000 },
    globalDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 20_000 },
  }),
  ai: Object.freeze({
    ipBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 10 },
    ipDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 30 },
    sessionBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 5 },
    sessionDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 12 },
    globalBurst: { minimumWindowMs: 5 * MINUTE, maximumLimit: 50 },
    globalDaily: { minimumWindowMs: 12 * 60 * MINUTE, maximumLimit: 500 },
  }),
})

const LIMIT_KEYS = [
  'ipBurst', 'ipDaily', 'sessionBurst', 'sessionDaily', 'globalBurst', 'globalDaily',
] as const

const MAX_PREVIEW_E2E_AI_LIMIT = 100

function withPreviewE2eAiLimit(configured: PublicIntakeAbuseLimits): PublicIntakeAbuseLimits {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL !== '1') return configured

  const serialized = process.env.PUBLIC_INTAKE_AI_E2E_PREVIEW_LIMIT?.trim()
  if (!serialized) return configured

  const limit = Number(serialized)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PREVIEW_E2E_AI_LIMIT) {
    throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
  }

  return Object.freeze({
    ...configured,
    ai: Object.freeze(Object.fromEntries(
      LIMIT_KEYS.map((key) => [
        key,
        Object.freeze({
          ...configured.ai[key],
          limit: Math.max(configured.ai[key].limit, limit),
        }),
      ]),
    ) as unknown as OperationLimits),
  })
}

export function configuredPublicIntakeAbuseLimits(): PublicIntakeAbuseLimits {
  const serialized = process.env.PUBLIC_INTAKE_ABUSE_LIMITS_JSON?.trim()
  if (!serialized) return withPreviewE2eAiLimit(DEFAULT_PUBLIC_INTAKE_ABUSE_LIMITS)

  let candidate: unknown
  try {
    candidate = JSON.parse(serialized)
  } catch {
    throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
  }

  for (const operation of ['request', 'ai'] as const) {
    const operationValue = (candidate as Record<string, unknown>)[operation]
    if (!operationValue || typeof operationValue !== 'object' || Array.isArray(operationValue)) {
      throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
    }
    for (const key of LIMIT_KEYS) {
      const value = (operationValue as Record<string, unknown>)[key]
      const bounds = PUBLIC_INTAKE_LIMIT_HARD_BOUNDS[operation][key]
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
      }
      const { windowMs, limit } = value as Record<string, unknown>
      if (
        !Number.isInteger(windowMs) || !Number.isInteger(limit) ||
        Number(windowMs) < bounds.minimumWindowMs || Number(windowMs) > 2 * DAY ||
        Number(limit) < 1 || Number(limit) > bounds.maximumLimit
      ) {
        throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
      }
    }
  }
  return withPreviewE2eAiLimit(candidate as PublicIntakeAbuseLimits)
}

function environment(): PublicIntakeEnvironment {
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  if (process.env.NODE_ENV === 'test') return 'test'
  if (process.env.NODE_ENV === 'development') return 'development'
  return 'production'
}

function trustedClientIp(headers: Headers): string | null {
  const environmentName = environment()
  if (
    (environmentName === 'production' || environmentName === 'preview') &&
    process.env.VERCEL !== '1'
  ) return null
  const forwarded = headers.get('x-forwarded-for')?.trim()
  if (!forwarded || forwarded.includes(',') || isIP(forwarded) === 0) return null
  return forwarded
}

function pseudonymizationSecret(): string | null {
  const secret = process.env.BETTER_AUTH_SECRET?.trim()
  return secret && secret.length >= 32 ? secret : null
}

function subjectHash(
  secret: string,
  environmentName: PublicIntakeEnvironment,
  operation: PublicIntakeOperation,
  subjectType: PublicIntakeSubjectType,
  subject: string,
): string {
  return createHmac('sha256', secret)
    .update(`public-intake-abuse:v1:${environmentName}:${operation}:${subjectType}:${subject}`)
    .digest('hex')
}

function bucketStart(at: Date, windowMs: number): Date {
  return new Date(Math.floor(at.getTime() / windowMs) * windowMs)
}

function toBuckets(
  operation: PublicIntakeOperation,
  rules: readonly LimitRule[],
  at: Date,
  secret: string,
): readonly Bucket[] {
  const environmentName = environment()
  return rules.map((rule) => {
    const windowStartedAt = bucketStart(at, rule.windowMs)
    const windowEndsAt = new Date(windowStartedAt.getTime() + rule.windowMs)
    return {
      environment: environmentName,
      operation,
      subjectType: rule.subjectType,
      subjectHash: subjectHash(
        secret,
        environmentName,
        operation,
        rule.subjectType,
        rule.subject,
      ),
      windowStartedAt,
      windowEndsAt,
      expiresAt: new Date(windowEndsAt.getTime() + RETENTION_AFTER_WINDOW_MS),
      limit: rule.limit,
    }
  })
}

export const prismaPublicIntakeAbuseBucketRepository: PublicIntakeAbuseBucketRepository =
  Object.freeze({
    async consume(buckets, now) {
      try {
        return await getPrisma().$transaction(
          async (transaction) => {
            await transaction.publicIntakeAbuseBucket.deleteMany({
              where: { expiresAt: { lt: now } },
            })

            for (const bucket of buckets) {
              const consumed = await transaction.$queryRaw<Array<{ requestCount: number }>>(
                Prisma.sql`
                  INSERT INTO "PublicIntakeAbuseBucket" (
                    "environment", "operation", "subjectType", "subjectHash",
                    "windowStartedAt", "windowEndsAt", "requestCount", "expiresAt", "updatedAt"
                  ) VALUES (
                    ${bucket.environment}, ${bucket.operation}, ${bucket.subjectType}, ${bucket.subjectHash},
                    ${bucket.windowStartedAt}, ${bucket.windowEndsAt}, 1, ${bucket.expiresAt}, ${now}
                  )
                  ON CONFLICT (
                    "environment", "operation", "subjectType", "subjectHash",
                    "windowStartedAt", "windowEndsAt"
                  ) DO UPDATE SET
                    "requestCount" = "PublicIntakeAbuseBucket"."requestCount" + 1,
                    "updatedAt" = EXCLUDED."updatedAt"
                  WHERE "PublicIntakeAbuseBucket"."requestCount" < ${bucket.limit}
                  RETURNING "requestCount"
                `,
              )
              if (consumed.length !== 1) {
                throw new PublicIntakeAbuseProtectionError('RATE_LIMITED')
              }
            }
            return true
          },
          { isolationLevel: 'Serializable' },
        )
      } catch (error) {
        if (error instanceof PublicIntakeAbuseProtectionError) return false
        throw error
      }
    },
  })

function rulesFor(
  operation: PublicIntakeOperation,
  ip: string,
  sessionToken?: string,
): readonly LimitRule[] {
  const configured = configuredPublicIntakeAbuseLimits()
  const limits = operation === 'AI_CLASSIFICATION' ? configured.ai : configured.request
  const rules: LimitRule[] = [
    { subjectType: 'IP', subject: ip, ...limits.ipBurst },
    { subjectType: 'IP', subject: ip, ...limits.ipDaily },
    { subjectType: 'GLOBAL', subject: 'all', ...limits.globalBurst },
    { subjectType: 'GLOBAL', subject: 'all', ...limits.globalDaily },
  ]
  if (sessionToken) {
    rules.push(
      { subjectType: 'SESSION', subject: sessionToken, ...limits.sessionBurst },
      { subjectType: 'SESSION', subject: sessionToken, ...limits.sessionDaily },
    )
  }
  return rules
}

async function consume(
  operation: PublicIntakeOperation,
  context: PublicIntakeAbuseContext,
  options: Readonly<{
    at?: Date
    repository?: PublicIntakeAbuseBucketRepository
  }> = {},
): Promise<void> {
  const ip = trustedClientIp(context.requestHeaders)
  const secret = pseudonymizationSecret()
  if (!ip || !secret || (operation === 'AI_CLASSIFICATION' && !context.sessionToken)) {
    throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
  }

  const at = options.at ?? new Date()
  const repository = options.repository ?? prismaPublicIntakeAbuseBucketRepository
  try {
    const allowed = await repository.consume(
      toBuckets(operation, rulesFor(operation, ip, context.sessionToken), at, secret),
      at,
    )
    if (!allowed) throw new PublicIntakeAbuseProtectionError('RATE_LIMITED')
  } catch (error) {
    if (error instanceof PublicIntakeAbuseProtectionError) throw error
    throw new PublicIntakeAbuseProtectionError('PROTECTION_UNAVAILABLE')
  }
}

export async function assertPublicIntakeRequestAllowed(
  context: PublicIntakeAbuseContext,
  options: Readonly<{
    at?: Date
    repository?: PublicIntakeAbuseBucketRepository
  }> = {},
): Promise<void> {
  await consume('INTAKE_REQUEST', context, options)
}

export async function allowPublicIntakeAIClassification(
  context: PublicIntakeAbuseContext,
  options: Readonly<{
    at?: Date
    repository?: PublicIntakeAbuseBucketRepository
  }> = {},
): Promise<PublicIntakeAIAllowance> {
  try {
    await consume('AI_CLASSIFICATION', context, options)
    return { allowed: true }
  } catch (error) {
    return {
      allowed: false,
      reason:
        error instanceof PublicIntakeAbuseProtectionError && error.code === 'RATE_LIMITED'
          ? 'RATE_LIMITED'
          : 'PROTECTION_UNAVAILABLE',
    }
  }
}
