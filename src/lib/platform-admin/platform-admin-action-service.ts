import 'server-only'

import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { auth } from '@/lib/auth'
import { withAuthEmailDeliveryCapture } from '@/lib/auth-email-delivery-context'
import { canUseAccountRecovery } from '@/lib/auth-policy'
import {
  administrativeEmail,
  AuthEmailDeliveryError,
  sendAuthEmail,
  type AuthEmail,
  type AuthEmailDeliveryResult,
} from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { sendOrganizationInvitationActivation } from '@/lib/account-architecture/better-auth-invitation-service'
import { getPlatformAdministratorContext } from './platform-admin-authorization'
import { platformActionStatuses, platformSignalAuditId, type PlatformActionStatus } from './platform-admin-action-center'
import { getPlatformAdminActionCandidates } from './platform-admin-query-service'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class PlatformAdminActionError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'NOT_AVAILABLE'
      | 'DELIVERY_FAILED',
    message: string,
  ) {
    super(message)
    this.name = 'PlatformAdminActionError'
  }
}

type AdminTargetType = 'USER' | 'ORGANIZATION' | 'PROVIDER' | 'ASSIGNMENT'

const entityTypeByTarget: Record<AdminTargetType, string> = {
  USER: 'User',
  ORGANIZATION: 'Organization',
  PROVIDER: 'ProviderProfile',
  ASSIGNMENT: 'Assignment',
}

function cleanText(value: string, minimum: number, maximum: number, message: string) {
  const result = value.trim()
  if (result.length < minimum || result.length > maximum) {
    throw new PlatformAdminActionError('INVALID_INPUT', message)
  }
  return result
}

function assertUuid(value: string) {
  if (!uuidPattern.test(value)) throw new PlatformAdminActionError('INVALID_INPUT', 'De gekozen beheercontext is ongeldig.')
}

async function assertTargetExists(targetType: AdminTargetType, targetId: string) {
  const prisma = getPrisma()
  if (targetType === 'USER') return Boolean(await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }))
  if (targetType === 'ORGANIZATION') return Boolean(await prisma.organization.findFirst({ where: { id: targetId, systemKey: null }, select: { id: true } }))
  if (targetType === 'PROVIDER') return Boolean(await prisma.providerProfile.findUnique({ where: { id: targetId }, select: { id: true } }))
  return Boolean(await prisma.assignment.findUnique({ where: { id: targetId }, select: { id: true } }))
}

export async function addPlatformAdminNote(input: {
  actorUserId: string
  targetType: AdminTargetType
  targetId: string
  category: string
  text: string
  operation?: 'NOTE' | 'MARK_INVESTIGATED'
}) {
  await getPlatformAdministratorContext(input.actorUserId)
  assertUuid(input.targetId)
  if (input.operation === 'MARK_INVESTIGATED' && input.targetType !== 'ASSIGNMENT') {
    throw new PlatformAdminActionError('INVALID_INPUT', 'Deze onderzoeksactie is alleen voor opdrachten beschikbaar.')
  }
  const category = cleanText(input.category, 2, 80, 'Kies een geldige notitiecategorie.')
  const text = cleanText(input.text, 5, 2_000, 'Schrijf een notitie van 5 tot 2.000 tekens.')
  if (!await assertTargetExists(input.targetType, input.targetId)) {
    throw new PlatformAdminActionError('NOT_FOUND', 'Het doel van deze notitie is niet beschikbaar.')
  }
  return getPrisma().adminActionLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.operation === 'MARK_INVESTIGATED' ? 'ASSIGNMENT_SIGNAL_INVESTIGATED' : 'ADMIN_NOTE_ADDED',
      entityType: entityTypeByTarget[input.targetType],
      entityId: input.targetId,
      reason: text,
      metadata: { category, visibility: 'PLATFORM_ADMIN_ONLY', policyVersion: 'PLATFORM_ADMIN_ACTIONS_V1' },
    },
  })
}

