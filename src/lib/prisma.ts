import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { previewDatabasePolicy } from '@/lib/maintenance/preview-isolation'
import { PreviewDatabasePool } from '@/lib/maintenance/preview-database-pool'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function getPrisma(): PrismaClient {
  const preview = previewDatabasePolicy()
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL is niet geconfigureerd.')
    }

    globalForPrisma.prisma = new PrismaClient({
      adapter: preview
        ? new PrismaPg(new PreviewDatabasePool(preview), { disposeExternalPool: true })
        : new PrismaPg({ connectionString }),
    })
  }

  return globalForPrisma.prisma
}
