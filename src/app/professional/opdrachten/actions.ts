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

async function mutateInterest(
  formData: FormData,
  operation: 'REGISTER' | 'WITHDRAW',
) {
  const parsed = requestInterestInputSchema.safeParse({
    requestId: String(formData.get('requestId') ?? ''),
  })
  if (!parsed.success) redirect('/professional/opdrachten')

  const actor = await actorForRequest(parsed.data.requestId)
  try {
    if (operation === 'REGISTER') {
      await registerRequestInterest({
        actor,
        requestId: parsed.data.requestId,
      })
    } else {
      await withdrawRequestInterest({
        actor,
        requestId: parsed.data.requestId,
      })
    }
  } catch (error) {
    if (error instanceof RequestInterestServiceError) {
      redirect('/professional/opdrachten')
    }
    throw error
  }

  revalidatePath('/professional/opdrachten')
  revalidatePath(`/professional/opdrachten/${parsed.data.requestId}`)
  revalidatePath('/aanvragen')
  redirect(
    `/professional/opdrachten/${parsed.data.requestId}?result=${
      operation === 'REGISTER' ? 'interested' : 'withdrawn'
    }`,
  )
}

export async function registerRequestInterestAction(formData: FormData) {
  return mutateInterest(formData, 'REGISTER')
}

export async function withdrawRequestInterestAction(formData: FormData) {
  return mutateInterest(formData, 'WITHDRAW')
}

export async function claimRequestOfferSlotAction(formData: FormData) {
  const parsed = requestOfferSlotInputSchema.safeParse({
    requestId: String(formData.get('requestId') ?? ''),
  })
  if (!parsed.success) redirect('/professional/opdrachten')

  const actor = await actorForRequest(parsed.data.requestId)
  let result:
    | 'slot-claimed'
    | 'slots-full'
    | 'insufficient-credits'
    | 'claim-error' =
    'slot-claimed'
  try {
    await claimRequestOfferSlot({
      actor,
      requestId: parsed.data.requestId,
    })
  } catch (error) {
    if (error instanceof RequestOfferSlotServiceError) {
      result =
        error.code === 'FULL'
          ? 'slots-full'
          : error.code === 'INSUFFICIENT_CREDITS'
            ? 'insufficient-credits'
            : 'claim-error'
    } else {
      throw error
    }
  }

  revalidatePath('/professional/opdrachten')
  revalidatePath(`/professional/opdrachten/${parsed.data.requestId}`)
  revalidatePath('/aanvragen')
  redirect(
    `/professional/opdrachten/${parsed.data.requestId}?result=${result}`,
  )
}
