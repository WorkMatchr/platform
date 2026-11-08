import type { Prisma, ProviderDossierSection } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'
import { getProviderEditableSections } from './provider-dossier-access'
import { hashProviderJson } from './provider-canonical-json'

export const PROVIDER_COMPLETENESS_POLICY_VERSION = 'PROVIDER-COMPLETENESS-V3-1'

export type ProviderCompletenessReason = {
  code: string
  section: ProviderDossierSection
  state: 'ACTION_REQUIRED' | 'EXPIRED' | 'NOT_STARTED' | 'WARNING'
}

export type ProviderSectionStatus = 'REQUIRED_COMPLETE' | 'REQUIRED_OPEN' | 'OPTIONAL_COMPLETE' | 'OPTIONAL_OPEN' | 'OPTIONAL_EMPTY' | 'NOT_APPLICABLE'

export type ProviderCompletenessAssessment = {
  sections: Partial<Record<ProviderDossierSection, ProviderSectionStatus>>
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

const matchingSections: ProviderDossierSection[] = ['ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA']

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
      organization: { select: { name: true, chamberOfCommerceNumber: true,
      } },
    },
  })
  if (!provider) return emptyAssessment()

  // De pg-driver ondersteunt geen overlappende queries op één transactionele
  // PoolClient. Houd deze reads daarom expliciet sequentieel en vlak.
  const policyVersion = PROVIDER_COMPLETENESS_POLICY_VERSION
  const capabilityRevisions = await transaction.providerCapabilityRevision.findMany({
    where: { capability: { providerProfileId, status: 'ACTIVE' } },
    select: { providerCapabilityId: true, version: true, serviceTermId: true, specialismTermId: true, deliveryModes: true },
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
    where: { status: 'ACTIVE', professional: { providerProfileId, status: 'ACTIVE' }, revisions: { some: {} } },
  })
  const organizationQualificationCount = await transaction.providerOrganizationQualification.count({
    where: { providerProfileId, status: 'ACTIVE', revisions: { some: {} } },
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
  const pendingEvidence = cleanEvidenceCount === 0
    ? await transaction.providerEvidenceDocument.count({ where: { providerProfileId, status: { not: 'ARCHIVED' } } })
    : 0
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
    { section: 'CAPABILITIES', complete: capabilities.some((item) => Boolean(item.serviceTermId && item.deliveryModes.length)), code: 'SERVICE_DELIVERY_REQUIRED' },
    { section: 'SECTOR_EXPERIENCE', complete: sectorExperienceCount > 0, code: 'SECTOR_EXPERIENCE_INCOMPLETE' },
    { section: 'WORK_AREA', complete: workAreaCount > 0, code: 'WORK_AREA_INCOMPLETE' },
    { section: 'PROFESSIONALS', complete: professionals.some((item) => item.status === 'ACTIVE'), code: 'PROFESSIONALS_INCOMPLETE' },
    { section: 'QUALIFICATIONS', complete: professionalQualificationCount > 0 || organizationQualificationCount > 0, code: 'QUALIFICATIONS_INCOMPLETE' },
    { section: 'INSURANCE', complete: activeInsurance.some((item) => item.expiresAt > at), expired: activeInsurance.length > 0 && activeInsurance.every((item) => item.expiresAt <= at), code: 'INSURANCE_EXPIRED' },
    { section: 'EVIDENCE', complete: cleanEvidenceCount > 0 && activeInsurance.every((item) => scanStatusByEvidenceRevision.get(item.evidenceRevisionId) === 'CLEAN'), code: 'EVIDENCE_UNAVAILABLE' },
    { section: 'DECLARATIONS', complete: requiredTerms.length > 0 && requiredTerms.every((item) => accepted.has(item.id)), code: requiredTerms.length === 0 ? 'TERMS_NOT_CONFIGURED' : 'TERM_NOT_ACCEPTED' },
  ]
  const applicableChecks = checks.filter(check => matchingSections.includes(check.section))
  const sections: ProviderCompletenessAssessment['sections'] = { CAPACITY: 'NOT_APPLICABLE' }
  for (const check of checks) {
    if (applicableChecks.includes(check)) sections[check.section] = check.complete ? 'REQUIRED_COMPLETE' : 'REQUIRED_OPEN'
    else if (check.section === 'DECLARATIONS' && requiredTerms.length === 0) sections[check.section] = 'NOT_APPLICABLE'
    else if (check.complete) sections[check.section] = 'OPTIONAL_COMPLETE'
    else if ((check.section === 'INSURANCE' && activeInsurance.length) ||
        (check.section === 'PROFESSIONALS' && professionals.length) ||
        (check.section === 'DECLARATIONS' && termAcceptances.length) ||
        (check.section === 'EVIDENCE' && (pendingEvidence || cleanEvidenceCount || activeInsurance.length))) sections[check.section] = 'OPTIONAL_OPEN'
    else sections[check.section] = 'OPTIONAL_EMPTY'
  }
  const reasons = applicableChecks.filter((check) => !check.complete).map<ProviderCompletenessReason>((check) => ({
    code: check.code,
    section: check.section,
    state: check.expired ? 'EXPIRED' : check.section === 'DECLARATIONS' && requiredTerms.length === 0 ? 'NOT_STARTED' : 'ACTION_REQUIRED',
  }))
  const blockingSections = [...new Set(reasons.map((reason) => reason.section))]
  const editableSections = await getProviderEditableSections(transaction, providerProfileId)
  const completed = applicableChecks.length - reasons.length
  const checksum = hashProviderJson({
    policyVersion,
    sourceProfileVersion: provider.version,
    results: applicableChecks.map((check) => ({ section: check.section, complete: check.complete, expired: check.expired ?? false, code: check.code })),
  }).sha256
  return {
    policyVersion, sections,
    sourceProfileVersion: provider.version,
    required: applicableChecks.length,
    completed,
    actionRequired: reasons.filter((reason) => reason.state === 'ACTION_REQUIRED').length,
    expired: reasons.filter((reason) => reason.state === 'EXPIRED').length,
    notStarted: reasons.filter((reason) => reason.state === 'NOT_STARTED').length,
    percentage: Math.round((completed / applicableChecks.length) * 100),
    blockingSections,
    warnings: reasons.filter((reason) => reason.state === 'EXPIRED' || reason.state === 'WARNING'),
    reasons,
    editableSections,
    isSubmittable: reasons.length === 0,
    checksum,
  }
}

