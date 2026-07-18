import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { expectedVersionSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { requireProviderSectionEditable } from './provider-dossier-access'
import { hasConflictingActiveWorkArea } from './provider-work-area-rules'

const sectorExperienceSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  sectorTermId: uuidSchema,
  experienceYears: z.int().nonnegative().max(80).optional(),
})

const workAreaSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  regionTermId: uuidSchema,
  maxTravelDistanceKm: z.int().nonnegative().max(1000).optional(),
})

async function requireTerm(
  transaction: Prisma.TransactionClient,
  termId: string,
  kind: 'SECTOR' | 'REGION',
) {
  const term = await transaction.providerTaxonomyTerm.findFirst({
    where: { id: termId, isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind } } },
    select: { id: true, code: true },
  })
  if (!term) throw new ProviderServiceError('VALIDATION_ERROR')
  return term
}

export async function createProviderSectorExperience(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(sectorExperienceSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      await requireProviderSectionEditable(transaction, providerProfileId, 'SECTOR_EXPERIENCE')
      await requireTerm(transaction, input.sectorTermId, 'SECTOR')
      const record = await transaction.providerSectorExperience.create({
        data: {
          providerProfileId,
          revisions: { create: { version: 1, sectorTermId: input.sectorTermId, experienceYears: input.experienceYears } },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...record, profileVersion, verificationLevel: 'SELF_DECLARED' as const }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function createProviderWorkArea(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(workAreaSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      await requireProviderSectionEditable(transaction, providerProfileId, 'WORK_AREA')
      const term = await requireTerm(transaction, input.regionTermId, 'REGION')
      if (await hasConflictingActiveWorkArea(transaction, providerProfileId, term.code)) {
        throw new ProviderServiceError('VALIDATION_ERROR')
      }
      const record = await transaction.providerWorkArea.create({
        data: {
          providerProfileId,
          revisions: { create: { version: 1, regionTermId: input.regionTermId, maxTravelDistanceKm: input.maxTravelDistanceKm } },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...record, profileVersion, verificationLevel: 'SELF_DECLARED' as const }
    },
    { isolationLevel: 'Serializable' },
  )
}
