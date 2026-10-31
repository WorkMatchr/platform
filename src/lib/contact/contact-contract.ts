import { z } from 'zod'

export const contactSubjects = { GENERAL: 'Algemene vraag', TECHNICAL: 'Technische ondersteuning', PRIVACY: 'Privacy of klacht', OTHER: 'Overig' } as const

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Vul uw naam in.').max(100, 'Gebruik maximaal 100 tekens.'),
  email: z.string().trim().email('Vul een geldig e-mailadres in.').max(254).transform(value => value.toLowerCase()),
  subject: z.enum(['GENERAL', 'TECHNICAL', 'PRIVACY', 'OTHER'], { error: 'Kies een onderwerp.' }),
  message: z.string().trim().min(10, 'Beschrijf uw vraag in minimaal 10 tekens.').max(4000, 'Gebruik maximaal 4000 tekens.'),
  website: z.string().max(200).default(''),
  requestId: z.uuid(),
}).strict()
export type ContactInput = z.infer<typeof contactSchema>
export type ContactResult = { ok: boolean; message: string; errors?: Partial<Record<'name' | 'email' | 'subject' | 'message', string>> }
