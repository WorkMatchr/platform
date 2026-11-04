import { JSDOM } from 'jsdom'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Uitloggen</button> }))
vi.mock('@/app/platformbeheer/test-account-actions', () => ({ startTestImpersonationAction: vi.fn() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/platformbeheer/financien/facturen' }))
import { PlatformAdminShellV02 } from './platform-admin-shell-v02'

describe('compact admin shell', () => {
  it('shows chapters, contextual controls and actual page content', () => {
    const html = renderToStaticMarkup(<PlatformAdminShellV02 displayName="Testbeheerder" membershipRole="ADMIN" testAccountSwitcher={null}><h1>Facturen</h1><table><tbody><tr><td>Testfactuur</td></tr></tbody></table></PlatformAdminShellV02>)
    expect(html).toContain('Beheerhoofdstukken')
    expect(html).toContain('aria-current="location"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('Binnen Financieel')
    expect(html).toContain('Testfactuur')
    expect(html).not.toContain('Vergelijk met v0.1')
    expect(html).not.toContain('href="/platformbeheer/v01"')
    expect(html).toContain('href="/account"')
    expect(html.match(/>Uitloggen</g)).toHaveLength(1)
    expect(html).toContain('lg:grid-cols-[14rem_minmax(0,1fr)]')
    expect(html).not.toContain('Stel uw vraag')
  })
  it('does not expose operational navigation to the auditor', () => {
    const html = renderToStaticMarkup(<PlatformAdminShellV02 displayName="Auditor" membershipRole="MEMBER" testAccountSwitcher={null}>Audit</PlatformAdminShellV02>)
    expect(html).not.toContain('href="/platformbeheer/financien"')
    expect(html).toContain('href="/platformbeheer/auditor"')
    expect(html).not.toContain('Academy / E-learning')
  })
})


it.each(['OWNER', 'ADMIN'] as const)('shows all six unavailable Academy areas for %s without exposing learner or missing routes', role => {
  const document = new JSDOM(renderToStaticMarkup(<PlatformAdminShellV02 displayName="Testbeheerder" membershipRole={role} testAccountSwitcher={null}>Overzicht</PlatformAdminShellV02>)).window.document
  const navigation = document.querySelector('nav[aria-label="Academy / E-learning"]')!
  expect(navigation.querySelector('summary')?.textContent).toBe('Academy / E-learning')
  expect(navigation.querySelector('details')?.hasAttribute('open')).toBe(true)
  expect([...navigation.querySelectorAll('li')].map(item => item.firstElementChild?.textContent)).toEqual([
    'Cursussen', 'Hoofdstukken en lessen', 'Vragenbanken', 'Eindtoetsen', 'Deelnemers en resultaten', 'Certificaten',
  ])
  expect([...navigation.querySelectorAll('li')].every(item => item.textContent?.includes('Nog niet beschikbaar'))).toBe(true)
  expect(navigation.querySelectorAll('a, button, form')).toHaveLength(0)
  expect(document.querySelector('nav[aria-label="Binnen Financieel"] [aria-current="page"]')?.getAttribute('href')).toBe('/platformbeheer/financien/facturen')
})
