import { z } from 'zod'

export const GENERIC_SIGN_IN_ERROR = 'De combinatie van e-mailadres en wachtwoord is niet correct.'
export const GENERIC_RESET_CONFIRMATION =
  'Als dit e-mailadres bij ons bekend is, ontvangt U een bericht met verdere instructies.'
export const GENERIC_VERIFICATION_CONFIRMATION =
  'Als dit e-mailadres bij ons bekend is en nog verificatie nodig heeft, ontvangt U een nieuw bericht.'
export const GENERIC_AUTH_REQUEST_ERROR =
  'De aanvraag kon niet worden verwerkt. Probeer het later opnieuw.'
export const GENERIC_AUTH_RATE_LIMIT_ERROR =
  'U hebt te veel pogingen gedaan. Probeer het later opnieuw.'

const email = z.string().trim().max(254).email('Vul een geldig e-mailadres in.').transform((value) => value.toLowerCase())
const password = z.string().min(12, 'Gebruik minimaal 12 tekens.').max(128, 'Gebruik maximaal 128 tekens.')

export const registrationSchema = z
  .object({
    name: z.string().trim().min(1, 'Vul Uw volledige naam in.').max(100, 'Gebruik maximaal 100 tekens.'),
    email,
    password,
    passwordConfirmation: z.string(),
    acceptedTerms: z.literal('on', { error: 'U moet akkoord gaan om een account te registreren.' }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'De wachtwoorden zijn niet gelijk.',
    path: ['passwordConfirmation'],
  })

export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  returnTo: z.string().optional(),
})

export const emailSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(2048),
    password,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'De wachtwoorden zijn niet gelijk.',
    path: ['passwordConfirmation'],
  })

export type FormState = {
  status: 'idle' | 'error' | 'success'
  message?: string
  errors?: Record<string, string[] | undefined>
}

export const initialFormState: FormState = { status: 'idle' }

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
