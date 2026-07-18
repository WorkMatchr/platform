import { z } from 'zod'

export const organizationInvitationSchema = z.object({
  displayName: z.string().trim().min(1, 'Vul de naam van de gebruiker in.').max(100, 'Gebruik maximaal 100 tekens.'),
  email: z.string().trim().max(254).email('Vul een geldig e-mailadres in.').transform((value) => value.toLowerCase()),
  role: z.enum(['MEMBER', 'ADMIN'], { error: 'Kies een geldige organisatierol.' }),
  idempotencyKey: z.string().min(12).max(120).regex(/^[a-zA-Z0-9:_-]+$/),
})

export type OrganizationInvitationInput = z.infer<typeof organizationInvitationSchema>
