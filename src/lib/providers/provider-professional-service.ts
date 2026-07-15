import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { expectedVersionSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const createProfessionalSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  displayName: z.string().trim().min(2).max(200),
  contactEmail: z.email().max(254).optional(),
})

const qualificationSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  professionalId: uuidSchema,
  qualificationTermId: uuidSchema,
  issuer: z.string().trim().min(2).max(200).optional(),
  registrationNumber: z.string().trim().min(1).max(200).optional(),
  issuedAt: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  evidenceRevisionId: uuidSchema.optional(),
  capabilityIds: z.array(uuidSchema).max(50).default([]),
}).refine((input) => !input.validUntil || !input.issuedAt || input.validUntil >= input.issuedAt, { path: ['validUntil'] })

export async function createProviderProfessional(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(createProfessionalSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      const professional = await transaction.providerProfessional.create({
        data: {
          providerProfileId,
          privateData: { create: { displayName: input.displayName, contactEmail: input.contactEmail } },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...professional, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function addProviderProfessionalQualification(
  userId: string,
  providerProfileId: string,
  rawInput: unknown,
) {
  const input = parseProviderInput(qualificationSchema, rawInput)
  return getPrisma().$transaction(
    async (transaction) => {
      await requireProviderManager(transaction, userId, providerProfileId)
      const [professional, term, capabilityCount, evidence] = await Promise.all([
        transaction.providerProfessional.findFirst({ where: { id: input.professionalId, providerProfileId, status: 'ACTIVE' }, select: { id: true } }),
        transaction.providerTaxonomyTerm.findFirst({ where: { id: input.qualificationTermId, isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind: { in: ['QUALIFICATION', 'CERTIFICATION'] } } } }, select: { id: true } }),
        transaction.providerCapability.count({ where: { id: { in: input.capabilityIds }, providerProfileId, status: 'ACTIVE' } }),
        input.evidenceRevisionId
          ? transaction.providerEvidenceRevision.findFirst({ where: { id: input.evidenceRevisionId, evidenceDocument: { providerProfileId, status: 'AVAILABLE' }, scanDecision: { scanStatus: 'CLEAN' } }, select: { id: true } })
          : Promise.resolve(null),
      ])
      if (!professional || !term || capabilityCount !== new Set(input.capabilityIds).size) throw new ProviderServiceError('VALIDATION_ERROR')
      if (input.evidenceRevisionId && !evidence) throw new ProviderServiceError('EVIDENCE_NOT_CLEAN')
      const qualification = await transaction.providerProfessionalQualification.create({
        data: {
          professionalId: input.professionalId,
          revisions: {
            create: {
              version: 1,
              qualificationTermId: input.qualificationTermId,
              issuer: input.issuer,
              registrationNumber: input.registrationNumber,
              issuedAt: input.issuedAt,
              validUntil: input.validUntil,
              evidenceRevisionId: input.evidenceRevisionId,
            },
          },
          capabilities: { create: [...new Set(input.capabilityIds)].map((capabilityId) => ({ capabilityId })) },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...qualification, profileVersion, verificationLevel: 'SELF_DECLARED' as const }
    },
    { isolationLevel: 'Serializable' },
  )
}
