import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getPlatformAdministratorContext } from './platform-admin-authorization'

export class PlatformOrganizationLifecycleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlatformOrganizationLifecycleError'
  }
}

export async function setPlatformOrganizationBlocked(input: {
  actorUserId: string
  organizationId: string
  blocked: boolean
  reason: string
}) {
  await getPlatformAdministratorContext(input.actorUserId)
  const reason = input.reason.trim()
  if (reason.length < 5 || reason.length > 500) throw new PlatformOrganizationLifecycleError('Geef een duidelijke reden van 5 tot 500 tekens.')
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${input.organizationId}::uuid FOR UPDATE`)
    const organization = await transaction.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, status: true, systemKey: true },
    })
    if (!organization || organization.systemKey) throw new PlatformOrganizationLifecycleError('Deze organisatie kan niet via platformbeheer worden gewijzigd.')
    const targetStatus = input.blocked ? 'SUSPENDED' : 'ACTIVE'
    if (organization.status === targetStatus) return { outcome: 'UNCHANGED' as const }
    if (input.blocked && organization.status !== 'ACTIVE') throw new PlatformOrganizationLifecycleError('Alleen een actieve organisatie kan worden geblokkeerd.')
    if (!input.blocked && organization.status !== 'SUSPENDED') throw new PlatformOrganizationLifecycleError('Alleen een geblokkeerde organisatie kan worden gedeblokkeerd.')
    await transaction.organization.update({ where: { id: organization.id }, data: { status: targetStatus } })
    await transaction.adminActionLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.blocked ? 'ORGANIZATION_BLOCKED' : 'ORGANIZATION_UNBLOCKED',
        entityType: 'Organization',
        entityId: organization.id,
        reason,
        metadata: { previousStatus: organization.status, nextStatus: targetStatus, policyVersion: 'PLATFORM_ADMIN_V1' },
      },
    })
    return { outcome: input.blocked ? 'BLOCKED' as const : 'UNBLOCKED' as const }
  }, { isolationLevel: 'Serializable' })
}
