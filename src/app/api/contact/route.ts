import { sendAuthEmail, getAuthEmailConfigurationStatus } from '@/lib/email'
import { submitContact, unavailable } from '@/lib/contact/contact-service'
import { reserveContactAttempt } from '@/lib/contact/contact-rate-limit'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const config = getAuthEmailConfigurationStatus()
  const unavailableResponse = () => Response.json(unavailable().body, { status: 503 })
  if (process.env.CONTACT_FORM_ENABLED !== 'true' || !config.resendConfigured || !config.fromConfigured) return unavailableResponse()
  // Compare with server configuration, never a client-supplied Host header.
  let origin: string
  try { origin = new URL(process.env.BETTER_AUTH_URL ?? '').origin } catch { return unavailableResponse() }
  if (request.headers.get('origin') !== origin) return Response.json({ ok: false, message: 'Open het contactformulier opnieuw op WorkMatchr.' }, { status: 403 })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ ok: false }, { status: 415 })
  const reader = request.body?.getReader()
  if (!reader) return Response.json({ ok: false }, { status: 400 })
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > 20000) { await reader.cancel(); return Response.json({ ok: false, message: 'Het bericht is te groot.' }, { status: 413 }) }
      chunks.push(value)
    }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    // Vercel overwrites this trusted header; other hosts share a conservative bucket.
    const address = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() : 'local-or-unconfigured-proxy'
    if (!address) return unavailableResponse()
    const result = await submitContact(payload, address, process.env.BETTER_AUTH_SECRET ?? '', { reserve: reserveContactAttempt, send: sendAuthEmail, recipient: process.env.CONTACT_EMAIL_TO })
    return Response.json(result.body, { status: result.status, headers: { 'Cache-Control': 'no-store', ...(result.retryAfterSeconds ? { 'Retry-After': String(result.retryAfterSeconds) } : {}) } })
  } catch { return Response.json({ ok: false, message: 'Controleer uw bericht en probeer opnieuw.' }, { status: 400 }) }
}
