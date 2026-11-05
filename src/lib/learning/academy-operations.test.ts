import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ outbox: vi.fn(), purchases: vi.fn(), annual: vi.fn(), weekly: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $queryRaw: state.weekly, notificationOutbox: { count: state.outbox }, financialPurchase: { count: state.purchases }, learningAnnualReminder: { count: state.annual } }) }))
import { readAcademyOperations } from './academy-operations'
const at = new Date('2026-10-29T12:00:00Z')
beforeEach(() => { vi.resetAllMocks(); state.outbox.mockResolvedValue(0); state.purchases.mockResolvedValue(0); state.annual.mockResolvedValue(0); state.weekly.mockResolvedValue([{ backlog: 0 }]) })
describe('private Academy aggregate monitoring', () => {
  it('returns only numeric counts, thresholds and fixed codes without records or mutations', async () => {
    expect(await readAcademyOperations(at)).toEqual({ status: 'OK', checkedAt: at.toISOString(), thresholds: { overdueMinutes: 30, recentFailureHours: 24 }, counts: { pending: 0, overdue: 0, expiredLeases: 0, failedLastDay: 0, uncertainPayments: 0, failedPaymentsLastDay: 0, annualDue: 0, weeklyBacklog: 0 }, alerts: [] })
    expect(state.outbox).toHaveBeenCalledTimes(4)
    for (const [args] of state.outbox.mock.calls) expect(args.where.channel).toBe('EMAIL')
    for (const [args] of state.purchases.mock.calls) expect(args.where.kind).toBe('ACADEMY_COURSE')
  })
  it('reports backlog/leases/failures/payments/scheduling independently, without assigning rights or retrying', async () => {
    state.outbox.mockResolvedValueOnce(8).mockResolvedValueOnce(4).mockResolvedValueOnce(2).mockResolvedValueOnce(1)
    state.purchases.mockResolvedValueOnce(3).mockResolvedValueOnce(1); state.annual.mockResolvedValue(2); state.weekly.mockResolvedValue([{ backlog: 1 }])
    const result = await readAcademyOperations(at)
    expect(result.status).toBe('REVIEW_REQUIRED'); expect(result.alerts).toHaveLength(6)
    expect(result.counts).toMatchObject({ pending: 8, uncertainPayments: 3, annualDue: 2 })
    expect(state.annual).toHaveBeenCalledWith({ where: expect.objectContaining({ revokedAt: null, sentAt: null, enrollment: { accessRevokedAt: null }, user: { status: 'ACTIVE', emailVerified: true } }) })
  })
  it('uses explicit overdue boundaries and a bounded recent-failure window', async () => {
    await readAcademyOperations(at)
    expect(state.outbox.mock.calls[1][0].where.availableAt.lt).toEqual(new Date('2026-10-29T11:30:00Z'))
    expect(state.outbox.mock.calls[2][0].where.OR).toContainEqual({ leaseUntil: null })
    expect(state.outbox.mock.calls[3][0].where.OR[0].processedAt.gte).toEqual(new Date('2026-10-28T12:00:00Z'))
  })
})
