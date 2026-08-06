import 'server-only'

import { redirect } from 'next/navigation'
import { isCentralPlatformAdministrator } from '@/lib/account-architecture/account-management-policy'
import { getCurrentUser } from '@/lib/authorization'
import {
  getOptionalActiveOrganizationContext,
  requireOrganizationMembership,
} from '@/lib/organizations/organization-authorization'
import type { AdviceDossierViewer } from './advice-dossier-service'

export async function getAdviceDossierViewer(
  returnTo: string,
): Promise<AdviceDossierViewer> {
  const viewer = await getOptionalAdviceDossierViewer()
  if (!viewer) {
    redirect(
      `/inloggen?returnTo=${encodeURIComponent(returnTo)}`,
    )
  }
  return viewer
}

export async function getOptionalAdviceDossierViewer(): Promise<AdviceDossierViewer | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const context = await getOptionalActiveOrganizationContext()
  const membership = context?.activeMembership ?? null
  const isPlatformAdministrator = isCentralPlatformAdministrator({
    status: user.status,
    platformRole: user.platformRole,
    platformMembership: membership
      ? {
          status: membership.status,
          organization: {
            status: membership.organization.status,
            organizationType: membership.organization.organizationType,
            systemKey: membership.organization.systemKey,
          },
        }
      : null,
  })

  return {
    userId: user.id,
    organizationId:
      membership &&
      user.accountType === 'CLIENT' &&
      membership.organization.organizationType === 'CLIENT'
        ? membership.organization.id
        : null,
    organizationRole: membership?.role ?? null,
    isPlatformAdministrator,
  }
}

export async function requireClientAdviceDossierViewer(
  returnTo = '/adviesdossiers',
): Promise<AdviceDossierViewer> {
  const { user, activeMembership } =
    await requireOrganizationMembership(undefined, returnTo)
  if (
    user.accountType !== 'CLIENT' ||
    activeMembership.organization.organizationType !== 'CLIENT'
  ) {
    redirect('/account')
  }
  return {
    userId: user.id,
    organizationId: activeMembership.organization.id,
    organizationRole: activeMembership.role,
    isPlatformAdministrator: false,
  }
}
