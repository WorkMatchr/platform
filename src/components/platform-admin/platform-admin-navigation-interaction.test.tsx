// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const route = vi.hoisted(() => ({ pathname: '/platformbeheer/trading/toegang' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
import { PlatformAdminNavigationMenu } from './platform-admin-navigation-menu'
afterEach(cleanup)
it('houdt Trading en Systeem onafhankelijk en volgt daarna de actieve route', async () => {
  const view = render(<PlatformAdminNavigationMenu membershipRole="ADMIN" />)
  const trading = screen.getByText('Trading').closest('details')!
  const system = screen.getByText('Systeem').closest('details')!
  expect(trading.open).toBe(true); expect(system.open).toBe(false)
  system.open = true; fireEvent(system, new Event('toggle'))
  await waitFor(() => expect(system.open).toBe(true))
  trading.open = false; fireEvent(trading, new Event('toggle'))
  await waitFor(() => expect(trading.open).toBe(false))
  expect(system.open).toBe(true)
  route.pathname = '/platformbeheer/instellingen'
  view.rerender(<PlatformAdminNavigationMenu membershipRole="ADMIN" />)
  expect(trading.open).toBe(false); expect(system.open).toBe(true)
  const link = screen.getByRole('link', {name: 'Instellingen'})
  expect(link.getAttribute('aria-current')).toBe('page')
  link.focus(); expect(document.activeElement).toBe(link)
})
