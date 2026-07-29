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
  const administrator = await requirePlatformAdministrator('/platformbeheer/gebruikers')
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
  redirect('/platformbeheer/gebruikers?resultaat=accountstatus-gewijzigd')
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
