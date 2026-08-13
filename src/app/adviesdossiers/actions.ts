'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdviceDossierStatus } from '@/generated/prisma/client'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { startAdviceDossierIntake } from '@/lib/advice-dossiers/advice-dossier-intake-handoff-service'
import { changeAdviceDossierStatus } from '@/lib/advice-dossiers/advice-dossier-service'

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

export async function startAdviceDossierIntakeAction(
  dossierId: string,
) {
  const viewer = await requireClientAdviceDossierViewer(
    `/adviesdossiers/${dossierId}`,
  )
  const handoff = await startAdviceDossierIntake({ viewer, dossierId })
  if (handoff.kind === 'REQUEST') {
    redirect(`/aanvragen/${handoff.requestId}/gepubliceerd`)
  }
  revalidatePath('/opdrachten')
  redirect(`/hulpvragen/${handoff.intakeId}?van=adviesdossier`)
}
