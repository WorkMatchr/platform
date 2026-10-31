import { afterEach, describe, expect, it, vi } from 'vitest'
const worker = vi.hoisted(() => vi.fn(async () => ({ claimed: 1, sent: 1, retry: 0, failed: 0 })))
vi.mock('@/lib/marketplace/assignment-email-worker', () => ({ deliverAssignmentEmails: worker }))
const contactWorker = vi.hoisted(() => vi.fn(async () => ({ claimed: 1, sent: 1, retry: 0, failed: 0, redacted: 0 })))
vi.mock('@/lib/contact/contact-email-worker', () => ({ deliverContactEmails: contactWorker }))
import { GET, POST } from './route'

afterEach(() => { vi.unstubAllEnvs(); worker.mockClear(); contactWorker.mockClear() })
describe('marketplace maintenance authorization', () => {
  it('rejects requests without configured secret before claiming any mail', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST' }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
    expect(contactWorker).not.toHaveBeenCalled()
  })
  it('rejects the wrong bearer', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-test-secret-at-least-thirty-two-characters')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer invalid' } }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
    expect(contactWorker).not.toHaveBeenCalled()
  })
  it('rejects a missing bearer even when the server secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-test-secret-at-least-thirty-two-characters')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST' }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
    expect(contactWorker).not.toHaveBeenCalled()
  })
  it('returns zero counters for an authenticated empty queue', async () => {
    const secret = 'synthetic-test-secret-at-least-thirty-two-characters'
    vi.stubEnv('CRON_SECRET', secret)
    worker.mockResolvedValueOnce({ claimed: 0, sent: 0, retry: 0, failed: 0 })
    contactWorker.mockResolvedValueOnce({ claimed: 0, sent: 0, retry: 0, failed: 0, redacted: 0 })
    const result = await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }))
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ claimed: 0, sent: 0, retry: 0, failed: 0, contact: { claimed: 0, sent: 0, retry: 0, failed: 0, redacted: 0 } })
    expect(result.headers.get('Cache-Control')).toBe('no-store')
  })
  it('keeps scheduled GET unavailable outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect((await GET(new Request('http://localhost/api/maintenance/marketplace'))).status).toBe(404)
    expect(worker).not.toHaveBeenCalled()
    expect(contactWorker).not.toHaveBeenCalled()
  })
  it('uses the bounded worker after a valid maintenance bearer', async () => {
    const secret = 'synthetic-test-secret-at-least-thirty-two-characters'
    vi.stubEnv('CRON_SECRET', secret)
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }))).status).toBe(200)
    expect(worker).toHaveBeenCalledExactlyOnceWith({ limit: 10 })
  })
})

it('dispatches contact only behind its explicit gate and authenticated maintenance', async () => {
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-test-secret-for-unit-tests')
  expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST' }))).status).toBe(401)
  expect(contactWorker).not.toHaveBeenCalled()
  const r = await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer synthetic-maintenance-test-secret-for-unit-tests' } }))
  expect(r.status).toBe(200); expect((await r.json()).contact.sent).toBe(1)
  expect(contactWorker).toHaveBeenCalledExactlyOnceWith({ limit: 5 })
})
it('keeps independent consumers running and exposes only generic failure metadata', async () => {
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-test-secret-for-unit-tests')
  worker.mockRejectedValueOnce(new Error('sensitive-private-message@example.invalid'))
  const r = await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer synthetic-maintenance-test-secret-for-unit-tests' } }))
  expect(r.status).toBe(503)
  expect(await r.text()).not.toContain('sensitive-private')
  expect(contactWorker).toHaveBeenCalledTimes(1)
})

it('still invokes contact retention when its delivery gate is absent', async () => {
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', '')
  vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-test-secret-for-unit-tests')
  expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer synthetic-maintenance-test-secret-for-unit-tests' } }))).status).toBe(200)
  expect(contactWorker).toHaveBeenCalledExactlyOnceWith({ limit: 5 })
})
it('a broken contact consumer does not prevent assignment dispatch', async () => {
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-test-secret-for-unit-tests')
  contactWorker.mockRejectedValueOnce(new Error('CONTACT_CONFIGURATION_REQUIRED'))
  const r = await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer synthetic-maintenance-test-secret-for-unit-tests' } }))
  expect(r.status).toBe(503)
  expect(worker).toHaveBeenCalledExactlyOnceWith({ limit: 10 })
  expect(await r.json()).toEqual({ error: 'NOTIFICATION_DISPATCH_INCOMPLETE' })
})
