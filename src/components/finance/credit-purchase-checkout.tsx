'use client'

import { useActionState, useState } from 'react'
import type {
  CreditPricePreviewActionState,
  CreditPurchaseActionState,
} from '@/app/credits/actions'
import { Button } from '@/components/ui/button'
import { formatEuro, type CreditPackageSku, type PurchasePrice } from '@/lib/finance/financial-contract'

const inputClassName = 'min-h-11 w-full rounded-control border border-border bg-surface px-3 py-2 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

export type CreditCheckoutPackage = Readonly<{
  sku: CreditPackageSku
  credits: number
  normalPackagePriceCents: number
  price: PurchasePrice
}>

type BillingDetails = Readonly<{
  organizationName: string
  addressLine: string
  postalCode: string
  city: string
  countryCode: string
  chamberOfCommerceNumber: string
}>

type CreditPurchaseCheckoutProps = {
  action: (
    state: CreditPurchaseActionState,
    formData: FormData,
  ) => Promise<CreditPurchaseActionState>
  previewAction: (
    state: CreditPricePreviewActionState,
    formData: FormData,
  ) => Promise<CreditPricePreviewActionState>
  billingDetails: BillingDetails
  idempotencyKey: string
  initialError?: string
  packages: readonly CreditCheckoutPackage[]
  proStatusLabel: string
  sandboxActive: boolean
}

export function CreditCheckoutSubmitButton({ disabled, pending }: { disabled: boolean; pending: boolean }) {
  return (
    <div className="grid gap-2">
      <Button
        className="w-full sm:w-auto sm:justify-self-end"
        disabled={disabled}
        loading={pending}
        loadingLabel="Beveiligde betaling voorbereiden…"
        type="submit"
      >
        Ga veilig naar Mollie
      </Button>
      {pending ? (
        <p className="text-sm text-text-secondary sm:text-right" role="status">
          U wordt doorgestuurd naar Mollie.
        </p>
      ) : null}
    </div>
  )
}

export function CreditPriceBreakdown({
  normalPackagePriceCents,
  price,
  discountCode,
}: {
  normalPackagePriceCents: number
  price: PurchasePrice
  discountCode?: string
}) {
  const vatPercentage = price.vatRateBps / 100
  return (
    <div aria-label="Prijsopbouw" className="rounded-card border border-border bg-background p-4 sm:p-5">
      <p className="text-lg font-bold text-brand-dark">{price.credits} credits</p>
      <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3 text-sm sm:text-base">
        <dt>{price.pricingMode === 'MOLLIE_TEST_ACCEPTANCE' ? 'Normale pakketprijs' : 'Pakketprijs'}</dt>
        <dd className="text-right tabular-nums">{formatEuro(normalPackagePriceCents)}</dd>
        {price.pricingMode === 'MOLLIE_TEST_ACCEPTANCE' ? (
          <>
            <dt className="font-semibold text-brand-dark">Sandbox-testprijs</dt>
            <dd className="text-right font-semibold tabular-nums text-brand-dark">{formatEuro(price.amountExclVatCents)}</dd>
          </>
        ) : null}
        {price.packageDiscountCents > 0 ? (
          <>
            <dt>Pakketkorting</dt>
            <dd className="text-right tabular-nums">− {formatEuro(price.packageDiscountCents)}</dd>
          </>
        ) : null}
        {price.proDiscountCents > 0 ? (
          <>
            <dt>Pro-korting</dt>
            <dd className="text-right tabular-nums">− {formatEuro(price.proDiscountCents)}</dd>
          </>
        ) : null}
        {discountCode && (price.discountCodeDiscountCents > 0 || price.bonusCredits > 0) ? (
          <>
            <dt>Kortingscode {discountCode}</dt>
            <dd className="text-right tabular-nums">
              {price.discountCodeDiscountCents > 0
                ? `− ${formatEuro(price.discountCodeDiscountCents)}`
                : `+ ${price.bonusCredits} bonuscredits`}
            </dd>
          </>
        ) : null}
        <dt className="border-t border-border pt-3">Subtotaal excl. btw</dt>
        <dd className="border-t border-border pt-3 text-right tabular-nums">{formatEuro(price.amountExclVatCents)}</dd>
        <dt>Btw {vatPercentage}%</dt>
        <dd className="text-right tabular-nums">{formatEuro(price.vatAmountCents)}</dd>
        <dt className="border-t-2 border-brand-dark pt-3 text-lg font-bold text-brand-dark">Te betalen</dt>
        <dd className="border-t-2 border-brand-dark pt-3 text-right text-xl font-bold tabular-nums text-brand-dark">
          {formatEuro(price.amountInclVatCents)}
        </dd>
      </dl>
    </div>
  )
}

