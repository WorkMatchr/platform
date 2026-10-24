export const RETENTION_BANK_PUBLISHED_STATUS = 'PUBLISHED' as const
export const LEARNING_QUESTION_PUBLISHED_STATUS = 'PUBLISHED_PROTOTYPE' as const

export type RetentionPublicationState = {
  retentionStatus: string
  learningQuestionStatus: string
}

/** Shared policy for both weekly and annual selection, matching the database guard. */
export function isRetentionQuestionSelectable(state: RetentionPublicationState): boolean {
  return state.retentionStatus === RETENTION_BANK_PUBLISHED_STATUS
    && state.learningQuestionStatus === LEARNING_QUESTION_PUBLISHED_STATUS
}
