import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), execute: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
import { isDatabaseIdentityDiagnosticEnabled, readDatabaseIdentity } from './database-identity'

const now = Date.parse('2026-10-27T10:00:00Z')
const url = 'postgresql://synthetic_role:synthetic-password@ep-synthetic-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
const row = { database_name: 'neondb', database_role: 'synthetic_role', endpoint_id: 'ep-synthetic', branch_id: 'br-synthetic', ssl: true, tls_version: 'TLSv1.3', read_only: 'on', superuser: false, create_database: false, create_role: false, bypass_rls: false }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DATABASE_URL', url)
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', '')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '')
  vi.stubEnv('COMPLIANCE_F4_ENABLED', '')
  vi.stubEnv('LEARNING_RUNTIME_ENABLED', '')
  mocks.query.mockResolvedValue([row])
  mocks.transaction.mockImplementation(callback => callback({ $executeRaw: mocks.execute, $queryRaw: mocks.query }))
})
afterEach(() => vi.unstubAllEnvs())

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

  it('uses the existing Prisma client in a bounded read-only transaction and returns only metadata', async () => {
    const result = await readDatabaseIdentity()
    expect(mocks.transaction.mock.calls[0][1]).toEqual({ maxWait: 2000, timeout: 8000 })
    expect(mocks.execute.mock.calls.map(call => call[0][0])).toEqual(['SET TRANSACTION READ ONLY', "SET LOCAL statement_timeout = '5s'"])
    expect(mocks.query).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ configuredHostname: 'ep-synthetic-pooler.c-2.eu-central-1.aws.neon.tech', endpointId: 'ep-synthetic', branchId: 'br-synthetic', role: 'synthetic_role', database: 'neondb', transactionReadOnly: true })
    expect(JSON.stringify(result)).not.toMatch(/synthetic-password|postgresql|DATABASE_URL/)
    expect(result).not.toHaveProperty('projectId')
    expect(result.featureGates).toEqual({ complianceF4: false, learningRuntime: false })
  })

  it.each(['host=evil.invalid', 'user=other', 'database=other', 'options=-csearch_path%3Dprivate', 'schema=private'])('refuses ambiguous connection override %s before SQL', async parameter => {
    vi.stubEnv('DATABASE_URL', `${url}&${parameter}`)
    await expect(readDatabaseIdentity()).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each(['', 'invalid-secret-value', url.replace('sslmode=require', 'sslmode=disable'), url.replace('.neon.tech', '.example.invalid')])('refuses missing or unsafe connection configuration', async value => {
    vi.stubEnv('DATABASE_URL', value)
    await expect(readDatabaseIdentity()).rejects.toThrow()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it.each([
    { ssl: false }, { read_only: 'off' }, { branch_id: null }, { endpoint_id: 'ep-other' },
    { database_role: 'other_role' }, { database_name: 'other_database' }, { tls_version: null },
  ])('refuses missing or mismatching observed evidence %j', async changes => {
    mocks.query.mockResolvedValue([{ ...row, ...changes }])
    await expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
  })

  it.each([{ rows: [] }, { rows: [row, row] }])('requires exactly one metadata row', async ({ rows }) => {
    mocks.query.mockResolvedValue(rows)
    await expect(readDatabaseIdentity()).rejects.toThrow('DATABASE_IDENTITY_UNAVAILABLE')
  })
})
