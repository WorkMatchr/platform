import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
const route = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
import { ApplicationChrome } from './application-chrome'
import { buildHeaderViewModel } from './header-model'
const model = (role: 'OWNER' | 'ADMIN' | 'MEMBER') => buildHeaderViewModel({
  user: { displayName: 'Testopdrachtgever', email: 'client@example.invalid', accountType: 'CLIENT' },
  activeMembership: { role, organization: { id: 'org', name: 'Testorganisatie', organizationType: 'CLIENT', providerProfile: null } },
})
function markup(role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER', platform = false) {
  return renderToStaticMarkup(<ApplicationChrome header={<header>Header met mobiel accountmenu</header>} banner={null} footer={<footer>Publiek</footer>} compactFooter={<footer>Account</footer>} headerModel={{...model(role), isPlatformAdministrator: platform}}><section><h1>Pagina</h1><form action="/bestaande-actie"><label>Naam<input name="name" defaultValue="Bewaard" /></label><button type="submit">Opslaan</button></form></section></ApplicationChrome>)
}
afterEach(() => { vi.unstubAllEnvs(); route.pathname = '/dashboard' })
describe('klantaccount-shell v0.2', () => {
  it.each(['development', 'production', 'test'])('gebruikt v0.2 standaard in %s', environment => {
    vi.stubEnv('NODE_ENV', environment); vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', undefined)
    expect(markup()).toContain('data-account-shell="v02"')
  })
  it('behoudt v0.1 als expliciete rollback zonder verlies van inhoud', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', 'v01')
    const html = markup()
    expect(html).toContain('data-account-shell="v01"')
    expect(html).not.toContain('data-account-shell="v02"')
    expect(html).toContain('action="/bestaande-actie"')
    expect(html).toContain('Testorganisatie')
  })
  it.each(['OWNER', 'ADMIN', 'MEMBER'] as const)('behoudt context, alle links en formulier voor %s', role => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', undefined)
    for (const path of ['/dashboard', '/organisatie', '/opdrachten', '/adviesdossiers', '/account']) {
      route.pathname = path
      const html = markup(role)
      expect(html).toContain('data-account-shell="v02"'); expect(html).toContain('Testorganisatie')
      for (const group of model(role).navigationGroups) for (const link of group.links) expect(html).toContain('href="'+link.href+'"')
      expect(html).toContain('action="/bestaande-actie"'); expect(html).toContain('value="Bewaard"')
      expect(html.match(/aria-current="page"/g)).toHaveLength(1)
      expect(html).toContain('Header met mobiel accountmenu'); expect(html).not.toContain('Uitloggen')
    }
  })
  it('raakt publieke routes en platformbeheer niet', () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('NEXT_PUBLIC_ACCOUNT_SHELL_VERSION', undefined)
    route.pathname = '/'; expect(markup()).not.toContain('data-account-shell="v02"')
    route.pathname = '/platformbeheer'; expect(markup('OWNER', true)).not.toContain('data-account-shell="v02"')
  })
})
