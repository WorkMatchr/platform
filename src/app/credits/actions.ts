'use server'

import { redirect } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { createCreditPurchase } from '@/lib/finance/financial-purchase-service'
import { createProSubscriptionCheckout, scheduleProCancellation } from '@/lib/finance/subscription-service'

export async function startCreditPurchaseAction(formData: FormData) {
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
    redirect('/credits?fout=betaling-starten')
  }
  redirect(checkoutUrl)
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
