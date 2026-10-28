import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { previewDatabasePolicy } from '@/lib/maintenance/preview-isolation'
import { PreviewDatabasePool } from '@/lib/maintenance/preview-database-pool'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; previewPool?: PreviewDatabasePool }

// Diagnostics and Prisma use the same guarded runtime pool; no owner connection.
export function getPreviewRuntimePool() {
  const policy = previewDatabasePolicy()
  if (!policy) return null
  return globalForPrisma.previewPool ??= new PreviewDatabasePool(policy)
}

export function getPrisma(): PrismaClient {
  const preview = previewDatabasePolicy()
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL is niet geconfigureerd.')
    }

    globalForPrisma.prisma = new PrismaClient({
      adapter: preview
        ? new PrismaPg(getPreviewRuntimePool()!, { disposeExternalPool: true })
        : new PrismaPg({ connectionString }),
    })
  }

  return globalForPrisma.prisma
}
