import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getContext: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: mocks.getContext }))

import { getArboGuideApiAccess, getArboGuidePageAccess } from './arbo-guide-access'

describe('generieke Arbo-wijzer-toegang', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maakt voor een anonieme bezoeker een veilige lokale returnTo', async () => {
    mocks.getContext.mockResolvedValue(null)
    await expect(getArboGuidePageAccess('/wijzers/bhv')).resolves.toEqual({
      status: 'ANONYMOUS',
      loginHref: '/inloggen?returnTo=%2Fwijzers%2Fbhv',
    })
    await expect(getArboGuidePageAccess('https://evil.example/steel')).resolves.toEqual({
      status: 'ANONYMOUS',
      loginHref: '/inloggen?returnTo=%2Fwijzers',
    })
  })

  it('weigert API-gebruik zonder organisatie en laat een geldige tenant toe', async () => {
    mocks.getContext.mockResolvedValueOnce({ user: { id: 'user-1' }, activeMembership: null })
    await expect(getArboGuideApiAccess()).resolves.toEqual({ authorized: false, status: 403 })
    mocks.getContext.mockResolvedValueOnce({ user: { id: 'user-1' }, activeMembership: { organization: { id: 'organization-1', name: 'Voorbeeld BV' } } })
    await expect(getArboGuideApiAccess()).resolves.toEqual({ authorized: true, userId: 'user-1', organizationId: 'organization-1', organizationName: 'Voorbeeld BV' })
  })
})
