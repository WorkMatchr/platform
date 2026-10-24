import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ transaction: {} as Record<string, unknown> }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: (callback: (tx: unknown) => unknown) => callback(state.transaction) }) }))

import { awardMarketplaceQuote } from './award-service'
import { declineProviderInvitation } from './participation-service'
import { sendMarketplaceMessage } from './messaging-service'
import { applyMarketplaceMatchIntervention } from './matching-service'

describe('marketplace idempotency never grants authorization', () => {
  beforeEach(() => {
    state.transaction = {
      organizationMembership: { findFirst: vi.fn().mockResolvedValue(null) },
      user: { findFirst: vi.fn().mockResolvedValue(null) },
      awardDecision: { findUnique: vi.fn().mockResolvedValue({ id: 'private-award' }) },
      marketplaceAuditEvent: { findUnique: vi.fn().mockResolvedValue({ id: 'private-audit' }) },
      marketplaceMessage: { findUnique: vi.fn().mockResolvedValue({ content: 'private-message' }) },
      marketplaceMessageChannel: { findFirst: vi.fn().mockResolvedValue(null) },
    }
  })

  it('rejects an award replay after membership is revoked', async () => {
    await expect(awardMarketplaceQuote({ actorUserId: 'user', clientOrganizationId: 'client', assignmentId: 'assignment', quoteId: 'quote', motivation: 'Synthetische motivatie', idempotencyKey: 'existing' })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('rejects a declined invitation replay without provider access', async () => {
    await expect(declineProviderInvitation({ actorUserId: 'user', providerOrganizationId: 'provider', invitationId: 'invitation', reason: 'Synthetische reden', idempotencyKey: 'existing' })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('rejects a message replay outside the authorized channel', async () => {
    await expect(sendMarketplaceMessage({ actorUserId: 'user', organizationId: 'other', channelId: 'channel', content: 'Synthetisch bericht', idempotencyKey: 'existing' })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('rejects an intervention replay without current platform permission', async () => {
    await expect(applyMarketplaceMatchIntervention({ actorUserId: 'user', matchRunId: 'run', candidateIds: ['candidate'], reason: 'Synthetische reden', idempotencyKey: 'existing' })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  function authorize() {
    state.transaction.organizationMembership = { findFirst: vi.fn().mockResolvedValue({ role: 'OWNER', organizationId: 'provider', organization: { providerProfile: { id: 'profile' } } }) }
    state.transaction.user = { findFirst: vi.fn().mockResolvedValue({ id: 'user', memberships: [{ role: 'OWNER' }] }) }
  }

  it.each(['clientOrganizationId', 'decidedByUserId', 'quoteId'])('rejects award key reuse with a different %s', async field => {
    authorize()
    state.transaction.awardDecision = { findUnique: vi.fn().mockResolvedValue({ clientOrganizationId: 'client', decidedByUserId: 'user', quoteId: 'quote', [field]: 'other' }) }
    await expect(awardMarketplaceQuote({ actorUserId: 'user', clientOrganizationId: 'client', assignmentId: 'assignment', quoteId: 'quote', motivation: 'Synthetische motivatie', idempotencyKey: 'existing' })).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it('permits an authorized same-award replay using the canonical Request identity', async () => {
    authorize()
    const award = { clientOrganizationId: 'client', decidedByUserId: 'user', quoteId: 'quote', assignmentId: 'internal' }
    const findFirst = vi.fn().mockResolvedValue({ id: 'internal' })
    state.transaction.assignment = { findFirst }
    state.transaction.awardDecision = { findUnique: vi.fn().mockResolvedValue(award) }
    await expect(awardMarketplaceQuote({ actorUserId: 'user', clientOrganizationId: 'client', assignmentId: 'request', quoteId: 'quote', motivation: 'Synthetische motivatie', idempotencyKey: 'existing' })).resolves.toEqual(award)
    expect(JSON.stringify(findFirst.mock.calls)).toContain('request')
  })

  it.each([true, false])('binds declined-invitation replay to the same operation (valid=%s)', async valid => {
    authorize()
    const event = { actorUserId: 'user', organizationId: 'provider', action: 'INVITATION_DECLINED', entityType: 'ProviderInvitation', entityId: valid ? 'invitation' : 'other' }
    state.transaction.marketplaceAuditEvent = { findUnique: vi.fn().mockResolvedValue(event) }
    const result = declineProviderInvitation({ actorUserId: 'user', providerOrganizationId: 'provider', invitationId: 'invitation', reason: 'Synthetische reden', idempotencyKey: 'existing' })
    if (valid) await expect(result).resolves.toEqual(event)
    else await expect(result).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it.each([true, false])('binds messages to their sender, channel and content (valid=%s)', async valid => {
    authorize()
    state.transaction.marketplaceMessageChannel = { findFirst: vi.fn().mockResolvedValue({ id: 'channel', clientOrganizationId: 'client', clientOrganization: { memberships: [{ role: 'OWNER' }] }, participation: { providerOrganizationId: 'provider', status: 'ACTIVE' } }) }
    const message = { senderUserId: 'user', senderOrganizationId: 'client', channelId: valid ? 'channel' : 'other', content: 'Synthetisch bericht' }
    state.transaction.marketplaceMessage = { findUnique: vi.fn().mockResolvedValue(message) }
    const result = sendMarketplaceMessage({ actorUserId: 'user', organizationId: 'client', channelId: 'channel', content: 'Synthetisch bericht', idempotencyKey: 'existing' })
    if (valid) await expect(result).resolves.toEqual(message)
    else await expect(result).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })

  it.each([true, false])('binds platform interventions to the original selection (valid=%s)', async valid => {
    authorize()
    const event = { actorUserId: 'user', action: 'MATCH_SELECTION_INTERVENED', entityType: 'MarketplaceMatchIntervention', metadata: { matchRunId: 'run', replacementSelection: [{ candidateId: valid ? 'candidate' : 'other' }] } }
    state.transaction.marketplaceAuditEvent = { findUnique: vi.fn().mockResolvedValue(event) }
    const result = applyMarketplaceMatchIntervention({ actorUserId: 'user', matchRunId: 'run', candidateIds: ['candidate'], reason: 'Synthetische reden', idempotencyKey: 'existing' })
    if (valid) await expect(result).resolves.toEqual(event)
    else await expect(result).rejects.toMatchObject({ code: 'ACCESS_DENIED' })
  })
})
