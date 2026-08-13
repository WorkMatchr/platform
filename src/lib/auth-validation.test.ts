import { describe, expect, it } from 'vitest'
import { GENERIC_RESET_CONFIRMATION, GENERIC_SIGN_IN_ERROR, normalizeEmail, registrationSchema, resetPasswordSchema } from '@/lib/auth-validation'
import { getPasswordPolicyViolation, PASSWORD_MAX_LENGTH } from '@/lib/password-policy'

const validPassword = 'veilige wachtzin met ruimte'
const valid = { accountType: 'CLIENT', name: 'Test Gebruiker', email: 'TEST@EXAMPLE.INVALID', password: validPassword, passwordConfirmation: validPassword, acceptedTerms: 'on' }

describe('registratievalidatie', () => {
  it('normaliseert een geldig e-mailadres', () => { expect(registrationSchema.parse(valid).email).toBe('test@example.invalid') })
  it('weigert een ongeldig e-mailadres', () => { expect(registrationSchema.safeParse({ ...valid, email: 'ongeldig' }).success).toBe(false) })
  it('weigert een wachtwoord van veertien tekens', () => { expect(registrationSchema.safeParse({ ...valid, password: 'a'.repeat(14), passwordConfirmation: 'a'.repeat(14) }).success).toBe(false) })
  it('accepteert vijftien en vierenzestig tekens zonder compositionregel', () => {
    expect(getPasswordPolicyViolation('abcdefghijklmno')).toBeUndefined()
    expect(getPasswordPolicyViolation('abcdefghijklmno'.repeat(4) + 'abcd')).toBeUndefined()
  })
  it('weigert vijfenzestig tekens', () => { expect(getPasswordPolicyViolation('a'.repeat(PASSWORD_MAX_LENGTH + 1))).toBe('TOO_LONG') })
  it('accepteert een wachtzin met spaties', () => { expect(registrationSchema.safeParse({ ...valid, password: validPassword, passwordConfirmation: validPassword }).success).toBe(true) })
  it('weigert lokale veelgebruikte en WorkMatchr-gerelateerde wachtwoorden', () => {
    expect(getPasswordPolicyViolation('password met extra woorden')).toBe('PREDICTABLE')
    expect(getPasswordPolicyViolation('WorkMatchr veilig wachtwoord')).toBe('PREDICTABLE')
  })
  it('gebruikt dezelfde policy voor resetten', () => {
    expect(resetPasswordSchema.safeParse({ token: 'token', password: 'a'.repeat(14), passwordConfirmation: 'a'.repeat(14) }).success).toBe(false)
  })
  it('weigert ongelijke wachtwoorden', () => { expect(registrationSchema.safeParse({ ...valid, passwordConfirmation: 'b'.repeat(16) }).success).toBe(false) })
  it('weigert registratie zonder juridisch akkoord', () => { expect(registrationSchema.safeParse({ ...valid, acceptedTerms: undefined }).success).toBe(false) })
  it('weigert registratie zonder accounttype', () => { expect(registrationSchema.safeParse({ ...valid, accountType: undefined }).success).toBe(false) })
  it('accepteert een professionalaccount', () => { expect(registrationSchema.parse({ ...valid, accountType: 'PROFESSIONAL' }).accountType).toBe('PROFESSIONAL') })
})

describe('enumeratiebestendige meldingen', () => {
  it('gebruikt één generieke inlogmelding', () => { expect(GENERIC_SIGN_IN_ERROR).not.toContain('bestaat') })
  it('gebruikt één generieke resetbevestiging', () => { expect(GENERIC_RESET_CONFIRMATION).toContain('Als dit e-mailadres bij ons bekend is') })
  it('normaliseert losse invoer', () => { expect(normalizeEmail('  IEMAND@EXAMPLE.INVALID ')).toBe('iemand@example.invalid') })
})
