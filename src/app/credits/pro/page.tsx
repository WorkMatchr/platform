import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { ProSubscriptionCheckout } from '@/components/finance/pro-subscription-checkout'
import { formatEuro, WORKMATCHR_PRO_PLAN } from '@/lib/finance/financial-contract'
import {
  canScheduleProCancellation,
  getProCancellationExplanation,
  getProSubscriptionStatusLabel,
  isRetryableProFirstPaymentAttempt,
} from '@/lib/finance/pro-subscription-presentation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { getPrisma } from '@/lib/prisma'
import { cancelProSubscriptionAction, startProSubscriptionAction } from '../actions'

export const metadata: Metadata = { title: 'WorkMatchr Pro | WorkMatchr' }

export default async function ProPage({ searchParams }: { searchParams: Promise<{ fout?: string; opgezegd?: string }> }) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits/pro')
  if (user.accountType !== 'PROFESSIONAL' || !activeMembership.organization.providerProfile) notFound()
  const organization = await getPrisma().organization.findUnique({
    where: { id: activeMembership.organization.id },
    include: {
      locations: { where: { archivedAt: null }, orderBy: [{ isPrimary: 'desc' }], take: 1 },
      professionalSubscription: {
        include: {
          firstPaymentPurchase: true,
          firstPaymentAttempts: { orderBy: { attemptNumber: 'desc' }, take: 1, include: { purchase: true } },
        },
      },
    },
  })
  if (!organization) notFound()
  const location = organization.locations[0]
  const { fout, opgezegd } = await searchParams
  const subscription = organization.professionalSubscription
  const cancellationAvailable = canScheduleProCancellation(subscription)
  const cancellationExplanation = getProCancellationExplanation(subscription)
  const statusLabel = getProSubscriptionStatusLabel(subscription)
  const latestFirstPayment = subscription?.firstPaymentAttempts[0]?.purchase ?? subscription?.firstPaymentPurchase
  const retryAvailable = subscription?.status === 'PENDING_MANDATE'
    && subscription.mollieMandateId === null
    && subscription.mollieSubscriptionId === null
    && isRetryableProFirstPaymentAttempt(latestFirstPayment)
  const canStartFirstPayment = !subscription || retryAvailable

  return <Section spacing="compact">
    <Heading as="h1" size="h2">WorkMatchr Pro</Heading>
    <p className="mt-3 text-text-secondary">10% extra korting op reguliere creditaankopen, aanvullende financiële inzichten en een zichtbare Pro-badge. Pro beïnvloedt matching of rangschikking nooit.</p>
    <Card className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Maandelijks abonnement</h2>
          <p className="mt-1 text-text-secondary">{formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents).replace(/\s/g, '')} excl. btw per maand</p>
        </div>
        <span className="rounded-full bg-brand-primary-subtle px-3 py-1 font-semibold">{statusLabel}</span>
      </div>

      {fout === 'opzeggen' ? <p className="mt-5" role="alert">Opzeggen is nu niet gelukt. Uw abonnement is niet gewijzigd. Probeer het later opnieuw.</p> : null}
      {opgezegd && subscription?.cancellationEffectiveAt ? <p className="mt-5 rounded-control bg-success-subtle p-3 font-semibold" role="status">{cancellationExplanation}</p> : null}

      {canStartFirstPayment ? <ProSubscriptionCheckout
        action={startProSubscriptionAction}
        billingDetails={{
          organizationName: organization.name,
          addressLine: location?.addressLine ?? '',
          postalCode: location?.postalCode ?? '',
          city: location?.city ?? '',
          countryCode: location?.countryCode ?? 'NL',
          chamberOfCommerceNumber: organization.chamberOfCommerceNumber ?? '',
        }}
        idempotencyKey={`pro-subscription:${randomUUID()}`}
        initialError={fout === 'betaling-starten' ? 'De abonnementsbetaling kon niet worden gestart. Pro is niet geactiveerd.' : undefined}
        retryAvailable={retryAvailable}
      /> : null}

      <div className="mt-6 border-t border-border pt-5">
        <form action={cancelProSubscriptionAction}>
          <Button type="submit" variant="outline" disabled={!cancellationAvailable} aria-describedby="pro-cancellation-explanation">Pro opzeggen</Button>
        </form>
        <p id="pro-cancellation-explanation" className="mt-2 max-w-2xl text-sm text-text-secondary">{cancellationExplanation}</p>
      </div>
    </Card>
  </Section>
}
