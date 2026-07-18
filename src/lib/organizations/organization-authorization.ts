import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { OrganizationMembershipRole } from '@/generated/prisma/client'
import { getCurrentUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import { getSafeReturnUrl } from '@/lib/safe-redirect'
import { canManageOrganization, canUseMembership, canViewOrganization, selectActiveMembership } from './organization-policy'
import { normalTenantOrganizationWhere } from '@/lib/account-architecture/platform-organization-governance'

export const ACTIVE_ORGANIZATION_COOKIE = 'workmatchr.activeOrganization'

const membershipSelect = {
  id: true,
  role: true,
  status: true,
  organization: {
    include: {
      locations: { where: { archivedAt: null }, orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }] },
      sectors: { include: { sector: true }, orderBy: { createdAt: 'asc' as const } },
      providerProfile: true,
    },
  },
}

export const getOptionalActiveOrganizationContext = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null
  const memberships = await getPrisma().organizationMembership.findMany({
    where: {
      userId: user.id,
      status: 'ACTIVE',
      organization: { status: { not: 'ARCHIVED' }, ...normalTenantOrganizationWhere },
    },
    select: membershipSelect,
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) return { user, memberships, activeMembership: null }

  const selectedId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value
  const activeMembership = selectActiveMembership(memberships, selectedId)

  return { user, memberships, activeMembership }
})

export async function getActiveOrganizationContext(returnTo = '/account') {
  const context = await getOptionalActiveOrganizationContext()
  if (!context) redirect(`/inloggen?returnTo=${encodeURIComponent(getSafeReturnUrl(returnTo))}`)
  return context
}

export async function requireOrganizationMembership(organizationId?: string, returnTo = '/account') {
  const context = await getActiveOrganizationContext(returnTo)
  const membership = organizationId
    ? context.memberships.find((candidate) => candidate.organization.id === organizationId)
    : context.activeMembership

  if (!membership || !canUseMembership(membership.status) || !canViewOrganization(membership.organization.status)) {
    redirect('/organisatie/nieuw')
  }

  return { ...context, activeMembership: membership }
}

export async function requireOrganizationRole(roles: readonly OrganizationMembershipRole[], organizationId?: string) {
  const context = await requireOrganizationMembership(organizationId)
  if (!roles.includes(context.activeMembership.role)) redirect('/organisatie?toegang=alleen-lezen')
  return context
}

export async function requireManageableOrganization(organizationId?: string) {
  const context = await requireOrganizationMembership(organizationId)
  const { role, status } = context.activeMembership
  if (!canManageOrganization(role, status, context.activeMembership.organization.status)) {
    redirect('/organisatie?toegang=alleen-lezen')
  }
  return context
}
