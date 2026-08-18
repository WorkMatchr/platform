export class KnowledgeReviewError extends Error {
  constructor(
    public readonly code: 'NOT_AUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INVALID_STATE' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message)
    this.name = 'KnowledgeReviewError'
  }
}
