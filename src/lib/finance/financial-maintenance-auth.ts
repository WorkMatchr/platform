import { timingSafeEqual } from 'node:crypto'
import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'

export function isFinancialMaintenanceAuthorized(authorizationHeader: string | null) {
  if (!isPreviewInfrastructureAccepted()) return false
  const secret = process.env.FINANCIAL_MAINTENANCE_SECRET
  if (!secret || secret.length < 32 || !authorizationHeader?.startsWith('Bearer ')) return false
  const supplied = authorizationHeader.slice('Bearer '.length)
  const expectedBuffer = Buffer.from(secret)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

export function isFinancialMaintenanceCronAuthorized(authorizationHeader: string | null) {
  if (!isPreviewInfrastructureAccepted()) return false
  const secret = process.env.CRON_SECRET
  if (!secret || secret.length < 32 || !authorizationHeader?.startsWith('Bearer ')) return false
  const supplied = authorizationHeader.slice('Bearer '.length)
  const expectedBuffer = Buffer.from(secret)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}
