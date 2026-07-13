import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { OrganizationMembershipRole } from '@/generated/prisma/client'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'
import { canManageOrganization, canUseMembership, canViewOrganization, selectActiveMembership } from './organization-policy'

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

export async function getActiveOrganizationContext() {
  const user = await requireUser()
  const memberships = await getPrisma().organizationMembership.findMany({
    where: { userId: user.id, status: 'ACTIVE', organization: { status: { not: 'ARCHIVED' } } },
    select: membershipSelect,
    orderBy: { createdAt: 'asc' },
  })

  if (memberships.length === 0) return { user, memberships, activeMembership: null }

  const selectedId = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value
  const activeMembership = selectActiveMembership(memberships, selectedId)

  return { user, memberships, activeMembership }
}

export async function requireOrganizationMembership(organizationId?: string) {
  const context = await getActiveOrganizationContext()
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
