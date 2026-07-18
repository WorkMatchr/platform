import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { createCapabilitySchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { requireProviderSectionEditable } from './provider-dossier-access'

async function requirePublishedTerm(
  transaction: Prisma.TransactionClient,
  termId: string | undefined,
  kind: 'SERVICE' | 'SPECIALISM',
) {
  if (!termId) return
  const term = await transaction.providerTaxonomyTerm.findFirst({
    where: { id: termId, isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind } } },
    select: { id: true },
  })
  if (!term) throw new ProviderServiceError('VALIDATION_ERROR')
}

export async function createProviderCapability(
  userId: string,
  providerProfileId: string,
  rawInput: unknown,
) {
  const input = parseProviderInput(createCapabilitySchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      await requireProviderSectionEditable(transaction, providerProfileId, 'CAPABILITIES')
      await requirePublishedTerm(transaction, input.serviceTermId, 'SERVICE')
      await requirePublishedTerm(transaction, input.specialismTermId, 'SPECIALISM')
      const capability = await transaction.providerCapability.create({
        data: {
          providerProfileId,
          revisions: {
            create: {
              version: 1,
              serviceTermId: input.serviceTermId,
              specialismTermId: input.specialismTermId,
              deliveryModes: [...new Set(input.deliveryModes)],
              verificationLevel: 'SELF_DECLARED',
            },
          },
        },
        select: { id: true, version: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...capability, profileVersion, verificationLevel: 'SELF_DECLARED' as const }
    },
    { isolationLevel: 'Serializable' },
  )
}
