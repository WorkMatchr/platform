import type {
  AIClassifier,
  AIClassifierFallbackReason,
  AIClassifierLogger,
  AIClassifierOutput,
  SafeAIClassificationResult,
} from './ai-classifier-contract'
import { AIClassifierError } from './ai-classifier-error'
import { parseAIClassifierOutput } from './ai-classifier-validation'
import { OpenAIAIClassifier } from './openai-ai-classifier'

const DEFAULT_MODEL = 'gpt-5.6-sol'
export const DEFAULT_AI_INTAKE_TIMEOUT_MS = 30_000
export const MAX_AI_INTAKE_TIMEOUT_MS = 45_000
export const AI_INTAKE_MAX_INPUT_CHARACTERS = 2_000

function configuredTimeout(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 500 && parsed <= MAX_AI_INTAKE_TIMEOUT_MS
    ? parsed
    : DEFAULT_AI_INTAKE_TIMEOUT_MS
}

function defaultLogger(entry: Parameters<AIClassifierLogger>[0]): void {
  console.info('[ai-intake-classifier]', entry)
}

export function createConfiguredAIClassifier(): AIClassifier | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) return null

  return new OpenAIAIClassifier({
    apiKey,
    model: process.env.OPENAI_AI_INTAKE_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: configuredTimeout(process.env.OPENAI_AI_INTAKE_TIMEOUT_MS),
  })
}

export async function classifyAIIntakeSafely(
  helpRequest: string,
  options: Readonly<{
    classifier?: AIClassifier | null
    logger?: AIClassifierLogger
    now?: () => number
  }> = {},
): Promise<SafeAIClassificationResult> {
  const classifier =
    options.classifier === undefined
      ? createConfiguredAIClassifier()
      : options.classifier
  const logger = options.logger ?? defaultLogger
  const now = options.now ?? Date.now
  const startedAt = now()

  let classification: AIClassifierOutput | null = null
  let fallbackReason: AIClassifierFallbackReason | null = classifier
    ? null
    : 'CONFIGURATION_MISSING'
  let providerStatusCode: number | null = null

  if (helpRequest.length > AI_INTAKE_MAX_INPUT_CHARACTERS) {
    fallbackReason = 'INPUT_REJECTED'
  } else if (classifier) {
    try {
      const providerOutput = await classifier.classify({ helpRequest })
      try {
        classification = parseAIClassifierOutput(providerOutput)
      } catch {
        fallbackReason = 'OUTPUT_INVALID'
      }
    } catch (error) {
      classification = null
      if (error instanceof AIClassifierError) {
        fallbackReason = error.fallbackReason
        providerStatusCode = error.providerStatusCode
      } else {
        fallbackReason = 'UNKNOWN_ERROR'
      }
  }
  }

  const fallbackUsed = classification === null
  logger({
    latencyMs: Math.max(0, now() - startedAt),
    provider: classifier?.provider ?? 'openai',
    model:
      classifier?.model ??
      process.env.OPENAI_AI_INTAKE_MODEL?.trim() ??
      DEFAULT_MODEL,
    confidence: classification?.confidence ?? null,
    fallbackUsed,
    fallbackReason: fallbackUsed ? fallbackReason : null,
    providerStatusCode,
  })

  return Object.freeze({
    classification,
    fallbackUsed,
    fallbackReason: fallbackUsed ? fallbackReason : null,
    providerStatusCode,
  })
}
