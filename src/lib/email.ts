import { Resend } from 'resend'

export type AuthEmail = {
  kind:
    | 'INVITATION'
    | 'VERIFICATION'
    | 'PASSWORD_RESET'
    | 'ROLE_CHANGE_NOTIFICATION'
    | 'TWO_FACTOR_RESET_NOTIFICATION'
    | 'ADMIN_MESSAGE'
    | 'FINANCIAL_INVOICE'
  to: string
  subject: string
  text: string
  html: string
  developmentUrl?: string
  idempotencyKey?: string
}

export type AuthEmailDeliveryResult = {
  accepted: true
  transport: 'RESEND' | 'DEVELOPMENT_LOG'
  status: 'ACCEPTED' | 'DEVELOPMENT_ONLY'
  messageId: string
  previewRecipientOverrideUsed?: boolean
}

export type AuthEmailDeliveryErrorCode =
  | 'EMAIL_DELIVERY_NOT_CONFIGURED'
  | 'EMAIL_PROVIDER_REJECTED'
  | 'EMAIL_PROVIDER_RESPONSE_INVALID'
  | 'EMAIL_PROVIDER_UNAVAILABLE'
  | 'PREVIEW_EMAIL_OVERRIDE_FORBIDDEN'
  | 'PREVIEW_EMAIL_OVERRIDE_INVALID'

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

function isPreviewInvoiceFixtureVerification(email: AuthEmail): boolean {
  return process.env.VERCEL_ENV === 'preview'
    && email.kind === 'VERIFICATION'
    && [
      'preview-invoice-e2e-member-20260823@workmatchr.example.invalid',
      'preview-invoice-e2e-mail-20260823@workmatchr.example.invalid',
      'preview-invoice-e2e-mail2-20260823@workmatchr.example.invalid',
      'preview-invoice-e2e-mail3-20260823@workmatchr.example.invalid',
    ].includes(email.to)
}

function resolvePreviewInvoiceRecipientOverride(email: AuthEmail) {
  const configuredRecipient = process.env.PREVIEW_EMAIL_RECIPIENT_OVERRIDE?.trim()
  if (!configuredRecipient || email.kind !== 'FINANCIAL_INVOICE') {
    return { email, previewRecipientOverrideUsed: false }
  }

  if (process.env.VERCEL_ENV !== 'preview') {
    throw new AuthEmailDeliveryError(
      'PREVIEW_EMAIL_OVERRIDE_FORBIDDEN',
      'De Preview-factuurmailoverride is buiten Preview niet toegestaan.',
    )
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredRecipient)) {
    throw new AuthEmailDeliveryError(
      'PREVIEW_EMAIL_OVERRIDE_INVALID',
      'De Preview-factuurmailoverride is ongeldig geconfigureerd.',
    )
  }

  return {
    email: {
      ...email,
      to: configuredRecipient,
      subject: `[PREVIEW TEST] ${email.subject}`,
    },
    previewRecipientOverrideUsed: true,
  }
}

