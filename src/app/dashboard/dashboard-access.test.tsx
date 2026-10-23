import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ context: vi.fn(), landing: vi.fn(), tenant: vi.fn(), platform: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`) } }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getActiveOrganizationContext: mocks.context }))
vi.mock('@/lib/platform-admin/platform-admin-landing', () => ({ getPlatformAdminLanding: mocks.landing }))
vi.mock('@/lib/marketplace/dashboard-query-service', () => ({ getMarketplaceDashboard: mocks.tenant, getMarketplacePlatformDashboard: mocks.platform }))
vi.mock('@/components/marketplace/marketplace-dashboard', () => ({ MarketplaceDashboard: () => null }))
import DashboardPage from './page'
import { MarketplaceServiceError } from '@/lib/marketplace/marketplace-errors'

describe('dashboard zonder actieve tenant', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.context.mockResolvedValue({ user: { id: 'user', accountType: 'CLIENT' }, activeMembership: null })
    mocks.landing.mockResolvedValue(null)
    mocks.platform.mockRejectedValue(new MarketplaceServiceError('ACCESS_DENIED'))
  })

  it.each(['CLIENT', 'PROFESSIONAL'])('stuurt %s zonder organisatie naar bestaande onboarding', async (accountType) => {
    mocks.context.mockResolvedValue({ user: { id: 'user', accountType }, activeMembership: null })
    await expect(DashboardPage()).rejects.toThrow('REDIRECT:/organisatie/nieuw')
    expect(mocks.tenant).not.toHaveBeenCalled()
  })

  it('stuurt een account zonder accounttype veilig naar de accountpagina', async () => {
    mocks.context.mockResolvedValue({ user: { id: 'user', accountType: null }, activeMembership: null })
    await expect(DashboardPage()).rejects.toThrow('REDIRECT:/account')
  })

  it('behoudt de server-side platformlanding', async () => {
    mocks.landing.mockResolvedValue('/platformbeheer')
    await expect(DashboardPage()).rejects.toThrow('REDIRECT:/platformbeheer')
    expect(mocks.platform).not.toHaveBeenCalled()
  })

  it('behoudt expliciet bevoegde platformactoren zonder tenant', async () => {
    mocks.platform.mockResolvedValue({ kind: 'PLATFORM' })
    await expect(DashboardPage()).resolves.toBeDefined()
    expect(mocks.platform).toHaveBeenCalledWith('user')
  })

  it('gebruikt uitsluitend de server-side tenantcontext', async () => {
    mocks.context.mockResolvedValue({ user: { id: 'user' }, activeMembership: { organization: { id: 'tenant-a', name: 'Tenant A' } } })
    mocks.tenant.mockResolvedValue({ kind: 'CLIENT' })
    await expect(DashboardPage()).resolves.toBeDefined()
    expect(mocks.tenant).toHaveBeenCalledWith('user', 'tenant-a')
    expect(mocks.platform).not.toHaveBeenCalled()
  })

  it('verbergt geen database- of onverwachte fouten achter onboarding', async () => {
    mocks.platform.mockRejectedValue(new Error('database unavailable'))
    await expect(DashboardPage()).rejects.toThrow('database unavailable')
    mocks.platform.mockRejectedValue(new MarketplaceServiceError('CONFLICT'))
    await expect(DashboardPage()).rejects.toThrow(MarketplaceServiceError)
  })
})
