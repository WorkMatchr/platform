import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

export function knowledgeImprovementClaimWhere(
  knowledgeItemId: string,
  runtimeEnvironment = process.env.NODE_ENV,
): Prisma.KnowledgeClaimWhereInput {
  if (runtimeEnvironment === 'development') return { id: knowledgeItemId }
  return { id: knowledgeItemId, publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED' }
}

export async function getDevelopmentKnowledgeImprovementTarget() {
  if (process.env.NODE_ENV !== 'development') return null
  return getPrisma().knowledgeClaim.findFirst({
    where: { OR: [{ publicationStatus: { not: 'PUBLISHED' } }, { validationStatus: { not: 'VALIDATED' } }] },
    select: { id: true },
    orderBy: { externalKey: 'asc' },
  })
}
