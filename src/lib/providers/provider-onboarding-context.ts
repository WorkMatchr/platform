import 'server-only'

import { redirect } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export async function requireProviderDossierContext(returnTo = '/aanbiedersdossier') {
  const context = await requireOrganizationMembership(undefined, returnTo)
  const organization = context.activeMembership.organization
  if (!['PROVIDER', 'BOTH'].includes(organization.organizationType)) {
    redirect('/organisatie?toegang=geen-aanbieder')
  }
  if (!organization.providerProfile) redirect('/organisatie?toegang=providerprofiel-ontbreekt')
  return {
    user: context.user,
    membership: context.activeMembership,
    organization,
    providerProfileId: organization.providerProfile.id,
    canManage: ['OWNER', 'ADMIN'].includes(context.activeMembership.role),
  }
}
