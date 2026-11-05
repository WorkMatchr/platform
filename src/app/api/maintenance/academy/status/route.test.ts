import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/lib/learning/academy-operations', () => ({ readAcademyOperations: read }))
import { GET } from './route'
const secret = 'synthetic-academy-monitor-credential-at-least-32-characters'
const request = (auth = `Bearer ${secret}`) => new Request('https://app.example.invalid/api/maintenance/academy/status', { headers: { authorization: auth } })
beforeEach(() => { vi.stubEnv('VERCEL_ENV', ''); vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', secret); vi.stubEnv('ACADEMY_OPERATIONS_MONITOR_ENABLED', 'true'); read.mockReset(); read.mockResolvedValue({ status: 'OK', counts: { pending: 0 } }) })
afterEach(() => vi.unstubAllEnvs())
describe('Academy monitor authentication and privacy', () => {
  it.each(['', 'false', 'TRUE'])('does not access the database when disabled (%s)', async flag => {
    vi.stubEnv('ACADEMY_OPERATIONS_MONITOR_ENABLED', flag); expect((await GET(request())).status).toBe(404); expect(read).not.toHaveBeenCalled()
  })
  it.each(['', 'Bearer wrong', 'Basic wrong'])('refuses anonymous or incorrect credentials (%s)', async auth => {
    expect((await GET(request(auth))).status).toBe(401); expect(read).not.toHaveBeenCalled()
  })
  it('refuses an invalid preview context before any query', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); expect((await GET(request())).status).toBe(401); expect(read).not.toHaveBeenCalled()
  })
  it('is no-store and contains no database or provider identity', async () => {
    const response = await GET(request()); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toContain('noindex')
    expect(await response.json()).toEqual({ status: 'OK', counts: { pending: 0 } })
  })
  it('scrubs database/provider errors rather than returning sensitive exception details', async () => {
    read.mockRejectedValue(new Error('synthetic private connection detail'))
    const response = await GET(request()); expect(response.status).toBe(503); expect(await response.json()).toEqual({ status: 'UNAVAILABLE', code: 'ACADEMY_OPERATIONS_READ_FAILED' })
  })
})
