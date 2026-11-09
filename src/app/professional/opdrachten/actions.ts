'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { requestInterestInputSchema } from '@/lib/requests/request-interest-contract'
import { requestOfferSlotInputSchema } from '@/lib/requests/request-offer-slot-contract'
import {
  claimRequestOfferSlot,
  RequestOfferSlotServiceError,
} from '@/lib/requests/request-offer-slot-service'
import {
  registerRequestInterest,
  RequestInterestServiceError,
  withdrawRequestInterest,
} from '@/lib/requests/request-interest-service'

async function actorForRequest(requestId: string) {
  const { user, activeMembership } =
    await requireOrganizationMembership(
      undefined,
      `/professional/opdrachten/${requestId}`,
    )
  return {
    userId: user.id,
    organizationId: activeMembership.organization.id,
  }
}

export async function registerRequestInterestAction(formData: FormData) {
  const parsed = requestInterestInputSchema.safeParse({ requestId: String(formData.get('requestId') ?? '') })
  if (!parsed.success) redirect('/professional/opdrachten')
  const actor = await actorForRequest(parsed.data.requestId)
  try {
    await registerRequestInterest({ actor, requestId: parsed.data.requestId })
  } catch (error) {
    if (!(error instanceof RequestInterestServiceError)) throw error
  }
  redirect('/professional/opdrachten')
}

export async function withdrawRequestInterestAction(formData: FormData) {
  const parsed = requestInterestInputSchema.safeParse({ requestId: String(formData.get('requestId') ?? '') })
  if (!parsed.success) redirect('/professional/opdrachten')
  const actor = await actorForRequest(parsed.data.requestId)
  try {
    await withdrawRequestInterest({ actor, requestId: parsed.data.requestId })
  } catch (error) {
    if (!(error instanceof RequestInterestServiceError)) throw error
    redirect('/professional/opdrachten')
  }
  revalidatePath('/professional/opdrachten')
  revalidatePath('/aanvragen')
  redirect(`/professional/opdrachten/${parsed.data.requestId}?result=withdrawn`)
}

export async function claimRequestOfferSlotAction(formData: FormData) {
  const parsed = requestOfferSlotInputSchema.safeParse({
    requestId: String(formData.get('requestId') ?? ''),
  })
  if (!parsed.success) redirect('/professional/opdrachten')

  const actor = await actorForRequest(parsed.data.requestId)
  try {
    await claimRequestOfferSlot({ actor, requestId: parsed.data.requestId })
  } catch (error) {
    if (!(error instanceof RequestOfferSlotServiceError)) throw error
  }
  redirect('/professional/opdrachten')
}
