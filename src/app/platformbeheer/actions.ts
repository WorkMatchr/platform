'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { blockAccount, unblockAccount } from '@/lib/account-architecture/account-lifecycle-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { setPlatformOrganizationBlocked } from '@/lib/platform-admin/platform-organization-lifecycle-service'

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
