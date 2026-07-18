import type { OrganizationMembershipRole, OrganizationType } from '@/generated/prisma/client'

type HeaderContext = {
  user: { displayName: string | null; email: string }
  activeMembership: {
    role: OrganizationMembershipRole
    organization: {
      id: string
      name: string
      organizationType: OrganizationType
      providerProfile: { id: string } | null
    }
  } | null
}

export type HeaderViewModel = {
  authenticated: boolean
  displayName: string
  activeOrganization: { id: string; name: string; role: OrganizationMembershipRole } | null
  primaryLinks: Array<{ href: string; label: string }>
  menuLinks: Array<{ href: string; label: string }>
}

export function buildHeaderViewModel(context: HeaderContext | null): HeaderViewModel {
  if (!context) {
    return { authenticated: false, displayName: '', activeOrganization: null, primaryLinks: [], menuLinks: [] }
  }

  const organization = context.activeMembership?.organization ?? null
  const supportsClientWork = organization?.organizationType === 'CLIENT' || organization?.organizationType === 'BOTH'
  const supportsProviderWork = Boolean(
    organization?.providerProfile && (organization.organizationType === 'PROVIDER' || organization.organizationType === 'BOTH'),
  )

  return {
    authenticated: true,
    displayName: context.user.displayName?.trim() || 'Gebruiker',
    activeOrganization: context.activeMembership ? {
      id: context.activeMembership.organization.id,
      name: context.activeMembership.organization.name,
      role: context.activeMembership.role,
    } : null,
    primaryLinks: [
      ...(supportsClientWork ? [{ href: '/hulpvragen', label: 'Hulpvragen' }, { href: '/opdrachten', label: 'Opdrachten' }] : []),
      ...(supportsProviderWork ? [{ href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' }] : []),
    ],
    menuLinks: [
      { href: '/account', label: 'Mijn account' },
      { href: organization ? '/organisatie' : '/organisatie/nieuw', label: 'Mijn organisatie' },
      ...(supportsProviderWork ? [{ href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' }] : []),
    ],
  }
}
