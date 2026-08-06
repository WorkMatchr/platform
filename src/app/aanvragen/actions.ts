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
import {
  submitMarketplaceContactRequest,
  withdrawPublishedRequest,
} from '@/lib/marketplace/marketplace-reliability-service'

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
            : error.code === 'PUBLICATION_REVIEW_REQUIRED'
              ? 'Neem eerst contact op met WorkMatchr via het formulier op deze pagina.'
            : 'De aanvraag kon niet veilig worden gepubliceerd. Probeer het opnieuw.',
      }
    }
    throw error
  }

  revalidatePath('/aanvragen')
  revalidatePath(`/adviesdossiers/${parsed.data.adviceDossierId}`)
  redirect(`/aanvragen/${requestId}/gepubliceerd`)
}

export async function submitMarketplaceContactRequestAction(formData: FormData) {
  const adviceDossierId = String(formData.get('adviceDossierId') ?? '')
  const explanation = String(formData.get('contactExplanation') ?? '')
  const viewer = await requireClientAdviceDossierViewer(
    `/aanvragen/nieuw?dossierId=${encodeURIComponent(adviceDossierId)}`,
  )
  if (!viewer.organizationId) {
    redirect(`/aanvragen/nieuw?dossierId=${encodeURIComponent(adviceDossierId)}&fout=geen-organisatie`)
  }
  try {
    await submitMarketplaceContactRequest({
      userId: viewer.userId,
      organizationId: viewer.organizationId,
      adviceDossierId,
      explanation,
    })
  } catch {
    redirect(`/aanvragen/nieuw?dossierId=${encodeURIComponent(adviceDossierId)}&fout=contactverzoek`)
  }
  revalidatePath('/platformbeheer/marketplace/betrouwbaarheid')
  redirect(`/aanvragen/nieuw?dossierId=${encodeURIComponent(adviceDossierId)}&contact=verzonden`)
}

export async function withdrawPublishedRequestAction(formData: FormData) {
  const requestId = String(formData.get('requestId') ?? '')
  const viewer = await requireClientAdviceDossierViewer(
    `/aanvragen/${encodeURIComponent(requestId)}/gepubliceerd`,
  )
  if (!viewer.organizationId) redirect('/aanvragen')
  try {
    await withdrawPublishedRequest({
      userId: viewer.userId,
      organizationId: viewer.organizationId,
      values: {
        requestId,
        reason: String(formData.get('reason') ?? ''),
        explanation: String(formData.get('explanation') ?? ''),
        confirmed: formData.get('confirmed') === 'on',
      },
    })
  } catch {
    redirect(`/aanvragen/${requestId}/gepubliceerd?fout=intrekken`)
  }
  revalidatePath('/aanvragen')
  revalidatePath(`/aanvragen/${requestId}/gepubliceerd`)
  revalidatePath('/platformbeheer/marketplace/betrouwbaarheid')
  redirect(`/aanvragen/${requestId}/gepubliceerd?intrekking=gelukt`)
}
