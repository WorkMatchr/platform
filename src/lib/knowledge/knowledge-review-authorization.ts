import type { Prisma } from '@/generated/prisma/client'
import { KnowledgeReviewError } from './knowledge-review-service-errors'

export async function assertPlatformAdministrator(transaction: Prisma.TransactionClient, actorUserId: string) {
  const actor = await transaction.user.findFirst({
    where: {
      id: actorUserId,
      status: 'ACTIVE',
      platformRole: 'ADMIN',
      memberships: { some: {
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN'] },
        organization: { status: 'ACTIVE', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM' },
      } },
    },
    select: { id: true },
  })
  if (!actor) throw new KnowledgeReviewError('NOT_AUTHORIZED', 'Deze kenniscontrole is niet beschikbaar.')
}
