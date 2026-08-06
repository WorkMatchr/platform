import { getPrisma } from '@/lib/prisma'
const PLATFORM_ORGANIZATION_SYSTEM_KEY = 'WORKMATCHR_PLATFORM'

export type InvitationActivationView = {
  email: string
  displayName: string
  organizationName: string
}

export async function getInvitationActivationView(
  token: string,
): Promise<InvitationActivationView | null> {
  if (!token || token.length > 256) return null

  const verification = await getPrisma().verification.findFirst({
    where: {
      identifier: `reset-password:${token}`,
      expiresAt: { gt: new Date() },
    },
    select: {
      value: true,
    },
  })
  if (!verification) return null

  const user = await getPrisma().user.findUnique({
    where: { id: verification.value },
    select: {
      email: true,
      displayName: true,
      status: true,
      migrationClassification: true,
      memberships: {
        where: {
          status: 'INVITED',
          organization: { status: 'ACTIVE' },
        },
        select: {
          organizationId: true,
          organization: {
            select: {
              name: true,
              organizationType: true,
              systemKey: true,
            },
          },
        },
      },
      receivedPlatformAdminInvitations: {
        where: {
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        select: { platformOrganizationId: true },
      },
    },
  })
  if (
    !user ||
    user.migrationClassification !== null ||
    user.memberships.length !== 1
  ) {
    return null
  }

  const membership = user.memberships[0]!
  const isNormalTenantInvitation =
    user.status === 'INVITED' &&
    membership.organization.organizationType !== 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === null
  const isPlatformInvitation =
    (user.status === 'INVITED' || user.status === 'ACTIVE') &&
    membership.organization.organizationType === 'PLATFORM_OPERATOR' &&
    membership.organization.systemKey === PLATFORM_ORGANIZATION_SYSTEM_KEY &&
    user.receivedPlatformAdminInvitations.some(
      (invitation) => invitation.platformOrganizationId === membership.organizationId,
    )

  if (!isNormalTenantInvitation && !isPlatformInvitation) {
    return null
  }

  return {
    email: user.email,
    displayName: user.displayName?.trim() || 'Gebruiker',
    organizationName: membership.organization.name,
  }
}
