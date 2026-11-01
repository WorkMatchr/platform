import { z } from 'zod'

const fingerprint = z.string().regex(/^[a-f0-9]{64}$/)
export const reconciliationInput = z.object({
  confirmation: z.literal('RECONCILE_WITHOUT_RESENDING'),
  outboxId: z.uuid(),
  decisionId: z.uuid(),
  evidenceId: z.uuid(),
  evidenceSha256: fingerprint,
  evidenceObservedAt: z.iso.datetime(),
  outcome: z.enum(['ACCEPTED', 'NOT_ACCEPTED']),
  reason: z.enum(['PROVIDER_ACCEPTANCE_PROVEN', 'PROVIDER_REJECTION_PROVEN']),
  providerMessageId: z.uuid().nullable(),
  expectedAttemptCount: z.number().int().positive(),
  expectedFingerprint: fingerprint,
}).strict().refine(v => v.outcome === 'ACCEPTED'
  ? v.reason === 'PROVIDER_ACCEPTANCE_PROVEN' && v.providerMessageId !== null
  : v.reason === 'PROVIDER_REJECTION_PROVEN' && v.providerMessageId === null)

export class ContactReconciliationError extends Error {
  constructor(public readonly code: 'CLOSED' | 'FORBIDDEN' | 'INVALID' | 'CONFLICT') {
    super(`CONTACT_RECONCILIATION_${code}`)
  }
}

export function reconciliationEnabled() {
  return process.env.CONTACT_RECONCILIATION_ENABLED === 'true'
}

export function isDesignatedContactOperator(userId: string) {
  const ids = (process.env.CONTACT_RECONCILIATION_OPERATOR_IDS ?? '').split(',')
  return ids.length <= 10 && ids.every(id => z.uuid().safeParse(id).success)
    && new Set(ids).size === ids.length && ids.includes(userId)
}
