import { Resend } from 'resend'

type AuthEmail = {
  to: string
  subject: string
  text: string
  html: string
  developmentUrl: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }
    return entities[character]
  })
}

export async function sendAuthEmail(email: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.AUTH_EMAIL_FROM

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WorkMatchr e-mailconfiguratie ontbreekt in productie.')
    }

    console.info(`[DEVELOPMENT-ONLY AUTH LINK] ${email.subject}: ${email.developmentUrl}`)
    return
  }

  const result = await new Resend(apiKey).emails.send({ from, to: email.to, subject: email.subject, text: email.text, html: email.html })
  if (result.error) throw new Error(`Versturen van authenticatie-e-mail is mislukt: ${result.error.message}`)
}

export function verificationEmail(to: string, name: string, url: string): AuthEmail {
  const safeName = escapeHtml(name)
  const safeUrl = escapeHtml(url)
  return {
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
    to,
    subject: 'Herstel Uw WorkMatchr-wachtwoord',
    text: `Beste ${name},\n\nStel een nieuw wachtwoord in via deze link: ${url}\n\nDe link is één uur geldig.`,
    html: `<p>Beste ${safeName},</p><p>U kunt een nieuw WorkMatchr-wachtwoord instellen.</p><p><a href="${safeUrl}">Wachtwoord herstellen</a></p><p>De link is één uur geldig.</p>`,
    developmentUrl: url,
  }
}
