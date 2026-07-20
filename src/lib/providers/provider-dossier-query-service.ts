import type { Prisma, ProviderDossierSection } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'
import { assessProviderDossierCompletenessInTransaction } from './provider-dossier-completeness'
import { buildProviderDossierOpenActions } from './provider-dossier-open-actions'
import { presentProviderStatuses, providerVerificationLabels } from './provider-dossier-presentation'
import { ProviderServiceError } from './provider-errors'

export function sanitizeProviderInsuranceForMember<T extends { policyReference?: unknown; coverageAmountCents?: unknown }>(value: T) {
  const safe = { ...value }
  delete safe.policyReference
  delete safe.coverageAmountCents
  return safe as Omit<T, 'policyReference' | 'coverageAmountCents'>
}

export function sanitizeProviderEvidenceForMember<T extends { revisions?: unknown; storageKey?: unknown }>(value: T) {
  const safe = { ...value }
  delete safe.revisions
  delete safe.storageKey
  return safe as Omit<T, 'revisions' | 'storageKey'>
}

async function loadContext(transaction: Prisma.TransactionClient, userId: string, providerProfileId: string) {
  const access = await requireProviderViewer(transaction, userId, providerProfileId)
  const provider = await transaction.providerProfile.findUnique({
    where: { id: access.id },
    select: {
      id: true, version: true, updatedAt: true, lifecycleStatus: true, readinessStatus: true,
      platformQualificationStatus: true, selectabilityStatus: true,
      organization: { select: { id: true, name: true, tradeName: true, chamberOfCommerceNumber: true, website: true, employeeCount: true, updatedAt: true } },
      dossierSubmissions: {
        orderBy: { submittedAt: 'desc' }, take: 1,
        select: { id: true, status: true, version: true, submittedAt: true, currentCandidateId: true, currentCandidate: { select: { candidateVersion: true } }, reviewCases: { orderBy: { openedAt: 'desc' }, take: 1, select: { findings: { select: { id: true, section: true, providerMessage: true, resolutions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, version: true, createdAt: true } } } } } } },
      },
    },
  })
  if (!provider) throw new ProviderServiceError('ACCESS_DENIED')
  return { access, provider }
}

export async function getProviderDossierDashboard(userId: string, providerProfileId: string, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    const { access, provider } = await loadContext(transaction, userId, providerProfileId)
    const completeness = await assessProviderDossierCompletenessInTransaction(transaction, provider.id, at)
    const latestSubmission = provider.dossierSubmissions[0] ?? null
    const activeSubmission = latestSubmission && ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED'].includes(latestSubmission.status) ? latestSubmission : null
    const findings = (latestSubmission?.reviewCases[0]?.findings ?? []).filter((finding) => finding.section !== 'CAPACITY')
    return {
      providerProfileId: provider.id,
      viewerRole: access.membershipRole,
      organization: provider.organization,
      profileVersion: provider.version,
      statuses: presentProviderStatuses({ readinessStatus: provider.readinessStatus, qualificationStatus: provider.platformQualificationStatus, selectabilityStatus: provider.selectabilityStatus, submissionStatus: latestSubmission?.status ?? null }),
      completeness,
      openActions: buildProviderDossierOpenActions(completeness, activeSubmission?.status ?? null, findings.filter((finding) => finding.resolutions.length === 0).map((finding) => finding.section)),
      expiryWarnings: completeness.warnings,
      lastModifiedAt: new Date(Math.max(provider.updatedAt.getTime(), provider.organization.updatedAt.getTime())).toISOString(),
      latestSubmission: latestSubmission ? { id: latestSubmission.id, status: latestSubmission.status, version: latestSubmission.version, submittedAt: latestSubmission.submittedAt.toISOString(), currentCandidateId: latestSubmission.currentCandidateId, candidateVersion: latestSubmission.currentCandidate?.candidateVersion ?? null } : null,
      activeSubmission: activeSubmission ? { id: activeSubmission.id, status: activeSubmission.status, version: activeSubmission.version, submittedAt: activeSubmission.submittedAt.toISOString(), currentCandidateId: activeSubmission.currentCandidateId, candidateVersion: activeSubmission.currentCandidate?.candidateVersion ?? null } : null,
      safeFindings: findings.map((finding) => ({ id: finding.id, section: finding.section, message: finding.providerMessage, resolved: finding.resolutions.length > 0, latestResolutionVersion: finding.resolutions[0]?.version ?? 0 })),
    }
  })
}

