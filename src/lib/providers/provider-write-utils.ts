import type { Prisma } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'

export async function reserveProviderVersion(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  expectedVersion: number,
): Promise<number> {
  const updated = await transaction.providerProfile.updateMany({
    where: { id: providerProfileId, version: expectedVersion, archivedAt: null },
    data: { version: { increment: 1 }, readinessStatus: 'INCOMPLETE', selectabilityStatus: 'NOT_SELECTABLE' },
  })
  if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
  const currentProjections = await transaction.trustedProviderProjection.findMany({
    where: { providerProfileId, invalidation: null },
    select: { id: true },
  })
  if (currentProjections.length) {
    await transaction.trustedProviderProjectionInvalidation.createMany({
      data: currentProjections.map(projection => ({ projectionId: projection.id, reasonCode: 'SOURCE_CHANGED' })),
      skipDuplicates: true,
    })
  }
  return expectedVersion + 1
}

export function parseProviderInput<T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  value: unknown,
): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new ProviderServiceError('VALIDATION_ERROR')
  return result.data
}
