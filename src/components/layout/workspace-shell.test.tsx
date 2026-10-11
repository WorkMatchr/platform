import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
const route = vi.hoisted(() => ({ pathname: '/dashboard' }))
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }))
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
vi.mock('@/app/platformbeheer/test-account-actions', () => ({ startTestImpersonationAction: vi.fn() }))
import { AccountWorkspaceShell } from './account-workspace-shell'
import { PlatformAdminShellV02 } from '@/components/platform-admin/platform-admin-shell-v02'
import { buildHeaderViewModel } from './header-model'

const parse = (html: string) => new JSDOM(html).window.document
const modelFor = (accountType: 'CLIENT' | 'PROFESSIONAL', role: 'OWNER' | 'ADMIN' | 'MEMBER') => buildHeaderViewModel({
  user: { displayName: 'Testgebruiker', email: 'layout@example.invalid', accountType },
  activeMembership: { role, organization: { id: 'tenant-a', name: 'Tenant A', organizationType: accountType === 'CLIENT' ? 'CLIENT' : 'PROVIDER', providerProfile: accountType === 'PROFESSIONAL' ? { id: 'profile-a' } : null } },
})

describe('gedeelde goedgekeurde beheershell', () => {
  it('behoudt de goedgekeurde beheermarkup exact bij extractie', () => {
    route.pathname = '/platformbeheer'
    const props = { displayName: 'Beheer', membershipRole: 'OWNER' as const, testAccountSwitcher: null, children: <h1>Dashboard</h1> }
    const current = renderToStaticMarkup(<PlatformAdminShellV02 {...props} />).replace(' data-workspace-shell="v02"', '')
    // Baseline verified against the unchanged main shell before this snapshot was recorded.
    expect(current).toMatchSnapshot()
  })
  it.each(['CLIENT', 'PROFESSIONAL'] as const)('behoudt iedere bestaande route en rolgrens voor %s', type => {
    for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
      const model = modelFor(type, role)
      expect(model.navigationGroups.flatMap(group => group.links).some(link => link.href === '/organisatie/gebruikers')).toBe(role !== 'MEMBER')
      for (const group of model.navigationGroups) for (const link of group.links) {
        route.pathname = link.href
        const document = parse(renderToStaticMarkup(<AccountWorkspaceShell model={model} banner={null}><form action="/unchanged"><input name="value" defaultValue="retained" /></form></AccountWorkspaceShell>))
        expect(document.querySelector('nav[aria-label="Accounthoofdstukken"] [aria-current="location"]')?.textContent).toBe(group.label)
        expect(document.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(link.href)
        expect([...document.querySelectorAll(`nav[aria-label="Binnen ${group.label}"] a`)].map(a => a.getAttribute('href'))).toEqual(group.links.map(item => item.href))
        expect(document.querySelector('summary')).toBeNull()
        expect(document.querySelector('form')?.getAttribute('action')).toBe('/unchanged')
        expect(document.querySelector('input')?.getAttribute('value')).toBe('retained')
        expect(document.body.textContent).toContain('Tenant A')
        expect(document.body.textContent).not.toContain('Tenant B')
        expect(document.querySelectorAll('button')).toHaveLength(1)
      }
    }
  })
  it('gebruikt identieke shell-, header-, sidebar- en subnavigatieklassen voor alle accounts', () => {
    route.pathname = '/platformbeheer'
    const admin = parse(renderToStaticMarkup(<PlatformAdminShellV02 displayName="Beheer" membershipRole="OWNER" testAccountSwitcher={null}><h1>Dashboard</h1></PlatformAdminShellV02>))
    for (const type of ['CLIENT', 'PROFESSIONAL'] as const) {
      route.pathname = '/dashboard'
      const account = parse(renderToStaticMarkup(<AccountWorkspaceShell model={modelFor(type, 'OWNER')} banner={null}><h1>Dashboard</h1></AccountWorkspaceShell>))
      for (const selector of ['[data-workspace-shell]', 'header', 'header > div', 'aside', 'aside > nav', 'aside > nav > a', 'nav[aria-label^="Binnen"]']) {
        expect(account.querySelector(selector)?.className, selector).toBe(admin.querySelector(selector)?.className)
      }
      expect(account.querySelector('[role="main"]')?.id).toBe('main-content')
    }
  })
  it('behoudt platformrolfiltering voor OWNER, ADMIN en MEMBER', () => {
    route.pathname = '/platformbeheer/auditor'
    for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
      const doc = parse(renderToStaticMarkup(<PlatformAdminShellV02 displayName="Beheer" membershipRole={role} testAccountSwitcher={null}>Audit</PlatformAdminShellV02>))
      expect(Boolean(doc.querySelector('a[href="/platformbeheer/financien"]'))).toBe(role !== 'MEMBER')
      expect(doc.querySelectorAll('button')).toHaveLength(1)
    }
  })
})
