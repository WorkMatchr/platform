import { afterEach, describe, expect, it, vi } from 'vitest'
import { Pool, type PoolClient } from 'pg'
import { previewDatabasePolicy, isPreviewInfrastructureAccepted, PREVIEW_FORBIDDEN_VARIABLES } from './preview-isolation'
import { PreviewDatabasePool, PREVIEW_IDENTITY_SQL } from './preview-database-pool'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
import { isF4Enabled } from '@/lib/compliance/compliance-f4-framework'
import { isFinancialMaintenanceAuthorized, isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { register } from '@/instrumentation'

const environment = {
  VERCEL_ENV: 'preview', PREVIEW_INFRASTRUCTURE_APPROVED: 'true',
  PREVIEW_DATABASE_ENDPOINT_ID: 'ep-synthetic-test', PREVIEW_DATABASE_BRANCH_ID: 'br-synthetic-test',
  PREVIEW_DATABASE_NAME: 'neondb', PREVIEW_DATABASE_ROLE: 'workmatchr_preview_runtime',
  DATABASE_URL: 'postgresql://workmatchr_preview_runtime:synthetic@ep-synthetic-test.eu-central-1.aws.neon.tech/neondb?sslmode=require',
}
const identity = {
  database: 'neondb', role: 'workmatchr_preview_runtime', login: 'workmatchr_preview_runtime',
  endpoint: 'ep-synthetic-test', branch: 'br-synthetic-test', ssl: true, tls: 'TLSv1.3',
  privileged: false, memberships: false, database_create: false, schema_create: false,
  owns_objects: false, registry_write: false,
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('Preview isolation before any application query', () => {
  it('does not change local/production configuration', () => {
    expect(previewDatabasePolicy({})).toBeNull()
    expect(previewDatabasePolicy({ VERCEL_ENV: 'production' })).toBeNull()
  })
  it.each(Object.keys(environment))('refuses missing %s', key => {
    if (key === 'VERCEL_ENV') return
    expect(() => previewDatabasePolicy({ ...environment, [key]: undefined })).toThrow('PREVIEW_DATABASE_ISOLATION_REQUIRED')
  })
  it.each(PREVIEW_FORBIDDEN_VARIABLES)('refuses inherited credential %s', key => {
    expect(isPreviewInfrastructureAccepted({ ...environment, [key]: 'synthetic' })).toBe(false)
  })
  it.each([
    { PREVIEW_DATABASE_BRANCH_ID: 'br-odd-smoke-agf0wj9j' },
    { PREVIEW_DATABASE_ENDPOINT_ID: 'ep-royal-sound-agegzj34' },
    { PREVIEW_DATABASE_ROLE: 'neondb_owner' },
    { DATABASE_URL: environment.DATABASE_URL + '&host=production' },
    { DATABASE_URL: environment.DATABASE_URL.replace('sslmode=require', 'sslmode=disable') },
    { DATABASE_URL: 'not a connection string, must never be echoed' },
    { PREVIEW_INFRASTRUCTURE_APPROVED: 'TRUE' },
  ])('rejects unsafe configuration %j', overrides => {
    expect(() => previewDatabasePolicy({ ...environment, ...overrides })).toThrow(/^PREVIEW_DATABASE_ISOLATION_REQUIRED$/)
  })
  it('pins certificate validation and removes URL SSL overrides', () => {
    const policy = previewDatabasePolicy(environment)!
    expect(policy.connectionString).not.toContain('sslmode')
    const pool = new PreviewDatabasePool(policy)
    expect(pool.options.ssl).toEqual({ rejectUnauthorized: true })
  })
  it.each(['branch', 'endpoint', 'database', 'role', 'login', 'ssl', 'tls', 'privileged', 'memberships', 'database_create', 'schema_create', 'owns_objects', 'registry_write'])('destroys client on live %s mismatch', async key => {
    const row = { ...identity, [key]: typeof identity[key as keyof typeof identity] === 'boolean' ? !identity[key as keyof typeof identity] : null }
    const client = { query: vi.fn().mockResolvedValue({ rows: [row] }), release: vi.fn() }
    vi.spyOn(Pool.prototype, 'connect').mockImplementation(() => Promise.resolve(client as unknown as PoolClient))
    const pool = new PreviewDatabasePool(previewDatabasePolicy(environment)!)
    await expect(pool.connect()).rejects.toThrow(/^PREVIEW_DATABASE_ISOLATION_REQUIRED$/)
    expect(client.release).toHaveBeenCalledExactlyOnceWith(true)
    expect(client.query).toHaveBeenCalledExactlyOnceWith({ text: PREVIEW_IDENTITY_SQL, query_timeout: 5000 })
  })
  it('checks every checkout including reuse, and returns the same verified transaction client', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [identity] }), release: vi.fn() }
    vi.spyOn(Pool.prototype, 'connect').mockImplementation(() => Promise.resolve(client as unknown as PoolClient))
    const pool = new PreviewDatabasePool(previewDatabasePolicy(environment)!)
    expect(await pool.connect()).toBe(client)
    expect(await pool.connect()).toBe(client)
    expect(client.query).toHaveBeenCalledTimes(2)
  })
  it('blocks Pool.query callback path without executing the application SQL', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() }
    vi.spyOn(Pool.prototype, 'connect').mockImplementation(() => Promise.resolve(client as unknown as PoolClient))
    const pool = new PreviewDatabasePool(previewDatabasePolicy(environment)!)
    await expect(pool.query('SELECT 42 AS application_query')).rejects.toThrow('PREVIEW_DATABASE_ISOLATION_REQUIRED')
    expect(client.query).toHaveBeenCalledTimes(1)
  })
  it('does not propagate a driver exception or credentials', async () => {
    vi.spyOn(Pool.prototype, 'connect').mockRejectedValue(new Error(environment.DATABASE_URL))
    const pool = new PreviewDatabasePool(previewDatabasePolicy(environment)!)
    await expect(pool.connect()).rejects.toThrow(/^PREVIEW_DATABASE_ISOLATION_REQUIRED$/)
  })
  it('blocks Preview startup before non-database/provider request handlers', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('PREVIEW_INFRASTRUCTURE_APPROVED', '')
    await expect(register()).rejects.toThrow(/^PREVIEW_DATABASE_ISOLATION_REQUIRED$/)
    vi.stubEnv('VERCEL_ENV', 'production')
    await expect(register()).resolves.toBeUndefined()
  })
  it('keeps features and maintenance closed even with flags/secrets on before acceptance', () => {
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('PREVIEW_INFRASTRUCTURE_APPROVED', '')
    vi.stubEnv('COMPLIANCE_F4_ENABLED', 'true'); vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true')
    const secret = 'synthetic-maintenance-acceptance-only-012345'
    vi.stubEnv('CRON_SECRET', secret); vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', secret)
    expect(isLearningRuntimeEnabled()).toBe(false); expect(isF4Enabled()).toBe(false)
    expect(isFinancialMaintenanceAuthorized(`Bearer ${secret}`)).toBe(false)
    expect(isFinancialMaintenanceCronAuthorized(`Bearer ${secret}`)).toBe(false)
  })
  it('accepted infrastructure never replaces existing maintenance authentication', () => {
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value)
    for (const key of PREVIEW_FORBIDDEN_VARIABLES) vi.stubEnv(key, '')
    vi.stubEnv('CRON_SECRET', 'synthetic-maintenance-acceptance-only-012345')
    expect(isFinancialMaintenanceCronAuthorized(null)).toBe(false)
    expect(isFinancialMaintenanceCronAuthorized('Bearer wrong')).toBe(false)
  })
})
