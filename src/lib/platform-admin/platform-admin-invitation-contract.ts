import { z } from 'zod'

export const platformAdminInvitationSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
    idempotencyKey: z.string().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
    ownerConfirmed: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.role === 'OWNER' && !value.ownerConfirmed) {
      context.addIssue({
        code: 'custom',
        path: ['ownerConfirmed'],
        message: 'Bevestig expliciet dat deze uitnodiging eigenaarsrechten geeft.',
      })
    }
  })
