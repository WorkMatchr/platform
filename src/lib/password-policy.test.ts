import { describe, expect, it } from 'vitest'
import {
  getPasswordPolicyViolation,
  PASSWORD_CHECK_UNAVAILABLE_MESSAGE,
  PASSWORD_REJECTED_MESSAGE,
} from './password-policy'

describe('centrale wachtwoordpolicy', () => {
  it('weert voorspelbare accountvarianten zonder ze op te slaan', () => {
    expect(getPasswordPolicyViolation('frankpassword2026', { email: 'frank@example.invalid' })).toBe('PREDICTABLE')
  })

  it('geeft alleen veilige gebruikersmeldingen terug', () => {
    expect(PASSWORD_REJECTED_MESSAGE).toBe('Kies een ander wachtwoord. Dit wachtwoord is te bekend of onvoldoende veilig.')
    expect(PASSWORD_CHECK_UNAVAILABLE_MESSAGE).toBe('De wachtwoordcontrole kan tijdelijk niet worden uitgevoerd. Probeer het later opnieuw.')
    expect(`${PASSWORD_REJECTED_MESSAGE}${PASSWORD_CHECK_UNAVAILABLE_MESSAGE}`).not.toMatch(/sha|hash|hibp|prefix/i)
  })
})
