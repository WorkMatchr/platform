import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  financialEventUpsert: vi.fn(),
  gatewayCancel: vi.fn(),
  findDue: vi.fn(),
}))

let current: Record<string, unknown>

const transaction = {
  $queryRaw: vi.fn(),
  professionalSubscription: {
    findUnique: vi.fn(async () => ({ ...current })),
    findUniqueOrThrow: vi.fn(async () => ({ ...current })),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      current = { ...current, ...data }
      return { ...current }
    }),
  },
  financialEvent: { upsert: mocks.financialEventUpsert },
}

vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ professionalSubscription: { findMany: mocks.findDue } }),
}))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({
  requireProviderMarketplaceAccess: mocks.authorize,
}))
vi.mock('./financial-transaction', () => ({
  runSerializableFinancialTransaction: (operation: (value: typeof transaction) => unknown) => operation(transaction),
}))
vi.mock('./invoice-service', () => ({ issueInvoiceForPaidSubscriptionPayment: vi.fn() }))

const gateway = {
  cancelSubscription: mocks.gatewayCancel,
} as never

const actorUserId = '10000000-0000-4000-8000-000000000001'
const organizationId = '20000000-0000-4000-8000-000000000001'

function resetSubscription(status: 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED') {
  current = {
    id: '30000000-0000-4000-8000-000000000001',
    organizationId,
    status,
    mollieCustomerId: 'cst_test',
    mollieSubscriptionId: 'sub_test',
    currentPeriodEnd: new Date('2026-09-09T12:00:00Z'),
    cancelAtPeriodEnd: false,
    cancellationRequestedAt: null,
    cancellationEffectiveAt: null,
  }
}

describe('WorkMatchr Pro opzeggen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetSubscription('ACTIVE')
    mocks.authorize.mockResolvedValue({ role: 'OWNER' })
    mocks.gatewayCancel.mockResolvedValue({ id: 'sub_test', status: 'canceled' })
    mocks.findDue.mockResolvedValue([])
  })

  it.each(['ACTIVE', 'PAST_DUE'] as const)('plant %s opzegging aan periode-einde zonder de status te wijzigen', async (status) => {
    resetSubscription(status)
    const { scheduleProCancellation } = await import('./subscription-service')
    const result = await scheduleProCancellation({ actorUserId, organizationId }, gateway)

    expect(result.status).toBe(status)
    expect(result.cancelAtPeriodEnd).toBe(true)
    expect(result.cancellationEffectiveAt).toEqual(new Date('2026-09-09T12:00:00Z'))
    expect(mocks.gatewayCancel).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'cst_test', subscriptionId: 'sub_test' }))
    expect(mocks.financialEventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ actorUserId, eventType: 'PRO_SUBSCRIPTION_CANCELLATION_SCHEDULED' }),
    }))
  })

  it('hergebruikt een dubbele opzegactie idempotent zonder tweede Mollie-call of auditregel', async () => {
    const { scheduleProCancellation } = await import('./subscription-service')
    const first = await scheduleProCancellation({ actorUserId, organizationId }, gateway)
    const second = await scheduleProCancellation({ actorUserId, organizationId }, gateway)

    expect(second.id).toBe(first.id)
    expect(mocks.gatewayCancel).toHaveBeenCalledTimes(1)
    expect(mocks.financialEventUpsert).toHaveBeenCalledTimes(1)
  })

  it.each(['SUSPENDED', 'EXPIRED'] as const)('weigert de opzegmutatie server-side voor %s', async (status) => {
    resetSubscription(status)
    const { scheduleProCancellation } = await import('./subscription-service')
    await expect(scheduleProCancellation({ actorUserId, organizationId }, gateway)).rejects.toMatchObject({ code: 'INVALID_STATE' })
    expect(mocks.gatewayCancel).not.toHaveBeenCalled()
  })

  it('weigert onbevoegde tenant- of roltoegang vóór de provider-call', async () => {
    mocks.authorize.mockRejectedValueOnce(new Error('ACCESS_DENIED'))
    const { scheduleProCancellation } = await import('./subscription-service')
    await expect(scheduleProCancellation({ actorUserId, organizationId }, gateway)).rejects.toThrow('ACCESS_DENIED')
    expect(mocks.gatewayCancel).not.toHaveBeenCalled()
  })

  it('finaliseert een vervallen opzegging als CANCELED met append-only audit', async () => {
    current = {
      ...current,
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date('2026-08-09T12:00:00Z'),
      cancellationEffectiveAt: new Date('2026-09-09T12:00:00Z'),
    }
    mocks.findDue.mockResolvedValue([{ id: current.id, organizationId }])
    const { finalizeScheduledProCancellations } = await import('./subscription-service')
    const result = await finalizeScheduledProCancellations(new Date('2026-09-09T12:00:00Z'))

    expect(result).toEqual({ count: 1 })
    expect(current).toMatchObject({ status: 'CANCELED', cancelAtPeriodEnd: false })
    expect(mocks.financialEventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventType: 'PRO_SUBSCRIPTION_CANCELED_AT_PERIOD_END' }),
    }))
  })

  it('laat een geplande opzegging vóór de einddatum actief', async () => {
    mocks.findDue.mockResolvedValue([])
    const { finalizeScheduledProCancellations } = await import('./subscription-service')
    await expect(finalizeScheduledProCancellations(new Date('2026-09-08T12:00:00Z'))).resolves.toEqual({ count: 0 })
    expect(current.status).toBe('ACTIVE')
  })

  it('is idempotent wanneer dezelfde vervallen opzegging tweemaal wordt aangeboden', async () => {
    current = { ...current, cancelAtPeriodEnd: true, cancellationEffectiveAt: new Date('2026-09-09T12:00:00Z') }
    mocks.findDue.mockResolvedValue([{ id: current.id, organizationId }])
    const { finalizeScheduledProCancellations } = await import('./subscription-service')
    await expect(finalizeScheduledProCancellations(new Date('2026-09-09T12:00:00Z'))).resolves.toEqual({ count: 1 })
    await expect(finalizeScheduledProCancellations(new Date('2026-09-09T12:00:00Z'))).resolves.toEqual({ count: 0 })
    expect(mocks.financialEventUpsert).toHaveBeenCalledTimes(1)
  })

  it('schort een betaling die langer dan een maand achterstallig is transactioneel en auditbaar op', async () => {
    current = {
      ...current,
      status: 'PAST_DUE',
      pastDueAt: new Date('2026-07-01T12:00:00Z'),
    }
    mocks.findDue.mockResolvedValue([{ id: current.id, organizationId }])
    const { suspendOverdueProSubscriptions } = await import('./subscription-service')
    const result = await suspendOverdueProSubscriptions(new Date('2026-08-09T12:00:00Z'))

    expect(result).toEqual({ count: 1 })
    expect(current).toMatchObject({ status: 'SUSPENDED', suspendedAt: new Date('2026-08-09T12:00:00Z') })
    expect(mocks.financialEventUpsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ eventType: 'PRO_SUBSCRIPTION_SUSPENDED_OVERDUE' }),
    }))
  })

  it('schort een achterstand jonger dan één maand niet op', async () => {
    current = { ...current, status: 'PAST_DUE', pastDueAt: new Date('2026-07-20T12:00:00Z') }
    mocks.findDue.mockResolvedValue([])
    const { suspendOverdueProSubscriptions } = await import('./subscription-service')
    await expect(suspendOverdueProSubscriptions(new Date('2026-08-09T12:00:00Z'))).resolves.toEqual({ count: 0 })
    expect(current.status).toBe('PAST_DUE')
  })
})
