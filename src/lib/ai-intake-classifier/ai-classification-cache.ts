import { createHash } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import {
  AI_CLASSIFIER_FALLBACK_REASONS,
  AI_INTAKE_CLASSIFIER_VERSION,
  type AIClassifierFallbackReason,
  type AIClassifierOutput,
  type SafeAIClassificationResult,
} from './ai-classifier-contract'
import { classifyAIIntakeSafely } from './ai-classifier-service'
import { parseAIClassifierOutput } from './ai-classifier-validation'

const CACHE_WAIT_INTERVAL_MS = 100
const CACHE_WAIT_LIMIT_MS = 16_000
const DEFAULT_MODEL = 'gpt-5.6-sol'

type ClassificationCacheRecord = Readonly<{
  inputFingerprint: string
  status: 'PROCESSING' | 'COMPLETED'
  classificationJson: unknown
  fallbackReason: string | null
  providerStatusCode: number | null
}>

export type AIClassificationCacheRepository = Readonly<{
  find(inputFingerprint: string): Promise<ClassificationCacheRecord | null>
  claim(input: Readonly<{
    inputFingerprint: string
    classifierVersion: string
    provider: string
    model: string
  }>): Promise<boolean>
  complete(
    inputFingerprint: string,
    result: SafeAIClassificationResult,
  ): Promise<void>
}>

type AIClassificationCacheLogEntry = Readonly<{
  event: 'CACHE_HIT' | 'CACHE_MISS' | 'EXTERNAL_CALL' | 'CACHE_UNAVAILABLE'
  classifierVersion: string
  provider: string
  model: string
}>

type AIClassificationCacheLogger = (
  entry: AIClassificationCacheLogEntry,
) => void

function defaultLogger(entry: AIClassificationCacheLogEntry): void {
  console.info('[ai-intake-classification-cache]', entry)
}

function normalizeHelpRequest(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('nl-NL')
}

export function createAIClassificationFingerprint(
  helpRequest: string,
  classifierVersion: string,
  model: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        classifierVersion,
        model,
        normalizedHelpRequest: normalizeHelpRequest(helpRequest),
      }),
    )
    .digest('hex')
}

function isFallbackReason(value: string): value is AIClassifierFallbackReason {
  return AI_CLASSIFIER_FALLBACK_REASONS.includes(
    value as AIClassifierFallbackReason,
  )
}

function safeFallback(
  fallbackReason: AIClassifierFallbackReason,
  providerStatusCode: number | null = null,
): SafeAIClassificationResult {
  return Object.freeze({
    classification: null,
    fallbackUsed: true,
    fallbackReason,
    providerStatusCode,
  })
}

function resultFromRecord(
  record: ClassificationCacheRecord,
): SafeAIClassificationResult {
  if (record.classificationJson !== null) {
    try {
      return Object.freeze({
        classification: parseAIClassifierOutput(record.classificationJson),
        fallbackUsed: false,
        fallbackReason: null,
        providerStatusCode: record.providerStatusCode,
      })
    } catch {
      return safeFallback('OUTPUT_INVALID', record.providerStatusCode)
    }
  }

  return safeFallback(
    record.fallbackReason && isFallbackReason(record.fallbackReason)
      ? record.fallbackReason
      : 'OUTPUT_INVALID',
    record.providerStatusCode,
  )
}

export function serializeAIClassifierOutput(
  classification: AIClassifierOutput,
): Prisma.InputJsonObject {
  return {
    summary: classification.summary,
    primarySubject: classification.primarySubject,
    secondarySubjects: [...classification.secondarySubjects],
    confidence: classification.confidence,
    alternatives: [...classification.alternatives],
  }
}

