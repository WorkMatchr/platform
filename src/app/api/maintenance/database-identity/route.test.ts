import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/lib/maintenance/database-identity', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/maintenance/database-identity')>(), readDatabaseIdentity: read }))
import { POST } from './route'

const secret = 'synthetic-maintenance-secret-not-used-outside-tests'
function request(authorization = `Bearer ${secret}`, intent = 'database-identity-v1', query = '') {
  return new Request(`https://app.example.invalid/api/maintenance/database-identity${query}`, { method: 'POST', headers: { authorization, 'x-workmatchr-diagnostic': intent } })
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T10:00:00Z'))
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'true')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '2026-10-27T10:10:00Z')
  vi.stubEnv('CRON_SECRET', secret)
  read.mockReset(); read.mockResolvedValue({ branchId: 'br-synthetic' })
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('database identity maintenance boundary', () => {
  it.each(['', 'false', 'TRUE'])('does not contact database when disabled: %s', async flag => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', flag)
    expect((await POST(request())).status).toBe(404)
    expect(read).not.toHaveBeenCalled()
  })
  it('expires without redeployment', async () => {
    vi.setSystemTime(new Date('2026-10-27T10:10:00Z'))
    expect((await POST(request())).status).toBe(404)
    expect(read).not.toHaveBeenCalled()
  })
  it.each(['', 'Bearer incorrect', 'Basic invalid'])('rejects incorrect or missing maintenance authentication', async auth => {
    expect((await POST(request(auth))).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it('rejects missing server secret', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await POST(request())).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it('requires explicit diagnostic intent and disallows target selection', async () => {
    expect((await POST(request(`Bearer ${secret}`, ''))).status).toBe(400)
    expect((await POST(request(`Bearer ${secret}`, 'database-identity-v1', '?database=other'))).status).toBe(400)
    expect(read).not.toHaveBeenCalled()
  })
  it('returns noncacheable metadata only after all guards', async () => {
    const result = await POST(request())
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ branchId: 'br-synthetic' })
    expect(result.headers.get('cache-control')).toContain('no-store')
    expect(result.headers.get('x-robots-tag')).toContain('noindex')
    expect(read).toHaveBeenCalledTimes(1)
  })
  it('does not log or expose adapter/URL errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    read.mockRejectedValue(new Error('postgresql://synthetic:private@host/db'))
    const result = await POST(request())
    expect(result.status).toBe(503)
    expect(await result.text()).not.toMatch(/postgresql|private|host/)
    expect(result.headers.get('cache-control')).toContain('no-store')
    expect(log).not.toHaveBeenCalled()
  })
})
