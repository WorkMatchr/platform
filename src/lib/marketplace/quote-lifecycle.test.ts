import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ tx: {} as Record<string, unknown> }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: (fn: (tx: unknown) => unknown) => fn(state.tx) }) }))
vi.mock('./marketplace-authorization', () => ({
  requireProviderMarketplaceAccess: vi.fn().mockResolvedValue({ role: 'OWNER', providerProfile: { id: 'profile' } }),
  requireClientMarketplaceManager: vi.fn().mockResolvedValue({ role: 'OWNER' }),
}))
import { saveQuoteDraft } from './quote-service'
import { awardMarketplaceQuote } from './award-service'

const content = { priceCents: 25000, priceExplanation: 'Synthetische prijs met toelichting', approach: 'Een controleerbare synthetische aanpak.', planning: 'In gezamenlijk overleg.' }
describe('commercial quote lifecycle boundaries', () => {
  beforeEach(() => {
    state.tx = {
      providerParticipation: { findFirst: vi.fn().mockResolvedValue({ id: 'participation', assignmentId: 'assignment' }) },
      creditReservation: { findUnique: vi.fn().mockResolvedValue(null) },
      creditTransaction: { findFirst: vi.fn().mockResolvedValue({ id: 'purchase' }) },
      providerInvitation: { findUniqueOrThrow: vi.fn().mockResolvedValue({ deadlineAt: new Date('2099-01-01') }) },
      assignment: { findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'CLOSED' }), findFirst: vi.fn().mockResolvedValue({ id: 'assignment', status: 'IN_SELECTION' }) },
      quote: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn(), findFirst: vi.fn() },
      awardDecision: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
    }
  })
  it('rejects draft creation after an assignment is closed, before any write', async () => {
    await expect(saveQuoteDraft({ actorUserId: 'user', providerOrganizationId: 'provider', participationId: 'participation', expectedQuoteVersion: 0, content })).rejects.toMatchObject({ code: 'INVALID_STATE' })
    expect((state.tx.quote as { create: ReturnType<typeof vi.fn> }).create).not.toHaveBeenCalled()
  })
  it.each(['2026-11-01T23:00:00Z', '2026-11-01T23:00:01Z'])('does not award a November 1 offer at %s', async now => {
    ;(state.tx.quote as { findFirst: ReturnType<typeof vi.fn> }).findFirst.mockResolvedValue({ id: 'quote', submittedVersion: { id: 'version', validUntil: new Date('2026-11-01T00:00:00Z') } })
    await expect(awardMarketplaceQuote({ actorUserId: 'user', clientOrganizationId: 'client', assignmentId: 'assignment', quoteId: 'quote', motivation: 'Synthetische motivering', idempotencyKey: 'award-key', now: new Date(now) })).rejects.toMatchObject({ code: 'DEADLINE_PASSED' })
    expect((state.tx.awardDecision as { create: ReturnType<typeof vi.fn> }).create).not.toHaveBeenCalled()
  })
})
