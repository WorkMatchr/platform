import 'server-only'

import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export type ArboGuidePageAccess =
  | Readonly<{ status: 'ANONYMOUS'; loginHref: string }>
  | Readonly<{ status: 'ORGANIZATION_REQUIRED'; organizationHref: '/organisatie/nieuw' }>
  | Readonly<{
      status: 'AUTHORIZED'
      userId: string
      organizationId: string
      organizationName: string
    }>

export async function getArboGuidePageAccess(returnTo: string): Promise<ArboGuidePageAccess> {
  const safeReturnTo = getSafeReturnUrl(returnTo, '/wijzers')
  const context = await getOptionalActiveOrganizationContext()
  if (!context) {
    return { status: 'ANONYMOUS', loginHref: `/inloggen?returnTo=${encodeURIComponent(safeReturnTo)}` }
  }
  if (!context.activeMembership) {
    return { status: 'ORGANIZATION_REQUIRED', organizationHref: '/organisatie/nieuw' }
  }
  return {
    status: 'AUTHORIZED',
    userId: context.user.id,
    organizationId: context.activeMembership.organization.id,
    organizationName: context.activeMembership.organization.name,
  }
}

export async function getArboGuideApiAccess() {
  const context = await getOptionalActiveOrganizationContext()
  if (!context) return { authorized: false as const, status: 401 as const }
  if (!context.activeMembership) return { authorized: false as const, status: 403 as const }
  return {
    authorized: true as const,
    userId: context.user.id,
    organizationId: context.activeMembership.organization.id,
    organizationName: context.activeMembership.organization.name,
  }
}
