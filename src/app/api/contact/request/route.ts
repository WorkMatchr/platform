import { contactConfiguration, contactFormEnabled } from '@/lib/contact/contact-configuration'
import { issueContactRequest } from '@/lib/contact/contact-request-token'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const respond = (body: unknown, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  const config = contactConfiguration()
  if (!contactFormEnabled() || !config) return respond({ ok: false }, 503)
  let origin: string
  try { origin = new URL(process.env.BETTER_AUTH_URL ?? '').origin } catch { return respond({ ok: false }, 503) }
  if (request.headers.get('origin') !== origin) return respond({ ok: false }, 403)
  // No persistence, provider request, user data or authentication token.
  return respond({ requestId: issueContactRequest(config.key) }, 200)
}
