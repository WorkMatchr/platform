import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { publishRequestAction } from '@/app/aanvragen/actions'
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
  searchParams: Promise<{ dossierId?: string }>
}) {
  const { dossierId } = await searchParams
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
          Nieuwe aanvraag
        </p>
        <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
          Professionele ondersteuning aanvragen
        </h1>
        <p className="mt-2 max-w-3xl text-text-secondary">
          Controleer welke informatie professionals straks over uw
          aanvraag mogen zien voordat u publiceert.
        </p>
        <div className="mt-7">
          <RequestPublicationForm
            action={publishRequestAction}
            preview={preview}
          />
        </div>
      </Container>
    </Section>
  )
}
