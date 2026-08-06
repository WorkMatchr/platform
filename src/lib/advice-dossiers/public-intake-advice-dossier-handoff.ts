import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import {
  AdviceDossierError,
  ensureAdviceDossierForCompletedPublicIntake,
} from './advice-dossier-service'

export async function attachAdviceDossierForCurrentUser(
  draft: PublicIntakeDraftView,
): Promise<PublicIntakeDraftView> {
  if (
    !draft.guidance.outcome ||
    ![
      'COMPLETED_WITH_GUIDANCE',
      'COMPLETED_WITH_SAFE_FALLBACK',
    ].includes(draft.guidance.completion.status)
  ) {
    return draft
  }

  const context = await getOptionalActiveOrganizationContext()
  const membership = context?.activeMembership
  if (
    !context ||
    !membership ||
    membership.status !== 'ACTIVE' ||
    membership.organization.status !== 'ACTIVE' ||
    context.user.accountType !== 'CLIENT' ||
    membership.organization.organizationType !== 'CLIENT'
  ) {
    return { ...draft, adviceDossier: null }
  }

  try {
    const adviceDossier =
      await ensureAdviceDossierForCompletedPublicIntake({
        draft,
        ownerUserId: context.user.id,
        organizationId: membership.organization.id,
      })
    return { ...draft, adviceDossier }
  } catch (error) {
    if (
      error instanceof AdviceDossierError &&
      (error.code === 'NOT_ELIGIBLE' ||
        error.code === 'ACCESS_DENIED')
    ) {
      return { ...draft, adviceDossier: null }
    }
    throw error
  }
}
