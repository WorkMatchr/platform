import { createHash } from 'node:crypto'
import { z } from 'zod'
export function certificateRecipientFingerprint(certificateId: string, email: string) {
  return createHash('sha256').update(JSON.stringify([certificateId,email.trim().toLowerCase()])).digest('hex')
}
export const certificateResendPayloadSchema = z.object({
  certificateId:z.string().uuid(),requestedByUserId:z.string().uuid(),platformOrganizationId:z.string().uuid(),
  actorRole:z.enum(['PLATFORM_OWNER','PLATFORM_ADMIN']),recipientFingerprint:z.string().regex(/^[0-9a-f]{64}$/),
}).strict()
