import type { Prisma } from '@/generated/prisma/client'
import { visibleScopedInvitation } from './assignment-scope-service'
import { blockedOnboardingProfiles } from '@/lib/providers/provider-marketplace-onboarding'
import { externalAssignmentId } from '@/lib/assignments/assignment-identity'
import { getPrisma } from '@/lib/prisma'
import { MarketplaceServiceError } from './marketplace-errors'

export async function getMarketplaceNotifications(userId: string, limit = 25, tx?: Prisma.TransactionClient) {
  return tx ? loadNotifications(userId,limit,tx) : getPrisma().$transaction(db=>loadNotifications(userId,limit,db),{isolationLevel:'RepeatableRead'})
}
async function loadNotifications(userId:string,limit:number,db:Prisma.TransactionClient){
  const incoming = await db.marketplaceNotification.findMany({
    where: { recipientUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 50)),
    select: { id: true, type: true, title: true, body: true, targetRoute: true, createdAt: true, readAt: true },
  })
  const notifications=[]
  for(const n of incoming){
    if(['ASSIGNMENT_PRIMARY_MATCH','ASSIGNMENT_ADDITIONAL_MATCH'].includes(n.type)){
      const id=/^\/uitnodigingen\/([0-9a-f-]{36})$/i.exec(n.targetRoute)?.[1]
      if(!id) continue
      const inv=await db.providerInvitation.findFirst({where:{id,providerOrganization:{memberships:{some:{userId,status:'ACTIVE',user:{status:'ACTIVE'}}}}},
        select:{snapshot:true,assignmentId:true,providerProfileId:true,providerOrganizationId:true,status:true,matchRun:{select:{assignmentSnapshot:true}},matchCandidate:{select:{projectionId:true}}}})
      if(!inv || inv.status!=='INVITED' || !await visibleScopedInvitation(db,inv,new Date()) || (await blockedOnboardingProfiles(db,[{providerProfileId:inv.providerProfileId,organizationId:inv.providerOrganizationId,projectionId:inv.matchCandidate.projectionId}],new Date())).size) continue
    }
    notifications.push(n)
  }
  // Older participation notices stored the internal assignment ID in the route.
  // A recipient can only resolve an assignment they can open as a client.
  const affected = notifications.filter(notice => notice.type === 'PROVIDER_ACCEPTED' || notice.type === 'PROVIDER_DECLINED')
  const legacyPath = /^\/opdrachten\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/(?:offertes|selectie)$/
  const ids = affected.flatMap(notice => legacyPath.exec(notice.targetRoute)?.[1] ?? [])
  if (!ids.length) return notifications
  const assignments = await db.assignment.findMany({
    where: { id: { in: ids }, requestId: { not: null }, clientOrganization: {
      status: 'ACTIVE', organizationType: 'CLIENT', systemKey: null,
      memberships: { some: { userId, status: 'ACTIVE', role: { in: ['ADMIN', 'OWNER'] }, user: { status: 'ACTIVE', accountType: 'CLIENT' } } },
    } },
    select: { id: true, requestId: true },
  })
  const canonical = new Map(assignments.map(assignment => [assignment.id, externalAssignmentId(assignment)]))
  for (const notice of affected) {
    const id = legacyPath.exec(notice.targetRoute)?.[1]
    if (!id) continue
    const requestId = canonical.get(id)
    if (requestId) notice.targetRoute = notice.targetRoute.replace(id, requestId)
  }
  return notifications
}

export async function markMarketplaceNotificationRead(userId: string, notificationId: string) {
  const updated = await getPrisma().marketplaceNotification.updateMany({
    where: { id: notificationId, recipientUserId: userId, readAt: null },
    data: { readAt: new Date(), readByUserId: userId },
  })
  if (updated.count === 0) {
    const existing = await getPrisma().marketplaceNotification.findFirst({ where: { id: notificationId, recipientUserId: userId } })
    if (!existing) throw new MarketplaceServiceError('NOT_FOUND')
  }
}
