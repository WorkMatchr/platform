import { beforeEach, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  organizationMembership: { findFirst: vi.fn() },
  providerInvitation: { findFirst: vi.fn() },
  creditAccount: { findUnique: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
import { getAssignmentSelectionView, getClientQuotes, getProviderInvitationDetail, getProviderParticipationForQuote, getProviderQuoteDetail } from './dashboard-query-service'

beforeEach(() => { vi.resetAllMocks() })

it.each([getClientQuotes, getProviderParticipationForQuote, getProviderQuoteDetail, getAssignmentSelectionView])('requires an active organization before reading private records (%s)', async read => {
  db.organizationMembership.findFirst.mockResolvedValue(null)
  await expect(read('user', 'organization', 'object')).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  expect(db.organizationMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organization: expect.objectContaining({ status: 'ACTIVE', systemKey: null }) }) }))
})

it.each([
  ['AWAITING_RESPONSES', 1, true], ['MATCHING', 1, true], ['IN_SELECTION', 1, true],
  ['AWAITING_RESPONSES', 0, false], ['AWAITING_RESPONSES', -1, false],
  ['CANCELLED', 1, false], ['AWARDED', 1, false], ['CLOSED', 1, false],
] as const)('purchase availability: status %s, deadline offset %s', async (status, offset, expected) => {
  const now = new Date('2026-10-23T12:00:00Z')
  db.organizationMembership.findFirst.mockResolvedValue({ role: 'OWNER' })
  db.creditAccount.findUnique.mockResolvedValue({ availableBalance: 100 })
  db.providerInvitation.findFirst.mockResolvedValue({ id: 'invitation', status: 'INVITED', deadlineAt: new Date(now.getTime() + offset), participation: null, snapshot: {}, creditCost: 31, assignment: { id: 'assignment', status, primarySpecialism: null, sector: null, desiredStartDate: null, responseDeadline: null, locationProvince: null, maxSelections: 3 } })
  const result = await getProviderInvitationDetail('user', 'organization', 'invitation', now)
  expect(result.invitation.canPurchase).toBe(expected)
  expect(result.invitation.fullAssignment).toBeNull()
  expect(result.invitation.preview.priceCredits).toBe(31)
})
