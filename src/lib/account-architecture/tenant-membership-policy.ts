import type { Prisma } from '@/generated/prisma/client'
import { normalTenantOrganizationWhere } from './platform-organization-governance'

export const ADR013_LEGACY_MULTI_MEMBERSHIP_USER_ID = '202fc2db-cb99-489e-a6f0-2ad1e05dcf75'

export class TenantMembershipPolicyError extends Error {
  constructor(message = 'Dit account kan niet aan een tweede organisatie worden gekoppeld.') {
    super(message)
    this.name = 'TenantMembershipPolicyError'
  }
}

type MembershipPolicyClient = Pick<Prisma.TransactionClient, 'organizationMembership'>

export async function assertCanCreateTenantMembership(
  transaction: MembershipPolicyClient,
  userId: string,
  organizationId?: string,
): Promise<void> {
  const existing = await transaction.organizationMembership.findFirst({
    where: {
      userId,
      status: { in: ['INVITED', 'ACTIVE', 'SUSPENDED'] },
      ...(organizationId ? { organizationId: { not: organizationId } } : {}),
      organization: normalTenantOrganizationWhere,
    },
    select: { id: true },
  })
  if (existing) throw new TenantMembershipPolicyError()
}

export function isApprovedLegacyMultiMembership(userId: string): boolean {
  return userId === ADR013_LEGACY_MULTI_MEMBERSHIP_USER_ID
}