async function resolveMailRecipient(targetType: Exclude<AdminTargetType, 'ASSIGNMENT'>, targetId: string) {
  const prisma = getPrisma()
  if (targetType === 'USER') {
    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, displayName: true, status: true },
    })
    return user ? { email: user.email, name: user.displayName?.trim() || 'gebruiker', entityType: 'User' } : null
  }
  const organization = targetType === 'ORGANIZATION'
    ? await prisma.organization.findFirst({
        where: { id: targetId, systemKey: null },
        select: {
          id: true,
          name: true,
          generalEmail: true,
          memberships: {
            where: { role: 'OWNER', status: 'ACTIVE', user: { status: 'ACTIVE' } },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { user: { select: { email: true } } },
          },
        },
      })
    : (await prisma.providerProfile.findUnique({
        where: { id: targetId },
        select: {
          organization: {
            select: {
              id: true,
              name: true,
              generalEmail: true,
              memberships: {
                where: { role: 'OWNER', status: 'ACTIVE', user: { status: 'ACTIVE' } },
                orderBy: { createdAt: 'asc' },
                take: 1,
                select: { user: { select: { email: true } } },
              },
            },
          },
        },
      }))?.organization
  if (!organization) return null
  const email = organization.generalEmail?.trim() || organization.memberships[0]?.user.email
  return email ? { email, name: organization.name, entityType: targetType === 'PROVIDER' ? 'ProviderProfile' : 'Organization' } : null
}

async function recordDelivery(input: {
  actorUserId: string
  targetId: string
  entityType: string
  action: string
  subject: string
  messageLength: number
  delivery: AuthEmailDeliveryResult | null
  failureCode?: string
  adminCommunicationId?: string
}) {
  await getPrisma().adminActionLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.targetId,
      adminCommunicationId: input.adminCommunicationId,
      reason: input.subject,
      metadata: {
        subject: input.subject,
        messageLength: input.messageLength,
        deliveryStatus: input.delivery?.status ?? 'FAILED',
        deliveryTransport: input.delivery?.transport ?? null,
        providerMessageId: input.delivery?.messageId ?? null,
        failureCode: input.failureCode ?? null,
        policyVersion: 'PLATFORM_ADMIN_ACTIONS_V1',
      },
    },
  })
}

async function createAdministrativeCommunication(input: {
  actorUserId: string
  targetId: string
  entityType: string
  subject: string
  email: AuthEmail
}) {
  const dispatchKey = `admin-communication:${randomUUID()}`
  return getPrisma().$transaction(async (transaction) => {
    const communication = await transaction.adminCommunication.create({
      data: {
        kind: 'ADMINISTRATIVE',
        targetEntityType: input.entityType,
        targetEntityId: input.targetId,
        authorUserId: input.actorUserId,
        subject: input.subject,
        textSnapshot: input.email.text,
        htmlSnapshot: input.email.html,
        dispatchKey,
      },
    })
    await transaction.adminActionLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'ADMIN_EMAIL_CREATED',
        entityType: input.entityType,
        entityId: input.targetId,
        adminCommunicationId: communication.id,
        reason: input.subject,
        metadata: {
          messageLength: input.email.text.length,
          policyVersion: 'ADMIN_COMMUNICATION_ARCHIVE_V1',
        },
      },
    })
    return communication
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}

async function recordAdministrativeCommunicationDelivery(input: {
  communicationId: string
  actorUserId: string
  targetId: string
  entityType: string
  subject: string
  delivery: AuthEmailDeliveryResult | null
  failureCode?: string
}) {
  await getPrisma().$transaction(async (transaction) => {
    const attemptCount = await transaction.adminCommunicationDeliveryAttempt.count({
      where: { communicationId: input.communicationId },
    })
    const providerStatus = input.delivery
      ? input.delivery.status === 'DEVELOPMENT_ONLY' ? 'DEVELOPMENT_ONLY' : 'PROVIDER_ACCEPTED'
      : 'FAILED'
    await transaction.adminCommunicationDeliveryAttempt.create({
      data: {
        communicationId: input.communicationId,
        attemptNumber: attemptCount + 1,
        transport: input.delivery?.transport ?? 'RESEND',
        providerMessageId: input.delivery?.messageId ?? null,
        providerStatus,
        failureCode: input.failureCode ?? null,
      },
    })
    await transaction.adminActionLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.delivery ? 'ADMIN_EMAIL_SENT' : 'ADMIN_EMAIL_FAILED',
        entityType: input.entityType,
        entityId: input.targetId,
        adminCommunicationId: input.communicationId,
        reason: input.subject,
        metadata: {
          deliveryStatus: providerStatus,
          deliveryTransport: input.delivery?.transport ?? null,
          providerMessageId: input.delivery?.messageId ?? null,
          failureCode: input.failureCode ?? null,
          policyVersion: 'ADMIN_COMMUNICATION_ARCHIVE_V1',
        },
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10_000 })
}

