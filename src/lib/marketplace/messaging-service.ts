import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { MarketplaceServiceError } from './marketplace-errors'
import { activeOrganizationRecipients, createMarketplaceNotification, writeMarketplaceAudit } from './marketplace-events'

async function requireChannelAccess(
  transaction: Prisma.TransactionClient,
  userId: string,
  organizationId: string,
  channelId: string,
  write: boolean,
) {
  const channel = await transaction.marketplaceMessageChannel.findFirst({
    where: {
      id: channelId,
      OR: [
        { clientOrganizationId: organizationId },
        { participation: { providerOrganizationId: organizationId } },
      ],
      ...(write ? { status: 'OPEN' } : {}),
    },
    include: {
      participation: { select: { providerOrganizationId: true, status: true } },
      clientOrganization: {
        select: {
          memberships: { where: { userId, status: 'ACTIVE', user: { status: 'ACTIVE' } }, select: { role: true }, take: 1 },
        },
      },
    },
  })
  if (!channel || channel.participation.status !== 'ACTIVE') throw new MarketplaceServiceError('ACCESS_DENIED')
  const clientRole = channel.clientOrganization.memberships[0]?.role
  const providerMembership = await transaction.organizationMembership.findFirst({
    where: { userId, organizationId: channel.participation.providerOrganizationId, status: 'ACTIVE', user: { status: 'ACTIVE' } },
    select: { role: true },
  })
  const role = channel.clientOrganizationId === organizationId ? clientRole : providerMembership?.role
  if (!role || (write && role === 'MEMBER')) throw new MarketplaceServiceError('ACCESS_DENIED')
  return { channel, role }
}

export async function sendMarketplaceMessage(input: {
  actorUserId: string
  organizationId: string
  channelId: string
  content: string
  idempotencyKey: string
}) {
  const content = input.content.trim()
  if (content.length < 1 || content.length > 4000) throw new MarketplaceServiceError('VALIDATION_ERROR')
  return getPrisma().$transaction(async (transaction) => {
    const repeated = await transaction.marketplaceMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } })
    if (repeated) return repeated
    const { channel, role } = await requireChannelAccess(transaction, input.actorUserId, input.organizationId, input.channelId, true)
    const message = await transaction.marketplaceMessage.create({
      data: {
        channelId: channel.id,
        senderUserId: input.actorUserId,
        senderOrganizationId: input.organizationId,
        content,
        idempotencyKey: input.idempotencyKey,
      },
    })
    const recipientOrganizationId = input.organizationId === channel.clientOrganizationId
      ? channel.participation.providerOrganizationId
      : channel.clientOrganizationId
    const recipients = await activeOrganizationRecipients(transaction, recipientOrganizationId)
    for (const recipientUserId of recipients) {
      await createMarketplaceNotification(transaction, {
        recipientUserId,
        eventId: `MESSAGE:${message.id}`,
        type: 'NEW_MESSAGE',
        title: 'Nieuw bericht',
        body: 'Er staat een nieuw bericht klaar binnen een opdracht.',
        targetRoute: `/berichten/${channel.id}`,
      })
    }
    await writeMarketplaceAudit(transaction, {
      actorUserId: input.actorUserId,
      actorRole: role,
      organizationId: input.organizationId,
      action: 'MESSAGE_SENT',
      entityType: 'MarketplaceMessage',
      entityId: message.id,
      correlationKey: input.idempotencyKey,
      metadata: { channelId: channel.id },
    })
    return message
  }, { isolationLevel: 'Serializable' })
}

export async function getMarketplaceChannel(userId: string, organizationId: string, channelId: string) {
  return getPrisma().$transaction(async (transaction) => {
    const { channel } = await requireChannelAccess(transaction, userId, organizationId, channelId, false)
    const messages = await transaction.marketplaceMessage.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, senderOrganizationId: true, content: true, status: true, createdAt: true },
      take: 200,
    })
    return { ...channel, messages }
  })
}
