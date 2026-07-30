import type { Metadata } from 'next'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { requestStatusLabels } from '@/lib/requests/request-contract'
import { listOwnRequests } from '@/lib/requests/request-service'

export const metadata: Metadata = {
  title: 'Mijn aanvragen | WorkMatchr',
  robots: { index: false, follow: false },
}

const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
  dateStyle: 'medium',
  timeZone: 'Europe/Amsterdam',
})

export default async function RequestsPage() {
  const viewer = await requireClientAdviceDossierViewer('/aanvragen')
  const requests = await listOwnRequests(viewer)

  return (
    <Section spacing="compact">
      <Container>
        <p className="text-sm font-semibold text-brand-primary">
          Uw account
        </p>
        <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
          Mijn aanvragen
        </h1>
        <p className="mt-2 max-w-3xl text-text-secondary">
          Hier vindt u de aanvragen die u vanuit een afgerond
          Adviesdossier heeft gepubliceerd.
        </p>

        {requests.length === 0 ? (
          <div className="mt-7 rounded-card border border-border bg-surface p-6">
            <h2 className="text-xl font-bold text-brand-dark">
              Nog geen aanvragen
            </h2>
            <p className="mt-2 text-text-secondary">
              Rond eerst een Adviesdossier af. Vanuit dat dossier kunt
              u professionele ondersteuning aanvragen.
            </p>
            <LinkButton
              href="/adviesdossiers"
              variant="outline"
              className="mt-4"
            >
              Bekijk mijn adviesdossiers
            </LinkButton>
          </div>
        ) : (
          <ul className="mt-7 divide-y divide-border rounded-card border border-border bg-surface">
            {requests.map((request) => (
              <li
                key={request.id}
                className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-primary">
                    {request.requestNumber}
                  </p>
                  <h2 className="mt-0.5 break-words font-bold text-brand-dark">
                    {request.title}
                  </h2>
                </div>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-text-secondary sm:justify-end">
                  <div>
                    <dt className="sr-only">Status</dt>
                    <dd>{requestStatusLabels[request.status]}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Publicatiedatum</dt>
                    <dd>
                      {request.publishedAt
                        ? dateFormatter.format(request.publishedAt)
                        : 'Nog niet gepubliceerd'}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">
                      Geschikte organisaties
                    </dt>
                    <dd>
                      {request._count.eligibleProviders} geschikte
                      organisaties
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Actieve interesse</dt>
                    <dd>
                      {request._count.interests} met actieve interesse
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Offerteplaatsen</dt>
                    <dd>
                      Offerteplaatsen bezet:{' '}
                      {request._count.offerSlots} / 3
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Offertes ontvangen</dt>
                    <dd>Offertes ontvangen: 0</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
