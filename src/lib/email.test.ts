import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthEmailDeliveryError, passwordResetEmail, roleChangeNotificationEmail, sendAuthEmail, verificationEmail } from '@/lib/email'

const resendMocks = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendMocks.send }
  },
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  resendMocks.send.mockReset()
})

describe('authenticatie-e-mails', () => {
  it('maakt een Nederlandstalige verificatiemail met veilige HTML', () => { const email = verificationEmail('test@example.invalid', '<Test>', 'https://workmatchr.invalid/verifieer?token=test'); expect(email.subject).toContain('Bevestig'); expect(email.html).toContain('&lt;Test&gt;') })
  it('maakt een uitnodigingsmail zonder gedeeld tijdelijk wachtwoord', () => {
    const email = verificationEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/verify?callbackURL=%2Fverifieer-email%3Fstatus%3Duitnodiging')
    expect(email.subject).toContain('uitgenodigd')
    expect(email.text).toContain('een eigen wachtwoord')
    expect(email.text).not.toContain('tijdelijk wachtwoord:')
  })
  it('maakt een Nederlandstalige herstelmail', () => { expect(passwordResetEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/reset').subject).toContain('Herstel') })
  it('maakt een tokenloze rolwijzigingsnotificatie met organisatie, rollen, tijdstip en contactadvies', () => {
    const email = roleChangeNotificationEmail({
      to: 'test@example.invalid',
      name: 'Testgebruiker',
      organizationName: 'Testorganisatie',
      previousRole: 'ADMIN',
      newRole: 'MEMBER',
      changedAt: new Date('2026-07-18T10:00:00.000Z'),
    })
    expect(email.subject).toContain('Testorganisatie')
    expect(email.text).toContain('Beheerder')
    expect(email.text).toContain('Lid')
    expect(email.text).toContain('opnieuw in')
    expect(email.text).toContain('contact op')
    expect(email.text).not.toContain('token=')
    expect(email.developmentUrl).toBeUndefined()
  })
  it('faalt veilig in productie zonder e-mailprovider', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    await expect(sendAuthEmail(passwordResetEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/reset')))
      .rejects.toMatchObject({ code: 'EMAIL_DELIVERY_NOT_CONFIGURED' } satisfies Partial<AuthEmailDeliveryError>)
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
  it('behandelt een echt adres zonder Resend-configuratie nooit als verzonden', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    await expect(sendAuthEmail(verificationEmail(
      'info@feenstra-safetyconsulting.nl',
      'Feenstra Safety Consulting',
      'http://localhost:3000/api/auth/verify-email?token=verborgen&callbackURL=%2Fverifieer-email%3Fstatus%3Duitnodiging',
    ))).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_NOT_CONFIGURED' } satisfies Partial<AuthEmailDeliveryError>)
  })
  it('geeft voor een development-testadres een expliciet niet-productieresultaat terug', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    await expect(sendAuthEmail(verificationEmail(
      'invite@example.invalid',
      'Testgebruiker',
      'http://localhost:3000/api/auth/verify-email?token=test&callbackURL=%2Fverifieer-email%3Fstatus%3Duitnodiging',
    ))).resolves.toEqual({
      accepted: true,
      transport: 'DEVELOPMENT_LOG',
      status: 'DEVELOPMENT_ONLY',
      messageId: 'development-only',
    })
  })
  it('accepteert alleen een Resend-response met message ID als succesvolle verzending', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('AUTH_EMAIL_FROM', 'WorkMatchr <account@workmatchr.nl>')
    resendMocks.send.mockResolvedValue({ data: { id: 'resend-message-123' }, error: null })
    await expect(sendAuthEmail(passwordResetEmail(
      'ontvanger@example.invalid',
      'Ontvanger',
      'https://workmatchr.invalid/reset',
    ))).resolves.toEqual({
      accepted: true,
      transport: 'RESEND',
      status: 'ACCEPTED',
      messageId: 'resend-message-123',
    })
  })
  it('behoudt de Resend-statuscode bij een providerafwijzing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('AUTH_EMAIL_FROM', 'WorkMatchr <account@workmatchr.nl>')
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Afgewezen', statusCode: 422 },
    })
    await expect(sendAuthEmail(passwordResetEmail(
      'ontvanger@example.invalid',
      'Ontvanger',
      'https://workmatchr.invalid/reset',
    ))).rejects.toMatchObject({
      code: 'EMAIL_PROVIDER_REJECTED',
      providerStatusCode: 422,
    } satisfies Partial<AuthEmailDeliveryError>)
  })
})
