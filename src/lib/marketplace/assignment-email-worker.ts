import { blockedOnboardingProfiles } from '@/lib/providers/provider-marketplace-onboarding'
import { readInvitationPrice } from './assignment-pricing'
import { checkRunScope, eligibleForScopedExpertise } from './assignment-scope-service'
import { MarketplaceServiceError } from './marketplace-errors'
import { createHash, randomUUID } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { AuthEmailDeliveryError, sendAuthEmail } from '@/lib/email'
import { assignmentEmailPayloadSchema, renderAssignmentEmail } from './assignment-email'

export const ASSIGNMENT_EMAIL_MAX_ATTEMPTS = 5
export const ASSIGNMENT_EMAIL_LEASE_MS = 5 * 60_000
export const ASSIGNMENT_EMAIL_RETRY_WINDOW_MS = 23 * 60 * 60_000
const backoff = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]

export function assignmentEmailFailure(error: unknown) {
  if (!(error instanceof AuthEmailDeliveryError)) return { code: 'DELIVERY_INTERNAL_ERROR', retryable: false, retryAfterMs: null }
  return { code: error.code, retryAfterMs: error.retryAfterMs, retryable: error.code === 'EMAIL_PROVIDER_UNAVAILABLE' || error.code === 'EMAIL_PROVIDER_RESPONSE_INVALID' || (error.code === 'EMAIL_PROVIDER_REJECTED' && (error.providerStatusCode === 429 || (error.providerStatusCode ?? 0) >= 500)) }
}

