import type { Prisma } from '@/generated/prisma/client'
import { assignmentInvitationCopy, type AssignmentPreview } from './assignment-purchase-preview'
import { createMarketplaceNotification, enqueueMarketplaceEmail } from './marketplace-events'

export async function enqueueAssignmentNotifications(transaction: Prisma.TransactionClient, invitation: {
  id: string; providerOrganizationId: string;
}, preview: AssignmentPreview) {
  const memberships = await transaction.organizationMembership.findMany({
    where: { organizationId: invitation.providerOrganizationId, status: 'ACTIVE',
      organization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] } },
      user: { status: 'ACTIVE', accountType: 'PROFESSIONAL', emailVerified: true } },
    select: { userId: true, user: { select: { assignmentEmailEnabled: true } } },
  })
  const copy = assignmentInvitationCopy(preview)
  let emailCount = 0
  for (const recipient of new Map(memberships.map(m => [m.userId, m])).values()) {
    const eventId = `INVITATION:${invitation.id}`
    await createMarketplaceNotification(transaction, {
      recipientUserId: recipient.userId, eventId,
      type: preview.matchType === 'ADDITIONAL' ? 'ASSIGNMENT_ADDITIONAL_MATCH' : 'ASSIGNMENT_PRIMARY_MATCH',
      title: copy.title, body: copy.body, targetRoute: `/uitnodigingen/${invitation.id}`,
    })
    if (!recipient.user.assignmentEmailEnabled) continue
    await enqueueMarketplaceEmail(transaction, { eventId, recipientUserId: recipient.userId,
      templateKey: 'MARKETPLACE_INVITATION', payload: JSON.parse(JSON.stringify({ schemaVersion: 2, invitationId: invitation.id, preview })) as Prisma.InputJsonValue })
    emailCount += 1
  }
  return emailCount
}
