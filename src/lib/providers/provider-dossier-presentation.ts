import type {
  ProviderDeliveryMode,
  ProviderDossierSection,
  ProviderDossierSubmissionStatus,
  ProviderEvidenceScanStatus,
  ProviderEvidenceStatus,
  ProviderPlatformQualificationStatus,
  ProviderReadinessStatus,
  ProviderSelectabilityStatus,
  ProviderVerificationLevel,
} from '@/generated/prisma/client'

export const providerVerificationLabels: Record<ProviderVerificationLevel, string> = {
  SELF_DECLARED: 'Zelf verklaard', DOCUMENT_CHECKED: 'Document gecontroleerd', VERIFIED: 'Geverifieerd',
}

export const providerReviewLabels: Record<ProviderDossierSubmissionStatus, string> = {
  SUBMITTED: 'Ingediend', UNDER_REVIEW: 'In beoordeling', ADDITIONAL_INFORMATION_REQUIRED: 'Aanvullende informatie nodig',
  APPROVED: 'Goedgekeurd', REJECTED: 'Afgewezen', EXPIRED: 'Verlopen', WITHDRAWN: 'Ingetrokken',
}

export const providerDossierSectionLabels: Record<ProviderDossierSection, string> = {
  ORGANIZATION: 'Bedrijfsgegevens', CAPABILITIES: 'Diensten', SECTOR_EXPERIENCE: 'Sectorervaring',
  WORK_AREA: 'Werkgebied', CAPACITY: 'Beschikbaarheid', PROFESSIONALS: 'Professionals',
  QUALIFICATIONS: 'Kwalificaties', INSURANCE: 'Verzekeringen', EVIDENCE: 'Bewijsstukken',
  DECLARATIONS: 'Verklaringen',
}

export const providerDeliveryModeLabels: Record<ProviderDeliveryMode, string> = {
  ON_SITE: 'Op locatie', HYBRID: 'Hybride', REMOTE: 'Remote',
}

export const providerEvidenceStatusLabels: Record<ProviderEvidenceStatus, string> = {
  DRAFT: 'Concept', AVAILABLE: 'Beschikbaar', ARCHIVED: 'Gearchiveerd',
}

export const providerEvidenceScanStatusLabels: Record<ProviderEvidenceScanStatus, string> = {
  PENDING: 'Controle loopt', CLEAN: 'Veilig gecontroleerd', QUARANTINED: 'In quarantaine', REJECTED: 'Afgewezen',
}

export const providerReadinessLabels: Record<ProviderReadinessStatus, string> = {
  INCOMPLETE: 'Dossier niet compleet', READY: 'Dossier compleet', STALE: 'Gegevens moeten worden vernieuwd',
}

export const providerQualificationLabels: Record<ProviderPlatformQualificationStatus, string> = {
  NOT_ASSESSED: 'Nog niet beoordeeld', PENDING: 'Beoordeling loopt', QUALIFIED: 'Platformgekwalificeerd',
  CHANGES_REQUESTED: 'Aanvullende informatie nodig', REJECTED: 'Niet gekwalificeerd', SUSPENDED: 'Geschorst', EXPIRED: 'Verlopen',
}

export const providerSelectabilityLabels: Record<ProviderSelectabilityStatus, string> = {
  NOT_SELECTABLE: 'Nog niet selecteerbaar', SELECTABLE: 'Selecteerbaar', STALE: 'Gegevens moeten worden vernieuwd', BLOCKED: 'Geblokkeerd',
}

export function presentProviderStatuses(input: {
  readinessStatus: ProviderReadinessStatus
  qualificationStatus: ProviderPlatformQualificationStatus
  selectabilityStatus: ProviderSelectabilityStatus
  submissionStatus: ProviderDossierSubmissionStatus | null
}) {
  return {
    dossierCompleteness: providerReadinessLabels[input.readinessStatus],
    platformQualification: providerQualificationLabels[input.qualificationStatus],
    professionalQualification: 'Per kwalificatie weergegeven',
    reviewStatus: input.submissionStatus ? providerReviewLabels[input.submissionStatus] : 'Nog niet ingediend',
    selectability: providerSelectabilityLabels[input.selectabilityStatus],
  }
}

export function presentExpiry(value: Date | null, at = new Date()) {
  if (!value) return { state: 'MISSING' as const, label: 'Nog niet vastgelegd', daysRemaining: null }
  const daysRemaining = Math.ceil((value.getTime() - at.getTime()) / 86_400_000)
  if (daysRemaining < 0) return { state: 'EXPIRED' as const, label: 'Verlopen', daysRemaining }
  if (daysRemaining <= 7) return { state: 'EXPIRING' as const, label: 'Verloopt binnenkort', daysRemaining }
  return { state: 'CURRENT' as const, label: 'Actueel', daysRemaining }
}
