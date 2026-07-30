import type { OrganizationMembershipRole, OrganizationType, PlatformRole, UserStatus } from '@/generated/prisma/client'
import { isCentralPlatformAdministrator } from '@/lib/account-architecture/account-management-policy'

type HeaderContext = {
  user: { displayName: string | null; email: string; status?: UserStatus; platformRole?: PlatformRole }
  activeMembership: {
    role: OrganizationMembershipRole
    status?: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REMOVED'
    organization: {
      id: string
      name: string
      organizationType: OrganizationType
      status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED'
      systemKey?: string | null
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
  const isPlatformAdministrator = isCentralPlatformAdministrator({
    status: context.user.status ?? 'INVITED',
    platformRole: context.user.platformRole ?? 'USER',
    platformMembership: context.activeMembership
      ? {
          status: context.activeMembership.status ?? 'INVITED',
          organization: {
            status: context.activeMembership.organization.status ?? 'PENDING',
            organizationType: context.activeMembership.organization.organizationType,
            systemKey: context.activeMembership.organization.systemKey ?? null,
          },
        }
      : null,
  })

  return {
    authenticated: true,
    displayName: context.user.displayName?.trim() || 'Gebruiker',
    activeOrganization: context.activeMembership ? {
      id: context.activeMembership.organization.id,
      name: context.activeMembership.organization.name,
      role: context.activeMembership.role,
    } : null,
    primaryLinks: [
      ...(organization ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
      ...(supportsClientWork
        ? [
            { href: '/hulpvragen', label: 'Hulpvragen' },
            { href: '/adviesdossiers', label: 'Adviesdossiers' },
            { href: '/opdrachten', label: 'Opdrachten' },
          ]
        : []),
      ...(supportsProviderWork
        ? [
            { href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' },
            { href: '/professional/opdrachten', label: 'Aanvragen' },
            { href: '/uitnodigingen', label: 'Uitnodigingen' },
          ]
        : []),
      ...(isPlatformAdministrator ? [{ href: '/platformbeheer', label: 'Platformbeheer' }] : []),
    ],
    menuLinks: [
      { href: '/account', label: 'Mijn account' },
      { href: organization ? '/organisatie' : '/organisatie/nieuw', label: 'Mijn organisatie' },
      ...(supportsClientWork
        ? [{ href: '/adviesdossiers', label: 'Mijn adviesdossiers' }]
        : []),
      ...(supportsProviderWork ? [{ href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' }] : []),
      ...(organization ? [{ href: '/notificaties', label: 'Notificaties' }] : []),
    ],
  }
}
