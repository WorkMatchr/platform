import 'server-only'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import { hasPlatformAdministratorIdentity } from './platform-admin-policy'

export class PlatformAdminAccessError extends Error {
  constructor() {
    super('Platformbeheer is niet beschikbaar.')
    this.name = 'PlatformAdminAccessError'
  }
}

export async function getPlatformAdministratorContext(userId: string) {
  const now = new Date()
  const administrator = await getPrisma().user.findFirst({
    where: {
      id: userId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: {
        some: {
          status: 'ACTIVE',
          organization: {
            status: 'ACTIVE',
            organizationType: 'PLATFORM_OPERATOR',
            systemKey: 'WORKMATCHR_PLATFORM',
          },
        },
      },
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      providerPermissionSubjects: {
        where: {
          validFrom: { lte: now },
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          revocation: null,
        },
        select: { permission: true },
      },
      memberships: {
        where: {
          status: 'ACTIVE',
          organization: { systemKey: 'WORKMATCHR_PLATFORM' },
        },
        select: {
          id: true,
          role: true,
          organization: { select: { id: true, name: true, systemKey: true } },
        },
        take: 1,
      },
    },
  })

  if (!hasPlatformAdministratorIdentity(administrator)) throw new PlatformAdminAccessError()
  return {
    id: administrator.id,
    displayName: administrator.displayName,
    email: administrator.email,
    platformMembership: administrator.memberships[0],
    permissions: administrator.providerPermissionSubjects.map((grant) => grant.permission),
  }
}

export async function requirePlatformAdministrator(returnTo = '/platformbeheer') {
  const user = await requireUser(returnTo)
  try {
    return await getPlatformAdministratorContext(user.id)
  } catch (error) {
    if (error instanceof PlatformAdminAccessError) redirect('/account')
    throw error
  }
}
