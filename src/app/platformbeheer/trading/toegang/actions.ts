'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { resetTradingPassword, revokeTradingSessions } from '@/lib/trading/trading-access-service'
const path = '/platformbeheer/trading/toegang'
export async function resetTradingPasswordAction() {
  const administrator = await requirePlatformOperator(path)
  let success = false
  try { await resetTradingPassword(administrator.id); success = true } catch {}
  revalidatePath(path)
  redirect(path + (success ? '?resultaat=reset' : '?fout=onbeschikbaar'))
}
export async function revokeTradingSessionsAction() {
  const administrator = await requirePlatformOperator(path)
  let success = false
  try { await revokeTradingSessions(administrator.id); success = true } catch {}
  revalidatePath(path)
  redirect(path + (success ? '?resultaat=ingetrokken' : '?fout=onbeschikbaar'))
}
