'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import { blockAccount, AccountLifecycleServiceError, unblockAccount } from '@/lib/account-architecture/account-lifecycle-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { inviteOrganizationUser, OrganizationInvitationServiceError, resendOrganizationInvitation } from '@/lib/account-architecture/organization-invitation-service'
import { organizationInvitationSchema } from '@/lib/account-architecture/organization-invitation-validation'
import {
  changeOrganizationUserRole,
  OwnerManagementServiceError,
  resendOrganizationRoleChangeNotification,
} from '@/lib/account-architecture/owner-management-service'

export type AccountManagementActionState = { message?: string; error?: boolean }
export type OrganizationInvitationActionState = {
  message?: string
  error?: boolean
  errors?: Record<string, string[] | undefined>
  values?: { displayName?: string; email?: string; role?: string }
}
export type OrganizationRoleActionState = { message?: string; error?: boolean }

const actionSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  idempotencyKey: z.string().min(12).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
  reasonCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,79}$/),
  reasonNote: z.string().trim().max(500).optional(),
})

function safeErrorMessage(error: unknown): string {
  if (error instanceof AccountLifecycleServiceError) return error.message
  return 'De accountactie kon niet veilig worden uitgevoerd.'
}

export async function blockOrganizationAccountAction(
  _state: AccountManagementActionState,
  formData: FormData,
): Promise<AccountManagementActionState> {
  const user = await requireUser('/organisatie/gebruikers')
  const parsed = actionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: true, message: 'Controleer de reden en probeer het opnieuw.' }
  try {
    await blockAccount({ actorUserId: user.id, ...parsed.data })
  } catch (error) {
    return { error: true, message: safeErrorMessage(error) }
  }
  revalidatePath('/organisatie/gebruikers')
  revalidatePath('/', 'layout')
  redirect('/organisatie/gebruikers?resultaat=geblokkeerd')
}

export async function unblockOrganizationAccountAction(
  _state: AccountManagementActionState,
  formData: FormData,
): Promise<AccountManagementActionState> {
  const user = await requireUser('/organisatie/gebruikers')
  const parsed = actionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: true, message: 'De accountactie is niet geldig.' }
  try {
    await unblockAccount({ actorUserId: user.id, ...parsed.data })
  } catch (error) {
    return { error: true, message: safeErrorMessage(error) }
  }
  revalidatePath('/organisatie/gebruikers')
  redirect('/organisatie/gebruikers?resultaat=gedeblokkeerd')
}

export async function inviteOrganizationUserAction(
  _state: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const context = await requireOrganizationMembership(undefined, '/organisatie/gebruikers')
  const rawValues = {
    displayName: String(formData.get('displayName') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
    idempotencyKey: String(formData.get('idempotencyKey') ?? ''),
  }
  const parsed = organizationInvitationSchema.safeParse(rawValues)
  if (!parsed.success) {
    return {
      error: true,
      message: 'Controleer de gemarkeerde velden.',
      errors: parsed.error.flatten().fieldErrors,
      values: rawValues,
    }
  }

  try {
    const result = await inviteOrganizationUser({
      actorUserId: context.user.id,
      organizationId: context.activeMembership.organization.id,
      ...parsed.data,
    })
    revalidatePath('/organisatie/gebruikers')
    redirect(`/organisatie/gebruikers?resultaat=${result.status === 'RESENT' ? 'opnieuw-uitgenodigd' : 'uitgenodigd'}`)
  } catch (error) {
    if (error instanceof OrganizationInvitationServiceError) {
      return { error: true, message: error.message, values: rawValues }
    }
    throw error
  }
}

const resendSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  idempotencyKey: z.string().min(12).max(160).regex(/^[a-zA-Z0-9:_-]+$/),
})

