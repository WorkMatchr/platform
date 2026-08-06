import { z } from 'zod'

export const creditLedgerMutationTypes = [
  'PURCHASE',
  'RESERVATION',
  'RESERVATION_RELEASE',
  'CONSUMPTION',
  'REFUND',
  'CONTRIBUTION_BONUS',
  'ADMIN_CORRECTION',
] as const

export type CreditLedgerMutationType = (typeof creditLedgerMutationTypes)[number]

export type CreditLedgerDelta = Readonly<{
  totalDelta: number
  reservedDelta: number
  ledgerAmount: number
}>

export type CreditBalance = Readonly<{
  totalBalance: number
  reservedBalance: number
  availableBalance: number
}>

export const creditMutationInputSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  type: z.enum(creditLedgerMutationTypes),
  amount: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(500),
  referenceType: z.string().trim().min(2).max(80).optional(),
  referenceId: z.string().uuid().optional(),
  idempotencyKey: z.string().trim().min(12).max(120).regex(/^[A-Za-z0-9:_-]+$/),
  auditMetadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
}).superRefine((value, context) => {
  if (value.type !== 'ADMIN_CORRECTION' && value.amount < 1) {
    context.addIssue({ code: 'custom', path: ['amount'], message: 'Het aantal credits moet positief zijn.' })
  }
  const reservationMutation = ['RESERVATION', 'RESERVATION_RELEASE', 'CONSUMPTION'].includes(value.type)
  if (reservationMutation && (!value.referenceType || !value.referenceId)) {
    context.addIssue({ code: 'custom', path: ['referenceId'], message: 'Een reserveringsmutatie vereist een zakelijke referentie.' })
  }
})

export type CreditMutationInput = z.infer<typeof creditMutationInputSchema>

export function getCreditLedgerDelta(
  type: CreditLedgerMutationType,
  amount: number,
): CreditLedgerDelta {
  if (!Number.isSafeInteger(amount) || amount === 0) throw new Error('INVALID_CREDIT_AMOUNT')
  if (type !== 'ADMIN_CORRECTION' && amount < 1) throw new Error('INVALID_CREDIT_AMOUNT')

  switch (type) {
    case 'RESERVATION':
      return Object.freeze({ totalDelta: 0, reservedDelta: amount, ledgerAmount: -amount })
    case 'RESERVATION_RELEASE':
      return Object.freeze({ totalDelta: 0, reservedDelta: -amount, ledgerAmount: amount })
    case 'CONSUMPTION':
      return Object.freeze({ totalDelta: -amount, reservedDelta: -amount, ledgerAmount: -amount })
    default:
      return Object.freeze({ totalDelta: amount, reservedDelta: 0, ledgerAmount: amount })
  }
}

export function deriveCreditBalance(
  entries: ReadonlyArray<Readonly<{ totalDelta: number; reservedDelta: number }>>,
): CreditBalance {
  const totals = entries.reduce(
    (current, entry) => ({
      totalBalance: current.totalBalance + entry.totalDelta,
      reservedBalance: current.reservedBalance + entry.reservedDelta,
    }),
    { totalBalance: 0, reservedBalance: 0 },
  )
  const availableBalance = totals.totalBalance - totals.reservedBalance
  if (totals.totalBalance < 0 || totals.reservedBalance < 0 || availableBalance < 0) {
    throw new Error('INVALID_CREDIT_LEDGER_BALANCE')
  }
  return Object.freeze({ ...totals, availableBalance })
}