export const prismaAIClassificationCacheRepository: AIClassificationCacheRepository =
  Object.freeze({
    async find(inputFingerprint) {
      return getPrisma().publicIntakeAIClassificationCache.findUnique({
        where: { inputFingerprint },
        select: {
          inputFingerprint: true,
          status: true,
          classificationJson: true,
          fallbackReason: true,
          providerStatusCode: true,
        },
      })
    },
    async claim(input) {
      try {
        await getPrisma().publicIntakeAIClassificationCache.create({
          data: input,
        })
        return true
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return false
        }
        throw error
      }
    },
    async complete(inputFingerprint, result) {
      const completed = await getPrisma().publicIntakeAIClassificationCache.updateMany({
        where: {
          inputFingerprint,
          status: 'PROCESSING',
        },
        data: {
          status: 'COMPLETED',
          classificationJson: result.classification
            ? serializeAIClassifierOutput(result.classification)
            : Prisma.DbNull,
          fallbackReason: result.fallbackUsed ? result.fallbackReason : null,
          providerStatusCode: result.providerStatusCode,
          completedAt: new Date(),
        },
      })

      if (completed.count !== 1) {
        throw new Error('AI_CLASSIFICATION_CACHE_COMPLETION_CONFLICT')
      }
    },
  })

async function waitForCompletion(
  repository: AIClassificationCacheRepository,
  inputFingerprint: string,
): Promise<SafeAIClassificationResult> {
  const deadline = Date.now() + CACHE_WAIT_LIMIT_MS

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, CACHE_WAIT_INTERVAL_MS))
    const cached = await repository.find(inputFingerprint)
    if (cached?.status === 'COMPLETED') return resultFromRecord(cached)
  }

  const timeoutFallback = safeFallback('PROVIDER_TIMEOUT')
  try {
    await repository.complete(inputFingerprint, timeoutFallback)
  } catch {
    const completedByOwner = await repository.find(inputFingerprint)
    if (completedByOwner?.status === 'COMPLETED') {
      return resultFromRecord(completedByOwner)
    }
  }

  return timeoutFallback
}

export async function classifyAIIntakeWithCache(
  helpRequest: string,
  options: Readonly<{
    repository?: AIClassificationCacheRepository
    classify?: typeof classifyAIIntakeSafely
    logger?: AIClassificationCacheLogger
    classifierVersion?: string
    model?: string
  }> = {},
): Promise<SafeAIClassificationResult> {
  const repository =
    options.repository ?? prismaAIClassificationCacheRepository
  const classify = options.classify ?? classifyAIIntakeSafely
  const logger = options.logger ?? defaultLogger
  const classifierVersion =
    options.classifierVersion ?? AI_INTAKE_CLASSIFIER_VERSION
  const provider = 'openai'
  const model =
    options.model ??
    process.env.OPENAI_AI_INTAKE_MODEL?.trim() ??
    DEFAULT_MODEL
  const inputFingerprint = createAIClassificationFingerprint(
    helpRequest,
    classifierVersion,
    model,
  )

  try {
    const cached = await repository.find(inputFingerprint)
    if (cached?.status === 'COMPLETED') {
      logger({ event: 'CACHE_HIT', classifierVersion, provider, model })
      return resultFromRecord(cached)
    }
    if (cached?.status === 'PROCESSING') {
      logger({ event: 'CACHE_HIT', classifierVersion, provider, model })
      return waitForCompletion(repository, inputFingerprint)
    }

    const claimed = await repository.claim({
      inputFingerprint,
      classifierVersion,
      provider,
      model,
    })
    if (!claimed) {
      logger({ event: 'CACHE_HIT', classifierVersion, provider, model })
      return waitForCompletion(repository, inputFingerprint)
    }

    logger({ event: 'CACHE_MISS', classifierVersion, provider, model })
    logger({ event: 'EXTERNAL_CALL', classifierVersion, provider, model })
    const result = await classify(helpRequest)
    await repository.complete(inputFingerprint, result)
    return result
  } catch {
    logger({
      event: 'CACHE_UNAVAILABLE',
      classifierVersion,
      provider,
      model,
    })
    return safeFallback('CACHE_UNAVAILABLE')
  }
}
