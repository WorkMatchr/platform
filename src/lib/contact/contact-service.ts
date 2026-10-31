import 'server-only'
import { createHmac } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { contactSchema, type ContactResult } from './contact-contract'
import { CONTACT_TEMPLATE, contactConfiguration } from './contact-configuration'
import { contactDigest, sealContact } from './contact-envelope'

export function unavailable() {
  return { status: 503, body: { ok: false, message: 'Ontvangen is nu niet gelukt. Uw invoer blijft staan. Probeer het later opnieuw of mail contact@workmatchr.nl.' } satisfies ContactResult }
}
export async function submitContact(payload: unknown, clientAddress: string): Promise<{ status: number; body: ContactResult; retryAfterSeconds?: number }> {
  const parsed = contactSchema.safeParse(payload)
  if (!parsed.success) {
    const errors: ContactResult['errors'] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]
      if (field === 'name' || field === 'email' || field === 'subject' || field === 'message') errors[field] ??= issue.message
    }
    return { status: 400, body: { ok: false, message: 'Controleer de gemarkeerde velden. Uw invoer blijft staan.', errors } }
  }
  if (parsed.data.website) return { status: 400, body: { ok: false, message: 'Gebruik de gewone contactvelden. Het bericht is niet ontvangen.' } }
  const config = contactConfiguration()
  if (!config || !clientAddress) return unavailable()
  const { name, email, subject, message, requestId } = parsed.data
  const content = { name, email, subject, message, recipient: config.recipient }
  const digest = contactDigest(content, config.key), identity = `contact:${requestId}`
  const hash = (value: string) => createHmac('sha256', config.key).update(value).digest('hex')
  try {
    const result = await getPrisma().$transaction(async tx => {
      // A06 nonblocking admission control, now atomic with durable enqueue.
      const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(310034) AS acquired`
      if (!lock?.acquired) return 'BUSY'
      const prior = await tx.notificationOutbox.findUnique({ where: { idempotencyKey: identity } })
      if (prior) {
        const saved = prior.payload as { digest?: string }
        if (prior.templateKey !== CONTACT_TEMPLATE || saved.digest !== digest) return 'CONFLICT'
        return prior.status === 'FAILED' ? 'FAILED' : 'ACCEPTED'
      }
      const now = Date.now()
      const limits = [
        { key: 'contact:global', limit: 30, windowMs: 600000 },
        { key: `contact:ip:${hash(clientAddress)}`, limit: 5, windowMs: 600000 },
        { key: `contact:email:${hash(email)}`, limit: 3, windowMs: 3600000 },
      ]
      const counters = []
      for (const limit of limits) {
        const previous = await tx.rateLimit.findUnique({ where: { key: limit.key } })
        const active = previous && Number(previous.lastRequest) > now - limit.windowMs
        if (active && previous.count >= limit.limit) return 'LIMITED'
        counters.push({ key: limit.key, count: active ? previous.count + 1 : 1, lastRequest: active ? previous.lastRequest : BigInt(now) })
      }
      await tx.rateLimit.deleteMany({ where: { key: { startsWith: 'contact:' }, lastRequest: { lt: BigInt(now - 3600000) } } })
      for (const data of counters) await tx.rateLimit.upsert({ where: { key: data.key }, create: data, update: data })
      await tx.notificationOutbox.create({ data: { eventId: identity, idempotencyKey: identity, channel: 'EMAIL',
        templateKey: CONTACT_TEMPLATE, payload: sealContact(content, config.key, identity) } })
      return 'ACCEPTED'
    })
    if (result === 'BUSY' || result === 'LIMITED') return { status: 429, retryAfterSeconds: result === 'BUSY' ? 5 : 3600,
      body: { ok: false, message: result === 'BUSY' ? 'Het contactformulier is momenteel druk. Uw invoer blijft staan. Probeer het over enkele seconden opnieuw.' : 'Er zijn te veel berichten ontvangen. Uw invoer blijft staan. Probeer het over een uur opnieuw of mail contact@workmatchr.nl.' } }
    if (result === 'CONFLICT') return { status: 409, body: { ok: false, message: 'Een eerder bericht is al met dit formulier ontvangen. Bewaar uw tekst en open het formulier opnieuw voor een ander bericht.' } }
    if (result === 'FAILED') return unavailable()
    return { status: 202, body: { ok: true, message: 'Uw bericht is ontvangen en staat klaar voor verwerking. U hoeft het niet opnieuw te versturen.' } }
  } catch { return unavailable() } // Never log raw database errors or contact data.
}
