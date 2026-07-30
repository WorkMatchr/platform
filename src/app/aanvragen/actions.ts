'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import {
  requestPublicationInputSchema,
  type RequestPublicationFormValues,
} from '@/lib/requests/request-contract'
import {
  publishRequest,
  RequestServiceError,
} from '@/lib/requests/request-service'

export type RequestPublicationActionState = Readonly<{
  values?: RequestPublicationFormValues
  errors?: Readonly<Record<string, readonly string[]>>
  message?: string
}>

export async function publishRequestAction(
  _state: RequestPublicationActionState,
  formData: FormData,
): Promise<RequestPublicationActionState> {
  const values: RequestPublicationFormValues = {
    adviceDossierId: String(
      formData.get('adviceDossierId') ?? '',
    ),
    publicSummary: String(formData.get('publicSummary') ?? ''),
    requestedStart: String(formData.get('requestedStart') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  }
  const parsed = requestPublicationInputSchema.safeParse(values)
  if (!parsed.success) {
    return {
      values,
      errors: parsed.error.flatten().fieldErrors,
      message: 'Controleer de gemarkeerde velden.',
    }
  }

  const viewer = await requireClientAdviceDossierViewer(
    `/aanvragen/nieuw?dossierId=${encodeURIComponent(parsed.data.adviceDossierId)}`,
  )
  let requestId: string
  try {
    const request = await publishRequest({
      viewer,
      publication: parsed.data,
    })
    requestId = request.id
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return {
        values,
        message:
          error.code === 'NOT_ELIGIBLE'
            ? 'Dit Adviesdossier is nog niet gereed voor publicatie.'
            : 'De aanvraag kon niet veilig worden gepubliceerd. Probeer het opnieuw.',
      }
    }
    throw error
  }

  revalidatePath('/aanvragen')
  revalidatePath(`/adviesdossiers/${parsed.data.adviceDossierId}`)
  redirect(`/aanvragen/${requestId}/gepubliceerd`)
}
