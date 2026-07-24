import { Resend } from 'resend'

type AuthEmail = {
  kind: 'INVITATION' | 'VERIFICATION' | 'PASSWORD_RESET' | 'ROLE_CHANGE_NOTIFICATION'
  to: string
  subject: string
  text: string
  html: string
  developmentUrl?: string
}

export type AuthEmailDeliveryResult = {
  accepted: true
  transport: 'RESEND' | 'DEVELOPMENT_LOG'
  status: 'ACCEPTED' | 'DEVELOPMENT_ONLY'
  messageId: string
}

export type AuthEmailDeliveryErrorCode =
  | 'EMAIL_DELIVERY_NOT_CONFIGURED'
  | 'EMAIL_PROVIDER_REJECTED'
  | 'EMAIL_PROVIDER_RESPONSE_INVALID'
  | 'EMAIL_PROVIDER_UNAVAILABLE'

export class AuthEmailDeliveryError extends Error {
  constructor(
    public readonly code: AuthEmailDeliveryErrorCode,
    message: string,
    public readonly providerStatusCode: number | null = null,
  ) {
    super(message)
    this.name = 'AuthEmailDeliveryError'
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }
    return entities[character]
  })
}

function isDevelopmentTestRecipient(email: AuthEmail): boolean {
  return process.env.NODE_ENV !== 'production' && email.to.toLowerCase().endsWith('@example.invalid')
}

function logDevelopmentAuthLink(email: AuthEmail): void {
  if (process.env.NODE_ENV !== 'development' || !email.developmentUrl) return

  const passwordReset = email.kind === 'PASSWORD_RESET'
  console.info([
    '==================================================',
    passwordReset ? 'PASSWORD RESET' : 'EMAIL VERIFICATION',
    '',
    'Email:',
    email.to,
    '',
    passwordReset ? 'Reset URL:' : 'Verification URL:',
    email.developmentUrl,
    '',
    '==================================================',
  ].join('\n'))
}

export function getAuthEmailConfigurationStatus() {
  const from = process.env.AUTH_EMAIL_FROM?.trim() ?? ''
  return {
    resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    fromConfigured: Boolean(from),
    fromAddress: from || null,
  }
}

export async function sendAuthEmail(email: AuthEmail): Promise<AuthEmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  logDevelopmentAuthLink(email)

  if (!apiKey || !from) {
    if (isDevelopmentTestRecipient(email)) {
      if (!email.developmentUrl) {
        console.info(`[DEVELOPMENT-ONLY AUTH EMAIL] ${email.subject}`)
      }
      return {
        accepted: true,
        transport: 'DEVELOPMENT_LOG',
        status: 'DEVELOPMENT_ONLY',
        messageId: 'development-only',
      }
    }

    throw new AuthEmailDeliveryError(
      'EMAIL_DELIVERY_NOT_CONFIGURED',
      'De e-mailprovider is niet volledig geconfigureerd.',
    )
  }

  let result
  try {
    result = await new Resend(apiKey).emails.send({ from, to: email.to, subject: email.subject, text: email.text, html: email.html })
  } catch {
    throw new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'De e-mailprovider kon niet worden bereikt.')
  }
  if (result.error) {
    throw new AuthEmailDeliveryError(
      'EMAIL_PROVIDER_REJECTED',
      'De e-mailprovider heeft het bericht niet geaccepteerd.',
      result.error.statusCode ?? null,
    )
  }
  if (!result.data?.id) {
    throw new AuthEmailDeliveryError(
      'EMAIL_PROVIDER_RESPONSE_INVALID',
      'De e-mailprovider gaf geen geldig bericht-ID terug.',
    )
  }
  return { accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: result.data.id }
}

export function verificationEmail(to: string, name: string, url: string): AuthEmail {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  const invitation = url.includes('status%3Duitnodiging') || url.includes('status=uitnodiging')
  if (invitation) {
    return {
      kind: 'INVITATION',
      to,
      subject: 'U bent uitgenodigd voor WorkMatchr',
      text: `Beste ${name},\n\nU bent uitgenodigd voor WorkMatchr. Bevestig eerst Uw e-mailadres via deze link: ${url}\n\nDaarna stelt U via de wachtwoordherstelpagina een eigen wachtwoord in. De link is één uur geldig.`,
      html: `<p>Beste ${safeName},</p><p>U bent uitgenodigd voor WorkMatchr. Bevestig eerst Uw e-mailadres.</p><p><a href="${safeUrl}">E-mailadres bevestigen</a></p><p>Daarna stelt U via de wachtwoordherstelpagina een eigen wachtwoord in. De link is één uur geldig.</p>`,
      developmentUrl: url,
    }
  }
  return {
    kind: 'VERIFICATION',
    to,
    subject: 'Bevestig Uw e-mailadres voor WorkMatchr',
    text: `Beste ${name},\n\nBevestig Uw e-mailadres via deze link: ${url}\n\nDe link is één uur geldig.`,
    html: `<p>Beste ${safeName},</p><p>Bevestig Uw e-mailadres voor WorkMatchr.</p><p><a href="${safeUrl}">E-mailadres bevestigen</a></p><p>De link is één uur geldig.</p>`,
    developmentUrl: url,
  }
}

export function passwordResetEmail(to: string, name: string, url: string): AuthEmail {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    kind: 'PASSWORD_RESET',
    to,
    subject: 'Herstel Uw WorkMatchr-wachtwoord',
    text: `Beste ${name},\n\nStel een nieuw wachtwoord in via deze link: ${url}\n\nDe link is één uur geldig.`,
    html: `<p>Beste ${safeName},</p><p>U kunt een nieuw WorkMatchr-wachtwoord instellen.</p><p><a href="${safeUrl}">Wachtwoord herstellen</a></p><p>De link is één uur geldig.</p>`,
    developmentUrl: url,
  }
}

export function roleChangeNotificationEmail(input: {
  to: string
  name: string
  organizationName: string
  previousRole: 'ADMIN' | 'MEMBER'
  newRole: 'ADMIN' | 'MEMBER'
  changedAt: Date
}): AuthEmail {
  const roleLabel = (role: 'ADMIN' | 'MEMBER') => role === 'ADMIN' ? 'Beheerder' : 'Lid'
  const changedAt = new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  }).format(input.changedAt)
  const safeName = escapeHtml(input.name)
  const safeOrganization = escapeHtml(input.organizationName)
  return {
    kind: 'ROLE_CHANGE_NOTIFICATION',
    to: input.to,
    subject: `Uw rol binnen ${input.organizationName} is gewijzigd`,
    text: `Beste ${input.name},\n\nUw rol binnen ${input.organizationName} is op ${changedAt} gewijzigd van ${roleLabel(input.previousRole)} naar ${roleLabel(input.newRole)}. Uw actieve sessies zijn beëindigd; log opnieuw in om met de actuele bevoegdheden verder te gaan.\n\nWas deze wijziging onverwacht? Neem dan contact op met Uw organisatie of via de contactmogelijkheid van WorkMatchr.`,
    html: `<p>Beste ${safeName},</p><p>Uw rol binnen <strong>${safeOrganization}</strong> is op ${changedAt} gewijzigd van <strong>${roleLabel(input.previousRole)}</strong> naar <strong>${roleLabel(input.newRole)}</strong>.</p><p>Uw actieve sessies zijn beëindigd. Log opnieuw in om met de actuele bevoegdheden verder te gaan.</p><p>Was deze wijziging onverwacht? Neem dan contact op met Uw organisatie of via de contactmogelijkheid van WorkMatchr.</p>`,
  }
}
