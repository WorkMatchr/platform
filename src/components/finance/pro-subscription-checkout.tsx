'use client'

import { useActionState } from 'react'
import type { ProSubscriptionActionState } from '@/app/credits/actions'
import { Button } from '@/components/ui/button'
import { formatEuro, WORKMATCHR_PRO_PLAN } from '@/lib/finance/financial-contract'

const inputClassName = 'min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

type BillingDetails = Readonly<{
  organizationName: string
  addressLine: string
  postalCode: string
  city: string
  countryCode: string
  chamberOfCommerceNumber: string
}>

type ProSubscriptionCheckoutProps = Readonly<{
  action: (state: ProSubscriptionActionState, formData: FormData) => Promise<ProSubscriptionActionState>
  billingDetails: BillingDetails
  idempotencyKey: string
  initialError?: string
  retryAvailable: boolean
}>

export function ProSubscriptionCheckoutSubmitButton({
  isPending,
  retryAvailable,
}: Readonly<{ isPending: boolean; retryAvailable: boolean }>) {
  return (
    <div className="mt-auto grid gap-2 pt-6">
      <Button className="w-full sm:w-auto" loading={isPending} loadingLabel="Beveiligde betaling voorbereiden…" type="submit">
        {retryAvailable ? 'Betaling opnieuw proberen' : 'Start Pro via Mollie'}
      </Button>
      {isPending ? <p className="text-sm text-text-secondary" role="status">U wordt doorgestuurd naar Mollie.</p> : null}
    </div>
  )
}

export function ProSubscriptionCheckout({
  action,
  billingDetails,
  idempotencyKey,
  initialError,
  retryAvailable,
}: ProSubscriptionCheckoutProps) {
  const [state, formAction, isPending] = useActionState(action, {})
  const error = state.error ?? initialError

  return (
    <form action={formAction} aria-busy={isPending || undefined} className="mt-6">
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <fieldset className="rounded-card border border-border bg-background p-4 sm:p-5">
          <legend className="px-1 text-sm font-bold uppercase tracking-wide text-text-secondary">Uw gegevens</legend>
          <p className="mt-2 text-sm text-text-secondary">Controleer de gegevens die op uw factuur komen. U kunt deze hier zo nodig corrigeren.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Organisatienaam<input className={inputClassName} name="organizationName" defaultValue={billingDetails.organizationName} required /></label>
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Adres<input className={inputClassName} name="addressLine" defaultValue={billingDetails.addressLine} required /></label>
            <label className="grid gap-2 font-semibold">Postcode<input className={inputClassName} name="postalCode" defaultValue={billingDetails.postalCode} required /></label>
            <label className="grid gap-2 font-semibold">Plaats<input className={inputClassName} name="city" defaultValue={billingDetails.city} required /></label>
            <label className="grid gap-2 font-semibold">Landcode<input className={inputClassName} name="countryCode" defaultValue={billingDetails.countryCode} required /></label>
            <label className="grid gap-2 font-semibold">KvK-nummer <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="chamberOfCommerceNumber" defaultValue={billingDetails.chamberOfCommerceNumber} /></label>
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Btw-id <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="vatId" /></label>
          </div>
        </fieldset>

        <section aria-labelledby="pro-payment-heading" className="flex h-full flex-col rounded-card border border-border bg-surface p-4 sm:p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Betaling</p>
          <h2 className="mt-1 text-xl font-bold text-brand-dark" id="pro-payment-heading">Uw Pro-abonnement</h2>
          <p className="mt-3 text-sm text-text-secondary">U betaalt de eerste maand via iDEAL of kaart. Daarmee geeft u toestemming voor de daaropvolgende maandelijkse betaling. Mollie toont uitsluitend betaalmethoden die voor uw betaling beschikbaar zijn.</p>
          {error ? <p className="mt-5 rounded-control border border-danger/30 bg-danger/5 p-3 text-sm" role="alert">{error}</p> : null}
          <dl aria-label="Prijsopbouw WorkMatchr Pro" className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3 text-sm sm:text-base">
            <dt>WorkMatchr Pro per maand</dt>
            <dd className="text-right tabular-nums">{formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents)}</dd>
            <dt className="border-t border-border pt-3">Subtotaal excl. btw</dt>
            <dd className="border-t border-border pt-3 text-right tabular-nums">{formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents)}</dd>
            <dt>Btw {WORKMATCHR_PRO_PLAN.vatRateBps / 100}%</dt>
            <dd className="text-right tabular-nums">{formatEuro(WORKMATCHR_PRO_PLAN.vatAmountCents)}</dd>
            <dt className="border-t-2 border-brand-dark pt-3 text-lg font-bold text-brand-dark">Te betalen</dt>
            <dd className="border-t-2 border-brand-dark pt-3 text-right text-xl font-bold tabular-nums text-brand-dark">{formatEuro(WORKMATCHR_PRO_PLAN.amountInclVatCents)}</dd>
          </dl>
          <ProSubscriptionCheckoutSubmitButton isPending={isPending} retryAvailable={retryAvailable} />
        </section>
      </div>
    </form>
  )
}
