import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isProviderNavigationItemCurrent, type ProviderNavigationItem } from './provider-dossier-navigation'

const servicesGroup: ProviderNavigationItem = {
  label: 'Diensten en ervaring',
  href: '/aanbiedersdossier/diensten-en-ervaring',
  matchPaths: [
    '/aanbiedersdossier/diensten-en-ervaring',
    '/aanbiedersdossier/diensten',
    '/aanbiedersdossier/sectorervaring',
  ],
  status: 'Actie nodig',
}

describe('dienstverlenersprofiel-navigatiecontext', () => {
  it('houdt Diensten en ervaring actief op Sectorervaring', () => {
    expect(isProviderNavigationItemCurrent(servicesGroup, '/aanbiedersdossier/sectorervaring')).toBe(true)
  })

  it('houdt Diensten en ervaring actief op Diensten en specialismen', () => {
    expect(isProviderNavigationItemCurrent(servicesGroup, '/aanbiedersdossier/diensten')).toBe(true)
  })

  it('activeert Diensten en ervaring op de overzichtspagina', () => {
    expect(isProviderNavigationItemCurrent(servicesGroup, '/aanbiedersdossier/diensten-en-ervaring')).toBe(true)
  })

  it('activeert een hoofdgroep niet voor een route uit een andere groep', () => {
    expect(isProviderNavigationItemCurrent(servicesGroup, '/aanbiedersdossier/werkgebied')).toBe(false)
  })

  it('ondersteunt geneste professionalroutes binnen dezelfde hoofdgroep', () => {
    const professionals: ProviderNavigationItem = {
      label: 'Professionals en kwalificaties',
      href: '/aanbiedersdossier/professionals',
      matchPaths: ['/aanbiedersdossier/professionals'],
      status: 'Actie nodig',
    }
    expect(
      isProviderNavigationItemCurrent(
        professionals,
        '/aanbiedersdossier/professionals/professional-1/kwalificaties',
      ),
    ).toBe(true)
  })

  it('gebruikt op mobiel hetzelfde sluitbare disclosure-menu als de header', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/providers/provider-dossier-navigation.tsx'), 'utf8')
    expect(source).toContain('<DisclosureMenu')
    expect(source).not.toContain('<details')
    expect(source).toContain('Mobiele onderdelen dienstverlenersprofiel')
    expect(source).not.toMatch(/Aanbiedersdossier|Providerdossier|Mijn providerdossier/)
  })
})