/** Only this template is claimed. Dispatch is fenced against concurrent assignment revisions. */
export async function deliverAssignmentEmails(input: { limit?: number; now?: () => Date; send?: typeof sendAuthEmail } = {}) {
  const db = getPrisma()
  const clock = input.now ?? (() => new Date())
  const send = input.send ?? sendAuthEmail
  const report = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  for (let index = 0; index < Math.min(50, Math.max(0, input.limit ?? 20)); index += 1) {
    const now = clock()
    const token = randomUUID()
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      WITH candidate AS (
        SELECT "id" FROM "NotificationOutbox"
        WHERE "templateKey" = 'MARKETPLACE_INVITATION' AND "channel" = 'EMAIL'
          AND (("status" = 'PENDING' AND "availableAt" <= ${now})
            OR ("status" = 'PROCESSING' AND ("leaseUntil" <= ${now} OR "leaseUntil" IS NULL)))
        ORDER BY "availableAt", "id" FOR UPDATE SKIP LOCKED LIMIT 1
      )
      UPDATE "NotificationOutbox" o SET "status" = 'PROCESSING', "leaseToken" = ${token}::uuid,
        "leaseUntil" = ${new Date(now.getTime() + ASSIGNMENT_EMAIL_LEASE_MS)},
        "firstAttemptAt" = COALESCE(o."firstAttemptAt", ${now}), "attemptCount" = o."attemptCount" + 1
      FROM candidate WHERE o."id" = candidate."id" RETURNING o."id"`
    if (!rows.length) break
    report.claimed += 1
    const job = await db.notificationOutbox.findUniqueOrThrow({ where: { id: rows[0].id } })
    const finish = async (status: 'SENT' | 'FAILED' | 'PENDING', code: string | null, messageId?: string, retryAfterMs?: number | null) => {
      const result = await db.notificationOutbox.updateMany({
        where: { id: job.id, status: 'PROCESSING', leaseToken: token },
        data: { status, lastErrorCode: code, providerMessageId: messageId, leaseToken: null, leaseUntil: null,
          processedAt: status === 'PENDING' ? null : clock(),
          ...(status === 'PENDING' ? { availableAt: new Date(clock().getTime() + Math.max(retryAfterMs ?? 0, backoff[Math.min(job.attemptCount - 1, backoff.length - 1)])) } : {}),
        },
      })
      if (result.count) report[status === 'SENT' ? 'sent' : status === 'PENDING' ? 'retry' : 'failed'] += 1
    }
    if (job.attemptCount > ASSIGNMENT_EMAIL_MAX_ATTEMPTS || now.getTime() - job.firstAttemptAt!.getTime() >= ASSIGNMENT_EMAIL_RETRY_WINDOW_MS) {
      await finish('FAILED', 'DELIVERY_RECONCILIATION_REQUIRED'); continue
    }
    const parsed = assignmentEmailPayloadSchema.safeParse(job.payload)
    if (!parsed.success || !job.recipientUserId) { await finish('FAILED', 'UNSUPPORTED_OR_INVALID_PAYLOAD'); continue }
    const invitation = await db.providerInvitation.findFirst({
      where: { id: parsed.data.invitationId, status: 'INVITED', deadlineAt: { gt: now },
        providerProfile: { selectabilityStatus: 'SELECTABLE', lifecycleStatus: 'QUALIFIED', archivedAt: null, blocks: { none: { release: null } } },
        providerOrganization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] } },
        assignment: { status: { in: ['MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] }, archivedAt: null, clientOrganization: { status: 'ACTIVE' } },
      }, select: { providerProfileId: true, providerOrganizationId: true, matchCandidate: { select: { projectionId: true } }, snapshot: true, creditCost: true },
    })
    if (!invitation) { await finish('FAILED', 'INVITATION_NOT_DELIVERABLE'); continue }
    const blocked = await db.$transaction(tx => blockedOnboardingProfiles(tx, [{
      providerProfileId: invitation.providerProfileId, organizationId: invitation.providerOrganizationId,
      projectionId: invitation.matchCandidate.projectionId,
    }], now))
    if (blocked.size) { await finish('FAILED', 'INVITATION_NOT_DELIVERABLE'); continue }
    const recipient = await db.organizationMembership.findFirst({
      where: { organizationId: invitation.providerOrganizationId, userId: job.recipientUserId, status: 'ACTIVE',
        user: { status: 'ACTIVE', emailVerified: true, accountType: 'PROFESSIONAL', assignmentEmailEnabled: true } },
      select: { user: { select: { email: true } } },
    })
    if (!recipient) { await finish('FAILED', 'RECIPIENT_NOT_DELIVERABLE'); continue }
    let providerAccepted = false
    try {
      const price = readInvitationPrice(invitation)
      const snapshot = invitation.snapshot as Record<string, unknown>
      if (!price.priceSnapshot || price.credits !== parsed.data.preview.priceCredits || JSON.stringify(snapshot.preview) !== JSON.stringify((job.payload as Record<string, unknown>).preview)) {
        await finish('FAILED', 'INVITATION_PAYLOAD_MISMATCH'); continue
      }
      const email = renderAssignmentEmail(parsed.data, recipient.user.email, process.env.BETTER_AUTH_URL ?? '', job.idempotencyKey)
      // Freeze identity and rendered content across retries without storing an email address/body.
      const fingerprint = createHash('sha256').update(JSON.stringify([email, process.env.AUTH_EMAIL_FROM ?? ''])).digest('hex')
      if (job.deliveryFingerprint && job.deliveryFingerprint !== fingerprint) { await finish('FAILED', 'DELIVERY_PAYLOAD_CHANGED'); continue }
      const ready = await db.notificationOutbox.updateMany({ where: { id: job.id, leaseToken: token, status: 'PROCESSING', leaseUntil: { gt: clock() } }, data: { deliveryFingerprint: fingerprint } })
      if (!ready.count) continue
      // Serialize the final dispatch against assignment edits. Never retry an ambiguous
      // provider acknowledgement with a different key, even if the transaction fails.
      const result = await db.$transaction(async tx=>{
        await tx.$queryRaw`SELECT a.id FROM "Assignment" a JOIN "ProviderInvitation" i ON i."assignmentId"=a.id WHERE i.id=${parsed.data.invitationId}::uuid FOR UPDATE OF a`
        await tx.$queryRaw`SELECT p.id FROM "ProviderInvitation" i JOIN "ProviderProfile" p ON p.id=i."providerProfileId" WHERE i.id=${parsed.data.invitationId}::uuid FOR SHARE OF i,p`
        // Policy publication is infrequent; keep the effective set stable until dispatch.
        await tx.$executeRaw`LOCK TABLE "ProviderCapabilityRequirementConfig", "ProviderCapabilityQualificationRequirement", "ProviderTaxonomyVersion", "ProviderTaxonomyTerm" IN SHARE MODE`
        const live = await tx.providerInvitation.findFirst({
          where: {
            id: parsed.data.invitationId,
            assignment: { status: { in: ['MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION'] }, archivedAt: null, clientOrganization: { status: 'ACTIVE' } },
          },
          include: { matchRun: { select: { assignmentSnapshot: true } }, matchCandidate: { select: { projectionId: true } } },
        })
        if (!live) throw new MarketplaceServiceError('NOT_SELECTABLE')
        const at=clock()
        const scope=await checkRunScope(tx,live.assignmentId,live.matchRun.assignmentSnapshot,at)
        if(live.status!=='INVITED'||live.deadlineAt<=at || !await eligibleForScopedExpertise(tx,live.providerProfileId,scope,snapshot.recipientExpertise,at) ||
           (await blockedOnboardingProfiles(tx,[{providerProfileId:live.providerProfileId,organizationId:live.providerOrganizationId,projectionId:live.matchCandidate.projectionId}],at)).size)
          throw new MarketplaceServiceError('NOT_SELECTABLE')
        const recipientStillActive=await tx.organizationMembership.findFirst({where:{organizationId:live.providerOrganizationId,userId:job.recipientUserId!,status:'ACTIVE',user:{status:'ACTIVE',emailVerified:true,assignmentEmailEnabled:true,email:recipient.user.email}},select:{userId:true}})
        if(!recipientStillActive) throw new MarketplaceServiceError('NOT_SELECTABLE')
        const receipt=await send(email)
        providerAccepted=receipt.status==='ACCEPTED'
        return receipt
      },{timeout:15000})
      if (result.status !== 'ACCEPTED') { await finish('FAILED', 'DEVELOPMENT_ONLY'); continue }
      providerAccepted = true
      await finish('SENT', null, result.messageId)
    } catch (error) {
      // Keep the lease after a lost acknowledgement; retry the same provider key, never a new send.
      if (providerAccepted) throw new Error('DELIVERY_ACKNOWLEDGEMENT_FAILED')
      if(error instanceof MarketplaceServiceError){await finish('FAILED','INVITATION_NOT_DELIVERABLE');continue}
      const failure = assignmentEmailFailure(error)
      await finish(failure.retryable && job.attemptCount < ASSIGNMENT_EMAIL_MAX_ATTEMPTS ? 'PENDING' : 'FAILED', failure.code, undefined, failure.retryAfterMs)
    }
  }
  return report
}
