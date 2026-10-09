import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { afterEach, describe, expect, it, vi } from 'vitest'

const route = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: vi.fn() }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformContext: vi.fn(), PlatformAdminAccessError: class extends Error {} }))

import { Header } from './header'
import { ApplicationChrome } from './application-chrome'
import { buildHeaderViewModel } from './header-model'

afterEach(() => { vi.unstubAllEnvs(); route.pathname = '/dashboard' })

describe('A01.6 bestaande accountnavigatie', () => {
  it.each(['CLIENT', 'PROFESSIONAL'] as const)('behoudt dezelfde desktop- en mobiele routes voor %s', async accountType => {
    vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', undefined)
    for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
      const professional = accountType === 'PROFESSIONAL'
      route.pathname = professional ? '/aanbiedersdossier/professionals' : '/opdrachten'
      const model = buildHeaderViewModel({
        user: { displayName: 'Synthetische gebruiker', email: 'navigation@example.invalid', accountType },
        activeMembership: { role, organization: { id: 'synthetic-org', name: 'Testorganisatie', organizationType: professional ? 'PROVIDER' : 'CLIENT', providerProfile: professional ? { id: 'synthetic-profile' } : null } },
      })
      const html = renderToStaticMarkup(<ApplicationChrome header={await Header({ model })} headerModel={model} banner={null} footer={null} compactFooter={null}><h1>Werkruimte</h1></ApplicationChrome>)
      const document = new JSDOM(html).window.document
      expect(document.querySelector('[data-account-shell="v02"]')).not.toBeNull()
      const menus = [...document.querySelectorAll('nav[aria-label="Accountnavigatie"]')]
      expect(menus).toHaveLength(2)
      const routes = menus.map(menu => [...menu.querySelectorAll('a')].map(link => link.getAttribute('href')))
      expect(routes[0]).toEqual(routes[1])
      for (const menu of menus) {
        expect(menu.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
        expect(menu.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(route.pathname)
        expect(menu.textContent).toContain('Uitloggen')
        expect(menu.querySelector('a[href="/platformbeheer"]')).toBeNull()
        expect(menu.querySelector(`a[href="${professional ? '/opdrachten' : '/credits'}"]`)).toBeNull()
      }
      expect(routes[0]).toEqual(model.navigationGroups.flatMap(group => group.links.map(link => link.href)))
      expect(document.querySelector('[data-account-sidebar]')?.className).toContain('hidden')
      expect(document.querySelector('[data-account-sidebar]')?.className).toContain('lg:block')
      expect(document.querySelector('button[aria-label="Accountmenu openen of sluiten"]')).not.toBeNull()
    }
  })

  it('past de klant-shell niet toe op een platformbeheerder', async () => {
    const model = buildHeaderViewModel({ user: { displayName: 'Testbeheerder', email: 'admin@example.invalid', platformRole: 'ADMIN' }, activeMembership: null }, true)
    route.pathname = '/platformbeheer/financien'
    const html = renderToStaticMarkup(<ApplicationChrome header={await Header({ model })} headerModel={model} banner={null} footer={null} compactFooter={null}><div>Platforminhoud</div></ApplicationChrome>)
    expect(html).not.toContain('data-account-shell')
    expect(html).not.toContain('Accountnavigatie')
    expect(html).toContain('Platforminhoud')
  })
})
