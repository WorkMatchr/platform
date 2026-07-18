import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { expectedVersionSchema, insuranceSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { requireProviderSectionEditable } from './provider-dossier-access'

const termAcceptanceSchema = z.object({
  documentVersionId: uuidSchema,
  expectedProfileVersion: expectedVersionSchema,
})

export async function acceptProviderTerm(
  userId: string,
  providerProfileId: string,
  rawInput: unknown,
) {
  const input = parseProviderInput(termAcceptanceSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    await requireProviderSectionEditable(transaction, providerProfileId, 'DECLARATIONS')
    const now = new Date()
    const version = await transaction.providerTermDocumentVersion.findFirst({
      where: {
        id: input.documentVersionId,
        status: 'ACTIVE',
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: { id: true },
    })
    if (!version) throw new ProviderServiceError('TERMS_NOT_CONFIGURED')
    const acceptance = await transaction.providerTermAcceptance.upsert({
      where: { providerProfileId_documentVersionId: { providerProfileId, documentVersionId: input.documentVersionId } },
      update: {},
      create: { providerProfileId, documentVersionId: input.documentVersionId, acceptedByUserId: userId },
      select: { id: true, acceptedAt: true },
    })
    const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
    return { ...acceptance, profileVersion }
  })
}

export async function registerProviderInsurance(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(insuranceSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      const provider = await requireProviderManager(transaction, userId, providerProfileId)
      await requireProviderSectionEditable(transaction, providerProfileId, 'INSURANCE')
      if (input.insuredOrganizationId !== provider.organizationId) throw new ProviderServiceError('VALIDATION_ERROR')
      const insuranceType = await transaction.providerTaxonomyTerm.findFirst({
        where: {
          id: input.insuranceTypeTermId,
          isActive: true,
          version: { status: 'PUBLISHED', taxonomy: { kind: 'INSURANCE_TYPE' } },
        },
        select: { id: true },
      })
      const evidence = await transaction.providerEvidenceRevision.findFirst({
        where: {
          id: input.evidenceRevisionId,
          evidenceDocument: { providerProfileId, status: 'AVAILABLE' },
          scanDecision: { scanStatus: 'CLEAN' },
        },
        select: { id: true },
      })
      if (!insuranceType) throw new ProviderServiceError('VALIDATION_ERROR')
      if (!evidence) throw new ProviderServiceError('EVIDENCE_NOT_CLEAN')
      const insurance = await transaction.providerInsurance.create({
        data: {
          providerProfileId,
          revisions: {
            create: {
              version: 1,
              insuranceTypeTermId: input.insuranceTypeTermId,
              insurer: input.insurer,
              policyReference: input.policyReference,
              effectiveFrom: input.effectiveFrom,
              expiresAt: input.expiresAt,
              insuredOrganizationId: input.insuredOrganizationId,
              coverageAmountCents: input.coverageAmountCents,
              coverageGeography: input.coverageGeography,
              evidenceRevisionId: input.evidenceRevisionId,
              verificationLevel: 'SELF_DECLARED',
            },
          },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...insurance, profileVersion, verificationLevel: 'SELF_DECLARED' as const }
    },
    { isolationLevel: 'Serializable' },
  )
}
