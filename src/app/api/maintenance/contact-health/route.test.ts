import { afterEach, expect, it, vi } from 'vitest'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/lib/contact/contact-health', () => ({ readContactHealth: read }))
import { GET } from './route'
const secret = 'synthetic-monitor-secret-at-least-thirty-two-characters'
const request = (auth?: string) => new Request('http://localhost/api/maintenance/contact-health', { headers: auth ? { authorization: auth } : {} })
afterEach(() => { vi.unstubAllEnvs(); read.mockReset() })
it('is closed by default before any database access', async () => {
  vi.stubEnv('CONTACT_MONITOR_ENABLED', '')
  const r = await GET(request()); expect(r.status).toBe(404)
  expect(r.headers.get('cache-control')).toBe('no-store'); expect(read).not.toHaveBeenCalled()
})
it.each([undefined, 'Bearer wrong'])('rejects missing/incorrect maintenance authentication: %s', async auth => {
  vi.stubEnv('CONTACT_MONITOR_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  expect((await GET(request(auth))).status).toBe(401); expect(read).not.toHaveBeenCalled()
})
it('reads aggregates with both contact gates closed and retention disabled', async () => {
  vi.stubEnv('CONTACT_MONITOR_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  vi.stubEnv('CONTACT_FORM_ENABLED', 'false'); vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'false')
  vi.stubEnv('CONTACT_RETENTION_ENABLED', 'false')
  read.mockResolvedValue({ version: 1, reviewRequired: 2 })
  const r = await GET(request(`Bearer ${secret}`)); expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ version: 1, reviewRequired: 2 }); expect(read).toHaveBeenCalledExactlyOnceWith()
})
it('returns generic no-store failure without raw database/secret details', async () => {
  vi.stubEnv('CONTACT_MONITOR_ENABLED', 'true'); vi.stubEnv('CRON_SECRET', secret)
  read.mockRejectedValue(new Error('private@example.invalid connection detail'))
  const r = await GET(request(`Bearer ${secret}`)); expect(r.status).toBe(503)
  expect(await r.text()).toBe('{"error":"CONTACT_HEALTH_UNAVAILABLE"}')
  expect(r.headers.get('cache-control')).toBe('no-store')
})
