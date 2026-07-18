import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { PlatformRole } from '@/generated/prisma/enums'
import { auth } from '@/lib/auth'
import { canAccessAccount, shouldRevokeExistingSessions } from '@/lib/auth-policy'
import { getPrisma } from '@/lib/prisma'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() })
}

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession()
  if (!session) return null

  const user = await getPrisma().user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, displayName: true, emailVerified: true, platformRole: true, status: true },
  })

  if (!user || shouldRevokeExistingSessions(user.status) || !canAccessAccount(user.status)) {
    await getPrisma().session.deleteMany({ where: { userId: session.user.id } })
    return null
  }

  return user
})

export async function requireUser(returnTo = '/account') {
  const user = await getCurrentUser()
  if (!user) redirect(`/inloggen?returnTo=${encodeURIComponent(getSafeReturnUrl(returnTo))}`)
  return user
}

export async function requirePlatformRole(role: PlatformRole) {
  const user = await requireUser()
  if (user.platformRole !== role) redirect('/account')
  return user
}
