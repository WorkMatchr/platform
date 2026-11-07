import 'server-only'
import { redirect } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { blockedOnboardingProfiles } from './provider-marketplace-onboarding'

export async function requireMarketplacePageMembership(organizationId?: string, returnTo?: string) {
  const context = await requireOrganizationMembership(organizationId, returnTo)
  const organization = context.activeMembership.organization
  if (context.user.accountType === 'PROFESSIONAL' && organization.providerProfile) {
    const candidate = { providerProfileId: organization.providerProfile.id, organizationId: organization.id }
    const blocked = await getPrisma().$transaction(tx => blockedOnboardingProfiles(tx, [candidate], new Date(), context.user.id))
    if (blocked.size) redirect('/aanbiedersdossier?toegang=profiel')
  }
  return context
}
