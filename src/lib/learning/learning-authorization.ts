import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { requireUser } from '@/lib/authorization'
import { getPrisma } from '@/lib/prisma'

export async function requireLearningUser(returnTo: string) {
  if (!isLearningRuntimeEnabled()) notFound()
  const sessionUser = await requireUser(returnTo)
  const user = await getPrisma().user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, status: true },
  })
  if (user?.status !== 'ACTIVE') redirect('/account?toegang=beperkt')
  return user
}