function emptyAssessment(): ProviderCompletenessAssessment {
  const reasons = matchingSections.map<ProviderCompletenessReason>((section) => ({
    code: 'DOSSIER_NOT_STARTED',
    section,
    state: 'NOT_STARTED',
  }))
  return {
    sections: { ...Object.fromEntries(matchingSections.map(section => [section, 'REQUIRED_OPEN'])), PROFESSIONALS: 'OPTIONAL_EMPTY', QUALIFICATIONS: 'OPTIONAL_EMPTY', INSURANCE: 'OPTIONAL_EMPTY', EVIDENCE: 'OPTIONAL_EMPTY', DECLARATIONS: 'NOT_APPLICABLE', CAPACITY: 'NOT_APPLICABLE' },
    policyVersion: PROVIDER_COMPLETENESS_POLICY_VERSION, sourceProfileVersion: 0,
    required: matchingSections.length, completed: 0, actionRequired: 0, expired: 0, notStarted: matchingSections.length, percentage: 0,
    blockingSections: matchingSections,
    warnings: [], reasons, editableSections: [], isSubmittable: false, checksum: '',
  }
}

export async function assessProviderDossierCompleteness(userId: string, providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    await requireProviderViewer(transaction, userId, providerProfileId)
    return assessProviderDossierCompletenessInTransaction(transaction, providerProfileId, at)
  })
}
