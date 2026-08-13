import 'server-only'

import type { Prisma } from '@/generated/prisma/client'
import { appendTwoFactorAuditEvent } from '@/lib/auth-two-factor-audit'
import { AuthEmailDeliveryError, sendAuthEmail, twoFactorResetNotificationEmail } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { getPlatformOperatorContext } from './platform-admin-authorization'

const RESET_WINDOW_MS = 15 * 60 * 1000
const RESET_LIMIT = 5

export class PlatformTwoFactorResetError extends Error {
  constructor(
    public readonly code: 'FORBIDDEN' | 'NOT_FOUND' | 'NOT_ENABLED' | 'SELF_RESET_LAST_OWNER' | 'RATE_LIMITED' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message)
    this.name = 'PlatformTwoFactorResetError'
  }
}

export async function resetUserTwoFactor(input: {
  actorUserId: string
  targetUserId: string
  reason: string
  confirmed: boolean
  idempotencyKey: string
}) {
  if (!input.confirmed || input.reason.trim().length < 10 || input.reason.trim().length > 500 || !input.idempotencyKey.trim()) {
    throw new PlatformTwoFactorResetError('INVALID_INPUT', 'De resetbevestiging of reden is ongeldig.')
  }

  // Resolves the current context before work starts. The transaction repeats the
  // authorization check to close the time-of-check/time-of-use gap.
  await getPlatformOperatorContext(input.actorUserId)
  const prisma = getPrisma()

  const reset = await prisma.$transaction(async (transaction) => {
    const actor = await transaction.user.findFirst({
      where: {
        id: input.actorUserId,
        status: 'ACTIVE',
        platformRole: 'ADMIN',
        memberships: {
          some: {
            status: 'ACTIVE',
            role: { in: ['OWNER', 'ADMIN'] },
            organization: {
              status: 'ACTIVE',
              organizationType: 'PLATFORM_OPERATOR',
              systemKey: 'WORKMATCHR_PLATFORM',
            },
          },
        },
      },
      select: { id: true },
    })
    if (!actor) throw new PlatformTwoFactorResetError('FORBIDDEN', 'Deze beheeractie is niet beschikbaar.')

    await enforceResetRateLimit(transaction, input.actorUserId)

    const target = await transaction.user.findUnique({
      where: { id: input.targetUserId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        twoFactorEnabled: true,
        memberships: {
          where: {
            status: 'ACTIVE',
            organization: { systemKey: 'WORKMATCHR_PLATFORM', status: 'ACTIVE' },
          },
          select: { id: true, role: true, organizationId: true },
          take: 1,
        },
      },
    })
    if (!target || target.status !== 'ACTIVE') {
      throw new PlatformTwoFactorResetError('NOT_FOUND', 'Het gekozen account is niet beschikbaar.')
    }

    const factors = await transaction.twoFactor.findMany({
      where: { userId: target.id },
      select: { id: true },
    })
    if (!target.twoFactorEnabled && factors.length === 0) {
      throw new PlatformTwoFactorResetError('NOT_ENABLED', 'Tweestapsverificatie is niet ingesteld voor dit account.')
    }

    const targetMembership = target.memberships[0]
    if (target.id === input.actorUserId && targetMembership?.role === 'OWNER') {
      const activeOwnerCount = await transaction.organizationMembership.count({
        where: {
          organizationId: targetMembership.organizationId,
          status: 'ACTIVE',
          role: 'OWNER',
          user: { status: 'ACTIVE', platformRole: 'ADMIN' },
        },
      })
      if (activeOwnerCount <= 1) {
        throw new PlatformTwoFactorResetError('SELF_RESET_LAST_OWNER', 'De laatste actieve platformeigenaar kan deze herstelactie niet op zichzelf uitvoeren.')
      }
    }

    const pendingVerifications = await transaction.verification.findMany({
      where: {
        value: target.id,
        OR: [
          { identifier: { startsWith: '2fa-' } },
          { identifier: { startsWith: 'trust-device-' } },
        ],
      },
      select: { identifier: true },
    })
    const verificationIdentifiers = pendingVerifications.flatMap(({ identifier }) => (
      identifier.startsWith('2fa-') && !identifier.startsWith('2fa-attempts-')
        ? [identifier, `2fa-attempts-${identifier}`]
        : [identifier]
    ))

    await transaction.user.update({ where: { id: target.id }, data: { twoFactorEnabled: false } })
    await transaction.twoFactor.deleteMany({ where: { userId: target.id } })
    await transaction.session.deleteMany({ where: { userId: target.id } })
    if (verificationIdentifiers.length > 0) {
      await transaction.verification.deleteMany({ where: { identifier: { in: verificationIdentifiers } } })
    }

    const correlationId = `two-factor-reset:${input.idempotencyKey}`
    await appendTwoFactorAuditEvent(transaction, {
      eventType: 'TWO_FACTOR_RESET',
      subjectUserId: target.id,
      actorUserId: input.actorUserId,
      reasonCode: 'PLATFORM_ADMIN_TWO_FACTOR_RESET',
      metadata: { resetReason: input.reason.trim() },
      correlationId,
      idempotencyKey: correlationId,
    })
    await transaction.adminActionLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'TWO_FACTOR_RESET',
        entityType: 'User',
        entityId: target.id,
        reason: input.reason.trim(),
        metadata: { policyVersion: 'TWO_FACTOR_RESET_V1' },
      },
    })

    return {
      targetUserId: target.id,
      targetEmail: target.email,
      targetName: target.displayName?.trim() || 'gebruiker',
      platformRequired: Boolean(targetMembership),
      resetAt: new Date(),
    }
  }, { isolationLevel: 'Serializable' })

  const notification = await notifyTwoFactorReset({
    actorUserId: input.actorUserId,
    targetUserId: reset.targetUserId,
    targetEmail: reset.targetEmail,
    targetName: reset.targetName,
    platformRequired: reset.platformRequired,
    resetAt: reset.resetAt,
    idempotencyKey: input.idempotencyKey,
  })

  return { targetUserId: reset.targetUserId, notification }
}

