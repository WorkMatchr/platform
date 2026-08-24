'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { blockAccount, unblockAccount } from '@/lib/account-architecture/account-lifecycle-service'
import { addOrganizationOwner, OwnerManagementServiceError } from '@/lib/account-architecture/owner-management-service'
import { platformActionStatuses } from '@/lib/platform-admin/platform-admin-action-center'
import {
  addPlatformAdminNote,
  PlatformAdminActionError,
  sendPlatformAdminMessage,
  sendPlatformUserAccessEmail,
  updatePlatformSignalStatus,
} from '@/lib/platform-admin/platform-admin-action-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { setPlatformOrganizationBlocked } from '@/lib/platform-admin/platform-organization-lifecycle-service'
import { createMarketplaceRuleSet } from '@/lib/marketplace/marketplace-rules-service'
import { mutateMarketplaceCredits } from '@/lib/marketplace/marketplace-credit-admin-service'
import {
  decideMarketplaceContactRequest,
  marketplaceContactDecisionSchema,
} from '@/lib/marketplace/marketplace-reliability-service'
import {
  changePlatformAdministratorRole,
  invitePlatformAdministrator,
  PlatformAdminInvitationError,
  resendPlatformAdminInvitation,
  revokePlatformAdministratorAccess,
  revokePlatformAdminInvitation,
  setPlatformAdministratorBlocked,
} from '@/lib/platform-admin/platform-admin-invitation-service'

function safeReturnTo(value: FormDataEntryValue | null, fallback: string) {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/platformbeheer') && !path.startsWith('//') && !path.includes('://') ? path : fallback
}

function redirectWithResult(path: string, key: 'resultaat' | 'fout', value: string): never {
  const url = new URL(path, 'https://workmatchr.invalid')
  url.searchParams.set(key, value)
  redirect(`${url.pathname}${url.search}${url.hash}`)
}

const organizationActionSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().trim().min(5).max(500),
  operation: z.enum(['block', 'unblock']),
})

export async function changePlatformOrganizationStatusAction(formData: FormData) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/organisaties')
  const parsed = organizationActionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/platformbeheer/organisaties?fout=ongeldige-actie')
  await setPlatformOrganizationBlocked({
    actorUserId: administrator.id,
    organizationId: parsed.data.organizationId,
    blocked: parsed.data.operation === 'block',
    reason: parsed.data.reason,
  })
  revalidatePath('/platformbeheer')
  revalidatePath('/platformbeheer/organisaties')
  redirect(`/platformbeheer/organisaties/${parsed.data.organizationId}?resultaat=${parsed.data.operation === 'block' ? 'geblokkeerd' : 'gedeblokkeerd'}`)
}

const userActionSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  reasonNote: z.string().trim().min(5).max(500),
  operation: z.enum(['block', 'unblock']),
})

export async function changePlatformUserStatusAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get('returnTo'), '/platformbeheer/gebruikers')
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = userActionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/platformbeheer/gebruikers?fout=ongeldige-actie')
  const idempotencyKey = `platform-admin:${parsed.data.operation}:${crypto.randomUUID()}`
  const input = {
    actorUserId: administrator.id,
    organizationId: parsed.data.organizationId,
    subjectUserId: parsed.data.subjectUserId,
    reasonCode: parsed.data.operation === 'block' ? 'PLATFORM_ADMIN_BLOCK' : 'PLATFORM_ADMIN_UNBLOCK',
    reasonNote: parsed.data.reasonNote,
    idempotencyKey,
  }
  if (parsed.data.operation === 'block') await blockAccount(input)
  else await unblockAccount(input)
  revalidatePath('/platformbeheer')
  revalidatePath('/platformbeheer/gebruikers')
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'accountstatus-gewijzigd')
}

const adminEmailSchema = z.object({
  targetType: z.enum(['USER', 'ORGANIZATION', 'PROVIDER']),
  targetId: z.string().uuid(),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
})

export async function sendPlatformAdminEmailAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get('returnTo'), '/platformbeheer')
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = adminEmailSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-mail')
  try {
    await sendPlatformAdminMessage({ actorUserId: administrator.id, ...parsed.data })
  } catch (error) {
    if (error instanceof PlatformAdminActionError) redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'mail-verzonden')
}

const accessEmailSchema = z.object({
  subjectUserId: z.string().uuid(),
  operation: z.enum(['ACTIVATION', 'VERIFICATION', 'PASSWORD_RESET']),
})

export async function sendPlatformUserAccessEmailAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get('returnTo'), '/platformbeheer/gebruikers')
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = accessEmailSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-accountmail')
  try {
    await sendPlatformUserAccessEmail({
      actorUserId: administrator.id,
      requestHeaders: await headers(),
      ...parsed.data,
    })
  } catch (error) {
    if (error instanceof PlatformAdminActionError) redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'accountmail-verzonden')
}

const adminNoteSchema = z.object({
  targetType: z.enum(['USER', 'ORGANIZATION', 'PROVIDER', 'ASSIGNMENT']),
  targetId: z.string().uuid(),
  category: z.string().trim().min(2).max(80),
  text: z.string().trim().min(5).max(2000),
  operation: z.enum(['NOTE', 'MARK_INVESTIGATED']).default('NOTE'),
})

export async function addPlatformAdminNoteAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get('returnTo'), '/platformbeheer')
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = adminNoteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-notitie')
  try {
    await addPlatformAdminNote({ actorUserId: administrator.id, ...parsed.data })
  } catch (error) {
    if (error instanceof PlatformAdminActionError) redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    throw error
  }
  revalidatePath(returnTo)
  revalidatePath('/platformbeheer/auditor')
  redirectWithResult(returnTo, 'resultaat', 'notitie-vastgelegd')
}

const signalStatusSchema = z.object({
  signalId: z.string().trim().min(3).max(200),
  status: z.enum(platformActionStatuses),
  note: z.string().trim().max(500).optional(),
})

export async function updatePlatformSignalStatusAction(formData: FormData) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/actiecentrum')
  const parsed = signalStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/platformbeheer/actiecentrum?fout=ongeldige-status')
  try {
    await updatePlatformSignalStatus({ actorUserId: administrator.id, ...parsed.data })
  } catch (error) {
    if (error instanceof PlatformAdminActionError) redirect(`/platformbeheer/actiecentrum?fout=${error.code.toLowerCase()}`)
    throw error
  }
  revalidatePath('/platformbeheer')
  revalidatePath('/platformbeheer/actiecentrum')
  redirect('/platformbeheer/actiecentrum?resultaat=status-vastgelegd')
}

const ownerSchema = z.object({
  organizationId: z.string().uuid(),
  successorUserId: z.string().uuid(),
  reasonNote: z.string().trim().min(5).max(500),
})

export async function addPlatformOrganizationOwnerAction(formData: FormData) {
  const returnTo = safeReturnTo(formData.get('returnTo'), '/platformbeheer/organisaties')
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = ownerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-owneractie')
  try {
    await addOrganizationOwner({
      actorUserId: administrator.id,
      organizationId: parsed.data.organizationId,
      successorUserId: parsed.data.successorUserId,
      reasonCode: 'PLATFORM_ADMIN_OWNER_ADDED',
      reasonNote: parsed.data.reasonNote,
      idempotencyKey: `platform-owner-add:${crypto.randomUUID()}`,
    })
  } catch (error) {
    if (error instanceof OwnerManagementServiceError) redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    throw error
  }
  revalidatePath(returnTo)
  revalidatePath('/platformbeheer')
  redirectWithResult(returnTo, 'resultaat', 'owner-aangewezen')
}

