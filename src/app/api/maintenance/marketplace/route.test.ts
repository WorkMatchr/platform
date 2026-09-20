import { afterEach, describe, expect, it, vi } from 'vitest'
const worker = vi.hoisted(() => vi.fn(async () => ({ claimed: 1, sent: 1, retry: 0, failed: 0 })))
vi.mock('@/lib/marketplace/assignment-email-worker', () => ({ deliverAssignmentEmails: worker }))
import { GET, POST } from './route'

afterEach(() => { vi.unstubAllEnvs(); worker.mockClear() })
describe('marketplace maintenance authorization', () => {
  it('rejects requests without configured secret before claiming any mail', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST' }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
  })
  it('rejects the wrong bearer', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-test-secret-at-least-thirty-two-characters')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: 'Bearer invalid' } }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
  })
  it('rejects a missing bearer even when the server secret is configured', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-test-secret-at-least-thirty-two-characters')
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST' }))).status).toBe(401)
    expect(worker).not.toHaveBeenCalled()
  })
  it('returns zero counters for an authenticated empty queue', async () => {
    const secret = 'synthetic-test-secret-at-least-thirty-two-characters'
    vi.stubEnv('CRON_SECRET', secret)
    worker.mockResolvedValueOnce({ claimed: 0, sent: 0, retry: 0, failed: 0 })
    const result = await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }))
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ claimed: 0, sent: 0, retry: 0, failed: 0 })
  })
  it('keeps scheduled GET unavailable outside production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect((await GET(new Request('http://localhost/api/maintenance/marketplace'))).status).toBe(404)
    expect(worker).not.toHaveBeenCalled()
  })
  it('uses the bounded worker after a valid maintenance bearer', async () => {
    const secret = 'synthetic-test-secret-at-least-thirty-two-characters'
    vi.stubEnv('CRON_SECRET', secret)
    expect((await POST(new Request('http://localhost/api/maintenance/marketplace', { method: 'POST', headers: { authorization: `Bearer ${secret}` } }))).status).toBe(200)
    expect(worker).toHaveBeenCalledExactlyOnceWith({ limit: 10 })
  })
})