export async function sendPlatformAdminMessage(input: {
  actorUserId: string
  targetType: 'USER' | 'ORGANIZATION' | 'PROVIDER'
  targetId: string
  subject: string
  message: string
}) {
  const administrator = await getPlatformAdministratorContext(input.actorUserId)
  assertUuid(input.targetId)
  const subject = cleanText(input.subject, 3, 160, 'Gebruik een onderwerp van 3 tot 160 tekens.')
  const message = cleanText(input.message, 10, 4_000, 'Schrijf een bericht van 10 tot 4.000 tekens.')
  const recipient = await resolveMailRecipient(input.targetType, input.targetId)
  if (!recipient) throw new PlatformAdminActionError('NOT_AVAILABLE', 'Voor dit doel is geen veilig e-mailadres beschikbaar.')
  const email = administrativeEmail({
    to: recipient.email,
    recipientName: recipient.name,
    subject,
    message,
    senderName: administrator.displayName?.trim() || 'WorkMatchr platformbeheer',
  })
  const communication = await createAdministrativeCommunication({
    actorUserId: input.actorUserId,
    targetId: input.targetId,
    entityType: recipient.entityType,
    subject,
    email,
  })
  let delivery: AuthEmailDeliveryResult
  try {
    delivery = await sendAuthEmail({ ...email, idempotencyKey: communication.dispatchKey })
  } catch (error) {
    const failureCode = error instanceof AuthEmailDeliveryError ? error.code : 'EMAIL_DELIVERY_UNKNOWN'
    await recordAdministrativeCommunicationDelivery({
      communicationId: communication.id,
      actorUserId: input.actorUserId,
      targetId: input.targetId,
      entityType: recipient.entityType,
      subject,
      delivery: null,
      failureCode,
    })
    throw new PlatformAdminActionError('DELIVERY_FAILED', 'De e-mail kon niet veilig worden verzonden. Probeer het later opnieuw.')
  }
  try {
    await recordAdministrativeCommunicationDelivery({
      communicationId: communication.id,
      actorUserId: input.actorUserId,
      targetId: input.targetId,
      entityType: recipient.entityType,
      subject,
      delivery,
    })
    return delivery
  } catch {
    // The immutable snapshot exists before the provider call. Never create a
    // contradictory failed attempt after a provider-accepted delivery.
    throw new PlatformAdminActionError('DELIVERY_FAILED', 'De e-mail kon niet veilig worden verzonden. Probeer het later opnieuw.')
  }
}

