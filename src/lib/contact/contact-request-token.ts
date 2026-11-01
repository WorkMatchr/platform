import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const CONTACT_REQUEST_TTL_MS = 24 * 60 * 60_000
const format = /^v1\.[0-9a-z]{1,11}\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/
const sign = (body: string, key: Buffer) => createHmac('sha256', key).update(`contact-request:v1:${body}`).digest('base64url')

/** Stateless admission proof; no new secret or retained replay tombstone. */
export function issueContactRequest(key: Buffer, now = Date.now()) {
  const body = `v1.${now.toString(36)}.${randomUUID()}`
  return `${body}.${sign(body, key)}`
}

export function isFreshContactRequest(value: string, key: Buffer, now = Date.now()) {
  if (!format.test(value)) return false
  const [version, issued, nonce, signature] = value.split('.')
  const timestamp = Number.parseInt(issued, 36)
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > now || now - timestamp >= CONTACT_REQUEST_TTL_MS) return false
  const expected = sign(`${version}.${issued}.${nonce}`, key)
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
