import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from './account-history-service'
import { normalTenantOrganizationWhere } from './platform-organization-governance'

export async function activateVerifiedInvitation(userId: string): Promise<'ACTIVATED' | 'NOT_APPLICABLE'> {
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`)
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        emailVerified: true,
        migrationClassification: true,
        memberships: {
          where: {
            status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
            organization: { status: 'ACTIVE', ...normalTenantOrganizationWhere },
          },
          select: { id: true, organizationId: true, role: true, status: true },
        },
      },
    })
    if (!user || user.status !== 'INVITED' || !user.emailVerified || user.migrationClassification !== null) {
      return 'NOT_APPLICABLE'
    }
    if (user.memberships.length > 1) return 'NOT_APPLICABLE'

    const membership = user.memberships[0]
    if (membership && membership.status !== 'INVITED') return 'NOT_APPLICABLE'
    await transaction.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } })
    if (!membership) return 'ACTIVATED'

    await transaction.organizationMembership.update({
      where: { id: membership.id },
      data: { status: 'ACTIVE' },
    })
    const correlationId = `invitation-accepted:${membership.id}`
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'INVITATION_ACCEPTED', subjectUserId: userId, actorUserId: userId,
      organizationId: membership.organizationId, membershipId: membership.id,
      reasonCode: 'ORGANIZATION_INVITATION_ACCEPTED', correlationId,
      idempotencyKey: `${correlationId}:account`,
      metadata: { policyVersion: 'ADR013_PHASE2B_INVITATION_V1' },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'INVITATION_ACCEPTED', membershipId: membership.id, userId,
      organizationId: membership.organizationId, actorUserId: userId,
      previousRole: membership.role, newRole: membership.role,
      previousStatus: 'INVITED', newStatus: 'ACTIVE',
      reasonCode: 'ORGANIZATION_INVITATION_ACCEPTED', correlationId,
      idempotencyKey: `${correlationId}:membership`,
      metadata: { policyVersion: 'ADR013_PHASE2B_INVITATION_V1' },
    })
    return 'ACTIVATED'
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}
