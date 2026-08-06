export type KnowledgeActionState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  fieldErrors: Record<string, string[] | undefined>
}

export const emptyKnowledgeActionState: KnowledgeActionState = {
  status: 'idle',
  message: null,
  fieldErrors: {},
}

export function normalizeKnowledgeActionState(value: unknown): KnowledgeActionState {
  if (!value || typeof value !== 'object') return emptyKnowledgeActionState
  const candidate = value as Record<string, unknown>
  const status = candidate.status === 'success' || candidate.status === 'error' ? candidate.status : 'idle'
  const message = typeof candidate.message === 'string' ? candidate.message : null
  const fieldErrors = candidate.fieldErrors && typeof candidate.fieldErrors === 'object'
    ? Object.fromEntries(Object.entries(candidate.fieldErrors as Record<string, unknown>).map(([key, errors]) => [
      key,
      Array.isArray(errors) ? errors.filter((error): error is string => typeof error === 'string') : undefined,
    ]))
    : {}
  return { status, message, fieldErrors }
}

