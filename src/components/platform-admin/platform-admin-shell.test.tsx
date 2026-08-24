import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Uitloggen</button>,
}))

vi.mock('@/app/platformbeheer/test-account-actions', () => ({
  startTestImpersonationAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/platformbeheer',
}))

import { PlatformAdminShell } from './platform-admin-shell'

describe('platformbeheershell', () => {
  it('toont compacte beheerchrome zonder opdrachtgeveracties', () => {
    const html = renderToStaticMarkup(
      <PlatformAdminShell
        displayName="Platformbeheerder"
        membershipRole="ADMIN"
        testAccountSwitcher={{
          accounts: [],
          unavailableReason: null,
        }}
      >
        <div>Beheerdashboard</div>
      </PlatformAdminShell>,
    )

    expect(html).toContain('WorkMatchr')
    expect(html).toContain('Platformbeheer')
    expect(html).toContain('Account')
    expect(html).toContain('Uitloggen')
    expect(html).toContain('Privacy')
    expect(html).toContain('Beveiliging')
    expect(html).toContain('Testen als')
    expect(html).toContain('open=""')
    expect(html).toContain('Dagelijks beheer')
    expect(html).toContain('Financieel')
    expect(html).not.toContain('>Gebruikers<')
    expect(html).not.toContain('Stel uw vraag')
    expect(html).not.toContain('Maak Uw organisatie aan')
    expect(html).not.toContain('Er is nog geen actieve organisatie')
  })

  it('geeft navigatie en inhoud op desktop onafhankelijke scrollgebieden', () => {
    const html = renderToStaticMarkup(
      <PlatformAdminShell displayName="Platformbeheerder" membershipRole="ADMIN" testAccountSwitcher={null}>
        <div>Lange beheerinhoud</div>
      </PlatformAdminShell>,
    )

    expect(html).toContain('lg:h-full')
    expect(html).toContain('lg:overflow-hidden')
    expect(html.match(/lg:overflow-y-auto/g)).toHaveLength(2)
    expect(html).toContain('lg:grid-cols-[15rem_minmax(0,1fr)]')
    expect(html).toContain('lg:self-stretch')
  })

  it('toont een auditor uitsluitend de beperkte auditnavigatie', () => {
    const html = renderToStaticMarkup(
      <PlatformAdminShell displayName="Platformauditor" membershipRole="MEMBER" testAccountSwitcher={null}>
        <div>Audit</div>
      </PlatformAdminShell>,
    )

    expect(html).toContain('Audit')
    expect(html).not.toContain('Organisaties')
    expect(html).not.toContain('Gebruikers')
    expect(html).not.toContain('Financieel')
    expect(html).not.toContain('Kennisbeheer')
  })
})
