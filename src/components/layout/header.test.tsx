import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
}))

vi.mock('@/lib/organizations/organization-authorization', () => ({
  getOptionalActiveOrganizationContext: mocks.getContext,
}))

vi.mock('@/components/auth/logout-button', () => ({
  LogoutButton: () => <button type="button">Uitloggen</button>,
}))

import { Header } from './header'

async function renderHeader() {
  return renderToStaticMarkup(await Header())
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('headerweergave per sessiecontext', () => {
  it('toont de publieke header met een loginactie zonder sessie', async () => {
    mocks.getContext.mockResolvedValue(null)

    const html = await renderHeader()

    expect(html).toContain('Inloggen')
    expect(html).toContain('Diensten')
    expect(html).toContain('Wettelijke verplichtingen')
    expect(html).toContain('Sectoren')
    expect(html).toContain('Kenniscentrum')
    expect(html).toContain('Over WorkMatchr')
    expect(html).toContain('Contact')
    expect(html).toContain('Stel uw vraag')
    expect(html).not.toContain('Mijn account')
  })

  it('toont voor een opdrachtgever publieke navigatie en het accountmenu', async () => {
    mocks.getContext.mockResolvedValue({
      user: { displayName: 'Opdrachtgever', email: 'opdrachtgever@example.invalid' },
      activeMembership: {
        role: 'OWNER',
        organization: {
          id: 'client-1',
          name: 'Opdrachtgever BV',
          organizationType: 'CLIENT',
          providerProfile: null,
        },
      },
    })

    const html = await renderHeader()

    expect(html).not.toContain('Inloggen')
    expect(html).toContain('Diensten')
    expect(html).toContain('Wettelijke verplichtingen')
    expect(html).toContain('Sectoren')
    expect(html).toContain('Kenniscentrum')
    expect(html).toContain('Over WorkMatchr')
    expect(html).toContain('Contact')
    expect(html).toContain('Stel uw vraag')
    expect(html).toContain('Mijn account')
    expect(html).toContain('Mijn organisatie')
    expect(html).toContain('Eigenaar')
    expect(html).not.toContain('Dienstverlenersprofiel')
  })

  it('toont voor een provider de actieve organisatie en het dienstverlenersprofiel', async () => {
    mocks.getContext.mockResolvedValue({
      user: { displayName: 'Aanbieder', email: 'aanbieder@example.invalid' },
      activeMembership: {
        role: 'ADMIN',
        organization: {
          id: 'provider-1',
          name: 'Aanbieder BV',
          organizationType: 'PROVIDER',
          providerProfile: { id: 'profile-1' },
        },
      },
    })

    const html = await renderHeader()

    expect(html).not.toContain('Inloggen')
    expect(html).toContain('Aanbieder BV')
    expect(html).toContain('Beheerder')
    expect(html).toContain('Diensten')
    expect(html).toContain('Kenniscentrum')
    expect(html).toContain('Contact')
    expect(html).toContain('Dienstverlenersprofiel')
    expect(html).not.toMatch(/Aanbiedersdossier|Providerdossier|Mijn providerdossier/)
    expect(html).toContain('Uitloggen')
  })

  it('toont voor een platformbeheerder publieke navigatie en de beheeractie', async () => {
    mocks.getContext.mockResolvedValue({
      user: {
        displayName: 'Platformbeheerder',
        email: 'platformbeheerder@example.invalid',
        status: 'ACTIVE',
        platformRole: 'ADMIN',
      },
      activeMembership: {
        role: 'ADMIN',
        status: 'ACTIVE',
        organization: {
          id: 'platform-1',
          name: 'WorkMatchr Platform',
          organizationType: 'PLATFORM_OPERATOR',
          status: 'ACTIVE',
          systemKey: 'WORKMATCHR_PLATFORM',
          providerProfile: null,
        },
      },
    })

    const html = await renderHeader()

    expect(html).not.toContain('Inloggen')
    expect(html).toContain('Diensten')
    expect(html).toContain('Wettelijke verplichtingen')
    expect(html).toContain('Sectoren')
    expect(html).toContain('Kenniscentrum')
    expect(html).toContain('Over WorkMatchr')
    expect(html).toContain('Contact')
    expect(html).toContain('Platformbeheer')
    expect(html).toContain('Mijn account')
  })

  it('houdt publieke en accountacties bereikbaar in de mobiele header', async () => {
    mocks.getContext.mockResolvedValue({
      user: {
        displayName: 'Opdrachtgever',
        email: 'opdrachtgever@example.invalid',
      },
      activeMembership: {
        role: 'OWNER',
        organization: {
          id: 'client-1',
          name: 'Opdrachtgever BV',
          organizationType: 'CLIENT',
          providerProfile: null,
        },
      },
    })

    const html = await renderHeader()

    expect(html).toContain('Mobiele hoofdnavigatie')
    expect(html).toContain('Hoofdnavigatie openen of sluiten')
    expect(html).toContain('Gebruikersmenu openen of sluiten')
    expect(html).toContain('Mijn account')
    expect(html).toContain('Dashboard')
  })

  it('gebruikt voor publieke en ingelogde menu\u2019s hetzelfde sluitbare interactiepatroon', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/layout/header.tsx'), 'utf8')
    const publicNavigation = readFileSync(join(process.cwd(), 'src/components/layout/public-navigation.tsx'), 'utf8')
    const logout = readFileSync(join(process.cwd(), 'src/components/auth/logout-button.tsx'), 'utf8')
    expect(source.match(/<DisclosureMenu/g)).toHaveLength(1)
    expect(publicNavigation.match(/<DisclosureMenu/g)).toHaveLength(1)
    expect(source).not.toContain('<details')
    expect(publicNavigation).not.toContain('<details')
    expect(logout).toContain("window.location.assign('/')")
  })
})
