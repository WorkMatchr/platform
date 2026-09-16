'use server'

import { revalidatePath } from 'next/cache'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { publishLegacySimpleAdvice, saveLegacySimpleAdvice } from '@/lib/requests/legacy-simple-advice-service'
import type { SimpleAdviceActionState } from '@/app/advieswijzer/simple-actions'
import { z } from 'zod'

export async function saveLegacySimpleAdviceAction(intakeId: string, payload: unknown, expectedVersion: number) {
  const viewer = await requireClientAdviceDossierViewer(`/hulpvragen/${intakeId}/hulpvraag`)
  try {
    z.string().uuid().parse(intakeId)
    z.number().int().nonnegative().parse(expectedVersion)
    return { version: await saveLegacySimpleAdvice(viewer, intakeId, expectedVersion, payload) }
  } catch { return { message: 'Opslaan is niet gelukt. Uw invoer blijft bewaard. Vernieuw de pagina als deze opdracht elders is gewijzigd.' } }
}

export async function publishLegacySimpleAdviceAction(intakeId: string, _state: SimpleAdviceActionState, form: FormData): Promise<SimpleAdviceActionState> {
  const viewer = await requireClientAdviceDossierViewer(`/hulpvragen/${intakeId}/hulpvraag`)
  try {
    z.string().uuid().parse(intakeId)
    const text = String(form.get('payload') ?? '')
    if (text.length > 16000) throw Error('TOO_LARGE')
    const version = z.coerce.number().int().nonnegative().parse(form.get('draftVersion'))
    const request = await publishLegacySimpleAdvice(viewer, intakeId, version, JSON.parse(text))
    for (const path of ['/dashboard', '/opdrachten', '/adviesdossiers', `/hulpvragen/${intakeId}`]) revalidatePath(path)
    return { requestId: request.id }
  } catch { return { message: 'Publiceren is niet gelukt. Controleer uw gegevens en probeer het opnieuw. Uw invoer blijft bewaard.' } }
}
