import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { capacitySnapshotSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const CAPACITY_VALIDITY_DAYS = 30

export async function confirmProviderCapacity(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(capacitySnapshotSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      const confirmedAt = new Date()
      const validUntil = new Date(confirmedAt)
      validUntil.setUTCDate(validUntil.getUTCDate() + CAPACITY_VALIDITY_DAYS)
      const snapshot = await transaction.providerCapacitySnapshot.create({
        data: {
          providerProfileId,
          acceptsNewAssignments: input.acceptsNewAssignments,
          earliestStartDate: input.earliestStartDate,
          capacityLevel: input.capacityLevel,
          confirmedAt,
          validUntil,
        },
        select: { id: true, confirmedAt: true, validUntil: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...snapshot, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}
