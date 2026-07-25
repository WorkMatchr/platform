import { getPrisma } from '@/lib/prisma'
import { normalTenantOrganizationWhere } from './platform-organization-governance'

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
          organization: { status: 'ACTIVE', ...normalTenantOrganizationWhere },
        },
        select: {
          organization: { select: { name: true } },
        },
      },
    },
  })
  if (
    !user ||
    user.status !== 'INVITED' ||
    user.migrationClassification !== null ||
    user.memberships.length !== 1
  ) {
    return null
  }

  return {
    email: user.email,
    displayName: user.displayName?.trim() || 'Gebruiker',
    organizationName: user.memberships[0]!.organization.name,
  }
}
