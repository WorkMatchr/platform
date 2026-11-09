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
  return { accessRevokedAt: null, OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: now } }] }
}
export function academyAccessExpired(enrollment: { accessExpiresAt?: Date | null }, now = new Date()) {
  return Boolean(enrollment.accessExpiresAt && enrollment.accessExpiresAt <= now)
}
export function academyUnusedSeatAvailable(order: { accessPolicyVersion?: string | null; purchase: { paidAt?: Date | null } }, now: Date) {
  if (!order.accessPolicyVersion) return true
  return order.accessPolicyVersion === ACADEMY_ACCESS_POLICY_VERSION && Boolean(order.purchase.paidAt && now < addAcademyCalendarYear(order.purchase.paidAt))
}
