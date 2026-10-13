import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Vul uw naam in.').max(100, 'Gebruik maximaal 100 tekens.'),
  email: z.string().trim().email('Vul een geldig e-mailadres in.').max(254).transform(value => value.toLowerCase()),
  message: z.string().trim().min(10, 'Beschrijf uw vraag in minimaal 10 tekens.').max(4000, 'Gebruik maximaal 4000 tekens.'),
  website: z.string().max(200).default(''),
  requestId: z.uuid(),
}).strict()
export type ContactInput = z.infer<typeof contactSchema>
export type ContactResult = { ok: boolean; message: string; errors?: Partial<Record<'name' | 'email' | 'message', string>> }
