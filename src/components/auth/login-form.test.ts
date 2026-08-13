import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('2FA-loginnavigatie', () => {
  it('stuurt een Better Auth 2FA-respons eerst naar de challenge en niet naar de normale successroute', () => {
    const source = read('src/components/auth/login-form.tsx')

    expect(source).toContain('getTwoFactorRedirectResponse(response.data)')
    expect(source).toContain("twoFactorRedirect?.twoFactorMethods.includes('totp')")
    expect(source).toContain('`/tweestapsverificatie?returnTo=${encodeURIComponent(destination)}`')
    expect(source.indexOf('twoFactorRedirect?.twoFactorMethods.includes')).toBeLessThan(source.lastIndexOf('window.location.assign(destination)'))
  })

  it('behoudt de veilige terugkeerroute na TOTP of herstelcode', () => {
    const source = read('src/components/auth/two-factor-challenge-form.tsx')

    expect(source).toContain("getSafeReturnUrl(returnTo, '/dashboard')")
    expect(source).toContain('authClient.twoFactor.verifyTotp')
    expect(source).toContain('authClient.twoFactor.verifyBackupCode')
  })
})
