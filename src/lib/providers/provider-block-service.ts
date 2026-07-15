import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderPlatformPermission } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { requiresFourEyes } from './provider-policy'
import { expectedVersionSchema, reasonCodeSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const blockSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  type: z.enum(['COMPLIANCE', 'QUALIFICATION', 'SECURITY', 'LEGAL', 'DATA_QUALITY']),
  reasonCode: reasonCodeSchema,
  reviewedByUserId: uuidSchema,
})

const releaseSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  blockId: uuidSchema,
  reasonCode: reasonCodeSchema,
  reviewedByUserId: uuidSchema,
})

export async function blockProvider(approvedByUserId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(blockSchema, rawInput)
  if (!requiresFourEyes(input.reviewedByUserId, approvedByUserId)) throw new ProviderServiceError('FOUR_EYES_REQUIRED')
  return getPrisma().$transaction(
    async (transaction) => {
      const now = new Date()
      await requireProviderPlatformPermission(transaction, input.reviewedByUserId, 'PROVIDER_REVIEWER', providerProfileId, now)
      await requireProviderPlatformPermission(transaction, approvedByUserId, 'PROVIDER_APPROVER', providerProfileId, now)
      const review = await transaction.providerVerificationReview.findFirst({
        where: { providerProfileId, reviewerUserId: input.reviewedByUserId, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        select: { id: true },
      })
      if (!review) throw new ProviderServiceError('REQUIREMENTS_NOT_CONFIGURED')
      const reason = await transaction.providerReasonCode.findUnique({ where: { code: input.reasonCode }, select: { id: true } })
      if (!reason) throw new ProviderServiceError('VALIDATION_ERROR')
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      const block = await transaction.providerBlock.create({
        data: { providerProfileId, type: input.type, reasonCode: input.reasonCode, reviewedByUserId: input.reviewedByUserId, blockedByUserId: approvedByUserId },
        select: { id: true, type: true, createdAt: true },
      })
      await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { selectabilityStatus: 'BLOCKED' } })
      return { ...block, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function releaseProviderBlock(approvedByUserId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(releaseSchema, rawInput)
  if (!requiresFourEyes(input.reviewedByUserId, approvedByUserId)) throw new ProviderServiceError('FOUR_EYES_REQUIRED')
  return getPrisma().$transaction(
    async (transaction) => {
      const now = new Date()
      await requireProviderPlatformPermission(transaction, input.reviewedByUserId, 'PROVIDER_REVIEWER', providerProfileId, now)
      await requireProviderPlatformPermission(transaction, approvedByUserId, 'PROVIDER_APPROVER', providerProfileId, now)
      const review = await transaction.providerVerificationReview.findFirst({
        where: { providerProfileId, reviewerUserId: input.reviewedByUserId, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
        select: { id: true },
      })
      if (!review) throw new ProviderServiceError('REQUIREMENTS_NOT_CONFIGURED')
      const block = await transaction.providerBlock.findFirst({ where: { id: input.blockId, providerProfileId, release: null }, select: { id: true } })
      if (!block) throw new ProviderServiceError('NOT_FOUND')
      const reason = await transaction.providerReasonCode.findUnique({ where: { code: input.reasonCode }, select: { id: true } })
      if (!reason) throw new ProviderServiceError('VALIDATION_ERROR')
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      const release = await transaction.providerBlockRelease.create({
        data: { blockId: block.id, reasonCode: input.reasonCode, reviewedByUserId: input.reviewedByUserId, releasedByUserId: approvedByUserId },
        select: { id: true, releasedAt: true },
      })
      const remaining = await transaction.providerBlock.count({ where: { providerProfileId, release: null, id: { not: block.id } } })
      await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { selectabilityStatus: remaining > 0 ? 'BLOCKED' : 'NOT_SELECTABLE' } })
      return { ...release, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}