export async function sendPlatformUserAccessEmail(input: {
  actorUserId: string
  subjectUserId: string
  operation: 'ACTIVATION' | 'VERIFICATION' | 'PASSWORD_RESET'
  requestHeaders?: Headers
}) {
  await getPlatformAdministratorContext(input.actorUserId)
  assertUuid(input.subjectUserId)
  const user = await getPrisma().user.findUnique({
    where: { id: input.subjectUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      status: true,
      memberships: {
        where: { status: { in: ['INVITED', 'ACTIVE'] }, organization: { systemKey: null } },
        take: 2,
        select: { organizationId: true, status: true, organization: { select: { name: true, status: true } } },
      },
    },
  })
  if (!user) throw new PlatformAdminActionError('NOT_FOUND', 'Het account is niet beschikbaar.')

  let delivery: AuthEmailDeliveryResult | null = null
  try {
    if (input.operation === 'ACTIVATION') {
      const membership = user.memberships[0]
      if (
        user.status !== 'INVITED' ||
        user.memberships.length !== 1 ||
        membership?.status !== 'INVITED' ||
        membership.organization.status !== 'ACTIVE'
      ) {
        throw new PlatformAdminActionError('NOT_AVAILABLE', 'Voor dit account staat geen actieve uitnodiging open.')
      }
      delivery = await sendOrganizationInvitationActivation({
        email: user.email,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        requestHeaders: input.requestHeaders,
      })
    } else if (input.operation === 'VERIFICATION') {
      const hasPendingOrganizationInvitation = user.status === 'INVITED' &&
        user.memberships.some((membership) => membership.status === 'INVITED')
      if (
        user.emailVerified ||
        hasPendingOrganizationInvitation ||
        (user.status !== 'ACTIVE' && user.status !== 'INVITED')
      ) {
        throw new PlatformAdminActionError('NOT_AVAILABLE', 'Voor dit account is geen verificatiemail nodig.')
      }
      delivery = await withAuthEmailDeliveryCapture(() => auth.api.sendVerificationEmail({
        body: { email: user.email, callbackURL: '/account' },
        headers: input.requestHeaders,
      }))
    } else {
      if (!canUseAccountRecovery(user.status)) {
        throw new PlatformAdminActionError('NOT_AVAILABLE', 'Wachtwoordherstel is voor dit account niet beschikbaar.')
      }
      delivery = await withAuthEmailDeliveryCapture(() => auth.api.requestPasswordReset({
        body: { email: user.email, redirectTo: '/wachtwoord-herstellen' },
        headers: input.requestHeaders,
      }))
    }
    if (!delivery) {
      throw new AuthEmailDeliveryError('EMAIL_PROVIDER_RESPONSE_INVALID', 'Er is geen controleerbaar bezorgresultaat.')
    }
    await recordDelivery({
      actorUserId: input.actorUserId,
      targetId: user.id,
      entityType: 'User',
      action: `ADMIN_${input.operation}_EMAIL_SENT`,
      subject: input.operation,
      messageLength: 0,
      delivery,
    })
    return delivery
  } catch (error) {
    if (error instanceof PlatformAdminActionError && error.code !== 'DELIVERY_FAILED') throw error
    const failureCode = error instanceof AuthEmailDeliveryError ? error.code : 'EMAIL_DELIVERY_UNKNOWN'
    await recordDelivery({
      actorUserId: input.actorUserId,
      targetId: user.id,
      entityType: 'User',
      action: `ADMIN_${input.operation}_EMAIL_FAILED`,
      subject: input.operation,
      messageLength: 0,
      delivery: null,
      failureCode,
    })
    throw new PlatformAdminActionError('DELIVERY_FAILED', 'De e-mail kon niet veilig worden verzonden. Probeer het later opnieuw.')
  }
}

export async function updatePlatformSignalStatus(input: {
  actorUserId: string
  signalId: string
  status: PlatformActionStatus
  note?: string
}) {
  const administrator = await getPlatformAdministratorContext(input.actorUserId)
  if (!platformActionStatuses.includes(input.status) || input.signalId.length > 200) {
    throw new PlatformAdminActionError('INVALID_INPUT', 'De gekozen actie of status is ongeldig.')
  }
  const signal = (await getPlatformAdminActionCandidates(input.actorUserId)).find((item) => item.id === input.signalId)
  if (!signal) throw new PlatformAdminActionError('NOT_FOUND', 'Dit signaal is niet meer actief.')
  const note = input.note?.trim()
  if (note && (note.length < 5 || note.length > 500)) {
    throw new PlatformAdminActionError('INVALID_INPUT', 'Gebruik voor de toelichting 5 tot 500 tekens.')
  }
  return getPrisma().adminActionLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: 'PLATFORM_ACTION_STATUS_CHANGED',
      entityType: 'PlatformAdviceSignal',
      entityId: platformSignalAuditId(signal.id),
      reason: note || signal.recommendedAction,
      metadata: {
        signalId: signal.id,
        ruleCode: signal.ruleCode,
        status: input.status,
        responsibleUserId: administrator.id,
        responsibleName: administrator.displayName?.trim() || administrator.email,
        policyVersion: 'PLATFORM_ADMIN_ACTIONS_V1',
      },
    },
  })
}
