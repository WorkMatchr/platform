import type { Prisma } from '@/generated/prisma/client'

// Written by the server in the same transaction as the new organization or invited account.
export const organizationOnboarding = 'PROVIDER_ORGANIZATION_V1'
export const professionalOnboarding = 'PROVIDER_PROFESSIONAL_V1'

export function onboardingEventWhere(userId?: string): Prisma.AccountProvisioningEventWhereInput {
  const organization = { reasonCode: 'ORGANIZATION_ONBOARDING_OWNER_LINKED',
    metadata: { path: ['marketplaceOnboarding'], equals: organizationOnboarding } }
  const conditions: Prisma.AccountProvisioningEventWhereInput[] = [organization]
  if (userId) conditions.push({ subjectUserId: userId, reasonCode: 'ORGANIZATION_INVITATION_LINKED',
    metadata: { path: ['marketplaceOnboarding'], equals: professionalOnboarding } })
  return { eventType: 'ORGANIZATION_LINKED', OR: conditions }
}
