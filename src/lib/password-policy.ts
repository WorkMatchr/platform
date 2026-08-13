import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 15
export const PASSWORD_MAX_LENGTH = 64

export const PASSWORD_TOO_SHORT_MESSAGE = 'Gebruik minimaal 15 tekens.'
export const PASSWORD_TOO_LONG_MESSAGE = 'Gebruik maximaal 64 tekens.'
export const PASSWORD_REJECTED_MESSAGE = 'Kies een ander wachtwoord. Dit wachtwoord is te bekend of onvoldoende veilig.'
export const PASSWORD_CHECK_UNAVAILABLE_MESSAGE = 'De wachtwoordcontrole kan tijdelijk niet worden uitgevoerd. Probeer het later opnieuw.'

export type PasswordPolicyViolation = 'TOO_SHORT' | 'TOO_LONG' | 'PREDICTABLE'

export type PasswordAccountHints = {
  email?: string | null
  displayName?: string | null
}

function normalizedPassword(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/[^\p{L}\p{N}]/gu, '')
}

function accountTerms(hints: PasswordAccountHints): string[] {
  const source = [hints.email?.split('@')[0], hints.displayName]
  return source
    .flatMap((value) => value?.normalize('NFKC').toLocaleLowerCase('nl-NL').split(/[^\p{L}\p{N}]+/u) ?? [])
    .map((value) => normalizedPassword(value))
    .filter((value) => value.length >= 5)
}

function isPredictablePassword(password: string, hints: PasswordAccountHints): boolean {
  const compact = normalizedPassword(password)
  if (!compact) return true

  const commonPrefixes = ['password', 'wachtwoord', 'qwerty', 'asdf', 'zxcv', 'letmein', 'welkom', 'admin', 'workmatchr']
  if (commonPrefixes.some((prefix) => compact.startsWith(prefix))) return true
  if (/^(?:1234567890|0987654321|123456|654321)/.test(compact)) return true
  if (/^(.)\1{5,}$/u.test(compact)) return true
  if (/^(?:abc|abcd|abcdef|qwerty|azerty|test){2,}/.test(compact)) return true

  return accountTerms(hints).some((term) => compact.startsWith(term) || compact.includes(`${term}password`) || compact.includes(`${term}wachtwoord`))
}

export function getPasswordPolicyViolation(
  password: string,
  hints: PasswordAccountHints = {},
): PasswordPolicyViolation | undefined {
  if (password.length < PASSWORD_MIN_LENGTH) return 'TOO_SHORT'
  if (password.length > PASSWORD_MAX_LENGTH) return 'TOO_LONG'
  if (isPredictablePassword(password, hints)) return 'PREDICTABLE'
  return undefined
}

export function passwordPolicyMessage(violation: PasswordPolicyViolation): string {
  if (violation === 'TOO_SHORT') return PASSWORD_TOO_SHORT_MESSAGE
  if (violation === 'TOO_LONG') return PASSWORD_TOO_LONG_MESSAGE
  return PASSWORD_REJECTED_MESSAGE
}

export function assertPasswordPolicy(password: string, hints: PasswordAccountHints = {}): void {
  const violation = getPasswordPolicyViolation(password, hints)
  if (violation) throw new PasswordPolicyError(violation)
}

export class PasswordPolicyError extends Error {
  constructor(public readonly violation: PasswordPolicyViolation) {
    super(passwordPolicyMessage(violation))
    this.name = 'PasswordPolicyError'
  }
}

export const newPasswordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, PASSWORD_TOO_SHORT_MESSAGE)
  .max(PASSWORD_MAX_LENGTH, PASSWORD_TOO_LONG_MESSAGE)
  .superRefine((password, context) => {
    const violation = getPasswordPolicyViolation(password)
    if (violation === 'PREDICTABLE') context.addIssue({ code: 'custom', message: PASSWORD_REJECTED_MESSAGE })
  })
