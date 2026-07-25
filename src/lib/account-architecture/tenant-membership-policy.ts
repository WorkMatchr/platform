import type { Prisma } from '@/generated/prisma/client'

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
      ...(organizationId ? { organizationId: { not: organizationId } } : {}),
    },
    select: { id: true },
  })
  if (existing) throw new TenantMembershipPolicyError()
}
