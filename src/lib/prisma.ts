import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '@/generated/prisma/client'
import { previewDatabasePolicy } from '@/lib/maintenance/preview-isolation'
import { PreviewDatabasePool } from '@/lib/maintenance/preview-database-pool'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; previewPool?: PreviewDatabasePool; runtimePool?: Pool }

// Diagnostics and Prisma use the same guarded runtime pool; no owner connection.
export function getPreviewRuntimePool() {
  const policy = previewDatabasePolicy()
  if (!policy) return null
  return globalForPrisma.previewPool ??= new PreviewDatabasePool(policy)
}

// Expose the application's actual pool to the authenticated read-only diagnostic.
// Keep the adapter's existing pg configuration; never open a second owner connection.
export function getRuntimeDatabasePool() {
  const previewPool = getPreviewRuntimePool()
  if (previewPool) return previewPool
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
  return globalForPrisma.runtimePool ??= new Pool({ connectionString })
}

export function getPrisma(): PrismaClient {
  const pool = getRuntimeDatabasePool()
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg(pool, { disposeExternalPool: true }),
    })
  }

  return globalForPrisma.prisma
}
