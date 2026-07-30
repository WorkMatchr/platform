import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import {
  presentMatchedExpertise,
  requestInterestStatusLabels,
} from '@/lib/requests/request-interest-contract'
import {
  listEligibleRequestsForProvider,
  RequestInterestServiceError,
} from '@/lib/requests/request-interest-service'
import { requestStartLabels } from '@/lib/requests/request-contract'

export const metadata: Metadata = {
  title: 'Passende aanvragen | WorkMatchr',
  robots: { index: false, follow: false },
}

const dateFormatter = new Intl.DateTimeFormat('nl-NL', {
  dateStyle: 'medium',
  timeZone: 'Europe/Amsterdam',
})

export default async function ProviderRequestsPage() {
  const { user, activeMembership } =
    await requireOrganizationMembership(
      undefined,
      '/professional/opdrachten',
    )
  let eligibleRequests
  try {
    eligibleRequests = await listEligibleRequestsForProvider({
      userId: user.id,
      organizationId: activeMembership.organization.id,
    })
  } catch (error) {
    if (error instanceof RequestInterestServiceError) notFound()
    throw error
  }

  return (
    <Section spacing="compact">
      <Container>
        <p className="text-sm font-semibold text-brand-primary">
          Professionele organisatie
        </p>
        <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
          Passende aanvragen
        </h1>
        <p className="mt-2 max-w-3xl text-text-secondary">
          Bekijk geanonimiseerde aanvragen die aansluiten op de
          gecontroleerde deskundigheid en het werkgebied van uw
          organisatie.
        </p>

        {eligibleRequests.length === 0 ? (
          <Card className="mt-7">
            <h2 className="text-xl font-bold text-brand-dark">
              Geen passende aanvragen
            </h2>
            <p className="mt-2 text-text-secondary">
              Er staan momenteel geen gepubliceerde aanvragen in de
              vastgelegde doelgroep van uw organisatie.
            </p>
          </Card>
        ) : (
          <ul className="mt-7 grid gap-4">
            {eligibleRequests.map((item) => (
              <li key={item.request.id}>
                <Card className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-primary">
                      {item.request.requestNumber}
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-brand-dark">
                      {item.request.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-text-secondary">
                      {item.request.publicSummary}
                    </p>
                    <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <div>
                        <dt className="font-semibold text-text-secondary">
                          Regio
                        </dt>
                        <dd>{item.request.region ?? 'Niet opgegeven'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-text-secondary">
                          Sector
                        </dt>
                        <dd>{item.request.sector ?? 'Niet opgegeven'}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-text-secondary">
                          Planning
                        </dt>
                        <dd>
                          {requestStartLabels[item.request.requestedStart]}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-sm text-text-secondary">
                      <span className="font-semibold text-brand-dark">
                        Passend op:{' '}
                      </span>
                      {item.matchedExpertise
                        .map(presentMatchedExpertise)
                        .join(', ')}
                    </p>
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-brand-dark">
                      {item.interest
                        ? item.interest.offerSlot?.status === 'CLAIMED'
                          ? `Offerteplaats ${item.interest.offerSlot.slotNumber} geclaimd`
                          : requestInterestStatusLabels[
                              item.interest.status
                            ]
                        : 'Nog geen interesse'}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {item.request.publishedAt
                        ? dateFormatter.format(item.request.publishedAt)
                        : ''}
                    </span>
                    <Link
                      href={`/professional/opdrachten/${item.request.id}`}
                      className="font-semibold text-brand-primary underline decoration-2 underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Bekijk aanvraag
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  )
}
