import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'

// Lock current authority as well as the draft. Revocation cannot race a write.
export async function assertF4DraftActor(tx: Prisma.TransactionClient, actor: { userId: string; organizationId: string }) {
  const rows = await tx.$queryRaw<Array<{ role: string }>>(Prisma.sql`
    SELECT m."role"::text AS role FROM "OrganizationMembership" m
    JOIN "User" u ON u.id = m."userId" JOIN "Organization" o ON o.id = m."organizationId"
    WHERE m."userId" = ${actor.userId}::uuid AND m."organizationId" = ${actor.organizationId}::uuid
      AND m.status = 'ACTIVE' AND u.status = 'ACTIVE' AND o.status = 'ACTIVE'
      AND o."organizationType" <> 'PLATFORM_OPERATOR' AND m.role IN ('OWNER','ADMIN')
    FOR SHARE OF m, u, o`)
  if (!rows.length) throw new ArboGuideRunError('ACCESS_DENIED')
}