function logDevelopmentAuthLink(email: AuthEmail): void {
  if (process.env.NODE_ENV !== 'development' || !email.developmentUrl) return

  const passwordReset = email.kind === 'PASSWORD_RESET'
  const accountActivation = email.kind === 'INVITATION'
  const heading = accountActivation
    ? 'Development account activation email'
    : passwordReset
      ? 'Development password reset email'
      : 'Development verification email'
  const urlLabel = accountActivation ? 'Activation URL:' : passwordReset ? 'Reset URL:' : 'Verify URL:'
  const block = [
    '--------------------------------------------------',
    heading,
    `To: ${email.to}`,
    urlLabel,
    email.developmentUrl,
    '--------------------------------------------------',
  ].join('\n')

  process.stdout.write(`${block}\n`)
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
  const resolved = resolvePreviewInvoiceRecipientOverride(email)
  const deliveryEmail = resolved.email
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  logDevelopmentAuthLink(deliveryEmail)

  if (isPreviewInvoiceFixtureVerification(deliveryEmail)) {
    return {
      accepted: true,
      transport: 'DEVELOPMENT_LOG',
      status: 'DEVELOPMENT_ONLY',
      messageId: 'preview-invoice-fixture-only',
    }
  }

  if (!apiKey || !from) {
    if (isDevelopmentTestRecipient(deliveryEmail)) {
      if (!deliveryEmail.developmentUrl) {
        console.info(`[DEVELOPMENT-ONLY AUTH EMAIL] ${deliveryEmail.subject}`)
      }
      return {
        accepted: true,
        transport: 'DEVELOPMENT_LOG',
        status: 'DEVELOPMENT_ONLY',
        messageId: 'development-only',
        ...(resolved.previewRecipientOverrideUsed ? { previewRecipientOverrideUsed: true } : {}),
      }
    }

    throw new AuthEmailDeliveryError(
      'EMAIL_DELIVERY_NOT_CONFIGURED',
      'De e-mailprovider is niet volledig geconfigureerd.',
    )
  }

  let result
  try {
    result = await new Resend(apiKey).emails.send(
      { from, to: deliveryEmail.to, subject: deliveryEmail.subject, text: deliveryEmail.text, html: deliveryEmail.html },
      deliveryEmail.idempotencyKey ? { headers: { 'Idempotency-Key': deliveryEmail.idempotencyKey } } : undefined,
    )
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
  return {
    accepted: true,
    transport: 'RESEND',
    status: 'ACCEPTED',
    messageId: result.data.id,
    ...(resolved.previewRecipientOverrideUsed ? { previewRecipientOverrideUsed: true } : {}),
  }
}

export function verificationEmail(to: string, name: string, url: string): AuthEmail {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    kind: 'VERIFICATION',
    to,
    subject: 'Bevestig uw e-mailadres voor WorkMatchr',
    text: `Beste ${name},\n\nBevestig uw e-mailadres via deze link: ${url}\n\nDe link is één uur geldig.`,
    html: `<p>Beste ${safeName},</p><p>Bevestig uw e-mailadres voor WorkMatchr.</p><p><a href="${safeUrl}">E-mailadres bevestigen</a></p><p>De link is één uur geldig.</p>`,
    developmentUrl: url,
  }
}

export function invitationActivationEmail(
  to: string,
  name: string,
  organizationName: string,
  url: string,
): AuthEmail {
  const safeName = escapeHtml(name)
  const safeOrganizationName = escapeHtml(organizationName)
  const safeUrl = escapeHtml(url)
  return {
    kind: 'INVITATION',
    to,
    subject: `Account activeren voor ${organizationName}`,
    text: `Beste ${name},\n\n${organizationName} heeft u uitgenodigd voor WorkMatchr. Account activeren: ${url}\n\nVia deze beveiligde link kiest u uw wachtwoord. De link is één uur geldig.`,
    html: `<p>Beste ${safeName},</p><p><strong>${safeOrganizationName}</strong> heeft u uitgenodigd voor WorkMatchr.</p><p><a href="${safeUrl}">Account activeren</a></p><p>Via deze beveiligde link kiest u uw wachtwoord. De link is één uur geldig.</p>`,
    developmentUrl: url,
  }
}

export function passwordResetEmail(to: string, name: string, url: string): AuthEmail {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
    kind: 'PASSWORD_RESET',
    to,
    subject: 'Herstel uw WorkMatchr-wachtwoord',
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
    text: `Beste ${input.name},\n\nUw rol binnen ${input.organizationName} is op ${changedAt} gewijzigd van ${roleLabel(input.previousRole)} naar ${roleLabel(input.newRole)}. Uw actieve sessies zijn beëindigd; log opnieuw in om met de actuele bevoegdheden verder te gaan.\n\nWas deze wijziging onverwacht? Neem dan contact op met uw organisatie of via de contactmogelijkheid van WorkMatchr.`,
    html: `<p>Beste ${safeName},</p><p>Uw rol binnen <strong>${safeOrganization}</strong> is op ${changedAt} gewijzigd van <strong>${roleLabel(input.previousRole)}</strong> naar <strong>${roleLabel(input.newRole)}</strong>.</p><p>Uw actieve sessies zijn beëindigd. Log opnieuw in om met de actuele bevoegdheden verder te gaan.</p><p>Was deze wijziging onverwacht? Neem dan contact op met uw organisatie of via de contactmogelijkheid van WorkMatchr.</p>`,
  }
}