export function CreditPurchaseCheckout({
  action,
  previewAction,
  billingDetails,
  idempotencyKey,
  initialError,
  packages,
  proStatusLabel,
  sandboxActive,
}: CreditPurchaseCheckoutProps) {
  const [purchaseState, purchaseFormAction, purchasePending] = useActionState(action, {})
  const [previewState, previewFormAction, previewPending] = useActionState(previewAction, {})
  const [selectedSku, setSelectedSku] = useState<CreditPackageSku>(packages[0].sku)
  const [discountCode, setDiscountCode] = useState('')
  const selectedPackage = packages.find((item) => item.sku === selectedSku) ?? packages[0]
  const normalizedDiscountCode = discountCode.trim().toUpperCase()
  const sandboxSelected = selectedPackage.price.pricingMode === 'MOLLIE_TEST_ACCEPTANCE'
  const effectiveDiscountCode = sandboxSelected ? '' : normalizedDiscountCode
  const matchingPreview = previewState.packageSku === selectedSku
    && previewState.discountCode === effectiveDiscountCode
    ? previewState
    : null
  const price = matchingPreview?.price ?? selectedPackage.price
  const discountMustBeChecked = effectiveDiscountCode.length > 0 && !matchingPreview?.price
  const previewError = matchingPreview?.error
  const purchaseError = purchaseState.error ?? initialError

  return (
    <form action={purchaseFormAction} aria-busy={purchasePending || undefined} className="mt-6">
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <fieldset className="rounded-card border border-border bg-background p-4 sm:p-5">
          <legend className="px-1 text-sm font-bold uppercase tracking-wide text-text-secondary">Factuurgegevens</legend>
          <p className="mt-2 text-sm text-text-secondary">Controleer de gegevens die op uw factuur komen. U kunt deze hier zo nodig corrigeren.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Organisatienaam<input className={inputClassName} name="organizationName" defaultValue={billingDetails.organizationName} required /></label>
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Adres<input className={inputClassName} name="addressLine" defaultValue={billingDetails.addressLine} required /></label>
            <label className="grid gap-2 font-semibold">Postcode<input className={inputClassName} name="postalCode" defaultValue={billingDetails.postalCode} required /></label>
            <label className="grid gap-2 font-semibold">Plaats<input className={inputClassName} name="city" defaultValue={billingDetails.city} required /></label>
            <label className="grid gap-2 font-semibold">Landcode<input className={inputClassName} name="countryCode" defaultValue={billingDetails.countryCode} maxLength={2} required /></label>
            <label className="grid gap-2 font-semibold">KvK-nummer <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="chamberOfCommerceNumber" defaultValue={billingDetails.chamberOfCommerceNumber} /></label>
            <label className="grid gap-2 font-semibold sm:col-span-2 lg:col-span-1 xl:col-span-2">Btw-id <span className="font-normal text-text-secondary">(optioneel)</span><input className={inputClassName} name="vatId" /></label>
          </div>
          <p className="mt-4 text-sm text-text-secondary">De definitieve factuur blijft ongewijzigd wanneer uw organisatiegegevens later wijzigen.</p>
        </fieldset>

        <section aria-labelledby="credit-order-heading" className="grid gap-5 rounded-card border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-text-secondary">Uw bestelling</p>
              <h3 className="mt-1 text-xl font-bold text-brand-dark" id="credit-order-heading">Kies uw creditpakket</h3>
            </div>
            <span className="rounded-full bg-brand-primary-subtle px-3 py-1 text-sm font-semibold">Pro: {proStatusLabel}</span>
          </div>

          {sandboxActive ? (
            <p className="rounded-control border border-brand/30 bg-brand/5 p-3 text-sm">
              <strong>Mollie-testomgeving:</strong> alleen het pakket van 25 credits gebruikt tijdelijk de sandbox-testprijs. Pro-korting en kortingscodes worden daarop niet toegepast.
            </p>
          ) : null}

          <label className="grid gap-2 font-semibold">Creditpakket
            <select className={inputClassName} name="packageSku" onChange={(event) => setSelectedSku(event.target.value as CreditPackageSku)} required value={selectedSku}>
              {packages.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.credits} credits — {formatEuro(item.price.amountExclVatCents)} excl. btw{item.price.pricingMode === 'MOLLIE_TEST_ACCEPTANCE' ? ' (sandbox-testprijs)' : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-2">
            <label className="font-semibold" htmlFor="discountCode">Kortingscode <span className="font-normal text-text-secondary">(niet combineerbaar met Pro)</span></label>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input className={inputClassName} disabled={sandboxSelected} id="discountCode" name="discountCode" onChange={(event) => setDiscountCode(event.target.value)} value={discountCode} />
              <Button disabled={sandboxSelected || !normalizedDiscountCode || previewPending} formAction={previewFormAction} formNoValidate loading={previewPending} type="submit" variant="outline">
                Kortingscode controleren
              </Button>
            </div>
            {sandboxSelected ? <p className="text-sm text-text-secondary">Kortingscodes zijn niet van toepassing op de sandbox-testprijs.</p> : null}
            {previewError ? <p className="text-sm text-error" role="alert">{previewError}</p> : null}
            {matchingPreview?.price && effectiveDiscountCode ? <p className="text-sm text-success" role="status">De kortingscode is gecontroleerd en in de prijs verwerkt.</p> : null}
          </div>

          <CreditPriceBreakdown
            discountCode={matchingPreview?.price ? effectiveDiscountCode : undefined}
            normalPackagePriceCents={selectedPackage.normalPackagePriceCents}
            price={price}
          />

          {discountMustBeChecked ? <p className="text-sm text-text-secondary">Controleer de kortingscode voordat u doorgaat naar Mollie.</p> : null}
          {purchaseError ? <p className="rounded-control border border-danger/30 bg-danger/5 p-3 text-sm" role="alert">{purchaseError}</p> : null}
          <CreditCheckoutSubmitButton disabled={discountMustBeChecked || previewPending} pending={purchasePending} />
        </section>
      </div>
    </form>
  )
}
