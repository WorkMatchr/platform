import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { PlatformRole } from '@/generated/prisma/enums'
import { auth } from '@/lib/auth'
import { getSafeReturnUrl } from '@/lib/safe-redirect'
import { getCurrentAuthenticationContext } from '@/lib/test-impersonation/test-impersonation-context'

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() })
}

export const getCurrentUser = cache(async () => {
  const context = await getCurrentAuthenticationContext()
  if (context?.impersonation && !context.impersonation.valid) return null
  return context?.effectiveUser ?? null
})

export { getCurrentAuthenticationContext }

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