export async function createMarketplaceRuleSetAction(formData: FormData) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/marketplace/regels')
  try {
    await createMarketplaceRuleSet({
      actorUserId: administrator.id,
      values: {
        version: String(formData.get('version') ?? ''),
        validFrom: String(formData.get('validFrom') ?? ''),
        participationPriceCredits: Number(formData.get('participationPriceCredits')),
        minimumParticipationPrice: Number(formData.get('minimumParticipationPrice')),
        withdrawalRefundPercentage: Number(formData.get('withdrawalRefundPercentage')),
        roundRefundUp: formData.get('roundRefundUp') === 'on',
        unawardedQuoteRefundCredits: Number(formData.get('unawardedQuoteRefundCredits')),
        maximumParticipants: Number(formData.get('maximumParticipants')),
        withdrawalThreshold: Number(formData.get('withdrawalThreshold')),
        withdrawalWindowMonths: Number(formData.get('withdrawalWindowMonths')),
        reliabilitySignalsEnabled: formData.get('reliabilitySignalsEnabled') === 'on',
        changeReason: String(formData.get('changeReason') ?? ''),
        confirmed: formData.get('confirmed') === 'on',
      },
    })
  } catch {
    redirect('/platformbeheer/marketplace/regels?fout=ongeldige-regelset')
  }
  revalidatePath('/platformbeheer/marketplace/regels')
  redirect('/platformbeheer/marketplace/regels?resultaat=regelset-toegevoegd')
}

export async function mutateMarketplaceCreditsAction(formData: FormData) {
  const providerOrganizationId = String(formData.get('providerOrganizationId') ?? '')
  const returnTo = safeReturnTo(
    formData.get('returnTo'),
    '/platformbeheer/dienstverleners',
  )
  const administrator = await requirePlatformAdministrator(returnTo)
  try {
    await mutateMarketplaceCredits({
      actorUserId: administrator.id,
      values: {
        providerOrganizationId,
        amount: Number(formData.get('amount')),
        reasonCode: String(formData.get('reasonCode') ?? ''),
        explanation: String(formData.get('explanation') ?? ''),
        reference: String(formData.get('reference') ?? '') || undefined,
        reversalOfTransactionId:
          String(formData.get('reversalOfTransactionId') ?? '') || undefined,
        idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
        confirmed: formData.get('confirmed') === 'on',
      },
    })
  } catch {
    redirectWithResult(returnTo, 'fout', 'creditmutatie')
  }
  revalidatePath(returnTo)
  revalidatePath('/platformbeheer/marketplace')
  redirectWithResult(returnTo, 'resultaat', 'credits-bijgewerkt')
}

export async function decideMarketplaceContactRequestAction(formData: FormData) {
  const organizationId = String(formData.get('organizationId') ?? '')
  const returnTo = `/platformbeheer/marketplace/betrouwbaarheid/${organizationId}`
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = marketplaceContactDecisionSchema.safeParse({
    contactRequestId: String(formData.get('contactRequestId') ?? ''),
    decision: String(formData.get('decision') ?? ''),
    reason: String(formData.get('reason') ?? ''),
    validUntil: formData.get('validUntil')
      ? new Date(String(formData.get('validUntil')))
      : null,
  })
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'beheerbesluit')
  try {
    await decideMarketplaceContactRequest({
      actorUserId: administrator.id,
      ...parsed.data,
    })
  } catch {
    redirectWithResult(returnTo, 'fout', 'beheerbesluit')
  }
  revalidatePath(returnTo)
  revalidatePath('/platformbeheer/marketplace/betrouwbaarheid')
  redirectWithResult(returnTo, 'resultaat', 'beheerbesluit-vastgelegd')
}

const platformAdministratorInvitationActionSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

