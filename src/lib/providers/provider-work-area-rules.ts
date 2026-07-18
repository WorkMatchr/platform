import type { Prisma } from '@/generated/prisma/client'

export async function hasConflictingActiveWorkArea(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  targetCode: string,
  excludedWorkAreaId?: string,
) {
  if (targetCode === 'REMOTE') return false
  const activeWorkAreas = await transaction.providerWorkArea.findMany({
    where: {
      providerProfileId,
      status: 'ACTIVE',
      ...(excludedWorkAreaId ? { id: { not: excludedWorkAreaId } } : {}),
    },
    select: {
      revisions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { regionTerm: { select: { code: true } } },
      },
    },
  })
  const currentCodes = activeWorkAreas.map((workArea) => workArea.revisions[0]?.regionTerm.code)
  return targetCode === 'NATIONWIDE'
    ? currentCodes.some((code) => code !== undefined && code !== 'REMOTE')
    : currentCodes.includes('NATIONWIDE')
}
