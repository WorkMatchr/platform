import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { recordAuthorizedBonusCreditsInTransaction } from '@/lib/credits/credit-wallet-service'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from './financial-transaction'

const GENERIC_EMAIL_DOMAINS = new Set(['gmail.com', 'outlook.com', 'hotmail.com', 'live.nl', 'icloud.com', 'yahoo.com'])

const inputSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  evidenceSource: z.enum(['MANUAL_PLATFORM_REVIEW', 'KVK_PROVIDER']),
  chamberOfCommerceRegistrationDate: z.coerce.date().optional(),
  chamberOfCommerceNumber: z.string().trim().min(6).max(20),
  iban: z.string().trim().min(8).max(34).optional(),
  accountIdentity: z.string().trim().min(2).max(160),
  organizationName: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(120),
  emailDomain: z.string().trim().toLowerCase().max(120).optional(),
  reason: z.string().trim().min(5).max(500),
  idempotencyKey: z.string().trim().min(12).max(160).regex(/^[A-Za-z0-9:_-]+$/),
})

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function hash(value: string) {
  return createHash('sha256').update(normalize(value)).digest('hex')
}

function determineAgeDecision(registrationDate: Date | undefined, at: Date) {
  if (!registrationDate) return 'REVIEW_REQUIRED' as const
  if (registrationDate > at) return 'REVIEW_REQUIRED' as const
  const threshold = new Date(at)
  threshold.setUTCFullYear(threshold.getUTCFullYear() - 1)
  return registrationDate >= threshold ? 'ELIGIBLE' as const : 'INELIGIBLE' as const
}

export async function assessAndGrantStarterBenefit(input: unknown, at = new Date()) {
  const values = inputSchema.parse(input)
  return runSerializableFinancialTransaction(async (transaction) => {
    await requireMarketplacePlatformAdmin(transaction, values.actorUserId)
    await transaction.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`starter:${values.organizationId}`}, 0))::text AS "lock"`)
    const repeated = await transaction.starterBenefitReview.findUnique({ where: { idempotencyKey: values.idempotencyKey }, include: { grant: true } })
    if (repeated) return { review: repeated, grant: repeated.grant, idempotent: true }
    const organization = await transaction.organization.findFirst({
      where: { id: values.organizationId, status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] }, systemKey: null },
      select: { id: true },
    })
    if (!organization) throw new Error('STARTER_ORGANIZATION_NOT_ELIGIBLE')
    const chamberOfCommerceHash = hash(values.chamberOfCommerceNumber.replace(/\D/g, ''))
    const accountIdentityHash = hash(values.accountIdentity)
    const nameCityHash = hash(`${values.organizationName}|${values.city}`)
    const emailDomain = values.emailDomain && !GENERIC_EMAIL_DOMAINS.has(values.emailDomain) ? values.emailDomain : undefined
    const emailDomainHash = emailDomain ? hash(emailDomain) : undefined
    const ibanHash = values.iban ? hash(values.iban.replace(/\s+/g, '')) : undefined

    let decision = determineAgeDecision(values.chamberOfCommerceRegistrationDate, at)
    const existingHardIdentity = await transaction.starterBenefitGrant.findUnique({ where: { chamberOfCommerceHash } })
    if (existingHardIdentity) decision = 'INELIGIBLE'
    if (decision === 'ELIGIBLE') {
      const strongSignal = await transaction.starterBenefitReview.findFirst({
        where: {
          grant: { isNot: null },
          OR: [
            { accountIdentityHash },
            { nameCityHash },
            ...(ibanHash ? [{ ibanHash }] : []),
            ...(emailDomainHash ? [{ emailDomainHash }] : []),
          ],
        },
        select: { id: true },
      })
      if (strongSignal) decision = 'REVIEW_REQUIRED'
    }
    const reviewId = randomUUID()
    const review = await transaction.starterBenefitReview.create({
      data: {
        id: reviewId,
        organizationId: values.organizationId,
        reviewedByUserId: values.actorUserId,
        decision,
        evidenceSource: values.evidenceSource,
        chamberOfCommerceDate: values.chamberOfCommerceRegistrationDate,
        chamberOfCommerceHash,
        ibanHash,
        accountIdentityHash,
        nameCityHash,
        emailDomainHash,
        reason: values.reason,
        idempotencyKey: values.idempotencyKey,
      },
    })
    if (decision !== 'ELIGIBLE') return { review, grant: null, idempotent: false }
    const grantId = randomUUID()
    const ledger = await recordAuthorizedBonusCreditsInTransaction(transaction, {
      organizationId: values.organizationId,
      actorUserId: values.actorUserId,
      credits: 25,
      reason: 'Startersvoordeel: 25 bonuscredits na gecontroleerde KvK-beoordeling.',
      referenceType: 'StarterBenefitGrant',
      referenceId: grantId,
      idempotencyKey: `starter-benefit-ledger:${review.id}`,
    })
    const grant = await transaction.starterBenefitGrant.create({
      data: {
        id: grantId,
        organizationId: values.organizationId,
        reviewId: review.id,
        grantedByUserId: values.actorUserId,
        credits: 25,
        chamberOfCommerceHash,
        ledgerTransactionId: ledger.id,
        idempotencyKey: `starter-benefit-grant:${values.idempotencyKey}`,
      },
    })
    await transaction.financialEvent.create({
      data: {
        actorUserId: values.actorUserId,
        eventType: 'STARTER_BENEFIT_GRANTED',
        result: 'SUCCEEDED',
        reason: values.reason,
        idempotencyKey: `starter-benefit-event:${grant.id}`,
        metadata: { organizationId: values.organizationId, reviewId: review.id, credits: 25 },
      },
    })
    return { review, grant, idempotent: false }
  })
}
