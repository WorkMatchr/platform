import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'
import { LinkButton } from '@/components/ui/link-button'
import { Button } from '@/components/ui/button'
import { withdrawPublishedRequestAction } from '@/app/aanvragen/actions'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import {
  calculateWithdrawalRefund,
  getCurrentMarketplaceRuleSet,
} from '@/lib/marketplace/marketplace-rules-service'
import { withdrawalReasonLabels } from '@/lib/marketplace/marketplace-reliability-service'
import { requestStatusLabels } from '@/lib/requests/request-contract'
import {
  getOwnRequest,
  RequestServiceError,
} from '@/lib/requests/request-service'

export const metadata: Metadata = {
  title: 'Opdracht gepubliceerd | WorkMatchr',
  robots: { index: false, follow: false },
}

export default async function PublishedRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>
  searchParams: Promise<{ intrekking?: string; fout?: string }>
}) {
  const { requestId } = await params
  const feedback = await searchParams
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
  const marketplaceRules = await getCurrentMarketplaceRuleSet()
  const expectedRefund = request.offerSlots.reduce((total, slot) => {
    if (!slot.creditAmount || !slot.marketplaceRuleSet) return total
    return total + calculateWithdrawalRefund(
      slot.creditAmount,
      slot.marketplaceRuleSet.withdrawalRefundPercentage,
      slot.marketplaceRuleSet.roundRefundUp,
    )
  }, 0)

  return (
    <Section spacing="compact">
      <Container size="narrow">
        <div className="rounded-card border border-success-border bg-success-subtle p-6 sm:p-8">
          <p className="text-sm font-semibold text-success">
            {request.status === 'CANCELLED' ? 'Opdracht ingetrokken' : 'Publicatie geslaagd'}
          </p>
          <h1 className="mt-1 text-heading-2 font-bold text-brand-dark">
            {request.status === 'CANCELLED'
              ? 'Uw opdracht is ingetrokken.'
              : 'Uw opdracht is gepubliceerd.'}
          </h1>
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold text-text-secondary">
                Opdrachtnummer
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
                {request._count.offerSlots} / {marketplaceRules.maximumParticipants}
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

        {feedback.fout === 'intrekken' ? (
          <p role="alert" className="mt-5 rounded-control border border-error-border bg-error-subtle p-4 text-brand-dark">
            De opdracht kon niet veilig worden ingetrokken. Controleer de reden en probeer het opnieuw. Er zijn geen gedeeltelijke wijzigingen uitgevoerd.
          </p>
        ) : null}
        {request.status === 'PUBLISHED' ? (
          <details className="mt-6 rounded-card border border-border bg-surface p-5">
            <summary className="cursor-pointer font-bold text-brand-dark">
              Opdracht intrekken
            </summary>
            <p className="mt-3 text-sm text-text-secondary">
              {request.offerSlots.length > 0
                ? `${request.offerSlots.length} professional${request.offerSlots.length === 1 ? '' : 's'} hebben een deelnameplaats. Bij intrekking wordt in totaal ${expectedRefund} credits teruggezet. De intrekking telt mee als intern betrouwbaarheidssignaal en wordt in de audittrail vastgelegd.`
                : 'Er zijn nog geen deelnameplaatsen ingenomen. Intrekken veroorzaakt daarom geen creditmutatie.'}
            </p>
            <form action={withdrawPublishedRequestAction} className="mt-4 grid gap-4">
              <input type="hidden" name="requestId" value={request.id} />
              <label className="grid gap-1 font-semibold text-brand-dark" htmlFor="withdrawal-reason">
                Reden
                <select id="withdrawal-reason" name="reason" required className="rounded-control border border-border bg-surface px-3 py-2 font-normal">
                  {Object.entries(withdrawalReasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 font-semibold text-brand-dark" htmlFor="withdrawal-explanation">
                Toelichting
                <textarea id="withdrawal-explanation" name="explanation" maxLength={1000} rows={4} className="rounded-control border border-border bg-surface px-3 py-2 font-normal" />
                <span className="text-sm font-normal text-text-secondary">Verplicht wanneer u “Andere reden” kiest.</span>
              </label>
              <label className="flex items-start gap-3 text-sm text-brand-dark">
                <input type="checkbox" name="confirmed" required className="mt-1" />
                <span>Ik begrijp de gevolgen en wil deze opdracht intrekken.</span>
              </label>
              <Button type="submit" variant="outline" className="border-error text-error hover:bg-error-subtle">Opdracht intrekken</Button>
            </form>
          </details>
        ) : null}
      </Container>
    </Section>
  )
}
