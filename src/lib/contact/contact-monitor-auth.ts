import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'

/** Endpoint-scoped bearer, never maintenance authority. No CRON fallback. */
export function isContactMonitorAuthorized(header: string | null) {
  const secret = process.env.CONTACT_MONITOR_SECRET
  if (!isPreviewInfrastructureAccepted() || !secret || !/^[a-f0-9]{64}$/.test(secret)
    || secret === process.env.CRON_SECRET || secret === process.env.FINANCIAL_MAINTENANCE_SECRET
    || !header?.startsWith('Bearer ')) return false
  const supplied = Buffer.from(header.slice(7)), expected = Buffer.from(secret)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
