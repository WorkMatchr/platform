import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AuthEmailDeliveryError,
  invitationActivationEmail,
  passwordResetEmail,
  roleChangeNotificationEmail,
  sendAuthEmail,
  verificationEmail,
} from '@/lib/email'

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
  it('maakt een uitnodigingsmail met één duidelijke accountactivatie', () => {
    const email = invitationActivationEmail(
      'test@example.invalid',
      'Test',
      'Voorbeeldorganisatie',
      'https://workmatchr.invalid/account-activeren?token=test',
    )
    expect(email.subject).toContain('Account activeren')
    expect(email.text).toContain('Account activeren')
    expect(email.html).toContain('Account activeren')
    expect(email.text).not.toContain('Wachtwoord vergeten')
    expect(email.text).not.toContain('Wachtwoord instellen')
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
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await expect(sendAuthEmail(passwordResetEmail('test@example.invalid', 'Test', 'https://workmatchr.invalid/reset')))
      .rejects.toMatchObject({ code: 'EMAIL_DELIVERY_NOT_CONFIGURED' } satisfies Partial<AuthEmailDeliveryError>)
    expect(output).not.toHaveBeenCalled()
  })
  it('logt de volledige verificatielink in het vaste developmentformaat', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const url = 'http://localhost:4317/api/auth/verify-email?token=verification-token'
    await sendAuthEmail(verificationEmail('verification@example.invalid', 'Test', url))
    expect(output).toHaveBeenCalledWith([
      '--------------------------------------------------',
      'Development verification email',
      'To: verification@example.invalid',
      'Verify URL:',
      url,
      '--------------------------------------------------',
      '',
    ].join('\n'))
  })
  it('logt de volledige resetlink in het vaste developmentformaat', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const url = 'http://localhost:4317/wachtwoord-herstellen/reset-token'
    await sendAuthEmail(passwordResetEmail('reset@example.invalid', 'Test', url))
    expect(output).toHaveBeenCalledWith([
      '--------------------------------------------------',
      'Development password reset email',
      'To: reset@example.invalid',
      'Reset URL:',
      url,
      '--------------------------------------------------',
      '',
    ].join('\n'))
  })
  it('logt een uitnodiging in development als accountactivatie', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const url = 'http://localhost:4317/api/auth/reset-password/activation-token?callbackURL=%2Faccount-activeren'
    await sendAuthEmail(invitationActivationEmail(
      'activation@example.invalid',
      'Test',
      'Voorbeeldorganisatie',
      url,
    ))
    expect(output).toHaveBeenCalledWith(expect.stringContaining('Development account activation email'))
    expect(output).toHaveBeenCalledWith(expect.stringContaining(`Activation URL:\n${url}`))
  })
  it('behandelt een echt adres zonder Resend-configuratie nooit als verzonden', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await expect(sendAuthEmail(invitationActivationEmail(
      'info@feenstra-safetyconsulting.nl',
      'Feenstra Safety Consulting',
      'Feenstra Safety Consulting',
      'http://localhost:3000/api/auth/reset-password/verborgen?callbackURL=%2Faccount-activeren',
    ))).rejects.toMatchObject({ code: 'EMAIL_DELIVERY_NOT_CONFIGURED' } satisfies Partial<AuthEmailDeliveryError>)
  })
  it('geeft voor een development-testadres een expliciet niet-productieresultaat terug', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    delete process.env.RESEND_API_KEY
    delete process.env.AUTH_EMAIL_FROM
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    await expect(sendAuthEmail(invitationActivationEmail(
      'invite@example.invalid',
      'Testgebruiker',
      'Voorbeeldorganisatie',
      'http://localhost:3000/api/auth/reset-password/test?callbackURL=%2Faccount-activeren',
    ))).resolves.toEqual({
      accepted: true,
      transport: 'DEVELOPMENT_LOG',
      status: 'DEVELOPMENT_ONLY',
      messageId: 'development-only',
    })
  })
  it('accepteert alleen een Resend-response met message ID als succesvolle verzending', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', 'test-resend-key')
    vi.stubEnv('AUTH_EMAIL_FROM', 'WorkMatchr <account@workmatchr.nl>')
    const output = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
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
    expect(output).not.toHaveBeenCalled()
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
