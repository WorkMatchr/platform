import type { Prisma, ProviderDossierSection } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'
import { getProviderEditableSections } from './provider-dossier-access'
import { hashProviderJson } from './provider-canonical-json'

export const PROVIDER_COMPLETENESS_POLICY_VERSION = 'PROVIDER-COMPLETENESS-2'

export type ProviderCompletenessReason = {
  code: string
  section: ProviderDossierSection
  state: 'ACTION_REQUIRED' | 'EXPIRED' | 'NOT_STARTED' | 'WARNING'
}

export type ProviderCompletenessAssessment = {
  policyVersion: string
  sourceProfileVersion: number
  required: number
  completed: number
  actionRequired: number
  expired: number
  notStarted: number
  percentage: number
  blockingSections: ProviderDossierSection[]
  warnings: ProviderCompletenessReason[]
  reasons: ProviderCompletenessReason[]
  editableSections: ProviderDossierSection[]
  isSubmittable: boolean
  checksum: string
}

type Check = { section: ProviderDossierSection; complete: boolean; expired?: boolean; code: string }

function latestRevisionPerRecord<T extends { version: number }>(
  revisions: T[],
  getRecordId: (revision: T) => string,
) {
  const latest = new Map<string, T>()
  for (const revision of revisions) {
    const recordId = getRecordId(revision)
    const current = latest.get(recordId)
    if (!current || revision.version > current.version) latest.set(recordId, revision)
  }
  return [...latest.values()]
}

