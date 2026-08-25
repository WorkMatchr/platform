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
    && email.to === 'preview-invoice-e2e-member-20260823@workmatchr.example.invalid'
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
  paidAmountInclVatCents: number
  paidAt: Date
  downloadUrl: string
}): AuthEmail {
  const safeName = escapeHtml(input.recipientName)
  const safeInvoiceNumber = escapeHtml(input.invoiceNumber)
  const safeDownloadUrl = escapeHtml(input.downloadUrl)
  const paidAmount = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(input.paidAmountInclVatCents / 100)
  const paidDate = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(input.paidAt)
  const safePaidAmount = escapeHtml(paidAmount)
  const safePaidDate = escapeHtml(paidDate)
  const logoUrl = 'https://www.workmatchr.nl/branding/workmatchr-logo.png'
  return {
    kind: 'FINANCIAL_INVOICE',
    to: input.to,
    subject: `Uw betaling is ontvangen - factuur ${input.invoiceNumber}`,
    text: `Beste ${input.recipientName},\n\nUw betaling is ontvangen.\n\nFactuurnummer: ${input.invoiceNumber}\nBetaald bedrag: ${paidAmount}\nBetaaldatum: ${paidDate}\n\nFactuur bekijken: ${input.downloadUrl}\n\nUw factuur blijft ook beschikbaar in uw WorkMatchr-account.\n\nMet vriendelijke groet,\nWorkMatchr\nwww.workmatchr.nl`,
    html: `<!doctype html><html lang="nl"><head><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body style="margin:0;padding:0;background:#f3f8fb;color:#123044;font-family:Arial,Helvetica,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f8fb;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #d8e6ee;border-radius:14px;overflow:hidden;"><tr><td style="padding:30px 34px 22px;border-bottom:3px solid #0d6e9e;"><img src="${logoUrl}" width="210" alt="WorkMatchr" style="display:block;width:210px;max-width:100%;height:auto;border:0;"></td></tr><tr><td style="padding:34px;"><h1 style="margin:0 0 14px;font-size:28px;line-height:1.25;color:#07304a;">Uw betaling is ontvangen</h1><p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#314f61;">Beste ${safeName},<br><br>Bedankt. Uw betaling is verwerkt en de factuur staat veilig voor u klaar.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#eef7fb;border:1px solid #cce2ed;border-radius:10px;"><tr><td style="padding:22px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:0 0 10px;color:#5b7483;font-size:13px;">Factuurnummer</td><td align="right" style="padding:0 0 10px;color:#07304a;font-size:14px;font-weight:bold;">${safeInvoiceNumber}</td></tr><tr><td style="padding:10px 0;border-top:1px solid #d5e7ef;color:#5b7483;font-size:13px;">Betaald bedrag</td><td align="right" style="padding:10px 0;border-top:1px solid #d5e7ef;color:#07304a;font-size:17px;font-weight:bold;">${safePaidAmount}</td></tr><tr><td style="padding:10px 0 0;border-top:1px solid #d5e7ef;color:#5b7483;font-size:13px;">Betaaldatum</td><td align="right" style="padding:10px 0 0;border-top:1px solid #d5e7ef;color:#07304a;font-size:14px;">${safePaidDate}</td></tr></table></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 20px;"><tr><td bgcolor="#0d6e9e" style="border-radius:8px;"><a href="${safeDownloadUrl}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">Factuur bekijken</a></td></tr></table><p style="margin:0;font-size:14px;line-height:1.6;color:#5b7483;">De factuur blijft ook beschikbaar in uw WorkMatchr-account.</p></td></tr><tr><td style="padding:22px 34px;background:#07304a;color:#dcebf2;font-size:12px;line-height:1.6;">Met vriendelijke groet,<br><strong style="color:#ffffff;">WorkMatchr</strong><br><a href="https://www.workmatchr.nl" style="color:#9dd5ed;text-decoration:none;">www.workmatchr.nl</a><br><a href="https://www.workmatchr.nl/contact" style="color:#9dd5ed;text-decoration:none;">Neem contact met ons op</a></td></tr></table></td></tr></table></body></html>`,
  }
}
