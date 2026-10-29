import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ policy: vi.fn(), pools: [] as object[], adapters: [] as object[] }))
vi.mock('pg', () => ({ Pool: class { constructor(public options: unknown) { mocks.pools.push(this) } } }))
vi.mock('@/lib/maintenance/preview-database-pool', () => ({ PreviewDatabasePool: class { constructor(public policy: unknown) { mocks.pools.push(this) } } }))
vi.mock('@/lib/maintenance/preview-isolation', () => ({ previewDatabasePolicy: mocks.policy }))
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class { constructor(public pool: unknown, public options: unknown) { mocks.adapters.push(this) } } }))
vi.mock('@/generated/prisma/client', () => ({ PrismaClient: class { constructor(public options: unknown) {} } }))
import { getPrisma, getRuntimeDatabasePool } from './prisma'
const cache = globalThis as typeof globalThis & { prisma?: unknown; previewPool?: unknown; runtimePool?: unknown }
function clear() { delete cache.prisma; delete cache.previewPool; delete cache.runtimePool }
beforeEach(() => { clear(); mocks.pools.length = 0; mocks.adapters.length = 0; mocks.policy.mockReset(); mocks.policy.mockReturnValue(null); vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost/test') })
afterEach(() => { clear(); vi.unstubAllEnvs() })
describe('shared application and diagnostic pool', () => {
  it.each(['prisma-first', 'diagnostic-first'])('shares one production pool: %s', order => {
    if (order === 'prisma-first') getPrisma(); else getRuntimeDatabasePool()
    const pool = getRuntimeDatabasePool()
    const prisma = getPrisma()
    expect(getPrisma()).toBe(prisma)
    expect(getRuntimeDatabasePool()).toBe(pool)
    expect(mocks.pools).toHaveLength(1)
    expect(mocks.adapters).toEqual([{ pool, options: { disposeExternalPool: true } }])
    expect(pool).toMatchObject({ options: { connectionString: process.env.DATABASE_URL } })
  })
  it('retains the guarded Preview pool without a parallel connection', () => {
    const policy = { synthetic: true }; mocks.policy.mockReturnValue(policy)
    const pool = getRuntimeDatabasePool(); getPrisma()
    expect(mocks.pools).toHaveLength(1)
    expect(pool).toEqual({ policy })
    expect(mocks.adapters).toEqual([{ pool, options: { disposeExternalPool: true } }])
  })
  it('fails closed for rejected Preview policy', () => {
    mocks.policy.mockImplementation(() => { throw new Error('PREVIEW_DATABASE_ISOLATION_REQUIRED') })
    expect(getRuntimeDatabasePool).toThrow('PREVIEW_DATABASE_ISOLATION_REQUIRED')
    expect(getPrisma).toThrow('PREVIEW_DATABASE_ISOLATION_REQUIRED')
    expect(mocks.pools).toHaveLength(0)
  })
  it('rechecks the Preview guard even when Prisma is already cached', () => {
    getPrisma()
    mocks.policy.mockImplementation(() => { throw new Error('PREVIEW_DATABASE_ISOLATION_REQUIRED') })
    expect(getPrisma).toThrow('PREVIEW_DATABASE_ISOLATION_REQUIRED')
    expect(mocks.pools).toHaveLength(1)
  })
  it('does not create a fallback connection without DATABASE_URL', () => {
    vi.stubEnv('DATABASE_URL', '')
    expect(getRuntimeDatabasePool).toThrow()
    expect(mocks.pools).toHaveLength(0)
  })
})
