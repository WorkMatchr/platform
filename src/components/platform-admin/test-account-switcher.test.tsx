import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/platformbeheer/test-account-actions', () => ({
  startTestImpersonationAction: vi.fn(),
}))

import { TestAccountSwitcher } from './test-account-switcher'

const accounts = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    displayName: 'Testeigenaar',
    email: 'eigenaar@test-wm.example.invalid',
    organizationName: 'TEST-WM-Delta Veiligheidsadvies',
    organizationType: 'PROVIDER' as const,
    organizationRole: 'OWNER' as const,
    platformRole: 'USER' as const,
    accountStatus: 'ACTIVE' as const,
    destination: '/professional/opdrachten',
  },
]

describe('testaccountwisselaarinterface', () => {
  it('toont een gelabelde accountkeuze en geen wachtwoordveld', () => {
    const html = renderToStaticMarkup(
      <TestAccountSwitcher accounts={accounts} unavailableReason={null} />,
    )
    expect(html).toContain('Testen als')
    expect(html).toContain('Kies een testaccount')
    expect(html).toContain('TEST-WM-Delta Veiligheidsadvies')
    expect(html).not.toContain('type="password"')
  })

  it('toont een beperkte developmentmelding wanneer de feature is uitgeschakeld', () => {
    const html = renderToStaticMarkup(
      <TestAccountSwitcher
        accounts={null}
        unavailableReason="Testaccountwisselaar niet beschikbaar: feature flag uitgeschakeld."
      />,
    )

    expect(html).toContain('Testen als')
    expect(html).toContain('feature flag uitgeschakeld')
    expect(html).not.toContain('Kies een testaccount')
  })

  it('vraagt expliciet om bevestiging vóór de wisseling', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/platform-admin/test-account-switcher.tsx'),
      'utf8',
    )
    expect(source).toContain('window.confirm')
    expect(source).toContain('rechten van dit account')
    expect(source).toContain('als testhandeling gelogd')
    expect(source).toContain('Wilt u doorgaan?')
  })
})
