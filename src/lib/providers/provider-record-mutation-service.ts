import { z } from 'zod'
import type { Prisma, ProviderDossierSection } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { requireProviderSectionEditable } from './provider-dossier-access'
import { ProviderServiceError } from './provider-errors'
import { expectedVersionSchema, evidenceMetadataSchema, insuranceSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'
import { hasConflictingActiveWorkArea } from './provider-work-area-rules'

const recordBase = z.object({ expectedProfileVersion: expectedVersionSchema, expectedRecordVersion: expectedVersionSchema })
const capabilityRevisionSchema = recordBase.extend({
  capabilityId: uuidSchema, serviceTermId: uuidSchema.optional(), specialismTermId: uuidSchema.optional(),
  deliveryModes: z.array(z.enum(['ON_SITE', 'HYBRID', 'REMOTE'])).min(1).max(3),
}).refine((input) => input.serviceTermId || input.specialismTermId, 'Een dienst of specialisme is verplicht.')
const sectorRevisionSchema = recordBase.extend({ sectorExperienceId: uuidSchema, sectorTermId: uuidSchema, experienceYears: z.int().nonnegative().max(80).optional() })
const workAreaRevisionSchema = recordBase.extend({ workAreaId: uuidSchema, regionTermId: uuidSchema, maxTravelDistanceKm: z.int().nonnegative().max(1000).optional() })
const qualificationRevisionSchema = recordBase.extend({
  qualificationId: uuidSchema, qualificationTermId: uuidSchema, issuer: z.string().trim().min(2).max(200), isCertified: z.boolean(),
  registrationNumber: z.string().trim().min(1).max(200).optional(), issuedAt: z.coerce.date().optional(), validUntil: z.coerce.date().optional(), evidenceRevisionId: uuidSchema.optional(),
}).refine((input) => !input.validUntil || !input.issuedAt || input.validUntil >= input.issuedAt, { path: ['validUntil'] })
const organizationQualificationSchema = z.object({
  expectedProfileVersion: expectedVersionSchema, qualificationId: uuidSchema.optional(), expectedRecordVersion: expectedVersionSchema.optional(),
  qualificationTermId: uuidSchema, registrationNumber: z.string().trim().min(1).max(200).optional(), issuedAt: z.coerce.date().optional(), validUntil: z.coerce.date().optional(), evidenceRevisionId: uuidSchema.optional(),
})
const insuranceRevisionSchema = insuranceSchema.extend({ insuranceId: uuidSchema, expectedRecordVersion: expectedVersionSchema })
const evidenceRevisionSchema = evidenceMetadataSchema.extend({ evidenceDocumentId: uuidSchema, expectedRecordVersion: expectedVersionSchema })
const profileSchema = z.object({ expectedProfileVersion: expectedVersionSchema, description: z.string().trim().max(2000).optional(), maxTravelDistanceKm: z.int().nonnegative().max(1000).optional(), acceptsRemoteWork: z.boolean() })
const statusSchema = z.object({ expectedProfileVersion: expectedVersionSchema, expectedRecordVersion: expectedVersionSchema, recordId: uuidSchema, status: z.enum(['ACTIVE', 'ARCHIVED']) })

async function requireTerm(transaction: Prisma.TransactionClient, id: string | undefined, kinds: Array<'SERVICE' | 'SPECIALISM' | 'COMPETENCY' | 'SECTOR' | 'REGION' | 'QUALIFICATION' | 'CERTIFICATION' | 'INSURANCE_TYPE'>) {
  if (!id) return
  const term = await transaction.providerTaxonomyTerm.findFirst({ where: { id, isActive: true, version: { status: 'PUBLISHED', taxonomy: { kind: { in: kinds } } } }, select: { id: true, code: true } })
  if (!term) throw new ProviderServiceError('VALIDATION_ERROR')
  return term
}

async function requireCleanEvidence(transaction: Prisma.TransactionClient, providerProfileId: string, id: string | undefined) {
  if (!id) return
  const evidence = await transaction.providerEvidenceRevision.findFirst({ where: { id, evidenceDocument: { providerProfileId, status: 'AVAILABLE' }, scanDecision: { scanStatus: 'CLEAN' } }, select: { id: true } })
  if (!evidence) throw new ProviderServiceError('EVIDENCE_NOT_CLEAN')
}

async function beginWrite(transaction: Prisma.TransactionClient, userId: string, providerProfileId: string, section: ProviderDossierSection) {
  const provider = await requireProviderManager(transaction, userId, providerProfileId)
  await requireProviderSectionEditable(transaction, providerProfileId, section)
  return provider
}

export async function updateProviderProfileFacts(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(profileSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'ORGANIZATION')
    const profileVersion = await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion)
    await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { description: input.description, maxTravelDistanceKm: input.maxTravelDistanceKm, acceptsRemoteWork: input.acceptsRemoteWork } })
    return { providerProfileId, profileVersion }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderCapability(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(capabilityRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'CAPABILITIES')
    await requireTerm(transaction, input.serviceTermId, ['SERVICE'])
    await requireTerm(transaction, input.specialismTermId, ['SPECIALISM'])
    const updated = await transaction.providerCapability.updateMany({ where: { id: input.capabilityId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerCapabilityRevision.create({ data: { providerCapabilityId: input.capabilityId, version: input.expectedRecordVersion + 1, serviceTermId: input.serviceTermId, specialismTermId: input.specialismTermId, deliveryModes: [...new Set(input.deliveryModes)], verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderSectorExperience(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(sectorRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'SECTOR_EXPERIENCE')
    await requireTerm(transaction, input.sectorTermId, ['SECTOR'])
    const updated = await transaction.providerSectorExperience.updateMany({ where: { id: input.sectorExperienceId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerSectorExperienceRevision.create({ data: { sectorExperienceId: input.sectorExperienceId, version: input.expectedRecordVersion + 1, sectorTermId: input.sectorTermId, experienceYears: input.experienceYears, verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderWorkArea(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(workAreaRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'WORK_AREA')
    const term = await requireTerm(transaction, input.regionTermId, ['REGION'])
    if (term && await hasConflictingActiveWorkArea(transaction, providerProfileId, term.code, input.workAreaId)) {
      throw new ProviderServiceError('VALIDATION_ERROR')
    }
    const updated = await transaction.providerWorkArea.updateMany({ where: { id: input.workAreaId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerWorkAreaRevision.create({ data: { workAreaId: input.workAreaId, version: input.expectedRecordVersion + 1, regionTermId: input.regionTermId, maxTravelDistanceKm: input.maxTravelDistanceKm, verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderProfessionalQualification(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(qualificationRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'QUALIFICATIONS')
    await requireTerm(transaction, input.qualificationTermId, ['QUALIFICATION', 'CERTIFICATION'])
    await requireCleanEvidence(transaction, providerProfileId, input.evidenceRevisionId)
    const updated = await transaction.providerProfessionalQualification.updateMany({ where: { id: input.qualificationId, professional: { providerProfileId }, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerProfessionalQualificationRevision.create({ data: { qualificationId: input.qualificationId, version: input.expectedRecordVersion + 1, qualificationTermId: input.qualificationTermId, issuer: input.issuer, isCertified: input.isCertified, registrationNumber: input.registrationNumber, issuedAt: input.issuedAt, validUntil: input.validUntil, evidenceRevisionId: input.evidenceRevisionId, verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function writeProviderOrganizationQualification(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(organizationQualificationSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'QUALIFICATIONS')
    await requireTerm(transaction, input.qualificationTermId, ['QUALIFICATION', 'CERTIFICATION'])
    await requireCleanEvidence(transaction, providerProfileId, input.evidenceRevisionId)
    if (!input.qualificationId) {
      const created = await transaction.providerOrganizationQualification.create({ data: { providerProfileId, revisions: { create: { version: 1, qualificationTermId: input.qualificationTermId, registrationNumber: input.registrationNumber, issuedAt: input.issuedAt, validUntil: input.validUntil, evidenceRevisionId: input.evidenceRevisionId, verificationLevel: 'SELF_DECLARED' } } }, select: { id: true } })
      return { ...created, recordVersion: 1, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
    }
    if (!input.expectedRecordVersion) throw new ProviderServiceError('VALIDATION_ERROR')
    const updated = await transaction.providerOrganizationQualification.updateMany({ where: { id: input.qualificationId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerOrganizationQualificationRevision.create({ data: { qualificationId: input.qualificationId, version: input.expectedRecordVersion + 1, qualificationTermId: input.qualificationTermId, registrationNumber: input.registrationNumber, issuedAt: input.issuedAt, validUntil: input.validUntil, evidenceRevisionId: input.evidenceRevisionId, verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderInsurance(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(insuranceRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    const provider = await beginWrite(transaction, userId, providerProfileId, 'INSURANCE')
    if (input.insuredOrganizationId !== provider.organizationId) throw new ProviderServiceError('VALIDATION_ERROR')
    await requireTerm(transaction, input.insuranceTypeTermId, ['INSURANCE_TYPE'])
    await requireCleanEvidence(transaction, providerProfileId, input.evidenceRevisionId)
    const updated = await transaction.providerInsurance.updateMany({ where: { id: input.insuranceId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 } } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerInsuranceRevision.create({ data: { insuranceId: input.insuranceId, version: input.expectedRecordVersion + 1, insuranceTypeTermId: input.insuranceTypeTermId, insurer: input.insurer, policyReference: input.policyReference, effectiveFrom: input.effectiveFrom, expiresAt: input.expiresAt, insuredOrganizationId: input.insuredOrganizationId, coverageAmountCents: input.coverageAmountCents, coverageGeography: input.coverageGeography, evidenceRevisionId: input.evidenceRevisionId, verificationLevel: 'SELF_DECLARED' }, select: { id: true, version: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion), verificationLevel: 'SELF_DECLARED' as const }
  }, { isolationLevel: 'Serializable' })
}

export async function reviseProviderEvidenceMetadata(userId: string, providerProfileId: string, rawInput: unknown) {
  const input = parseProviderInput(evidenceRevisionSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, 'EVIDENCE')
    const updated = await transaction.providerEvidenceDocument.updateMany({ where: { id: input.evidenceDocumentId, providerProfileId, version: input.expectedRecordVersion }, data: { version: { increment: 1 }, status: 'DRAFT' } })
    if (updated.count !== 1) throw new ProviderServiceError('CONFLICT')
    const revision = await transaction.providerEvidenceRevision.create({ data: { evidenceDocumentId: input.evidenceDocumentId, version: input.expectedRecordVersion + 1, storageKey: input.storageKey, originalFileName: input.originalFileName, mimeType: input.mimeType, sizeBytes: input.sizeBytes, sha256: input.sha256, scanStatus: 'PENDING' }, select: { id: true, version: true, scanStatus: true } })
    return { ...revision, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion) }
  }, { isolationLevel: 'Serializable' })
}

type RecordKind = 'CAPABILITY' | 'SECTOR_EXPERIENCE' | 'WORK_AREA' | 'PROFESSIONAL' | 'PROFESSIONAL_QUALIFICATION' | 'ORGANIZATION_QUALIFICATION' | 'INSURANCE' | 'EVIDENCE'
const recordSection: Record<RecordKind, ProviderDossierSection> = { CAPABILITY: 'CAPABILITIES', SECTOR_EXPERIENCE: 'SECTOR_EXPERIENCE', WORK_AREA: 'WORK_AREA', PROFESSIONAL: 'PROFESSIONALS', PROFESSIONAL_QUALIFICATION: 'QUALIFICATIONS', ORGANIZATION_QUALIFICATION: 'QUALIFICATIONS', INSURANCE: 'INSURANCE', EVIDENCE: 'EVIDENCE' }

export async function setProviderRecordStatus(userId: string, providerProfileId: string, kind: RecordKind, rawInput: unknown) {
  const input = parseProviderInput(statusSchema, rawInput)
  return getPrisma().$transaction(async (transaction) => {
    await beginWrite(transaction, userId, providerProfileId, recordSection[kind])
    const where = { id: input.recordId, version: input.expectedRecordVersion }
    let count = 0
    if (kind === 'CAPABILITY') count = (await transaction.providerCapability.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'SECTOR_EXPERIENCE') count = (await transaction.providerSectorExperience.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'WORK_AREA') count = (await transaction.providerWorkArea.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'PROFESSIONAL') count = (await transaction.providerProfessional.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'PROFESSIONAL_QUALIFICATION') count = (await transaction.providerProfessionalQualification.updateMany({ where: { ...where, professional: { providerProfileId } }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'ORGANIZATION_QUALIFICATION') count = (await transaction.providerOrganizationQualification.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'INSURANCE') count = (await transaction.providerInsurance.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status, version: { increment: 1 } } })).count
    if (kind === 'EVIDENCE') count = (await transaction.providerEvidenceDocument.updateMany({ where: { ...where, providerProfileId }, data: { status: input.status === 'ACTIVE' ? 'DRAFT' : 'ARCHIVED', version: { increment: 1 } } })).count
    if (count !== 1) throw new ProviderServiceError('CONFLICT')
    return { recordId: input.recordId, status: input.status, recordVersion: input.expectedRecordVersion + 1, profileVersion: await reserveProviderVersion(transaction, providerProfileId, input.expectedProfileVersion) }
  }, { isolationLevel: 'Serializable' })
}
