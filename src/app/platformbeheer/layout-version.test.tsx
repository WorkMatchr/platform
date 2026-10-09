import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ authorize: vi.fn(), cookies: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAuditor: mocks.authorize }))
vi.mock('@/lib/test-impersonation/test-impersonation-service', () => ({ getAvailableTestAccounts: vi.fn() }))
vi.mock('@/lib/test-impersonation/test-impersonation-policy', () => ({ isTestAccountSwitcherEnabled: () => false }))
vi.mock('@/components/platform-admin/platform-admin-shell', () => ({ PlatformAdminShell: ({ children }: { children: React.ReactNode }) => <div data-version="v01">{children}</div> }))
vi.mock('@/components/platform-admin/platform-admin-shell-v02', () => ({ PlatformAdminShellV02: ({ children }: { children: React.ReactNode }) => <div data-version="v02">{children}</div> }))
import Layout from './layout'

beforeEach(() => { vi.resetAllMocks(); mocks.authorize.mockResolvedValue({ membershipRole: 'MEMBER', displayName: 'Testbeheerder' }) })
describe('A01.6 herstelde platformversiekeuze', () => {
  it.each([[undefined, 'v01'], ['invalid', 'v01'], ['v01', 'v01'], ['v02', 'v02']])('behoudt de bestaande voorkeur %s -> %s', async (cookie, expected) => {
    const get = vi.fn(() => cookie ? { value: cookie } : undefined)
    mocks.cookies.mockResolvedValue({ get })
    const html = renderToStaticMarkup(await Layout({ children: <h1>Audit</h1> }))
    expect(mocks.authorize).toHaveBeenCalledWith('/platformbeheer')
    expect(get).toHaveBeenCalledWith('platform-admin-view')
    expect(html).toContain(`data-version="${expected}"`)
    expect(html).toContain('Audit')
  })
  it('vertrouwt een v02-cookie niet als autorisatie', async () => {
    mocks.authorize.mockRejectedValue(new Error('Geen toegang'))
    await expect(Layout({ children: null })).rejects.toThrow('Geen toegang')
    expect(mocks.cookies).not.toHaveBeenCalled()
  })
})
