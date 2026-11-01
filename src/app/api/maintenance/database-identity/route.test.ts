import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const read = vi.hoisted(() => vi.fn())
vi.mock('@/lib/maintenance/database-identity', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/maintenance/database-identity')>(), readDatabaseIdentity: read }))
import { POST } from './route'

const secret = 'a'.repeat(64) // Synthetic diagnostic key; never provisioned.
const cronSecret = 'synthetic-existing-cron-secret-not-used-outside-tests'
const financeSecret = 'synthetic-existing-finance-secret-not-used-outside-tests'
function request(authorization = `Bearer ${secret}`, intent = 'database-identity-v1', query = '') {
  return new Request(`https://app.example.invalid/api/maintenance/database-identity${query}`, { method: 'POST', headers: { authorization, 'x-workmatchr-diagnostic': intent } })
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T10:00:00Z'))
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'true')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '2026-10-27T10:10:00Z')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_SECRET', secret)
  vi.stubEnv('CRON_SECRET', cronSecret)
  vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', financeSecret)
  vi.stubEnv('VERCEL_ENV', 'production')
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
  it('does not disclose an identity if the window expires during the read', async () => {
    read.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date('2026-10-27T10:10:00Z'))
      return { branchId: 'br-synthetic' }
    })
    const result = await POST(request())
    expect(result.status).toBe(404)
    expect(await result.text()).not.toContain('br-synthetic')
    expect(result.headers.get('cache-control')).toContain('no-store')
  })
  it.each(['', 'Bearer incorrect', 'Basic invalid'])('rejects incorrect or missing maintenance authentication', async auth => {
    expect((await POST(request(auth))).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it('rejects missing server secret', async () => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_SECRET', '')
    expect((await POST(request())).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it.each([cronSecret, financeSecret])('never accepts another maintenance credential', async other => {
    expect((await POST(request(`Bearer ${other}`))).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it('has no dependency on a configured cron or finance credential', async () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', '')
    expect((await POST(request())).status).toBe(200)
    expect(read).toHaveBeenCalledTimes(1)
  })
  it.each(['', 'invalid', '2026-10-27T10:15:01Z'])('rejects invalid or overlong windows: %s', async until => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', until)
    expect((await POST(request())).status).toBe(404)
    expect(read).not.toHaveBeenCalled()
  })
  it('rejects an unapproved Preview even with a valid diagnostic key', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('PREVIEW_INFRASTRUCTURE_APPROVED', '')
    expect((await POST(request())).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it('refuses the same key after closing or removing it', async () => {
    expect((await POST(request())).status).toBe(200)
    read.mockClear()
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'false')
    expect((await POST(request())).status).toBe(404)
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'true')
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_SECRET', '')
    expect((await POST(request())).status).toBe(401)
    expect(read).not.toHaveBeenCalled()
  })
  it.each([404, 401, 400, 200, 503])('keeps status %i generic and noncacheable without logging keys', async status => {
    const logs = ['log', 'warn', 'error'].map(method => vi.spyOn(console, method as 'log').mockImplementation(() => {}))
    if (status === 404) vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'false')
    if (status === 503) read.mockRejectedValue(new Error(secret))
    const result = await POST(request(status === 401 ? `Bearer ${'b'.repeat(64)}` : `Bearer ${secret}`, status === 400 ? '' : 'database-identity-v1'))
    expect(result.status).toBe(status)
    expect(result.headers.get('cache-control')).toContain('no-store')
    expect(result.headers.get('x-robots-tag')).toContain('noindex')
    expect(await result.text()).not.toContain(secret)
    for (const log of logs) expect(log).not.toHaveBeenCalled()
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
