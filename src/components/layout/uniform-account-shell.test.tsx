import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'node:fs'
const route = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
import { ApplicationChrome } from './application-chrome'
import { buildHeaderViewModel } from './header-model'

const context = (accountType: 'CLIENT' | 'PROFESSIONAL', role: 'OWNER' | 'ADMIN' | 'MEMBER') => ({
  user: { displayName: 'Testgebruiker', email: 'test@example.invalid', accountType },
  activeMembership: { role, organization: { id: 'tenant-a', name: 'Testorganisatie', organizationType: accountType === 'CLIENT' ? 'CLIENT' as const : 'PROVIDER' as const, providerProfile: accountType === 'PROFESSIONAL' ? { id: 'profile-a' } : null } },
})
afterEach(() => { vi.unstubAllEnvs(); route.pathname = '/dashboard' })
const markup = (model = buildHeaderViewModel(context('CLIENT', 'OWNER'))) => renderToStaticMarkup(
  <ApplicationChrome header={<header>Header</header>} banner={null} compactFooter={null} footer={<footer>Publiek</footer>} headerModel={model}>
    <form action="/existing-action"><input name="description" defaultValue="Behouden" /><button>Opslaan</button></form>
  </ApplicationChrome>,
)
describe('A01.7 uniforme werkruimte', () => {
  it.each(['CLIENT', 'PROFESSIONAL'] as const)('behoudt routes en rechten voor %s', accountType => {
    for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
      const model = buildHeaderViewModel(context(accountType, role))
      const links = model.navigationGroups.flatMap(group => group.links)
      expect(links.some(link => link.href === '/organisatie/gebruikers')).toBe(role !== 'MEMBER')
      expect(links.some(link => link.href === '/aanbiedersdossier/profiel')).toBe(accountType === 'PROFESSIONAL')
      expect(links.some(link => link.href.startsWith('/platformbeheer'))).toBe(false)
      for (const link of links) expect(existsSync(`src/app${link.href}/page.tsx`), link.href).toBe(true)
      const html = markup(model)
      expect(html).toContain('data-account-layout="uniform"')
      expect(html).toContain('action="/existing-action"')
      expect(html).toContain('value="Behouden"')
      expect(html).not.toContain('Uitloggen')
      expect(html).toContain('Testorganisatie')
    }
  })
  it('behoudt de eerdere account-v02 en v01 als expliciete rollback', () => {
    vi.stubEnv('NEXT_PUBLIC_ACCOUNT_LAYOUT_VERSION', 'legacy')
    expect(markup()).toContain('data-account-layout="legacy"')
    expect(markup()).toContain('data-account-shell="v02"')
    vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', 'v01')
    expect(markup()).toContain('data-account-shell="v01"')
  })
  it.each(['/', '/diensten', '/e-learning', '/e-learning/rie-in-de-praktijk', '/platformbeheer'])('wijzigt de publieke of afzonderlijke route %s niet', pathname => {
    route.pathname = pathname
    expect(markup()).not.toContain('data-account-layout')
  })
  it('maakt van anoniem of ontbrekend accounttype geen bevoegde opdrachtgever/provider', () => {
    expect(markup(buildHeaderViewModel(null))).not.toContain('data-account-layout')
    const unknown = buildHeaderViewModel({ user: { displayName: null, email: 'test@example.invalid', accountType: null }, activeMembership: null })
    const links = unknown.navigationGroups.flatMap(group => group.links)
    expect(links.some(link => /opdrachten|credits|aanbiedersdossier|platformbeheer/.test(link.href))).toBe(false)
  })
})
