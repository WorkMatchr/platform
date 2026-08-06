import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  publishRequestAction,
  submitMarketplaceContactRequestAction,
} from '@/app/aanvragen/actions'
import { RequestPublicationForm } from '@/components/requests/request-publication-form'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import {
  getRequestPublicationPreview,
  RequestServiceError,
} from '@/lib/requests/request-service'

export const metadata: Metadata = {
  title: 'Professionele ondersteuning aanvragen | WorkMatchr',
  robots: { index: false, follow: false },
}
export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ dossierId?: string; contact?: string; fout?: string }>
}) {
  const { dossierId, contact, fout } = await searchParams
  if (!dossierId) notFound()
  const viewer = await requireClientAdviceDossierViewer(
    `/aanvragen/nieuw?dossierId=${encodeURIComponent(dossierId)}`,
  )
  let preview
  try {
    preview = await getRequestPublicationPreview(viewer, dossierId)
  } catch (error) {
    if (error instanceof RequestServiceError) notFound()
    throw error
  }
  if (preview.existingRequest) {
    redirect(
      `/aanvragen/${preview.existingRequest.id}/gepubliceerd`,
    )
  }

  return (
    <Section spacing="compact">
      <Container size="narrow">
        <p className="text-sm font-semibold text-brand-primary">
          Nieuwe opdracht
        </p>
        <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
          Professionele ondersteuning voor uw opdracht
        </h1>
        <p className="mt-2 max-w-3xl text-text-secondary">
          Controleer welke informatie professionals straks over uw
          opdracht mogen zien voordat u publiceert.
        </p>
        <div className="mt-7">
          <RequestPublicationForm
            action={publishRequestAction}
            contactAction={submitMarketplaceContactRequestAction}
            contactResult={contact === 'verzonden' ? 'verzonden' : fout ? 'fout' : null}
            preview={preview}
          />
        </div>
      </Container>
    </Section>
  )
}
