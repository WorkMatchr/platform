import { getCurrentAuthenticationContext } from '@/lib/authorization'
import { reconcileContact } from '@/lib/contact/contact-reconciliation'
import { ContactReconciliationError, reconciliationEnabled } from '@/lib/contact/contact-reconciliation-policy'
import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  const respond = (status: number, body: unknown = { error: 'Deze afhandeling is niet beschikbaar.' }) =>
    Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!reconciliationEnabled() || !isPreviewInfrastructureAccepted()) return respond(404)
  try {
    const origin = new URL(process.env.BETTER_AUTH_URL ?? '').origin
    if (request.headers.get('origin') !== origin || request.headers.has('authorization')) return respond(403)
    if (request.headers.get('content-type') !== 'application/json') return respond(400)
    const context = await getCurrentAuthenticationContext()
    if (!context || context.impersonation || context.actorUser.id !== context.effectiveUser.id) return respond(403)
    const reader = request.body?.getReader()
    if (!reader) return respond(400)
    const chunks: Uint8Array[] = []
    let length = 0
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > 4096) { await reader.cancel(); return respond(400) }
      chunks.push(value)
    }
    let input: unknown
    try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return respond(400) }
    const result = await reconcileContact({ userId: context.actorUser.id, sessionId: context.sessionId }, input)
    return respond(200, result)
  } catch (error) {
    if (error instanceof ContactReconciliationError) return respond({ CLOSED: 404, FORBIDDEN: 403, INVALID: 400, CONFLICT: 409 }[error.code])
    return respond(503)
  }
}
