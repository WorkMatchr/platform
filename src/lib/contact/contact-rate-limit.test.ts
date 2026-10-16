import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ lock: vi.fn(), remove: vi.fn(), find: vi.fn(), upsert: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
import { reserveContactAttempt } from './contact-rate-limit'
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })
describe('persistent contact limits', () => {
  function setup() {
    mocks.lock.mockResolvedValue([{ acquired: true }])
    vi.spyOn(Date, 'now').mockReturnValue(7200000)
    mocks.transaction.mockImplementation(async callback => callback({ $queryRaw: mocks.lock, rateLimit: { deleteMany: mocks.remove, findUnique: mocks.find, upsert: mocks.upsert } }))
  }
  it('serialiseert reservering en schrijft alleen na controle van alle buckets', async () => {
    setup(); mocks.find.mockResolvedValue(null)
    expect(await reserveContactAttempt([{ key: 'contact:global', limit: 2, windowMs: 1000 }])).toBe(true)
    expect(mocks.lock).toHaveBeenCalledTimes(1)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { key: 'contact:global', count: 1, lastRequest: BigInt(7200000) } }))
    expect(mocks.remove).toHaveBeenCalledWith({ where: { key: { startsWith: 'contact:' }, lastRequest: { lt: BigInt(3600000) } } })
  })
  it('weigert drukte direct zonder counters te lezen, verwijderen of schrijven', async () => {
    setup(); mocks.lock.mockResolvedValue([{ acquired: false }])
    expect(await reserveContactAttempt([{ key: 'contact:global', limit: 30, windowMs: 1000 }])).toBe('BUSY')
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.lock.mock.calls[0][0][0]).toContain('pg_try_advisory_xact_lock')
  })
  it('weigert een volle bucket zonder gedeeltelijke reservering', async () => {
    setup(); mocks.find.mockResolvedValueOnce(null).mockResolvedValueOnce({ count: 2, lastRequest: BigInt(7199999) })
    expect(await reserveContactAttempt([{ key: 'contact:global', limit: 30, windowMs: 1000 }, { key: 'contact:ip:test', limit: 2, windowMs: 1000 }])).toBe(false)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('heropent verlopen venster zonder het venster bij iedere poging te verlengen', async () => {
    setup(); mocks.find.mockResolvedValue({ count: 2, lastRequest: BigInt(7199000) })
    expect(await reserveContactAttempt([{ key: 'contact:global', limit: 2, windowMs: 1000 }])).toBe(true)
    expect(mocks.upsert.mock.calls[0][0].update).toEqual({ key: 'contact:global', count: 1, lastRequest: BigInt(7200000) })
  })
})
