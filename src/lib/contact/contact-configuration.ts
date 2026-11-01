import 'server-only'
import { z } from 'zod'
import { getAuthEmailConfigurationStatus } from '@/lib/email'

export const CONTACT_TEMPLATE = 'CONTACT_MESSAGE'
export const CONTACT_RETENTION_MS = 7 * 24 * 60 * 60_000
export const CONTACT_METADATA_RETENTION_MS = 30 * 24 * 60 * 60_000
export const CONTACT_RATE_LIMIT_RETENTION_MS = 24 * 60 * 60_000
export function contactConfiguration() {
  const key = process.env.CONTACT_MESSAGE_ENCRYPTION_KEY ?? ''
  const recipient = process.env.CONTACT_EMAIL_TO?.trim() || 'contact@workmatchr.nl'
  if (!/^[a-f0-9]{64}$/i.test(key) || /[\r\n,;]/.test(recipient) || !z.email().max(254).safeParse(recipient).success) return null
  return { key: Buffer.from(key, 'hex'), recipient }
}
export function contactFormEnabled() {
  const email = getAuthEmailConfigurationStatus()
  return process.env.CONTACT_FORM_ENABLED === 'true' && process.env.CONTACT_OUTBOX_ENABLED === 'true'
    && Boolean(contactConfiguration()) && email.resendConfigured && email.fromConfigured
}