export function twoFactorResetNotificationEmail(input: {
  to: string
  name: string
  resetAt: Date
  platformRequired: boolean
}): AuthEmail {
  const resetAt = new Intl.DateTimeFormat('nl-NL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  }).format(input.resetAt)
  const safeName = escapeHtml(input.name)
  const platformMessage = input.platformRequired
    ? 'Stel tweestapsverificatie opnieuw in voordat u weer toegang krijgt tot platformbeheer.'
    : 'U kunt tweestapsverificatie later opnieuw instellen via uw accountbeveiliging.'
  return {
    kind: 'TWO_FACTOR_RESET_NOTIFICATION',
    to: input.to,
    subject: 'Uw tweestapsverificatie is gereset',
    text: `Beste ${input.name},\n\nUw tweestapsverificatie is op ${resetAt} door WorkMatchr-platformbeheer gereset. Uw eerdere tweestapsverificatie is niet meer actief. ${platformMessage}\n\nWas deze wijziging onverwacht? Neem dan contact op met WorkMatchr.`,
    html: `<p>Beste ${safeName},</p><p>Uw tweestapsverificatie is op <strong>${escapeHtml(resetAt)}</strong> door WorkMatchr-platformbeheer gereset.</p><p>Uw eerdere tweestapsverificatie is niet meer actief. ${escapeHtml(platformMessage)}</p><p>Was deze wijziging onverwacht? Neem dan contact op met WorkMatchr.</p>`,
  }
}

export function administrativeEmail(input: {
  to: string
  recipientName: string
  subject: string
  message: string
  senderName: string
}): AuthEmail {
  const safeName = escapeHtml(input.recipientName)
  const safeMessage = escapeHtml(input.message).replaceAll('\n', '<br />')
  const safeSender = escapeHtml(input.senderName)
  return {
    kind: 'ADMIN_MESSAGE',
    to: input.to,
    subject: input.subject,
    text: `Beste ${input.recipientName},\n\n${input.message}\n\nMet vriendelijke groet,\n${input.senderName}\nWorkMatchr`,
    html: `<p>Beste ${safeName},</p><p>${safeMessage}</p><p>Met vriendelijke groet,<br />${safeSender}<br />WorkMatchr</p>`,
  }
}

export function financialInvoiceEmail(input: {
  to: string
  recipientName: string
  invoiceNumber: string
  downloadUrl: string
}): AuthEmail {
  const safeName = escapeHtml(input.recipientName)
  const safeInvoiceNumber = escapeHtml(input.invoiceNumber)
  const safeDownloadUrl = escapeHtml(input.downloadUrl)
  return {
    kind: 'FINANCIAL_INVOICE',
    to: input.to,
    subject: `Uw WorkMatchr-factuur ${input.invoiceNumber}`,
    text: `Beste ${input.recipientName},\n\nUw betaling is verwerkt. U kunt factuur ${input.invoiceNumber} veilig bekijken en downloaden via: ${input.downloadUrl}\n\nMet vriendelijke groet,\nWorkMatchr`,
    html: `<p>Beste ${safeName},</p><p>Uw betaling is verwerkt. Uw factuur <strong>${safeInvoiceNumber}</strong> staat veilig voor u klaar.</p><p><a href="${safeDownloadUrl}">Factuur bekijken en downloaden</a></p><p>Met vriendelijke groet,<br />WorkMatchr</p>`,
  }
}
