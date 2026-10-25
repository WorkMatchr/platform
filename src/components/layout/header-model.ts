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
    key: 'work' | 'organization' | 'learning' | 'personal'
    label: 'Werk' | 'Organisatie' | 'E-LEARNINGS' | 'Persoonlijk'
    links: Array<{ href: string; label: string }>
  }>
}

export function buildHeaderViewModel(
  context: HeaderContext | null,
  isPlatformAdministrator = false,
  hasLearningProfile = false,
  learningRuntimeEnabled = false,
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
  const isLearningOnly = learningRuntimeEnabled && context.user.accountType == null && !organization && hasLearningProfile
  const hasLearningAccess = learningRuntimeEnabled && (context.user.accountType != null || hasLearningProfile)
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
          { key: 'work', label: 'Werk', links: [{ href: '/platformbeheer', label: 'Platformbeheer' }] },
          { key: 'personal', label: 'Persoonlijk', links: [{ href: '/account', label: 'Account' }] },
        ]
      : [
          {
            key: 'work',
            label: 'Werk',
            links: [
              ...(organization ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
              ...(supportsClientWork
                ? [
                    { href: '/opdrachten', label: 'Opdrachten' },
                    { href: '/adviesdossiers', label: 'Adviesdossiers' },
                    { href: '/mijn-arbo-wijzers', label: 'Mijn Arbo-wijzers' },
                  ]
                : []),
              ...(supportsProviderWork
                ? [
                    { href: '/professional/opdrachten', label: 'Beschikbare opdrachten' },
                    { href: '/uitnodigingen', label: 'Uitnodigingen' },
                  ]
                : []),
              ...(supportsProfessionalFinance
                ? [
                    { href: '/credits', label: 'Credits & facturen' },
                    { href: '/credits/pro', label: 'WorkMatchr Pro' },
                  ]
                : []),
            ],
          },
          ...(!isLearningOnly ? [{
            key: 'organization',
            label: 'Organisatie',
            links: [
              { href: organization ? '/organisatie' : '/organisatie/nieuw', label: 'Organisatie' },
              ...(organization && (context.activeMembership?.role === 'OWNER' || context.activeMembership?.role === 'ADMIN')
                ? [{ href: '/organisatie/gebruikers', label: 'Medewerkers' }] : []),
              ...(supportsProviderWork
                ? [
                    { href: '/aanbiedersdossier', label: 'Dienstverlenersprofiel' },
                    { href: '/aanbiedersdossier/professionals', label: 'Professionals' },
                    { href: '/aanbiedersdossier/profiel', label: 'Kernexpertises en profiel' },
                  ]
                : []),
            ],
          } as const] : []),
          ...(hasLearningAccess ? [{
            key: 'learning',
            label: 'E-LEARNINGS',
            links: [
              { href: '/e-learnings/mijn', label: 'Mijn e-learnings' },
              { href: '/e-learnings/aanbod', label: 'Opleidingsaanbod' },
            ],
          } as const] : []),
          {
            key: 'personal',
            label: 'Persoonlijk',
            links: [
              { href: '/account', label: 'Account' },
              ...(organization ? [{ href: '/notificaties', label: 'Notificaties' }] : []),
            ],
          },
        ].filter((group) => group.links.length > 0) as HeaderViewModel['navigationGroups'],
  }
}
