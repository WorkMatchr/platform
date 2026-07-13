import { afterEach, describe, expect, it, vi } from 'vitest'
import { passwordResetEmail, sendAuthEmail, verificationEmail } from '@/lib/email'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('authenticatie-e-mails', () => {
  it('maakt een Nederlandstalige verificatiemail met veilige HTML', () => { const email = verificationEmail('test@example.invalid', '<Test>', 'https://workmatchr.invalid/verifieer?token=test'); expect(email.subject).toContain('Bevestig'); expect(email.html).toContain('&lt;Test&gt;') })
  it('maakt een Nederlandstalige herstelmail', () => { expect(passwordResetEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/reset').subject).toContain('Herstel') })
  it('faalt veilig in productie zonder e-mailprovider', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    await expect(sendAuthEmail(passwordResetEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/reset'))).rejects.toThrow('e-mailconfiguratie ontbreekt')
  })
  it('logt development-links zonder wachtwoorden of sessietokens', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    const log = vi.spyOn(console, 'info').mockImplementation(() => undefined)
    await sendAuthEmail(verificationEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/verify?token=verification-token'))
    const output = log.mock.calls.flat().join(' ')
    expect(output).toContain('DEVELOPMENT-ONLY AUTH LINK')
    expect(output).not.toContain('credential-marker')
    expect(output).not.toContain('session-marker')
  })
})
