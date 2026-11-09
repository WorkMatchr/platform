import { RequestMatchExplanation } from '@/components/requests/request-match-explanation'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { ActionForm, SubmitButton as Button } from '@/components/ui/action-form'
import { LinkButton } from '@/components/ui/link-button'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import {
  requestInterestStatusLabels,
} from '@/lib/requests/request-interest-contract'
import {
  getEligibleRequestForProvider,
  RequestInterestServiceError,
} from '@/lib/requests/request-interest-service'
import { requestOfferSlotStatusLabels } from '@/lib/requests/request-offer-slot-contract'
import { requestStartLabels } from '@/lib/requests/request-contract'
import {
  withdrawRequestInterestAction,
} from '../actions'

export const metadata: Metadata = {
  title: 'Aanvraag bekijken | WorkMatchr',
  robots: { index: false, follow: false },
}

export default async function ProviderRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>
  searchParams: Promise<{ result?: string }>
}) {
  const { requestId } = await params
  const { result } = await searchParams
  const { user, activeMembership } =
    await requireOrganizationMembership(
      undefined,
      `/professional/opdrachten/${requestId}`,
    )
  let detail
  try {
    detail = await getEligibleRequestForProvider(
      {
        userId: user.id,
        organizationId: activeMembership.organization.id,
      },
      requestId,
    )
  } catch (error) {
    if (error instanceof RequestInterestServiceError) notFound()
    throw error
  }

  const request = detail.request
  const interested = detail.interest?.status === 'INTERESTED'
  const claimedOfferSlot =
    detail.interest?.offerSlot?.status === 'CLAIMED'
      ? detail.interest.offerSlot
      : null
  return (
    <Section spacing="compact">
      <Container size="narrow">
        <LinkButton href="/professional/opdrachten" variant="outline">
          Terug naar eerdere aanvragen
        </LinkButton>

        <article className="mt-5 rounded-card border border-border bg-surface p-5 sm:p-7">
          <p className="text-sm font-semibold text-brand-primary">
            {request.requestNumber}
          </p>
          <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
            {request.title}
          </h1>
          {result === 'withdrawn' && detail.interest.status === 'WITHDRAWN' ? (
            <p
              role="status"
              className="mt-5 rounded-control border border-border bg-surface-muted p-4 font-semibold text-brand-dark"
            >
              Uw interesse is ingetrokken.
            </p>
          ) : null}
          <section className="mt-6">
            <h2 className="text-xl font-bold text-brand-dark">
              Omschrijving
            </h2>
            <p className="mt-2 whitespace-pre-line text-text-secondary">
              {request.publicSummary}
            </p>
          </section>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Regio
              </dt>
              <dd className="mt-1">{request.region ?? 'Niet opgegeven'}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Sector
              </dt>
              <dd className="mt-1">{request.sector ?? 'Niet opgegeven'}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Planning
              </dt>
              <dd className="mt-1">
                {requestStartLabels[request.requestedStart]}
              </dd>
            </div>
          </dl>

          <section className="mt-6">
            <h2 className="text-xl font-bold text-brand-dark">
              Gevraagde deskundigheid
            </h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-semibold text-text-secondary">
                  Primair
                </dt>
                <dd>{request.primaryExpertise}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-text-secondary">
                  Aanvullend
                </dt>
                <dd>
                  {request.additionalExpertise.join(', ') || 'Geen'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-text-secondary">
                  Mogelijk
                </dt>
                <dd>
                  {request.possibleExpertise.join(', ') || 'Geen'}
                </dd>
              </div>
            </dl>
<RequestMatchExplanation primary={request.primaryExpertise} matches={detail.matchedExpertise} basis={detail.eligibilityBasis} />
          </section>

          {detail.requesterDetails ? (
            <section className="mt-6 rounded-card border border-success-border bg-success-subtle p-5">
              <h2 className="text-xl font-bold text-brand-dark">
                Contactgegevens opdrachtgever
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Deze gegevens zijn beschikbaar omdat uw organisatie
                een offerteplaats heeft geclaimd.
              </p>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">
                    Bedrijfsnaam
                  </dt>
                  <dd className="mt-1">
                    {detail.requesterDetails.organizationName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">
                    Contactpersoon
                  </dt>
                  <dd className="mt-1">
                    {detail.requesterDetails.contactName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">
                    E-mailadres
                  </dt>
                  <dd className="mt-1 break-all">
                    {detail.requesterDetails.email}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">
                    Telefoon
                  </dt>
                  <dd className="mt-1">
                    {detail.requesterDetails.phone}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-text-secondary">
                    Vestigingsplaats
                  </dt>
                  <dd className="mt-1">
                    {detail.requesterDetails.city}
                  </dd>
                </div>
              </dl>
              {detail.requesterDetails.notes ? (
                <div className="mt-5 border-t border-success-border pt-4">
                  <h3 className="font-semibold text-brand-dark">
                    Extra opmerkingen bij de aanvraag
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-text-secondary">
                    {detail.requesterDetails.notes}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm text-text-secondary">
              Status:{' '}
              <span className="font-semibold text-brand-dark">
                {detail.interest
                  ? requestInterestStatusLabels[detail.interest.status]
                  : 'Nog geen interesse'}
              </span>
            </p>
            {detail.interest.offerSlot && <p>{requestOfferSlotStatusLabels[detail.interest.offerSlot.status]} · plaats {detail.interest.offerSlot.slotNumber}</p>}
            {detail.interest.offerSlot?.creditAmount != null && (
              <p>Oorspronkelijke kosten: {detail.interest.offerSlot.creditAmount} credits.</p>
            )}
            {!claimedOfferSlot && detail.canManage && interested && request.status === 'PUBLISHED' ? (
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row">
                <ActionForm action={withdrawRequestInterestAction}>
                  <input
                    type="hidden"
                    name="requestId"
                    value={request.id}
                  />
                  <Button type="submit" variant="outline">
                    Interesse intrekken
                  </Button>
                </ActionForm>
              </div>
            ) : null}
            <LinkButton href="/uitnodigingen" variant="outline">Naar mijn uitnodigingen</LinkButton>
          </div>
        </article>
      </Container>
    </Section>
  )
}
