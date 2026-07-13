import { describe, expect, it } from 'vitest'
import { GENERIC_RESET_CONFIRMATION, GENERIC_SIGN_IN_ERROR, normalizeEmail, registrationSchema } from '@/lib/auth-validation'

const validPassword = 'a'.repeat(16)
const valid = { name: 'Test Gebruiker', email: 'TEST@EXAMPLE.INVALID', password: validPassword, passwordConfirmation: validPassword, acceptedTerms: 'on' }

describe('registratievalidatie', () => {
  it('normaliseert een geldig e-mailadres', () => { expect(registrationSchema.parse(valid).email).toBe('test@example.invalid') })
  it('weigert een ongeldig e-mailadres', () => { expect(registrationSchema.safeParse({ ...valid, email: 'ongeldig' }).success).toBe(false) })
  it('weigert een wachtwoord korter dan twaalf tekens', () => { expect(registrationSchema.safeParse({ ...valid, password: 'a'.repeat(11), passwordConfirmation: 'a'.repeat(11) }).success).toBe(false) })
  it('weigert ongelijke wachtwoorden', () => { expect(registrationSchema.safeParse({ ...valid, passwordConfirmation: 'b'.repeat(16) }).success).toBe(false) })
  it('weigert registratie zonder juridisch akkoord', () => { expect(registrationSchema.safeParse({ ...valid, acceptedTerms: undefined }).success).toBe(false) })
})

describe('enumeratiebestendige meldingen', () => {
  it('gebruikt één generieke inlogmelding', () => { expect(GENERIC_SIGN_IN_ERROR).not.toContain('bestaat') })
  it('gebruikt één generieke resetbevestiging', () => { expect(GENERIC_RESET_CONFIRMATION).toContain('Als dit e-mailadres bij ons bekend is') })
  it('normaliseert losse invoer', () => { expect(normalizeEmail('  IEMAND@EXAMPLE.INVALID ')).toBe('iemand@example.invalid') })
})