export async function invitePlatformAdministratorAction(formData: FormData) {
  const returnTo = '/platformbeheer/platformbeheerders'
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = platformAdministratorInvitationActionSchema.safeParse(
    Object.fromEntries(formData),
  )
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-uitnodiging')
  try {
    await invitePlatformAdministrator({
      actorUserId: administrator.id,
      values: {
        ...parsed.data,
        idempotencyKey: `platform-admin-invitation:${crypto.randomUUID()}`,
        ownerConfirmed: formData.get('ownerConfirmed') === 'on',
      },
      requestHeaders: await headers(),
    })
  } catch (error) {
    if (error instanceof PlatformAdminInvitationError) {
      redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    }
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'uitnodiging-verstuurd')
}

const platformAdministratorInvitationIdSchema = z.object({
  invitationId: z.string().uuid(),
})

export async function resendPlatformAdministratorInvitationAction(formData: FormData) {
  const returnTo = '/platformbeheer/platformbeheerders'
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = platformAdministratorInvitationIdSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-uitnodiging')
  try {
    await resendPlatformAdminInvitation({
      actorUserId: administrator.id,
      invitationId: parsed.data.invitationId,
      requestHeaders: await headers(),
    })
  } catch (error) {
    if (error instanceof PlatformAdminInvitationError) {
      redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    }
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'uitnodiging-opnieuw-verstuurd')
}

const platformAdministratorReasonActionSchema = z.object({
  subjectUserId: z.string().uuid().optional(),
  invitationId: z.string().uuid().optional(),
  reason: z.string().trim().min(10).max(500),
})

export async function revokePlatformAdministratorInvitationAction(formData: FormData) {
  const returnTo = '/platformbeheer/platformbeheerders'
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = platformAdministratorReasonActionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || !parsed.data.invitationId) {
    redirectWithResult(returnTo, 'fout', 'ongeldige-uitnodiging')
  }
  try {
    await revokePlatformAdminInvitation({
      actorUserId: administrator.id,
      invitationId: parsed.data.invitationId,
      reason: parsed.data.reason,
    })
  } catch (error) {
    if (error instanceof PlatformAdminInvitationError) {
      redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    }
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'uitnodiging-ingetrokken')
}

const platformAdministratorRoleActionSchema = z.object({
  subjectUserId: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
  reason: z.string().trim().min(10).max(500),
})

export async function changePlatformAdministratorRoleAction(formData: FormData) {
  const returnTo = '/platformbeheer/platformbeheerders'
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = platformAdministratorRoleActionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-rolwijziging')
  try {
    await changePlatformAdministratorRole({ actorUserId: administrator.id, ...parsed.data })
  } catch (error) {
    if (error instanceof PlatformAdminInvitationError) {
      redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    }
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'rol-bijgewerkt')
}

const platformAdministratorAccessActionSchema = z.object({
  subjectUserId: z.string().uuid(),
  operation: z.enum(['block', 'unblock', 'revoke']),
  reason: z.string().trim().min(10).max(500),
})

export async function changePlatformAdministratorAccessAction(formData: FormData) {
  const returnTo = '/platformbeheer/platformbeheerders'
  const administrator = await requirePlatformAdministrator(returnTo)
  const parsed = platformAdministratorAccessActionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirectWithResult(returnTo, 'fout', 'ongeldige-toegangsactie')
  try {
    if (parsed.data.operation === 'revoke') {
      await revokePlatformAdministratorAccess({
        actorUserId: administrator.id,
        subjectUserId: parsed.data.subjectUserId,
        reason: parsed.data.reason,
      })
    } else {
      await setPlatformAdministratorBlocked({
        actorUserId: administrator.id,
        subjectUserId: parsed.data.subjectUserId,
        blocked: parsed.data.operation === 'block',
        reason: parsed.data.reason,
      })
    }
  } catch (error) {
    if (error instanceof PlatformAdminInvitationError) {
      redirectWithResult(returnTo, 'fout', error.code.toLowerCase())
    }
    throw error
  }
  revalidatePath(returnTo)
  redirectWithResult(returnTo, 'resultaat', 'toegang-bijgewerkt')
}
