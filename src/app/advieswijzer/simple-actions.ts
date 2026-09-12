'use server'

import { revalidatePath } from 'next/cache'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { simpleAdviceSchema } from '@/lib/requests/simple-advice-contract'
import { publishSimpleAdviceRequest } from '@/lib/requests/simple-advice-service'
import { RequestServiceError } from '@/lib/requests/request-service'

export type SimpleAdviceActionState = { requestId?: string; message?: string; errors?: Record<string, string[]> }
export async function publishSimpleAdviceAction(_state: SimpleAdviceActionState, form: FormData): Promise<SimpleAdviceActionState> {
  const viewer = await requireClientAdviceDossierViewer('/advieswijzer')
  let raw: unknown
  try {
    const payload = String(form.get('payload') ?? '')
    if (payload.length > 16000) throw Error('TOO_LARGE')
    raw = JSON.parse(payload)
  } catch { return { message: 'Controleer uw ingevulde gegevens.' } }
  const parsed = simpleAdviceSchema.safeParse(raw)
  if (!parsed.success) return { message: 'Controleer de gemarkeerde velden.', errors: parsed.error.flatten().fieldErrors }
  let requestId: string
  try {
    requestId = (await publishSimpleAdviceRequest(viewer, String(form.get('submissionId') ?? ''), parsed.data)).id
  } catch (error) {
    if (error instanceof RequestServiceError) return { message: error.code === 'PUBLICATION_REVIEW_REQUIRED'
      ? 'Neem contact op met WorkMatchr voordat u opnieuw publiceert. Uw ingevulde gegevens blijven bewaard.'
      : 'Publiceren is niet gelukt. Controleer uw organisatielocatie en probeer het opnieuw. Uw gegevens blijven bewaard.' }
    return { message: 'Publiceren is niet gelukt. Uw gegevens blijven bewaard; probeer het opnieuw.' }
  }
  revalidatePath('/aanvragen')
  revalidatePath('/adviesdossiers')
  return { requestId }
}
