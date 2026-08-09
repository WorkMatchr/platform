'use server'

import { redirect } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import type { PurchasePrice } from '@/lib/finance/financial-contract'
import { createCreditPurchase, previewCreditPurchasePrice } from '@/lib/finance/financial-purchase-service'
import { createProSubscriptionCheckout, scheduleProCancellation } from '@/lib/finance/subscription-service'

export type CreditPurchaseActionState = Readonly<{ error?: string }>

export type CreditPricePreviewActionState = Readonly<{
  error?: string
  packageSku?: string
  discountCode?: string
  price?: PurchasePrice
}>

export async function startCreditPurchaseAction(
  _state: CreditPurchaseActionState,
  formData: FormData,
): Promise<CreditPurchaseActionState> {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits')
  let checkoutUrl: string
  try {
    const purchase = await createCreditPurchase({
      actorUserId: user.id,
      organizationId: activeMembership.organization.id,
      packageSku: formData.get('packageSku'),
      discountCode: String(formData.get('discountCode') ?? '').trim() || undefined,
      billingAddress: {
        organizationName: formData.get('organizationName'),
        addressLine: formData.get('addressLine'),
        postalCode: formData.get('postalCode'),
        city: formData.get('city'),
        countryCode: formData.get('countryCode'),
        chamberOfCommerceNumber: String(formData.get('chamberOfCommerceNumber') ?? '').trim() || undefined,
        vatId: String(formData.get('vatId') ?? '').trim() || undefined,
      },
      idempotencyKey: formData.get('idempotencyKey'),
    })
    if (!purchase.mollieCheckoutUrl) throw new Error('CHECKOUT_UNAVAILABLE')
    checkoutUrl = purchase.mollieCheckoutUrl
  } catch {
    return { error: 'De betaling kon niet worden gestart. Uw saldo is niet gewijzigd. Controleer de gegevens of probeer het later opnieuw.' }
  }
  redirect(checkoutUrl)
}

export async function previewCreditPurchaseAction(
  _state: CreditPricePreviewActionState,
  formData: FormData,
): Promise<CreditPricePreviewActionState> {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits')
  const packageSku = String(formData.get('packageSku') ?? '')
  const discountCode = String(formData.get('discountCode') ?? '').trim().toUpperCase()
  try {
    const price = await previewCreditPurchasePrice({
      actorUserId: user.id,
      organizationId: activeMembership.organization.id,
      packageSku,
      discountCode: discountCode || undefined,
    })
    return { packageSku, discountCode, price }
  } catch {
    return {
      packageSku,
      discountCode,
      error: 'Deze kortingscode kon niet worden toegepast. Controleer de code of ga verder zonder kortingscode.',
    }
  }
}

export async function startProSubscriptionAction(formData: FormData) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits/pro')
  let checkoutUrl: string
  try {
    const subscription = await createProSubscriptionCheckout({
      actorUserId: user.id,
      organizationId: activeMembership.organization.id,
      billingAddress: {
        organizationName: formData.get('organizationName'), addressLine: formData.get('addressLine'),
        postalCode: formData.get('postalCode'), city: formData.get('city'), countryCode: formData.get('countryCode'),
        chamberOfCommerceNumber: String(formData.get('chamberOfCommerceNumber') ?? '').trim() || undefined,
        vatId: String(formData.get('vatId') ?? '').trim() || undefined,
      },
      idempotencyKey: formData.get('idempotencyKey'),
    })
    checkoutUrl = subscription.firstPaymentPurchase?.mollieCheckoutUrl ?? ''
    if (!checkoutUrl) throw new Error('CHECKOUT_UNAVAILABLE')
  } catch {
    redirect('/credits/pro?fout=betaling-starten')
  }
  redirect(checkoutUrl)
}

export async function cancelProSubscriptionAction() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/credits/pro')
  try {
    await scheduleProCancellation({
      actorUserId: user.id,
      organizationId: activeMembership.organization.id,
    })
  } catch {
    redirect('/credits/pro?fout=opzeggen')
  }
  redirect('/credits/pro?opgezegd=1')
}
