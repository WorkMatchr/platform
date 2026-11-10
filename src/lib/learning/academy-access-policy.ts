import { assignedPilotVersions, isLocalPilot, paidPilotEnabled } from './learning-exam-runtime-version'

/** New orders only; null dates deliberately preserve historical rights. */
export const ACADEMY_ACCESS_POLICY_VERSION = 'ACADEMY-ACCESS-2026-10-30'
export function addAcademyCalendarYear(date: Date) {
  const result = new Date(date)
  const month = result.getUTCMonth()
  result.setUTCFullYear(result.getUTCFullYear() + 1)
  if (result.getUTCMonth() !== month) result.setUTCDate(0)
  return result
}
export function currentAcademyAccess(now = new Date()) {
  const restricted=Object.entries(assignedPilotVersions).map(([code,version])=>({course:{code},version}))
  const permit = { pilotAssignment: { is: { paidSlot:null, redeemedAt: {not:null} } }, user:{email:{endsWith:'@example.invalid'},emailVerified:true} }
  const paid = { pilotAssignment: { is: { paidSlot: {not:null}, redeemedAt:{not:null}, discountCode:{purchases:{some:{kind:'ACADEMY_COURSE' as const,status:'PAID' as const}}} } }, user:{status:'ACTIVE' as const,emailVerified:true} }
  const access = [{ courseVersion: { NOT: { OR:restricted } } }, ...(isLocalPilot() ? [permit] : []), ...(paidPilotEnabled() ? [paid] : [])]
  return { AND:[{OR:access}], accessRevokedAt: null, OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }] }
}
export function academyAccessExpired(enrollment: { accessExpiresAt?: Date | null }, now = new Date()) {
  return Boolean(enrollment.accessExpiresAt && enrollment.accessExpiresAt <= now)
}
export function academyUnusedSeatAvailable(order: { accessPolicyVersion?: string | null; purchase: { paidAt?: Date | null } }, now: Date) {
  if (!order.accessPolicyVersion) return true
  return order.accessPolicyVersion === ACADEMY_ACCESS_POLICY_VERSION && Boolean(order.purchase.paidAt && now < addAcademyCalendarYear(order.purchase.paidAt))
}
