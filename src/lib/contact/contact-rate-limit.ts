import { getPrisma } from '@/lib/prisma'

// Reuses the existing RateLimit model. Lock only this endpoint's namespace.
export async function reserveContactAttempt(limits: { key: string; limit: number; windowMs: number }[]) {
  const now = Date.now()
  return getPrisma().$transaction(async transaction => {
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(310034)`
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
