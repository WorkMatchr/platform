import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('loginnavigatie zonder 2FA', () => {
  it('gaat na een succesvolle e-mail- en wachtwoordlogin direct naar de veilige bestemming', () => {
    const source = read('src/components/auth/login-form.tsx')

    expect(source).toContain('authClient.signIn.email')
    expect(source).toContain("getSafeReturnUrl(result.data.returnTo, '/dashboard')")
    expect(source).toContain('window.location.assign(destination)')
    expect(source).not.toMatch(/twoFactor|tweestapsverificatie|totp|backupcode/i)
  })
})
