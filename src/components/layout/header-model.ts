import type { AccountType, OrganizationMembershipRole, OrganizationType, PlatformRole, UserStatus } from '@/generated/prisma/client'

type HeaderContext = {
  user: { displayName: string | null; email: string; status?: UserStatus; platformRole?: PlatformRole; accountType?: AccountType | null }
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
  isPlatformAdministrator: boolean
  displayName: string
  activeOrganization: { id: string; name: string; role: OrganizationMembershipRole } | null
  navigationGroups: Array<{
    key: 'work' | 'organization' | 'financial' | 'personal'
    label: 'WERK' | 'ORGANISATIE' | 'FINANCIEEL' | 'PERSOONLIJK'
    links: Array<{ href: string; label: string }>
  }>
}

export function buildHeaderViewModel(
  context: HeaderContext | null,
  isPlatformAdministrator = false,
): HeaderViewModel {
  if (!context) {
    return {
      authenticated: false,
      isPlatformAdministrator: false,
      displayName: '',
      activeOrganization: null,
      navigationGroups: [],
    }
  }

  const organization = context.activeMembership?.organization ?? null
  const supportsClientWork = context.user.accountType === 'CLIENT'
  const supportsProviderWork = Boolean(
    context.user.accountType === 'PROFESSIONAL' && organization?.providerProfile &&
      (organization.organizationType === 'PROVIDER' || organization.organizationType === 'BOTH'),
  )
  const supportsProfessionalFinance = supportsProviderWork
  return {
    authenticated: true,
    isPlatformAdministrator,
    displayName: context.user.displayName?.trim() || 'Gebruiker',
    activeOrganization:
      !isPlatformAdministrator && context.activeMembership
        ? {
            id: context.activeMembership.organization.id,
            name: context.activeMembership.organization.name,
            role: context.activeMembership.role,
          }
        : null,
    navigationGroups: isPlatformAdministrator
      ? [
          { key: 'work', label: 'WERK', links: [{ href: '/platformbeheer', label: 'Platformbeheer' }] },
          { key: 'personal', label: 'PERSOONLIJK', links: [{ href: '/account', label: 'Account' }] },
        ]
      : [
          {
            key: 'work',
            label: 'WERK',
            links: [
              ...(organization ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
              ...(supportsClientWork
                ? [
                    { href: '/hulpvragen', label: 'Opdrachten' },
                    { href: '/opdrachten', label: 'Gepubliceerde opdrachten' },
                    { href: '/adviesdossiers', label: 'Adviesdossiers' },
                  ]
                : []),
              ...(supportsProviderWork
                ? [
                    { href: '/professional/opdrachten', label: 'Aanvragen' },
                    { href: '/uitnodigingen', label: 'Uitnodigingen' },
                  ]
                : []),
            ],
          },
          {
            key: 'organization',
            label: 'ORGANISATIE',
            links: [
              { href: organization ? '/organisatie' : '/organisatie/nieuw', label: 'Organisatie' },
              ...(supportsProviderWork
                ? [
                    { href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' },
                    { href: '/aanbiedersdossier/professionals', label: 'Professionals' },
                  ]
                : []),
            ],
          },
          ...(supportsProfessionalFinance
            ? [{
                key: 'financial' as const,
                label: 'FINANCIEEL' as const,
                links: [
                  { href: '/credits', label: 'Credits & facturen' },
                  { href: '/credits/pro', label: 'WorkMatchr Pro' },
                ],
              }]
            : []),
          {
            key: 'personal',
            label: 'PERSOONLIJK',
            links: [
              { href: '/account', label: 'Account' },
              ...(organization ? [{ href: '/notificaties', label: 'Notificaties' }] : []),
            ],
          },
        ].filter((group) => group.links.length > 0) as HeaderViewModel['navigationGroups'],
  }
}