export async function resendOrganizationInvitationAction(
  _state: OrganizationInvitationActionState,
  formData: FormData,
): Promise<OrganizationInvitationActionState> {
  const context = await requireOrganizationMembership(undefined, '/organisatie/gebruikers')
  const parsed = resendSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || parsed.data.organizationId !== context.activeMembership.organization.id) {
    return { error: true, message: 'De uitnodiging kon niet veilig opnieuw worden verzonden.' }
  }
  try {
    await resendOrganizationInvitation({ actorUserId: context.user.id, ...parsed.data })
    revalidatePath('/organisatie/gebruikers')
    redirect('/organisatie/gebruikers?resultaat=opnieuw-uitgenodigd')
  } catch (error) {
    if (error instanceof OrganizationInvitationServiceError) return { error: true, message: error.message }
    throw error
  }
}

const roleChangeSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  expectedRole: z.enum(['ADMIN', 'MEMBER']),
  newRole: z.enum(['ADMIN', 'MEMBER']),
  idempotencyKey: z.string().min(12).max(120).regex(/^[a-zA-Z0-9:_-]+$/),
  confirmed: z.literal('on'),
}).refine((value) => value.expectedRole !== value.newRole, { message: 'Kies een andere rol.' })

export async function changeOrganizationRoleAction(
  _state: OrganizationRoleActionState,
  formData: FormData,
): Promise<OrganizationRoleActionState> {
  const context = await requireOrganizationMembership(undefined, '/organisatie/gebruikers')
  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || parsed.data.organizationId !== context.activeMembership.organization.id) {
    return { error: true, message: 'De rolwijziging kon niet veilig worden uitgevoerd.' }
  }
  let result
  try {
    const { subjectUserId, organizationId, expectedRole, newRole, idempotencyKey } = parsed.data
    result = await changeOrganizationUserRole({
      actorUserId: context.user.id,
      successorUserId: subjectUserId,
      reasonCode: 'TENANT_ROLE_CHANGED',
      organizationId,
      expectedRole,
      newRole,
      idempotencyKey,
    })
  } catch (error) {
    if (error instanceof OwnerManagementServiceError) return { error: true, message: error.message }
    throw error
  }
  revalidatePath('/organisatie/gebruikers')
  revalidatePath('/', 'layout')
  const outcome = result.notificationStatus === 'ACCEPTED'
    ? 'rol-gewijzigd-mail-verzonden'
    : result.notificationStatus === 'DEVELOPMENT_ONLY'
      ? 'rol-gewijzigd-mail-test'
      : 'rol-gewijzigd-mail-mislukt'
  redirect(`/organisatie/gebruikers?resultaat=${outcome}`)
}

const roleNotificationResendSchema = z.object({
  organizationId: z.string().uuid(),
  subjectUserId: z.string().uuid(),
  idempotencyKey: z.string().min(12).max(120).regex(/^[a-zA-Z0-9:_-]+$/),
})

export async function resendOrganizationRoleNotificationAction(
  _state: OrganizationRoleActionState,
  formData: FormData,
): Promise<OrganizationRoleActionState> {
  const context = await requireOrganizationMembership(undefined, '/organisatie/gebruikers')
  const parsed = roleNotificationResendSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success || parsed.data.organizationId !== context.activeMembership.organization.id) {
    return { error: true, message: 'De notificatie kon niet veilig opnieuw worden verzonden.' }
  }
  let result
  try {
    result = await resendOrganizationRoleChangeNotification({ actorUserId: context.user.id, ...parsed.data })
  } catch (error) {
    if (error instanceof OwnerManagementServiceError) return { error: true, message: error.message }
    throw error
  }
  revalidatePath('/organisatie/gebruikers')
  const outcome = result.notificationStatus === 'ACCEPTED'
    ? 'rolmail-opnieuw-verzonden'
    : result.notificationStatus === 'DEVELOPMENT_ONLY'
      ? 'rolmail-opnieuw-test'
      : 'rolmail-opnieuw-mislukt'
  redirect(`/organisatie/gebruikers?resultaat=${outcome}`)
}
