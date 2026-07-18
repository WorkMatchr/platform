import { describe, expect, it } from 'vitest'
import { organizationInvitationSchema } from './organization-invitation-validation'

const valid = {
  displayName: 'Nieuwe gebruiker',
  email: 'Nieuwe.Gebruiker@Example.Invalid',
  role: 'MEMBER',
  idempotencyKey: 'invite:12345678-1234-4000-8000-123456789abc',
}

describe('organisatie-uitnodigingsvalidatie', () => {
  it('normaliseert e-mail en accepteert MEMBER en ADMIN', () => {
    expect(organizationInvitationSchema.parse(valid).email).toBe('nieuwe.gebruiker@example.invalid')
    expect(organizationInvitationSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(true)
  })

  it('weigert OWNER en technische rolwaarden', () => {
    expect(organizationInvitationSchema.safeParse({ ...valid, role: 'OWNER' }).success).toBe(false)
    expect(organizationInvitationSchema.safeParse({ ...valid, role: 'PLATFORM_ADMIN' }).success).toBe(false)
  })

  it('geeft veldfouten voor ontbrekende naam en ongeldig e-mailadres', () => {
    const result = organizationInvitationSchema.safeParse({ ...valid, displayName: '', email: 'ongeldig' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.displayName?.[0]).toContain('naam')
      expect(result.error.flatten().fieldErrors.email?.[0]).toContain('geldig e-mailadres')
    }
  })
})
