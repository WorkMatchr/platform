import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('Better Auth-wachtwoordbeleid', () => {
  it('gebruikt de native Better Auth 1.6.23 HIBP-plugin met alleen relevante wachtwoordpaden', () => {
    const source = read('src/lib/auth.ts')

    expect(source).toContain("import { haveIBeenPwned } from 'better-auth/plugins/haveibeenpwned'")
    expect(source).toContain('haveIBeenPwned({')
    expect(source).toContain("paths: ['/sign-up/email', '/reset-password', '/change-password', '/set-password']")
    expect(source).toContain('PASSWORD_REJECTED_MESSAGE')
  })

  it('past de lokale policy toe vóór registratie, reset en wijziging zonder geheimen te loggen', () => {
    const source = read('src/lib/auth.ts')

    expect(source).toContain("ctx.path === '/sign-up/email' || ctx.path === '/reset-password' || ctx.path === '/change-password' || ctx.path === '/set-password'")
    expect(source).toContain('getPasswordPolicyViolation(password')
    expect(source).toContain("console.error('PASSWORD_BREACH_CHECK_UNAVAILABLE')")
    expect(source).not.toContain('console.error(password)')
    expect(source).not.toMatch(/console\.(log|info|warn|error).*prefix/i)
    expect(source).not.toMatch(/console\.(log|info|warn|error).*sha/i)
  })

  it('houdt alle wachtwoordvelden op dezelfde clientgrenzen', () => {
    for (const path of [
      'src/components/auth/register-form.tsx',
      'src/components/auth/reset-password-form.tsx',
      'src/components/auth/activate-account-form.tsx',
    ]) {
      const source = read(path)
      expect(source).toContain('PASSWORD_MIN_LENGTH')
      expect(source).toContain('PASSWORD_MAX_LENGTH')
    }
  })
})
