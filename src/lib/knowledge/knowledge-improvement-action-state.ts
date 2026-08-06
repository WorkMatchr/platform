export type KnowledgeImprovementFieldErrors = Partial<Record<
  'knowledgeItemId' | 'reportType' | 'explanation' | 'proposedImprovement' | 'sourceReference',
  string[] | undefined
>>

export type KnowledgeImprovementActionState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  fieldErrors: KnowledgeImprovementFieldErrors
}

export const initialKnowledgeImprovementActionState: KnowledgeImprovementActionState = {
  status: 'idle',
  message: null,
  fieldErrors: {
    knowledgeItemId: undefined,
    reportType: undefined,
    explanation: undefined,
    proposedImprovement: undefined,
    sourceReference: undefined,
  },
}

export function completeKnowledgeImprovementActionState(
  state?: Partial<KnowledgeImprovementActionState> | null,
): KnowledgeImprovementActionState {
  return {
    status: state?.status ?? initialKnowledgeImprovementActionState.status,
    message: state?.message ?? initialKnowledgeImprovementActionState.message,
    fieldErrors: state?.fieldErrors ?? initialKnowledgeImprovementActionState.fieldErrors,
  }
}
