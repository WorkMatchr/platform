import { z } from 'zod'
import { createHmac } from 'node:crypto'
import { contactSchema, contactSubjects, type ContactResult } from './contact-contract'
import { escapeHtml, type AuthEmail, type AuthEmailDeliveryResult } from '@/lib/email'

type Dependencies = {
  recipient?: string
  reserve: (keys: { key: string; limit: number; windowMs: number }[]) => Promise<boolean | 'BUSY'>
  send: (mail: AuthEmail) => Promise<AuthEmailDeliveryResult>
}
export async function submitContact(payload: unknown, clientAddress: string, secret: string, dependencies: Dependencies): Promise<{ status: number; body: ContactResult; retryAfterSeconds?: number }> {
  const parsed = contactSchema.safeParse(payload)
  if (!parsed.success) {
    const errors: ContactResult['errors'] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'name' || field === 'email' || field === 'subject' || field === 'message') errors[field] ??= issue.message
    }
    return { status: 400, body: { ok: false, message: 'Controleer de gemarkeerde velden. Uw invoer blijft staan.', errors } }
  }
  const { name, email, subject, message, website, requestId } = parsed.data
  if (website) return { status: 400, body: { ok: false, message: 'Het bericht is niet verstuurd. Gebruik de gewone contactvelden.' } }
  if (secret.length < 32) return unavailable()
  const recipient = dependencies.recipient ?? 'contact@workmatchr.nl'
  if (/[\r\n,;]/.test(recipient) || !z.email().max(254).safeParse(recipient).success) return unavailable()
  const subjectLabel = contactSubjects[subject]
  const digest = (value: string) => createHmac('sha256', secret).update(value).digest('hex')
  try {
    // Shared persistent limits; only HMAC identifiers/counters, never message content.
    const allowed = await dependencies.reserve([
      { key: 'contact:global', limit: 30, windowMs: 600000 },
      { key: `contact:ip:${digest(clientAddress)}`, limit: 5, windowMs: 600000 },
      { key: `contact:email:${digest(email)}`, limit: 3, windowMs: 3600000 },
    ])
    if (allowed === 'BUSY') return { status: 429, retryAfterSeconds: 5, body: { ok: false, message: 'Het contactformulier is momenteel druk. Uw invoer blijft staan. Probeer het over enkele seconden opnieuw.' } }
    if (!allowed) return { status: 429, body: { ok: false, message: 'Er zijn te veel berichten verstuurd. Uw invoer blijft staan. Probeer het over een uur opnieuw of mail contact@workmatchr.nl.' } }
    const result = await dependencies.send({
      kind: 'ADMIN_MESSAGE', to: recipient, subject: `${subjectLabel} | WorkMatchr`,
      text: `Onderwerp: ${subjectLabel}\nNaam: ${name}\nE-mailadres: ${email}\n\n${message}`,
      html: `<p>Onderwerp: ${subjectLabel}</p><p>Naam: ${escapeHtml(name)}</p><p>E-mailadres: ${escapeHtml(email)}</p><p>${escapeHtml(message).replaceAll('\n', '<br>')}</p>`,
      idempotencyKey: `contact:${digest(JSON.stringify([requestId, recipient, name, email, subject, message]))}`,
    })
    if (result.transport !== 'RESEND' || result.status !== 'ACCEPTED') return unavailable()
    return { status: 200, body: { ok: true, message: 'Uw bericht is aangeboden aan onze maildienst. U ontvangt een reactie op het opgegeven e-mailadres.' } }
  } catch { return unavailable() }
}
export function unavailable() {
  return { status: 503, body: { ok: false, message: 'Versturen is nu niet gelukt. Uw invoer blijft op deze pagina staan. Probeer het later opnieuw of mail contact@workmatchr.nl.' } }
}
