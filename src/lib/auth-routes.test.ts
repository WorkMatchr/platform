import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUTH_BASE_PATH } from '@/lib/auth-config'

const root = process.cwd()

describe('Better Auth-routes', () => {
  it('legt de server- en client-basePath expliciet en gelijk vast met de native 2FA-clientplugin', () => {
    const server = readFileSync(join(root, 'src', 'lib', 'auth.ts'), 'utf8')
    const client = readFileSync(join(root, 'src', 'lib', 'auth-client.ts'), 'utf8')
    expect(AUTH_BASE_PATH).toBe('/api/auth')
    expect(server).toContain('basePath: AUTH_BASE_PATH')
    expect(client).toContain('createAuthClient({')
    expect(client).toContain('basePath: AUTH_BASE_PATH')
    expect(client).toContain('plugins: [twoFactorClient()]')
  })

  it('gebruikt voor verificatie de officiële Better Auth-clientroute', () => {
    const form = readFileSync(join(root, 'src', 'components', 'auth', 'email-request-form.tsx'), 'utf8')
    expect(form).toContain('authClient.sendVerificationEmail')
    expect(form).not.toContain('/api/auth/request-email-verification')
    expect(form).not.toContain('/api/auth/verify-request')
  })

  it('toont succes uitsluitend na een technisch geaccepteerde aanvraag', () => {
    const form = readFileSync(join(root, 'src', 'components', 'auth', 'email-request-form.tsx'), 'utf8')
    expect(form).toContain("requestResult === 'technical_error'")
    expect(form).toContain('error={hasError}')
    expect(form.indexOf("requestResult === 'technical_error'"))
      .toBeLessThan(form.indexOf('GENERIC_RESET_CONFIRMATION : GENERIC_VERIFICATION_CONFIRMATION'))
  })

  it('houdt uitnodigingsactivatie gescheiden van verificatie en wachtwoordherstel', () => {
    const service = readFileSync(join(root, 'src', 'lib', 'account-architecture', 'better-auth-invitation-service.ts'), 'utf8')
    const invitationService = readFileSync(join(root, 'src', 'lib', 'account-architecture', 'organization-invitation-service.ts'), 'utf8')
    const form = readFileSync(join(root, 'src', 'components', 'auth', 'activate-account-form.tsx'), 'utf8')
    const page = readFileSync(join(root, 'src', 'app', 'account-activeren', 'page.tsx'), 'utf8')

    expect(service).toContain('auth.api.requestPasswordReset')
    expect(service).toContain("redirectTo: '/account-activeren'")
    expect(service).not.toContain('sendVerificationEmail')
    expect(form).toContain('Account activeren')
    expect(form).toContain('authClient.resetPassword')
    expect(form).toContain('authClient.signIn.email')
    expect(page).not.toContain('Wachtwoord vergeten')
    expect(page).not.toContain('Wachtwoord instellen')
    expect(invitationService).toContain(
      'De uitnodiging is aangemaakt, maar de e-mail kon niet worden verzonden. Controleer de e-mailinstellingen of probeer het later opnieuw.',
    )
    expect(invitationService).not.toContain('e-mailprovider heeft verzending niet geaccepteerd')
  })
})
