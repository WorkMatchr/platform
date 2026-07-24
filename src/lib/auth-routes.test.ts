import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUTH_BASE_PATH } from '@/lib/auth-config'

const root = process.cwd()

describe('Better Auth-routes', () => {
  it('legt de server- en client-basePath expliciet en gelijk vast', () => {
    const server = readFileSync(join(root, 'src', 'lib', 'auth.ts'), 'utf8')
    const client = readFileSync(join(root, 'src', 'lib', 'auth-client.ts'), 'utf8')
    expect(AUTH_BASE_PATH).toBe('/api/auth')
    expect(server).toContain('basePath: AUTH_BASE_PATH')
    expect(client).toContain('createAuthClient({ basePath: AUTH_BASE_PATH })')
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
})
