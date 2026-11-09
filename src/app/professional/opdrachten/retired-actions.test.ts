import { describe, expect, it, vi } from 'vitest'
import { claimRequestOfferSlotAction, registerRequestInterestAction } from './actions'

const stubs = vi.hoisted(() => ({
  authorize: vi.fn(async () => ({})),
  membership: vi.fn(async () => ({ user: { id: 'user' }, activeMembership: { organization: { id: 'own-tenant' } } })),
}))
vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: stubs.membership }))
vi.mock('@/lib/marketplace/marketplace-authorization', () => ({ requireProviderParticipationAccess: stubs.authorize }))
// A new write, or any database read after authorization, fails this boundary test.
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: (operation: (tx: object) => unknown) => operation({}) }) }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error('REDIRECT ' + url) } }))

describe('rechtstreekse historische serveracties', () => {
  it.each([registerRequestInterestAction, claimRequestOfferSlotAction])('sluit ook voor bevoegd beheer van de eigen organisatie', async action => {
    vi.clearAllMocks()
    const form = new FormData()
    form.set('requestId', '70000000-0000-4000-8000-000000000001')
    form.set('organizationId', 'foreign-tenant')
    await expect(action(form)).rejects.toThrow('REDIRECT /professional/opdrachten')
    expect(stubs.authorize).toHaveBeenCalledWith({}, 'user', 'own-tenant', true)
  })
})
