import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildAccountViewModel } from './account-view-model'

type AccountContext = Parameters<typeof buildAccountViewModel>[0]
type Membership = AccountContext['memberships'][number]

function membership(
  id: string,
  name: string,
  role: Membership['role'],
  organizationType: Membership['organization']['organizationType'] = 'CLIENT',
): Membership {
  return {
    role,
    organization: { id, name, organizationType, status: 'ACTIVE' },
  }
}

function context(memberships: Membership[], activeMembership: Membership | null): AccountContext {
  return {
    user: {
      displayName: 'Testgebruiker',
      email: 'account@example.invalid',
      emailVerified: true,
      platformRole: 'USER',
      status: 'ACTIVE',
    },
    memberships,
    activeMembership,
  }
}

describe('accountweergave van platform- en organisatierollen', () => {
  it('toont bij één organisatie de platformrol en volledige organisatiecontext', () => {
    const active = membership('organization-1', 'Veilig Werk BV', 'OWNER')

    const model = buildAccountViewModel(context([active], active))

    expect(model.platformRoleLabel).toBe('Gebruiker')
    expect(model.organizationCount).toBe(1)
    expect(model.activeOrganization).toEqual({
      id: 'organization-1',
      name: 'Veilig Werk BV',
      roleLabel: 'Eigenaar',
      typeLabel: 'Opdrachtgever',
      statusLabel: 'Actief',
    })
  })

  it('maakt bij meerdere organisaties de actieve organisatie expliciet', () => {
    const first = membership('organization-1', 'Eerste BV', 'OWNER')
    const second = membership('organization-2', 'Tweede BV', 'MEMBER', 'PROVIDER')

    const model = buildAccountViewModel(context([first, second], second))

    expect(model.organizationCount).toBe(2)
    expect(model.activeOrganization?.name).toBe('Tweede BV')
    expect(model.organizations).toEqual([
      { id: 'organization-1', name: 'Eerste BV' },
      { id: 'organization-2', name: 'Tweede BV' },
    ])
  })

  it('presenteert OWNER als Eigenaar naast de afzonderlijke platformrol', () => {
    const active = membership('organization-1', 'Eigenaar BV', 'OWNER')

    const model = buildAccountViewModel(context([active], active))

    expect(model.platformRoleLabel).toBe('Gebruiker')
    expect(model.activeOrganization?.roleLabel).toBe('Eigenaar')
  })

  it('presenteert ADMIN als Beheerder naast de afzonderlijke platformrol', () => {
    const active = membership('organization-1', 'Beheer BV', 'ADMIN')

    const model = buildAccountViewModel(context([active], active))

    expect(model.platformRoleLabel).toBe('Gebruiker')
    expect(model.activeOrganization?.roleLabel).toBe('Beheerder')
  })

  it('presenteert MEMBER als Lid naast de afzonderlijke platformrol', () => {
    const active = membership('organization-1', 'Leden BV', 'MEMBER')

    const model = buildAccountViewModel(context([active], active))

    expect(model.platformRoleLabel).toBe('Gebruiker')
    expect(model.activeOrganization?.roleLabel).toBe('Lid')
  })

  it('ververst alle organisatiegegevens na wisselen van actieve organisatie', () => {
    const first = membership('organization-1', 'Opdrachtgever BV', 'OWNER')
    const second = membership('organization-2', 'Provider BV', 'ADMIN', 'PROVIDER')

    const before = buildAccountViewModel(context([first, second], first))
    const after = buildAccountViewModel(context([first, second], second))

    expect(before.activeOrganization).toEqual(
      expect.objectContaining({ id: 'organization-1', roleLabel: 'Eigenaar', typeLabel: 'Opdrachtgever' }),
    )
    expect(after.activeOrganization).toEqual(
      expect.objectContaining({ id: 'organization-2', roleLabel: 'Beheerder', typeLabel: 'Aanbieder' }),
    )
  })

  it('behoudt een lang e-mailadres en gebruikt een responsief afbreekcontract', () => {
    const active = membership('organization-1', 'Veilig Werk BV', 'OWNER')
    const longEmail = 'zeer.lang.accountadres.voor.toegankelijkheid.en.zoomcontrole@example.invalid'
    const value = context([active], active)
    value.user.email = longEmail

    const model = buildAccountViewModel(value)
    const pageSource = readFileSync(join(process.cwd(), 'src/app/account/page.tsx'), 'utf8')

    expect(model.email).toBe(longEmail)
    expect(pageSource).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]')
    expect(pageSource).toContain('[overflow-wrap:anywhere]')
  })
})