export async function getProviderDossierNavigation(userId: string, providerProfileId: string) {
  const dashboard = await getProviderDossierDashboard(userId, providerProfileId)
  return {
    viewerRole: dashboard.viewerRole,
    items: [
      ['ORGANIZATION', 'Bedrijfsgegevens'], ['CAPABILITIES', 'Diensten'], ['SECTOR_EXPERIENCE', 'Sectorervaring'],
      ['WORK_AREA', 'Werkgebied'], ['PROFESSIONALS', 'Professionals'],
      ['QUALIFICATIONS', 'Kwalificaties'], ['INSURANCE', 'Verzekeringen'], ['EVIDENCE', 'Bewijsstukken'], ['DECLARATIONS', 'Verklaringen'],
    ].map(([section, label]) => ({ section: section as ProviderDossierSection, label, blocking: dashboard.completeness.blockingSections.includes(section as ProviderDossierSection) })),
  }
}

export async function getProviderDossierSection(userId: string, providerProfileId: string, section: ProviderDossierSection, at = new Date()) {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderViewer(transaction, userId, providerProfileId)
    const isMember = access.membershipRole === 'MEMBER'
    const base = { providerProfileId, viewerRole: access.membershipRole, readOnly: isMember }
    if (section === 'ORGANIZATION') {
      const value = await transaction.providerProfile.findUnique({ where: { id: providerProfileId }, select: { version: true, description: true, maxTravelDistanceKm: true, acceptsRemoteWork: true, organization: { select: { name: true, tradeName: true, chamberOfCommerceNumber: true, website: true, employeeCount: true } } } })
      return { ...base, section, value }
    }
    if (section === 'CAPABILITIES') {
      const value = await transaction.providerCapability.findMany({ where: { providerProfileId, ...(isMember ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, version: true, status: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { serviceTermId: true, specialismTermId: true, competencyTermId: true, serviceTerm: { select: { code: true, label: true } }, specialismTerm: { select: { code: true, label: true } }, competencyTerm: { select: { code: true, label: true } }, deliveryModes: true, verificationLevel: true } } } })
      return { ...base, section, value: value.map((item) => ({ ...item, revisions: item.revisions.map((revision) => ({ ...revision, verificationLabel: providerVerificationLabels[revision.verificationLevel] })) })) }
    }
    if (section === 'SECTOR_EXPERIENCE') {
      const value = await transaction.providerSectorExperience.findMany({ where: { providerProfileId, ...(isMember ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, version: true, status: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { sectorTermId: true, sectorTerm: { select: { code: true, label: true } }, experienceYears: true, verificationLevel: true } } } })
      return { ...base, section, value }
    }
    if (section === 'WORK_AREA') {
      const value = await transaction.providerWorkArea.findMany({ where: { providerProfileId, ...(isMember ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, version: true, status: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { regionTermId: true, regionTerm: { select: { code: true, label: true } }, maxTravelDistanceKm: true, verificationLevel: true } } } })
      return { ...base, section, value }
    }
    if (section === 'CAPACITY') throw new ProviderServiceError('CAPACITY_DEPRECATED')
    if (section === 'PROFESSIONALS' || section === 'QUALIFICATIONS') {
      const value = await transaction.providerProfessional.findMany({ where: { providerProfileId, ...(isMember ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, version: true, status: true, identityRevisions: { orderBy: { version: 'desc' }, take: 1, select: { displayName: true, functionalRole: true, status: true } }, qualifications: { where: isMember ? { status: 'ACTIVE' } : {}, select: { id: true, version: true, status: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { qualificationTermId: true, qualificationTerm: { select: { code: true, label: true } }, issuer: true, isCertified: true, registrationNumber: true, issuedAt: true, validUntil: true, evidenceRevisionId: true, verificationLevel: true } }, capabilities: { select: { capabilityId: true } } } } } })
      const sanitized = value.map((professional) => ({ ...professional, identityRevisions: professional.identityRevisions.map((identity) => isMember ? { functionalRole: identity.functionalRole, status: identity.status } : identity), qualifications: professional.qualifications.map((qualification) => ({ ...qualification, revisions: qualification.revisions.map((revision) => isMember ? { qualificationTerm: revision.qualificationTerm, issuer: revision.issuer, isCertified: revision.isCertified, verificationLevel: revision.verificationLevel } : revision) })) }))
      return { ...base, section, value: sanitized }
    }
    if (section === 'INSURANCE') {
      const value = await transaction.providerInsurance.findMany({ where: { providerProfileId, ...(isMember ? { status: 'ACTIVE' as const } : {}) }, select: { id: true, version: true, status: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { insuranceTypeTermId: true, insuranceTypeTerm: { select: { code: true, label: true } }, insurer: true, policyReference: true, effectiveFrom: true, expiresAt: true, coverageAmountCents: true, coverageGeography: true, evidenceRevisionId: true, verificationLevel: true } } } })
      return { ...base, section, value: value.map((item) => ({ ...item, revisions: item.revisions.map((revision) => isMember ? sanitizeProviderInsuranceForMember({ insuranceTypeTerm: revision.insuranceTypeTerm, insurer: revision.insurer, policyReference: revision.policyReference, effectiveFrom: revision.effectiveFrom, expiresAt: revision.expiresAt, coverageAmountCents: revision.coverageAmountCents, verificationLevel: revision.verificationLevel }) : { ...revision, coverageAmountCents: revision.coverageAmountCents?.toString() ?? null }) })) }
    }
    if (section === 'EVIDENCE') {
      const value = await transaction.providerEvidenceDocument.findMany({ where: { providerProfileId }, select: { id: true, status: true, version: true, revisions: { orderBy: { version: 'desc' }, take: 1, select: { id: true, originalFileName: true, mimeType: true, sizeBytes: true, scanStatus: true, createdAt: true } } } })
      return { ...base, section, value: isMember ? value.map((item) => sanitizeProviderEvidenceForMember({ id: item.id, status: item.status, version: item.version, available: item.revisions[0]?.scanStatus === 'CLEAN', revisions: item.revisions })) : value }
    }
    const required = await transaction.providerTermDocumentVersion.findMany({ where: { status: 'ACTIVE', isRequired: true, effectiveFrom: { lte: at }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }] }, select: { id: true, label: true, version: true, effectiveFrom: true, contentReference: true, document: { select: { code: true, label: true } }, acceptances: { where: { providerProfileId }, select: { id: true, acceptedAt: true, acceptedByUser: { select: { displayName: true } } } } } })
    return { ...base, section: 'DECLARATIONS' as const, value: required.map((term) => ({ id: term.id, code: term.document.code, label: term.label, version: term.version, effectiveFrom: term.effectiveFrom, contentReference: term.contentReference, required: true, accepted: term.acceptances.length > 0, ...(isMember ? {} : { acceptedAt: term.acceptances[0]?.acceptedAt ?? null, acceptedBy: term.acceptances[0]?.acceptedByUser.displayName ?? null }) })) }
  })
}

export const getProviderDossierOrganizationSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'ORGANIZATION')
export const getProviderDossierCapabilitiesSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'CAPABILITIES')
export const getProviderDossierSectorSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'SECTOR_EXPERIENCE')
export const getProviderDossierWorkAreaSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'WORK_AREA')
export const getProviderDossierProfessionalsSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'PROFESSIONALS')
export const getProviderDossierQualificationsSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'QUALIFICATIONS')
export const getProviderDossierComplianceSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'INSURANCE')
export const getProviderDossierEvidenceSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'EVIDENCE')
export const getProviderDossierTermsSection = (userId: string, providerId: string) => getProviderDossierSection(userId, providerId, 'DECLARATIONS')

export async function getProviderDossierControlView(userId: string, providerProfileId: string) {
  const dashboard = await getProviderDossierDashboard(userId, providerProfileId)
  return {
    providerProfileId,
    profileVersion: dashboard.profileVersion,
    viewerRole: dashboard.viewerRole,
    statuses: dashboard.statuses,
    completeness: dashboard.completeness,
    openActions: dashboard.openActions,
    activeSubmission: dashboard.activeSubmission,
    latestSubmission: dashboard.latestSubmission,
    safeFindings: dashboard.safeFindings,
    isSubmittable: dashboard.completeness.isSubmittable && !dashboard.activeSubmission,
  }
}

export async function getProviderMemberView(userId: string, providerProfileId: string) {
  const dashboard = await getProviderDossierDashboard(userId, providerProfileId)
  if (dashboard.viewerRole !== 'MEMBER') throw new ProviderServiceError('ACCESS_DENIED')
  const [capabilities, sectors, workAreas] = await Promise.all([
    getProviderDossierCapabilitiesSection(userId, providerProfileId), getProviderDossierSectorSection(userId, providerProfileId),
    getProviderDossierWorkAreaSection(userId, providerProfileId),
  ])
  return { statuses: dashboard.statuses, completeness: dashboard.completeness, openActions: dashboard.openActions.map((action) => ({ ...action, description: action.blocking ? 'Neem contact op met een OWNER of ADMIN om dit onderdeel bij te werken.' : action.description })), safeFindings: dashboard.safeFindings, capabilities: capabilities.value, sectors: sectors.value, workAreas: workAreas.value }
}
