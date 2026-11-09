import { getPrisma } from '@/lib/prisma'
import { externalAssignmentWhere } from '@/lib/assignments/assignment-identity'
import { requireClientMarketplaceManager, requireMarketplacePlatformAdmin } from './marketplace-authorization'
import { readAssignmentScope, decideScope } from './assignment-scope-service'
import { knownService } from './assignment-scope'
import { MarketplaceServiceError } from './marketplace-errors'

export function clientScope(
  user: string,
  org: string,
  externalId: string,
  service: string,
  submit = false,
  expected?: string,
) {
  return getPrisma().$transaction(async (tx) => {
    await requireClientMarketplaceManager(tx, user, org)
    const a = await tx.assignment.findFirstOrThrow({
      where: { ...externalAssignmentWhere(externalId), clientOrganizationId: org },
      select: { id: true, status: true },
    })
    const scope = await readAssignmentScope(tx, a.id, service, new Date(), submit)
    if (submit) {
      if (a.status !== 'OPEN' || !scope.reviewable || scope.digest !== expected)
        throw new MarketplaceServiceError('CONFLICT')
      const key = 'SCOPE_REQUEST:' + scope.digest
      if (!(await tx.marketplaceAuditEvent.findUnique({ where: { correlationKey: key } })))
        await tx.marketplaceAuditEvent.create({
          data: {
            entityId: a.id,
            entityType: 'Assignment',
            action: 'ASSIGNMENT_SCOPE_REQUESTED',
            actorUserId: user,
            organizationId: org,
            actorRole: 'CLIENT_MANAGER',
            correlationKey: key,
            metadata: { service, digest: scope.digest, revision: scope.revision },
          },
        })
    }
    return scope
  })
}
export function reviewQueue(user: string) {
  return getPrisma().$transaction(async (tx) => {
    await requireMarketplacePlatformAdmin(tx, user)
    const pending = await tx.$queryRaw<Array<{ id: string; service: string; digest: string }>>`
      SELECT r."entityId" AS id,r.metadata->>'service' AS service,r.metadata->>'digest' AS digest
      FROM "MarketplaceAuditEvent" r JOIN "Assignment" a ON a.id=r."entityId" AND a.status='OPEN' AND a."publishedVersion"=(r.metadata->>'revision')::integer WHERE r.action='ASSIGNMENT_SCOPE_REQUESTED'
      AND NOT EXISTS (SELECT 1 FROM "MarketplaceAuditEvent" d WHERE d."correlationKey"='SCOPE_DECISION:'||(r.metadata->>'digest'))
      ORDER BY r."createdAt" DESC`
    const items = []
    for (const r of pending) {
      if (!knownService(r.service)) continue
      const scope = await readAssignmentScope(tx, r.id, r.service, new Date(), false)
      if (scope.digest === r.digest && scope.reviewable) items.push({ ...scope, id: r.id })
    }
    return items
  })
}
export function reviewScope(
  user: string,
  id: string,
  service: string,
  expected: string,
  inside: boolean,
  reason: string,
) {
  if (!knownService(service)) throw new MarketplaceServiceError('VALIDATION_ERROR')
  return getPrisma().$transaction(
    async (tx) => {
      await requireMarketplacePlatformAdmin(tx, user)
      const req = await tx.marketplaceAuditEvent.findUnique({
        where: { correlationKey: 'SCOPE_REQUEST:' + expected },
      })
      if (!req || req.entityId !== id || req.action !== 'ASSIGNMENT_SCOPE_REQUESTED')
        throw new MarketplaceServiceError('NOT_FOUND')
      await decideScope(tx, user, id, service, expected, inside, reason)
    },
    { isolationLevel: 'Serializable' },
  )
}