export async function assessProviderDossierCompletenessInTransaction(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  at = new Date(),
): Promise<ProviderCompletenessAssessment> {
  const provider = await transaction.providerProfile.findFirst({
    where: { id: providerProfileId, archivedAt: null, organization: { status: 'ACTIVE', organizationType: { in: ['PROVIDER', 'BOTH'] } } },
    select: {
      version: true,
      organization: { select: { name: true, chamberOfCommerceNumber: true } },
    },
  })
  if (!provider) return emptyAssessment()

  // De pg-driver ondersteunt geen overlappende queries op één transactionele
  // PoolClient. Houd deze reads daarom expliciet sequentieel en vlak.
  const capabilityRevisions = await transaction.providerCapabilityRevision.findMany({
    where: { capability: { providerProfileId, status: 'ACTIVE' } },
    select: { providerCapabilityId: true, version: true, serviceTermId: true, specialismTermId: true },
  })
  const sectorExperienceCount = await transaction.providerSectorExperience.count({
    where: { providerProfileId, status: 'ACTIVE' },
  })
  const workAreaCount = await transaction.providerWorkArea.count({
    where: { providerProfileId, status: 'ACTIVE' },
  })
  const identityRevisions = await transaction.providerProfessionalIdentityRevision.findMany({
    where: { professional: { providerProfileId, status: 'ACTIVE' } },
    select: { professionalId: true, version: true, status: true },
  })
  const professionalQualificationCount = await transaction.providerProfessionalQualification.count({
    where: { status: 'ACTIVE', professional: { providerProfileId, status: 'ACTIVE' } },
  })
  const organizationQualificationCount = await transaction.providerOrganizationQualification.count({
    where: { providerProfileId, status: 'ACTIVE' },
  })
  const insuranceRevisions = await transaction.providerInsuranceRevision.findMany({
    where: { insurance: { providerProfileId, status: 'ACTIVE' } },
    select: { insuranceId: true, version: true, expiresAt: true, evidenceRevisionId: true },
  })
  const activeInsurance = latestRevisionPerRecord(insuranceRevisions, (revision) => revision.insuranceId)
  const insuranceScanDecisions = activeInsurance.length > 0
    ? await transaction.providerEvidenceScanDecision.findMany({
        where: { evidenceRevisionId: { in: activeInsurance.map((revision) => revision.evidenceRevisionId) } },
        select: { evidenceRevisionId: true, scanStatus: true },
      })
    : []
  const cleanEvidenceCount = await transaction.providerEvidenceRevision.count({
    where: {
      evidenceDocument: { providerProfileId, status: 'AVAILABLE' },
      scanDecision: { scanStatus: 'CLEAN' },
    },
  })
  const termAcceptances = await transaction.providerTermAcceptance.findMany({
    where: { providerProfileId },
    select: { documentVersionId: true },
  })
  const requiredTerms = await transaction.providerTermDocumentVersion.findMany({
    where: { status: 'ACTIVE', isRequired: true, effectiveFrom: { lte: at }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] },
    select: { id: true },
  })
  const capabilities = latestRevisionPerRecord(capabilityRevisions, (revision) => revision.providerCapabilityId)
  const professionals = latestRevisionPerRecord(identityRevisions, (revision) => revision.professionalId)
  const scanStatusByEvidenceRevision = new Map(
    insuranceScanDecisions.map((decision) => [decision.evidenceRevisionId, decision.scanStatus]),
  )
  const accepted = new Set(termAcceptances.map((item) => item.documentVersionId))
  const checks: Check[] = [
    { section: 'ORGANIZATION', complete: provider.organization.name.trim().length >= 2 && Boolean(provider.organization.chamberOfCommerceNumber?.trim()), code: 'ORGANIZATION_INCOMPLETE' },
    { section: 'CAPABILITIES', complete: capabilities.some((item) => Boolean(item.serviceTermId || item.specialismTermId)), code: 'CAPABILITIES_INCOMPLETE' },
    { section: 'SECTOR_EXPERIENCE', complete: sectorExperienceCount > 0, code: 'SECTOR_EXPERIENCE_INCOMPLETE' },
    { section: 'WORK_AREA', complete: workAreaCount > 0, code: 'WORK_AREA_INCOMPLETE' },
    { section: 'PROFESSIONALS', complete: professionals.some((item) => item.status === 'ACTIVE'), code: 'PROFESSIONALS_INCOMPLETE' },
    { section: 'QUALIFICATIONS', complete: professionalQualificationCount > 0 || organizationQualificationCount > 0, code: 'QUALIFICATIONS_INCOMPLETE' },
    { section: 'INSURANCE', complete: activeInsurance.some((item) => item.expiresAt > at), expired: activeInsurance.length > 0 && activeInsurance.every((item) => item.expiresAt <= at), code: 'INSURANCE_EXPIRED' },
    { section: 'EVIDENCE', complete: cleanEvidenceCount > 0 && activeInsurance.every((item) => scanStatusByEvidenceRevision.get(item.evidenceRevisionId) === 'CLEAN'), code: 'EVIDENCE_UNAVAILABLE' },
    { section: 'DECLARATIONS', complete: requiredTerms.length > 0 && requiredTerms.every((item) => accepted.has(item.id)), code: requiredTerms.length === 0 ? 'TERMS_NOT_CONFIGURED' : 'TERM_NOT_ACCEPTED' },
  ]
  const reasons = checks.filter((check) => !check.complete).map<ProviderCompletenessReason>((check) => ({
    code: check.code,
    section: check.section,
    state: check.expired ? 'EXPIRED' : check.section === 'DECLARATIONS' && requiredTerms.length === 0 ? 'NOT_STARTED' : 'ACTION_REQUIRED',
  }))
  const blockingSections = [...new Set(reasons.map((reason) => reason.section))]
  const editableSections = await getProviderEditableSections(transaction, providerProfileId)
  const completed = checks.length - reasons.length
  const checksum = hashProviderJson({
    policyVersion: PROVIDER_COMPLETENESS_POLICY_VERSION,
    sourceProfileVersion: provider.version,
    results: checks.map((check) => ({ section: check.section, complete: check.complete, expired: check.expired ?? false, code: check.code })),
  }).sha256
  return {
    policyVersion: PROVIDER_COMPLETENESS_POLICY_VERSION,
    sourceProfileVersion: provider.version,
    required: checks.length,
    completed,
    actionRequired: reasons.filter((reason) => reason.state === 'ACTION_REQUIRED').length,
    expired: reasons.filter((reason) => reason.state === 'EXPIRED').length,
    notStarted: reasons.filter((reason) => reason.state === 'NOT_STARTED').length,
    percentage: Math.round((completed / checks.length) * 100),
    blockingSections,
    warnings: reasons.filter((reason) => reason.state === 'EXPIRED' || reason.state === 'WARNING'),
    reasons,
    editableSections,
    isSubmittable: reasons.length === 0,
    checksum,
  }
}

function emptyAssessment(): ProviderCompletenessAssessment {
  const sections: ProviderDossierSection[] = [
    'ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA',
    'PROFESSIONALS', 'QUALIFICATIONS', 'INSURANCE', 'EVIDENCE', 'DECLARATIONS',
  ]
  const reasons = sections.map<ProviderCompletenessReason>((section) => ({
    code: 'DOSSIER_NOT_STARTED',
    section,
    state: 'NOT_STARTED',
  }))
  return {
    policyVersion: PROVIDER_COMPLETENESS_POLICY_VERSION, sourceProfileVersion: 0,
    required: 9, completed: 0, actionRequired: 0, expired: 0, notStarted: 9, percentage: 0,
    blockingSections: sections,
    warnings: [], reasons, editableSections: [], isSubmittable: false, checksum: '',
  }
}

export async function assessProviderDossierCompleteness(userId: string, providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderViewer(transaction, userId, providerProfileId)
    return assessProviderDossierCompletenessInTransaction(transaction, providerProfileId, at)
  })
}
