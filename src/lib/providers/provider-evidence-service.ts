import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { evidenceMetadataSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

export async function registerProviderEvidenceMetadata(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(evidenceMetadataSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      const document = await transaction.providerEvidenceDocument.create({
        data: {
          providerProfileId,
          revisions: {
            create: {
              version: 1,
              storageKey: input.storageKey,
              originalFileName: input.originalFileName,
              mimeType: input.mimeType,
              sizeBytes: input.sizeBytes,
              sha256: input.sha256,
              scanStatus: 'PENDING',
            },
          },
        },
        select: { id: true, revisions: { select: { id: true, scanStatus: true }, take: 1 } },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { documentId: document.id, revision: document.revisions[0], profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}
