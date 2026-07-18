import type {
  OrganizationMembershipRole,
  OrganizationStatus,
  OrganizationType,
  PlatformRole,
} from '@/generated/prisma/client'

type AccountContext = {
  user: {
    displayName: string | null
    email: string
    emailVerified: boolean
    platformRole: PlatformRole
    status: string
  }
  memberships: Array<{
    role: OrganizationMembershipRole
    organization: {
      id: string
      name: string
      organizationType: OrganizationType
      status: OrganizationStatus
    }
  }>
  activeMembership: {
    role: OrganizationMembershipRole
    organization: {
      id: string
      name: string
      organizationType: OrganizationType
      status: OrganizationStatus
    }
  } | null
}

const platformRoleLabels = { USER: 'Gebruiker', ADMIN: 'Platformbeheerder' } as const
const organizationRoleLabels = { OWNER: 'Eigenaar', ADMIN: 'Beheerder', MEMBER: 'Lid' } as const
const organizationTypeLabels = {
  CLIENT: 'Opdrachtgever',
  PROVIDER: 'Aanbieder',
  BOTH: 'Opdrachtgever en aanbieder',
  PLATFORM_OPERATOR: 'Platformorganisatie',
} as const
const organizationStatusLabels = {
  PENDING: 'In afwachting',
  ACTIVE: 'Actief',
  SUSPENDED: 'Geschorst',
  ARCHIVED: 'Gearchiveerd',
} as const

export type AccountViewModel = ReturnType<typeof buildAccountViewModel>

export function buildAccountViewModel(context: AccountContext) {
  const activeMembership = context.activeMembership

  return {
    title: `Welkom, ${context.user.displayName?.trim() || 'gebruiker'}`,
    email: context.user.email,
    emailVerificationLabel: context.user.emailVerified ? 'Bevestigd' : 'Niet bevestigd',
    platformRoleLabel: platformRoleLabels[context.user.platformRole],
    accountStatusLabel: context.user.status === 'ACTIVE' ? 'Actief' : 'Niet actief',
    organizationCount: context.memberships.length,
    activeOrganization: activeMembership
      ? {
          id: activeMembership.organization.id,
          name: activeMembership.organization.name,
          roleLabel: organizationRoleLabels[activeMembership.role],
          typeLabel: organizationTypeLabels[activeMembership.organization.organizationType],
          statusLabel: organizationStatusLabels[activeMembership.organization.status],
        }
      : null,
    organizations: context.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
    })),
  }
}
