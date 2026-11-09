import type { Prisma } from '@/generated/prisma/client'
import { currentApprovedQualificationBasis } from './provider-dossier-service'
import { profileDecisionHistory, profileQualificationAt } from './provider-effective-qualification'
import { getPrisma } from '@/lib/prisma'
import { hashProviderJson } from './provider-canonical-json'
import { ProviderServiceError } from './provider-errors'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'

export async function calculateProviderReadiness(providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(tx => calculateProviderReadinessInTransaction(tx, providerProfileId, at), { isolationLevel: 'Serializable' })
}

export async function calculateProviderReadinessInTransaction(transaction: Prisma.TransactionClient, providerProfileId: string, at: Date) {
    const provider = await transaction.providerProfile.findFirst({
      where: { id: providerProfileId, archivedAt: null, organization: { status: 'ACTIVE' } },
      select: { id: true, version: true },
    })
    if (!provider) throw new ProviderServiceError('NOT_FOUND')
    const assessmentBasis = await assessProviderDossierCompletenessInTransaction(transaction, providerProfileId, at)
    const reasons = assessmentBasis.reasons.map(reason => reason.code)
    const status = reasons.length === 0 ? 'READY' : 'INCOMPLETE'
    const checksum = hashProviderJson({ providerProfileId, providerVersion: provider.version, reasons: [...new Set(reasons)].sort(), status }).sha256
    const assessment = await transaction.providerReadinessAssessment.create({
      data: { providerProfileId, status, reasonCodes: [...new Set(reasons)].sort(), sourceVersion: provider.version, checksum },
      select: { id: true, status: true, reasonCodes: true, checksum: true },
    })
    await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { readinessStatus: status } })
    return assessment
}

export async function calculateProviderSelectability(providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(tx => calculateProviderSelectabilityInTransaction(tx, providerProfileId, at), { isolationLevel: 'Serializable' })
}

export async function calculateProviderSelectabilityInTransaction(transaction: Prisma.TransactionClient, providerProfileId: string, at: Date) {
    const provider = await transaction.providerProfile.findFirst({
      where: { id: providerProfileId, archivedAt: null },
      select: {
        id: true,
        version: true,
        platformQualificationStatus: true,
        readinessAssessments: { orderBy: { createdAt: 'desc' }, take: 1 },
        blocks: { where: { release: null }, select: { id: true } },
        ...profileDecisionHistory,
      },
    })
    if (!provider) throw new ProviderServiceError('NOT_FOUND')
    const readiness = provider.readinessAssessments[0]
    if (!readiness) throw new ProviderServiceError('CONFIGURATION_INCOMPLETE')
    const reasons: string[] = []
    if (readiness.status !== 'READY' || readiness.sourceVersion !== provider.version) {
      reasons.push('CONFIGURATION_INCOMPLETE')
    }
    const qualification = profileQualificationAt(provider, at)
    if (qualification.platform?.dossierCandidateId &&
        !await currentApprovedQualificationBasis(transaction, providerProfileId, qualification.platform.dossierCandidateId)) reasons.push('DOSSIER_NOT_SUBMITTABLE')
    if (!qualification.platform || provider.platformQualificationStatus !== 'QUALIFIED') reasons.push('REQUIREMENTS_NOT_CONFIGURED')
    if (provider.blocks.length > 0) reasons.push('PROVIDER_BLOCKED')
    if (!qualification.allServicesQualified) {
      reasons.push('QUALIFICATION_REQUIREMENTS_NOT_CONFIGURED')
    }
    const status = reasons.length === 0 ? 'SELECTABLE' : provider.blocks.length > 0 ? 'BLOCKED' : 'NOT_SELECTABLE'
    const checksum = hashProviderJson({ providerProfileId, providerVersion: provider.version, readinessAssessmentId: readiness.id, reasons: [...new Set(reasons)].sort(), status }).sha256
    const assessment = await transaction.providerSelectabilityAssessment.create({
      data: { providerProfileId, readinessAssessmentId: readiness.id, status, reasonCodes: [...new Set(reasons)].sort(), sourceVersion: provider.version, checksum },
      select: { id: true, status: true, reasonCodes: true, checksum: true },
    })
    await transaction.providerProfile.update({ where: { id: providerProfileId }, data: { selectabilityStatus: status } })
    return assessment
}
