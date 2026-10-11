import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ version: undefined as string | undefined, auth: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => mocks.version ? { value: mocks.version } : undefined }) }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAuditor: mocks.auth }))
vi.mock('@/lib/test-impersonation/test-impersonation-service', () => ({ getAvailableTestAccounts: vi.fn() }))
vi.mock('@/lib/test-impersonation/test-impersonation-policy', () => ({ isTestAccountSwitcherEnabled: () => false }))
vi.mock('@/components/platform-admin/platform-admin-shell', () => ({ PlatformAdminShell: () => <div>legacy</div> }))
vi.mock('@/components/platform-admin/platform-admin-shell-v02', () => ({ PlatformAdminShellV02: () => <div>shared</div> }))
import Layout from './layout'
beforeEach(() => { mocks.version = undefined; mocks.auth.mockReset(); mocks.auth.mockResolvedValue({ displayName: 'Beheer', membershipRole: 'MEMBER' }) })
it.each([undefined, 'v02', 'unknown'])('gebruikt de goedgekeurde shell bij voorkeur %s', async version => {
  mocks.version = version
  expect(renderToStaticMarkup(await Layout({ children: 'Inhoud' }))).toContain('shared')
  expect(mocks.auth).toHaveBeenCalledWith('/platformbeheer')
})
it('behoudt expliciete v01-vergelijking', async () => {
  mocks.version = 'v01'
  expect(renderToStaticMarkup(await Layout({ children: 'Inhoud' }))).toContain('legacy')
})
it('controleert toegang voordat een shell wordt geleverd', async () => {
  mocks.auth.mockRejectedValue(new Error('denied'))
  await expect(Layout({ children: 'Inhoud' })).rejects.toThrow('denied')
})
