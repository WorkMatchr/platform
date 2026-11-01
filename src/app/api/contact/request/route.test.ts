import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { POST } from './route'
import { isFreshContactRequest } from '@/lib/contact/contact-request-token'

const key = randomBytes(32)
beforeEach(() => {
  vi.stubEnv('CONTACT_FORM_ENABLED', 'true'); vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', key.toString('hex'))
  vi.stubEnv('RESEND_API_KEY', 'synthetic-not-real'); vi.stubEnv('AUTH_EMAIL_FROM', 'mail@example.invalid')
  vi.stubEnv('BETTER_AUTH_URL', 'https://workmatchr.example.invalid')
})
afterEach(() => vi.unstubAllEnvs())
const request = (origin = 'https://workmatchr.example.invalid') => new Request(`${origin}/api/contact/request`, { method: 'POST', headers: { origin } })
it('issues only a short-lived, no-store submission identity on the same origin', async () => {
  const response = await POST(request()), body = await response.json()
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store')
  expect(Object.keys(body)).toEqual(['requestId'])
  expect(isFreshContactRequest(body.requestId, key)).toBe(true)
  expect((await POST(request('https://other.example.invalid'))).status).toBe(403)
})
it.each(['CONTACT_FORM_ENABLED', 'CONTACT_OUTBOX_ENABLED', 'CONTACT_MESSAGE_ENCRYPTION_KEY', 'RESEND_API_KEY', 'AUTH_EMAIL_FROM'])('fails closed without %s', async name => {
  vi.stubEnv(name, '')
  expect((await POST(request())).status).toBe(503)
})
