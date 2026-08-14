'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdviceDossierStatus } from '@/generated/prisma/client'
import {
  getOptionalAdviceDossierViewer,
  requireClientAdviceDossierViewer,
} from '@/lib/advice-dossiers/advice-dossier-authorization'
import {
  AdviceDossierIntakeHandoffError,
  startAdviceDossierIntake,
} from '@/lib/advice-dossiers/advice-dossier-intake-handoff-service'
import {
  changeAdviceDossierStatus,
  type AdviceDossierViewer,
} from '@/lib/advice-dossiers/advice-dossier-service'

export type StartAdviceDossierIntakeActionResult =
  | Readonly<{ ok: true; href: string }>
  | Readonly<{
      ok: false
      code: 'ACCESS_DENIED' | 'NOT_ELIGIBLE' | 'TEMPORARY_ERROR'
    }>

function handoffHref(
  handoff: Awaited<ReturnType<typeof startAdviceDossierIntake>>,
): string {
  return handoff.kind === 'REQUEST'
    ? `/aanvragen/${handoff.requestId}/gepubliceerd`
    : `/hulpvragen/${handoff.intakeId}?van=adviesdossier`
}

async function executeAdviceDossierIntakeHandoff(
  viewer: AdviceDossierViewer,
  dossierId: string,
): Promise<StartAdviceDossierIntakeActionResult> {
  try {
    const handoff = await startAdviceDossierIntake({ viewer, dossierId })
    revalidatePath('/opdrachten')
    return { ok: true, href: handoffHref(handoff) }
  } catch (error) {
    if (!(error instanceof AdviceDossierIntakeHandoffError)) throw error
    if (error.code === 'NOT_FOUND' || error.code === 'ACCESS_DENIED') {
      return { ok: false, code: 'ACCESS_DENIED' }
    }
    if (error.code === 'NOT_ELIGIBLE') {
      return { ok: false, code: 'NOT_ELIGIBLE' }
    }
    return { ok: false, code: 'TEMPORARY_ERROR' }
  }
}

export async function changeAdviceDossierStatusAction(
  dossierId: string,
  toStatus: AdviceDossierStatus,
) {
  const viewer = await requireClientAdviceDossierViewer(
    `/adviesdossiers/${dossierId}`,
  )
  await changeAdviceDossierStatus({
    viewer,
    dossierId,
    toStatus,
  })
  revalidatePath('/adviesdossiers')
  revalidatePath(`/adviesdossiers/${dossierId}`)
  redirect(`/adviesdossiers/${dossierId}?status=gewijzigd`)
}

export async function prepareAdviceDossierIntakeAction(
  dossierId: string,
): Promise<StartAdviceDossierIntakeActionResult> {
  const viewer = await getOptionalAdviceDossierViewer()
  if (!viewer || viewer.isPlatformAdministrator || !viewer.organizationId) {
    return { ok: false, code: 'ACCESS_DENIED' }
  }
  return executeAdviceDossierIntakeHandoff(viewer, dossierId)
}

export async function startAdviceDossierIntakeAction(dossierId: string) {
  const viewer = await requireClientAdviceDossierViewer(
    `/adviesdossiers/${dossierId}`,
  )
  const result = await executeAdviceDossierIntakeHandoff(viewer, dossierId)
  if (!result.ok) {
    throw new AdviceDossierIntakeHandoffError(
      result.code === 'NOT_ELIGIBLE'
        ? 'NOT_ELIGIBLE'
        : result.code === 'ACCESS_DENIED'
          ? 'ACCESS_DENIED'
          : 'CONFLICT',
    )
  }
  redirect(result.href)
}
