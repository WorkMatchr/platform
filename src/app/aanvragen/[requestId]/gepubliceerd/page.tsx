import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { requestStatusLabels } from '@/lib/requests/request-contract'
import {
  getOwnRequest,
  RequestServiceError,
} from '@/lib/requests/request-service'

export const metadata: Metadata = {
  title: 'Aanvraag gepubliceerd | WorkMatchr',
  robots: { index: false, follow: false },
}

export default async function PublishedRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const viewer = await requireClientAdviceDossierViewer(
    `/aanvragen/${requestId}/gepubliceerd`,
  )
  let request
  try {
    request = await getOwnRequest(viewer, requestId)
  } catch (error) {
    if (error instanceof RequestServiceError) notFound()
    throw error
  }

  return (
    <Section spacing="compact">
      <Container size="narrow">
        <div className="rounded-card border border-success-border bg-success-subtle p-6 sm:p-8">
          <p className="text-sm font-semibold text-success">
            Publicatie geslaagd
          </p>
          <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
            Uw aanvraag is gepubliceerd.
          </h1>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Aanvraagnummer
              </dt>
              <dd className="mt-1 font-bold text-brand-dark">
                {request.requestNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Status
              </dt>
              <dd className="mt-1 text-brand-dark">
                {requestStatusLabels[request.status]}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Publicatiedatum
              </dt>
              <dd className="mt-1 text-brand-dark">
                {request.publishedAt
                  ? new Intl.DateTimeFormat('nl-NL', {
                      dateStyle: 'long',
                      timeZone: 'Europe/Amsterdam',
                    }).format(request.publishedAt)
                  : 'Niet beschikbaar'}
              </dd>
            </div>
          </dl>
          <dl className="mt-6 grid gap-3 border-t border-success-border pt-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-text-secondary">
                Geschikte organisaties
              </dt>
              <dd className="mt-1 text-brand-dark">
                {request._count.eligibleProviders}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text-secondary">
                Actieve interesse
              </dt>
              <dd className="mt-1 text-brand-dark">
                {request._count.interests}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text-secondary">
                Offerteplaatsen bezet
              </dt>
              <dd className="mt-1 text-brand-dark">
                {request._count.offerSlots} / 3
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text-secondary">
                Offertes ontvangen
              </dt>
              <dd className="mt-1 text-brand-dark">0</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/aanvragen">
              Bekijk mijn aanvragen
            </LinkButton>
            <LinkButton href="/dashboard" variant="outline">
              Terug naar dashboard
            </LinkButton>
          </div>
        </div>
      </Container>
    </Section>
  )
}