async function notifyTwoFactorReset(input: {
  actorUserId: string
  targetUserId: string
  targetEmail: string
  targetName: string
  platformRequired: boolean
  resetAt: Date
  idempotencyKey: string
}): Promise<'SENT' | 'FAILED'> {
  let delivery: Awaited<ReturnType<typeof sendAuthEmail>> | null = null
  let failureCode: string | null = null
  try {
    delivery = await sendAuthEmail({
      ...twoFactorResetNotificationEmail({
        to: input.targetEmail,
        name: input.targetName,
        resetAt: input.resetAt,
        platformRequired: input.platformRequired,
      }),
      idempotencyKey: `two-factor-reset-notification:${input.idempotencyKey}`,
    })
  } catch (error) {
    failureCode = error instanceof AuthEmailDeliveryError ? error.code : 'EMAIL_DELIVERY_UNKNOWN'
  }

  const sent = Boolean(delivery)
  try {
    await getPrisma().$transaction(async (transaction) => {
      const eventType = sent ? 'TWO_FACTOR_RESET_NOTIFICATION_SENT' : 'TWO_FACTOR_RESET_NOTIFICATION_FAILED'
      const correlationId = `two-factor-reset:${input.idempotencyKey}`
      await appendTwoFactorAuditEvent(transaction, {
        eventType,
        subjectUserId: input.targetUserId,
        actorUserId: input.actorUserId,
        reasonCode: 'PLATFORM_ADMIN_TWO_FACTOR_RESET_NOTIFICATION',
        correlationId,
        idempotencyKey: `${correlationId}:notification:${sent ? 'sent' : 'failed'}`,
        metadata: {
          transport: delivery?.transport ?? null,
          providerMessageId: delivery?.messageId ?? null,
          deliveryStatus: delivery?.status ?? 'FAILED',
          failureCode,
        },
      })
      await transaction.adminActionLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: eventType,
          entityType: 'User',
          entityId: input.targetUserId,
          metadata: {
            transport: delivery?.transport ?? null,
            providerMessageId: delivery?.messageId ?? null,
            deliveryStatus: delivery?.status ?? 'FAILED',
            failureCode,
            policyVersion: 'TWO_FACTOR_RESET_NOTIFICATION_V1',
          },
        },
      })
    }, { isolationLevel: 'Serializable' })
  } catch {
    // A delivery-audit outage never reverses an already committed security reset.
    console.error('TWO_FACTOR_RESET_NOTIFICATION_AUDIT_FAILED')
  }
  return sent ? 'SENT' : 'FAILED'
}

async function enforceResetRateLimit(transaction: Prisma.TransactionClient, actorUserId: string) {
  const key = `platform:two-factor-reset:${actorUserId}`
  const now = Date.now()
  const existing = await transaction.rateLimit.findUnique({ where: { key } })
  const withinWindow = existing && now - Number(existing.lastRequest) < RESET_WINDOW_MS
  const count = withinWindow ? existing.count : 0
  if (count >= RESET_LIMIT) {
    throw new PlatformTwoFactorResetError('RATE_LIMITED', 'Te veel herstelacties. Probeer het later opnieuw.')
  }
  await transaction.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, lastRequest: BigInt(now) },
    update: { count: count + 1, lastRequest: BigInt(now) },
  })
}
