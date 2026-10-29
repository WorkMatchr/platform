import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { isDatabaseIdentityDiagnosticEnabled } from './database-identity'
import { isPreviewInfrastructureAccepted } from './preview-isolation'

// A fresh, independently generated 256-bit hex key for this diagnostic only.
// No cron/finance fallback and no change to their existing authorization policy.
export function isDatabaseIdentityDiagnosticAuthorized(authorizationHeader: string | null) {
  if (!isDatabaseIdentityDiagnosticEnabled() || !isPreviewInfrastructureAccepted()) return false
  const secret = process.env.DATABASE_IDENTITY_DIAGNOSTIC_SECRET
  if (!secret || secret.length !== 64 || !/^[a-f0-9]{64}$/.test(secret)
    || secret === process.env.CRON_SECRET
    || secret === process.env.FINANCIAL_MAINTENANCE_SECRET
    || !authorizationHeader?.startsWith('Bearer ')) return false
  const supplied = authorizationHeader.slice('Bearer '.length)
  if (supplied.length !== 64 || !/^[a-f0-9]{64}$/.test(supplied)) return false
  return timingSafeEqual(Buffer.from(secret, 'hex'), Buffer.from(supplied, 'hex'))
}
