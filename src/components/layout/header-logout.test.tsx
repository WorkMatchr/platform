// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ path: '/dashboard', signOut: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: () => mocks.path }))
vi.mock('@/lib/auth-client', () => ({ authClient: { signOut: mocks.signOut } }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformContext: vi.fn(), PlatformAdminAccessError: class extends Error {} }))
vi.mock('@/app/platformbeheer/test-account-actions', () => ({ startTestImpersonationAction: vi.fn() }))
import { Header } from './header'
import { ApplicationChrome } from './application-chrome'
import { buildHeaderViewModel } from './header-model'
import { PlatformAdminShell } from '@/components/platform-admin/platform-admin-shell'
import { PlatformAdminShellV02 } from '@/components/platform-admin/platform-admin-shell-v02'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.path = '/dashboard' })
const modelFor = (type: 'CLIENT' | 'PROFESSIONAL' | 'PLATFORM') => buildHeaderViewModel({ user: { displayName: 'Testgebruiker', email: 'test@example.invalid', accountType: type === 'PLATFORM' ? null : type }, activeMembership: null }, type === 'PLATFORM')

it.each(['CLIENT', 'PROFESSIONAL', 'PLATFORM'] as const)('toont exact één toegankelijke headeruitlogknop voor %s', async type => {
  const model = modelFor(type)
  render(<ApplicationChrome header={await Header({ model })} headerModel={model} banner={null} footer={null} compactFooter={null}><h1>Account</h1></ApplicationChrome>)
  const button = screen.getByRole('button', { name: /^Uitloggen$/ })
  expect(screen.getAllByRole('button', { name: /^Uitloggen$/ })).toHaveLength(1)
  expect(button.closest('header')).not.toBeNull()
  expect(button.closest('nav')).toBeNull()
  expect(button.closest('[hidden]')).toBeNull()
  expect(button.getAttribute('type')).toBe('button')
  button.focus(); expect(document.activeElement).toBe(button)
  if (type !== 'PLATFORM') {
    const destination = within(button.parentElement!).getByRole('link', { name: 'Mijn omgeving' })
    expect(destination.getAttribute('href')).toBe('/dashboard')
    expect(destination.nextElementSibling).toBe(button)
    expect(destination.className).not.toContain('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Accountmenu openen of sluiten' }))
    expect(screen.getAllByRole('button', { name: /^Uitloggen$/ })).toHaveLength(1)
  }
})
it.each([PlatformAdminShell, PlatformAdminShellV02])('voegt geen tweede knop toe aan de eigen beheerdersshell', async Shell => {
  mocks.path = '/platformbeheer'
  const model = modelFor('PLATFORM')
  render(<ApplicationChrome header={await Header({ model })} headerModel={model} banner={null} footer={null} compactFooter={null}><Shell displayName="Testbeheerder" membershipRole="ADMIN" testAccountSwitcher={null}><h1>Beheer</h1></Shell></ApplicationChrome>)
  expect(screen.getAllByRole('button', { name: /^Uitloggen$/ })).toHaveLength(1)
})
it('toont geen uitlogknop zonder sessie', async () => {
  render(await Header({ model: buildHeaderViewModel(null) }))
  expect(screen.queryByRole('button', { name: /^Uitloggen$/ })).toBeNull()
})
it('gebruikt de echte LogoutButton: één signOut, daarna dezelfde bestemming', async () => {
  let finish!: () => void
  mocks.signOut.mockReturnValue(new Promise<void>(resolve => { finish = resolve }))
  const assign = vi.fn()
  const original = window
  vi.stubGlobal('window', new Proxy(original, { get(target, key) { return key === 'location' ? { assign, href: original.location.href, origin: original.location.origin } : Reflect.get(target, key, target) } }))
  render(await Header({ model: modelFor('CLIENT') }))
  const button = screen.getByRole('button', { name: /^Uitloggen$/ })
  fireEvent.click(button)
  expect(mocks.signOut).toHaveBeenCalledTimes(1)
  expect(button.getAttribute('aria-busy')).toBe('true')
  expect((button as HTMLButtonElement).disabled).toBe(true)
  expect(assign).not.toHaveBeenCalled()
  finish()
  await waitFor(() => expect(assign).toHaveBeenCalledExactlyOnceWith('/'))
})
