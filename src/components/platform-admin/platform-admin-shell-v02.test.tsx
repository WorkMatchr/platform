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
    expect(html).toContain('Vergelijk met v0.1')
    expect(html).toContain('lg:grid-cols-[14rem_minmax(0,1fr)]')
    expect(html).not.toContain('Stel uw vraag')
  })
  it('does not expose operational navigation to the auditor', () => {
    const html = renderToStaticMarkup(<PlatformAdminShellV02 displayName="Auditor" membershipRole="MEMBER" testAccountSwitcher={null}>Audit</PlatformAdminShellV02>)
    expect(html).not.toContain('href="/platformbeheer/financien"')
    expect(html).toContain('href="/platformbeheer/auditor"')
  })
})
