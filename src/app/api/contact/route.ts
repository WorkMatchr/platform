import { isIP } from 'node:net'
import { contactFormEnabled } from '@/lib/contact/contact-configuration'
import { submitContact, unavailable } from '@/lib/contact/contact-service'

export const runtime = 'nodejs'
const respond = (body: unknown, status: number, retry?: number) => Response.json(body, { status,
  headers: { 'Cache-Control': 'no-store', ...(retry ? { 'Retry-After': String(retry) } : {}) } })
export async function POST(request: Request) {
  const closed = () => respond(unavailable().body, 503)
  if (!contactFormEnabled()) return closed()
  let origin: string
  try { origin = new URL(process.env.BETTER_AUTH_URL ?? '').origin } catch { return closed() }
  if (request.headers.get('origin') !== origin) return respond({ ok: false, message: 'Open het contactformulier opnieuw op WorkMatchr.' }, 403)
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return respond({ ok: false }, 415)
  const reader = request.body?.getReader()
  if (!reader) return respond({ ok: false }, 400)
  const chunks: Uint8Array[] = []
  let length = 0, payload: unknown
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > 20000) { await reader.cancel(); return respond({ ok: false, message: 'Het bericht is te groot.' }, 413) }
      chunks.push(value)
    }
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch { return respond({ ok: false, message: 'Controleer uw bericht en probeer opnieuw.' }, 400) }
  // Existing Vercel trust boundary; alternate forwarding headers are not trusted.
  const forwarded = request.headers.get('x-forwarded-for')?.trim()
  let address = 'local-or-unconfigured-proxy'
  if (process.env.VERCEL === '1') {
    if (!forwarded || !isIP(forwarded)) return closed()
    address = forwarded
  } else if (process.env.NODE_ENV === 'production' && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) return closed()
  const result = await submitContact(payload, address)
  return respond(result.body, result.status, result.retryAfterSeconds)
}
