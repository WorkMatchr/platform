// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const route = vi.hoisted(() => ({ pathname: '/opdrachten' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformContext: vi.fn(), PlatformAdminAccessError: class extends Error {} }))
import { Header } from './header'
import { buildHeaderViewModel } from './header-model'
afterEach(cleanup)

it.each(['CLIENT', 'PROFESSIONAL'] as const)('mobiel accountmenu behoudt actieve route en Escape-focus voor %s', async accountType => {
  const professional = accountType === 'PROFESSIONAL'
  route.pathname = professional ? '/professional/opdrachten' : '/opdrachten'
  const model = buildHeaderViewModel({ user: { displayName: 'Testgebruiker', email: 'menu@example.invalid', accountType }, activeMembership: { role: 'OWNER', organization: { id: 'test', name: 'Testorganisatie', organizationType: professional ? 'PROVIDER' : 'CLIENT', providerProfile: professional ? { id: 'test' } : null } } })
  render(await Header({ model }))
  const trigger = screen.getByRole('button', { name: 'Accountmenu openen of sluiten' })
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  trigger.focus()
  fireEvent.click(trigger)
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  const navigation = screen.getByRole('navigation', { name: 'Accountnavigatie' })
  const current = navigation.querySelector('[aria-current="page"]') as HTMLAnchorElement
  expect(current.getAttribute('href')).toBe(route.pathname)
  current.focus()
  expect(document.activeElement).toBe(current)
  fireEvent.keyDown(document, { key: 'Escape' })
  await waitFor(() => expect(document.activeElement).toBe(trigger))
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(trigger)
  const personal = within(navigation).getByText('Persoonlijk').closest('details')!
  personal.open = true
  fireEvent(personal, new Event('toggle'))
  await waitFor(() => expect(personal.open).toBe(true))
  expect(within(navigation).getByRole('link', { name: 'Account' }).getAttribute('href')).toBe('/account')
})
