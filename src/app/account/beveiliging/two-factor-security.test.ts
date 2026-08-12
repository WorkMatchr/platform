import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('accountbeveiliging met TOTP', () => {
  it('gebruikt uitsluitend de native Better Auth-flow voor enrollment, verificatie en uitschakelen', () => {
    const source = read('src/components/auth/two-factor-security-panel.tsx')
    expect(source).toContain('authClient.twoFactor.enable')
    expect(source).toContain('authClient.twoFactor.verifyTotp')
    expect(source).toContain('authClient.twoFactor.disable')
    expect(source).toContain('trustDevice: false')
  })

  it('toont herstelcodes eenmalig in client-state en stuurt ze nooit naar audit of serveractie', () => {
    const panel = read('src/components/auth/two-factor-security-panel.tsx')
    const auth = read('src/lib/auth.ts')
    const audit = read('src/lib/auth-two-factor-audit.ts')
    expect(panel).toContain('Bewaar deze herstelcodes nu veilig')
    expect(panel).toContain('setEnrollment')
    expect(auth).toContain("ctx.path !== '/two-factor/verify-totp'")
    expect(auth).toContain("eventType: 'TWO_FACTOR_ENROLLED'")
    expect(audit).not.toMatch(/backupCode|recoveryCode|totpURI|otpauth/i)
  })

  it('houdt platformaccounts server-side tegen bij uitschakelen en maakt beveiliging toegankelijk', () => {
    const auth = read('src/lib/auth.ts')
    const securityPage = read('src/app/account/beveiliging/page.tsx')
    expect(auth).toContain("ctx.path === '/two-factor/disable'")
    expect(auth).toContain("systemKey: 'WORKMATCHR_PLATFORM'")
    expect(auth).toContain('Tweestapsverificatie is vereist voor toegang tot platformbeheer.')
    expect(securityPage).toContain("requireUser('/account/beveiliging')")
  })

  it('rendert een aparte challenge zonder trusted-deviceoptie', () => {
    const challenge = read('src/components/auth/two-factor-challenge-form.tsx')
    expect(challenge).toContain('authClient.twoFactor.verifyTotp')
    expect(challenge).toContain('authClient.twoFactor.verifyBackupCode')
    expect(challenge).toContain('trustDevice: false')
    expect(challenge).not.toContain('Dit apparaat vertrouwen')
  })
})
