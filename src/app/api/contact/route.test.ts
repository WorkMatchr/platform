import { randomBytes } from 'node:crypto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const submit = vi.hoisted(() => vi.fn())
vi.mock('@/lib/contact/contact-service', () => ({ submitContact: submit, unavailable: () => ({ body: { ok: false }, status: 503 }) }))
import { POST } from './route'
const request = (body = '{}', headers: Record<string, string> = {}) => new Request('http://localhost/api/contact', { method: 'POST', headers: { origin: 'https://workmatchr.example.invalid', 'content-type': 'application/json', ...headers }, body })
beforeEach(() => {
  vi.stubEnv('CONTACT_FORM_ENABLED', 'true'); vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', randomBytes(32).toString('hex'))
  vi.stubEnv('RESEND_API_KEY', 'synthetic-not-real'); vi.stubEnv('AUTH_EMAIL_FROM', 'mail@example.invalid')
  vi.stubEnv('BETTER_AUTH_URL', 'https://workmatchr.example.invalid'); vi.stubEnv('VERCEL', '')
  submit.mockResolvedValue({ status: 202, body: { ok: true } })
})
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('default-off refuses before persistence', async () => {
  vi.stubEnv('CONTACT_FORM_ENABLED', '')
  expect((await POST(request())).status).toBe(503); expect(submit).not.toHaveBeenCalled()
})
it.each(['', 'https://other.example.invalid'])('rejects foreign/missing origin %s', async origin => {
  expect((await POST(request('{}', { origin }))).status).toBe(403); expect(submit).not.toHaveBeenCalled()
})
it('bounds bytes, JSON and content type before persistence', async () => {
  expect((await POST(request('x'.repeat(20001)))).status).toBe(413)
  expect((await POST(request('bad'))).status).toBe(400)
  expect((await POST(request('{}', { 'content-type': 'text/plain' }))).status).toBe(415)
  expect(submit).not.toHaveBeenCalled()
})
it.each(['', 'not-ip', '192.0.2.1, 192.0.2.2'])('rejects untrusted address %s', async value => {
  vi.stubEnv('VERCEL', '1')
  expect((await POST(request('{}', { 'x-forwarded-for': value, 'x-vercel-forwarded-for': '192.0.2.4' }))).status).toBe(503)
  expect(submit).not.toHaveBeenCalled()
})
it('accepts only the platform-trusted single address; returns durable 202', async () => {
  vi.stubEnv('VERCEL', '1')
  const response = await POST(request('{}', { 'x-forwarded-for': '192.0.2.1' }))
  expect(response.status).toBe(202); expect(submit).toHaveBeenCalledExactlyOnceWith({}, '192.0.2.1')
  expect(response.headers.get('cache-control')).toBe('no-store')
})
it('preserves fail-closed status and retry hints', async () => {
  submit.mockResolvedValueOnce({ status: 429, retryAfterSeconds: 5, body: { ok: false } })
  const response = await POST(request())
  expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('5')
})
