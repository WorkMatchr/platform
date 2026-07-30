import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildHeaderViewModel } from './header-model'

const clientContext = {
  user: { displayName: 'Opdrachtgever', email: 'opdrachtgever@example.invalid' },
  activeMembership: {
    role: 'OWNER' as const,
    organization: {
      id: 'client-1',
      name: 'Opdrachtgever BV',
      organizationType: 'CLIENT' as const,
      providerProfile: null,
    },
  },
}

const providerContext = {
  user: { displayName: 'Aanbieder', email: 'aanbieder@example.invalid' },
  activeMembership: {
    role: 'ADMIN' as const,
    organization: {
      id: 'provider-1',
      name: 'Aanbieder BV',
      organizationType: 'PROVIDER' as const,
      providerProfile: { id: 'profile-1' },
    },
  },
}

describe('gedeelde headercontext', () => {
  it('toont de publieke header uitsluitend zonder sessie', () => {
    expect(buildHeaderViewModel(null)).toEqual(expect.objectContaining({ authenticated: false, menuLinks: [] }))
  })

  it('toont een ingelogde opdrachtgever zonder login- of providerlink', () => {
    const model = buildHeaderViewModel(clientContext)
    expect(model.authenticated).toBe(true)
    expect(model.primaryLinks.map((item) => item.label)).toEqual([
      'Dashboard',
      'Hulpvragen',
      'Adviesdossiers',
      'Opdrachten',
    ])
    expect(model.menuLinks.map((item) => item.label)).toEqual([
      'Mijn account',
      'Mijn organisatie',
      'Mijn adviesdossiers',
      'Notificaties',
    ])
    expect(model.menuLinks.some((item) => item.href === '/inloggen')).toBe(false)
  })

  it('kent een ingelogde provider en diens actieve organisatierol', () => {
    const model = buildHeaderViewModel(providerContext)
    expect(model.activeOrganization).toEqual({ id: 'provider-1', name: 'Aanbieder BV', role: 'ADMIN' })
    expect(model.menuLinks).toContainEqual({ href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' })
  })

  it('gebruikt Better Auth voor uitloggen', () => {
    const source = readFileSync(join(process.cwd(), 'src/components/auth/logout-button.tsx'), 'utf8')
    expect(source).toContain('authClient.signOut()')
    expect(source).toContain("window.location.assign('/')")
  })

  it('presenteert uitsluitend de server-side afgeleide organisatie', () => {
    const model = buildHeaderViewModel(providerContext)
    expect(model.activeOrganization?.id).toBe('provider-1')
    expect(model.menuLinks.some((item) => item.href === '/aanbiedersdossier')).toBe(true)
  })

  it('gebruikt bij sessievernieuwing de actuele gebruikersclaims', () => {
    const renewed = buildHeaderViewModel({
      ...providerContext,
      user: { ...providerContext.user, displayName: 'Vernieuwde gebruiker' },
      activeMembership: { ...providerContext.activeMembership, role: 'MEMBER' },
    })
    expect(renewed.displayName).toBe('Vernieuwde gebruiker')
    expect(renewed.activeOrganization?.role).toBe('MEMBER')
  })

  it('leest header en beschermde pagina’s uit dezelfde centrale servercontext', () => {
    const header = readFileSync(join(process.cwd(), 'src/components/layout/header.tsx'), 'utf8')
    const organizations = readFileSync(
      join(process.cwd(), 'src/lib/organizations/organization-authorization.ts'),
      'utf8',
    )
    expect(header).toContain('getOptionalActiveOrganizationContext()')
    expect(organizations).toContain('getCurrentUser()')
    expect(organizations).toContain('organizationMembership.findUnique')
    expect(organizations).not.toContain('ACTIVE_ORGANIZATION_COOKIE')
  })
  it('toont Platformbeheer alleen bij de volledige centrale platformclaim', () => {
    const platformAdministrator = buildHeaderViewModel({
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
    expect(platformAdministrator.primaryLinks).toContainEqual({ href: '/platformbeheer', label: 'Platformbeheer' })
    expect(buildHeaderViewModel(clientContext).primaryLinks.some((item) => item.href === '/platformbeheer')).toBe(false)
  })
})
