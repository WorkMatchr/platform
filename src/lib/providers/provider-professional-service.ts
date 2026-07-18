import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { ProviderServiceError } from './provider-errors'
import { expectedVersionSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { requireProviderSectionEditable } from './provider-dossier-access'

const createProfessionalSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  displayName: z.string().trim().min(2).max(200),
  functionalRole: z.string().trim().min(2).max(160),
  contactEmail: z.email().max(254).optional(),
})

const identityRevisionSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  expectedProfessionalVersion: expectedVersionSchema,
  professionalId: uuidSchema,
  displayName: z.string().trim().min(2).max(160),
  functionalRole: z.string().trim().min(2).max(160),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
})

const qualificationSchema = z.object({
  expectedProfileVersion: expectedVersionSchema,
  professionalId: uuidSchema,
  qualificationTermId: uuidSchema,
  issuer: z.string().trim().min(2).max(200),
  isCertified: z.boolean(),
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
      await requireProviderSectionEditable(transaction, providerProfileId, 'PROFESSIONALS')
      const professional = await transaction.providerProfessional.create({
        data: {
          providerProfileId,
          privateData: { create: { displayName: input.displayName, contactEmail: input.contactEmail } },
          identityRevisions: {
            create: {
              version: 1,
              displayName: input.displayName,
              functionalRole: input.functionalRole,
              createdByUserId: userId,
            },
          },
        },
        select: { id: true },
      })
      const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
      return { ...professional, profileVersion }
    },
    { isolationLevel: 'Serializable' },
  )
}

export async function reviseProviderProfessionalIdentity(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(identityRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderManager(transaction, userId, providerProfileId)
    await requireProviderSectionEditable(transaction, providerProfileId, 'PROFESSIONALS')
    const updated = await transaction.providerProfessional.updateMany({
      where: { id: input.professionalId, providerProfileId, version: input.expectedProfessionalVersion },
      data: { version: { increment: 1 }, status: input.status },
    })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const latest = await transaction.providerProfessionalIdentityRevision.aggregate({
      where: { professionalId: input.professionalId },
      _max: { version: true },
    })
    const revision = await transaction.providerProfessionalIdentityRevision.create({
      data: {
        professionalId: input.professionalId,
        version: (latest._max.version ?? 0) + 1,
        displayName: input.displayName,
        functionalRole: input.functionalRole,
        status: input.status,
        createdByUserId: userId,
      },
      select: { id: true, version: true },
    })
    await transaction.providerProfessionalPrivateData.update({
      where: { professionalId: input.professionalId },
      data: { displayName: input.displayName },
    })
    const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
    return { ...revision, professionalVersion: input.expectedProfessionalVersion + 1, profileVersion }
  }, { isolationLevel: 'Serializable' })
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
      await requireProviderSectionEditable(transaction, providerProfileId, 'QUALIFICATIONS')
      const professional = await transaction.providerProfessional.findFirst({ where: { id: input.professionalId, providerProfileId, status: 'ACTIVE' }, select: { id: true } })
      const term = await transaction.providerTaxonomyTerm.findFirst({ where: { id: input.qualificationTermId, isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind: { in: ['QUALIFICATION', 'CERTIFICATION'] } } } }, select: { id: true } })
      const capabilityCount = await transaction.providerCapability.count({ where: { id: { in: input.capabilityIds }, providerProfileId, status: 'ACTIVE' } })
      const evidence = input.evidenceRevisionId
        ? await transaction.providerEvidenceRevision.findFirst({ where: { id: input.evidenceRevisionId, evidenceDocument: { providerProfileId, status: 'AVAILABLE' }, scanDecision: { scanStatus: 'CLEAN' } }, select: { id: true } })
        : null
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
              isCertified: input.isCertified,
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
