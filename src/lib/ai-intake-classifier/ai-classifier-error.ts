import type { AIClassifierFallbackReason } from './ai-classifier-contract'

export class AIClassifierError extends Error {
  readonly fallbackReason: AIClassifierFallbackReason
  readonly providerStatusCode: number | null

  constructor(
    fallbackReason: AIClassifierFallbackReason,
    providerStatusCode: number | null = null,
  ) {
    super(fallbackReason)
    this.name = 'AIClassifierError'
    this.fallbackReason = fallbackReason
    this.providerStatusCode = providerStatusCode
  }
}
