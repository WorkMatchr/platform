'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import {
  startTestImpersonation,
  stopTestImpersonation,
  TestImpersonationError,
} from '@/lib/test-impersonation/test-impersonation-service'

const startSchema = z.object({
  targetUserId: z.string().uuid(),
})

export async function startTestImpersonationAction(formData: FormData) {
  const parsed = startSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) redirect('/platformbeheer?testfout=ongeldig-account')

  let destination: string
  try {
    destination = (await startTestImpersonation(parsed.data.targetUserId)).destination
  } catch (error) {
    if (error instanceof TestImpersonationError) {
      redirect(`/platformbeheer?testfout=${error.code.toLowerCase()}`)
    }
    throw error
  }

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function stopTestImpersonationAction() {
  try {
    await stopTestImpersonation()
  } catch (error) {
    if (error instanceof TestImpersonationError) {
      redirect(`/platformbeheer?testfout=${error.code.toLowerCase()}`)
    }
    throw error
  }

  revalidatePath('/', 'layout')
  redirect('/platformbeheer')
}
