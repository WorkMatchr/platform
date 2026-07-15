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
  const currentProjection = await transaction.trustedProviderProjection.findFirst({
    where: { providerProfileId, invalidation: null },
    orderBy: { sourceVersion: 'desc' },
    select: { id: true },
  })
  if (currentProjection) {
    await transaction.trustedProviderProjectionInvalidation.create({
      data: { projectionId: currentProjection.id, reasonCode: 'SOURCE_CHANGED' },
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
