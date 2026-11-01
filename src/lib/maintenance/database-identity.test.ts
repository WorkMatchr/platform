import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ pool: vi.fn(), connect: vi.fn(), query: vi.fn(), release: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRuntimeDatabasePool: mocks.pool }))
import { isDatabaseIdentityDiagnosticEnabled, readDatabaseIdentity } from './database-identity'

const now = Date.parse('2026-10-27T10:00:00Z')
const host = 'ep-synthetic-pooler.c-2.eu-central-1.aws.neon.tech'
const url = `postgresql://synthetic_role:synthetic-password@${host}/neondb?sslmode=require`
const row = { database_name: 'neondb', database_role: 'synthetic_role', endpoint_id: 'ep-synthetic', branch_id: 'br-synthetic', ssl: false, tls_version: null, read_only: 'on', superuser: false, create_database: false, create_role: false, bypass_rls: false }
function client() {
  return {
    connection: { stream: { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3', getPeerCertificate: () => ({ subjectaltname: `DNS:${host}` }) } },
    query: mocks.query, release: mocks.release,
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.pool.mockReturnValue({ connect: mocks.connect })
  mocks.connect.mockResolvedValue(client())
  mocks.query.mockResolvedValue({ rows: [row] })
  vi.stubEnv('DATABASE_URL', url)
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', '')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '')
  vi.stubEnv('COMPLIANCE_F4_ENABLED', '')
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', '')
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('temporary database identity diagnostic', () => {
  it('is off by default and rejects missing, expired or unbounded windows', () => {
    expect(isDatabaseIdentityDiagnosticEnabled(now)).toBe(false)
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'true')
    for (const until of ['', 'invalid', '2026-10-27T10:00:00Z', '2026-10-27T10:15:01Z']) {
      vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', until)
      expect(isDatabaseIdentityDiagnosticEnabled(now)).toBe(false)
    }
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '2026-10-27T10:15:00Z')
    expect(isDatabaseIdentityDiagnosticEnabled(now)).toBe(true)
    expect(isDatabaseIdentityDiagnosticEnabled(now + 15 * 60 * 1000)).toBe(false)
  })
  it.each(['production', 'preview'])('verifies the %s client despite a plaintext proxy backend', async environment => {
    vi.stubEnv('VERCEL_ENV', environment)
    const result = await readDatabaseIdentity()
    expect(result).toMatchObject({ configuredHostname: host, endpointId: 'ep-synthetic', branchId: 'br-synthetic', role: 'synthetic_role', database: 'neondb', transactionReadOnly: true, tlsVersion: 'TLSv1.3', tlsEvidence: 'verified-runtime-client-socket' })
    expect(JSON.stringify(result)).not.toMatch(/synthetic-password|postgresql|DATABASE_URL/)
    expect(result).not.toHaveProperty('projectId')
    expect(result.featureGates).toEqual({ complianceF4: false, learningRuntime: false })
    expect(mocks.query.mock.calls.map(call => typeof call[0] === 'string' ? call[0] : 'SELECT')).toEqual(['BEGIN READ ONLY', "SET LOCAL statement_timeout = '5s'", 'SELECT', 'ROLLBACK'])
    expect(mocks.query.mock.calls[2][0].query_timeout).toBe(5000)
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it.each(['host=evil.invalid', 'user=other', 'database=other', 'options=-csearch_path%3Dprivate', 'schema=private'])('refuses ambiguous override %s before SQL', async parameter => {
    vi.stubEnv('DATABASE_URL', `${url}&${parameter}`)
    await expect(readDatabaseIdentity()).rejects.toThrow()
    expect(mocks.pool).not.toHaveBeenCalled()
  })
  it.each(['', 'invalid-secret-value', url.replace('sslmode=require', 'sslmode=disable'), url.replace('.neon.tech', '.example.invalid')])('refuses unsafe connection configuration', async value => {
    vi.stubEnv('DATABASE_URL', value)
    await expect(readDatabaseIdentity()).rejects.toThrow()
    expect(mocks.pool).not.toHaveBeenCalled()
  })
  it.each([{ read_only: 'off' }, { branch_id: null }, { endpoint_id: 'ep-other' }, { database_role: 'other_role' }, { database_name: 'other_database' }])('refuses mismatching identity %j', async changes => {
    mocks.query.mockResolvedValue({ rows: [{ ...row, ...changes }] })
    await expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it.each([{ rows: [] }, { rows: [row, row] }])('requires exactly one identity row', async ({ rows }) => {
    mocks.query.mockResolvedValue({ rows })
    await expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it('does not substitute backend TLS for verified client TLS', async () => {
    const c = client(); c.connection.stream.authorized = false
    mocks.connect.mockResolvedValue(c)
    mocks.query.mockResolvedValue({ rows: [{ ...row, ssl: true, tls_version: 'TLSv1.3' }] })
    await expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_CLIENT_TLS_UNVERIFIED')
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it.each([0, 1, 2, 3])('destroys the connection on failure at query %i', async failedQuery => {
    let count = 0
    mocks.query.mockImplementation(async () => {
      if (count++ === failedQuery) throw new Error('synthetic SQL failure')
      return { rows: [row] }
    })
    await expect(readDatabaseIdentity()).rejects.toThrow()
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it('bounds stalled SQL to eight seconds and destroys the client', async () => {
    vi.useFakeTimers()
    mocks.query.mockImplementationOnce(() => new Promise(() => {}))
    const result = expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
    await vi.advanceTimersByTimeAsync(8000); await result
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
  it('destroys late acquisition after timeout without executing SQL', async () => {
    vi.useFakeTimers()
    let resolve!: (value: ReturnType<typeof client>) => void
    mocks.connect.mockReturnValue(new Promise(done => { resolve = done }))
    const result = expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
    await vi.advanceTimersByTimeAsync(8000); await result
    resolve(client()); await vi.advanceTimersByTimeAsync(1)
    expect(mocks.query).not.toHaveBeenCalled()
    expect(mocks.release).toHaveBeenCalledExactlyOnceWith(true)
  })
})
