import { getPrisma } from '@/lib/prisma'

// Reuses the existing RateLimit model. Lock only this endpoint's namespace.
export async function reserveContactAttempt(limits: { key: string; limit: number; windowMs: number }[]) {
  return getPrisma().$transaction(async transaction => {
    // Do not let a busy contact lock occupy every connection in the shared pool.
    const [lock] = await transaction.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(310034) AS acquired`
    if (!lock?.acquired) return 'BUSY' as const
    const now = Date.now()
    await transaction.rateLimit.deleteMany({ where: { key: { startsWith: 'contact:' }, lastRequest: { lt: BigInt(now - 3600000) } } })
    const counts = []
    for (const limit of limits) {
      const previous = await transaction.rateLimit.findUnique({ where: { key: limit.key } })
      const active = previous && Number(previous.lastRequest) > now - limit.windowMs
      if (active && previous.count >= limit.limit) return false
      counts.push({ key: limit.key, count: active ? previous.count + 1 : 1, lastRequest: active ? previous.lastRequest : BigInt(now) })
    }
    for (const data of counts) await transaction.rateLimit.upsert({ where: { key: data.key }, create: data, update: data })
    return true
  })
}
