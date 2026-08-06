import type {
  KnowledgeAccessTier,
  KnowledgeAuthorityLevel,
  KnowledgeAuditEventType,
  KnowledgeClaimType,
  KnowledgeControlRisk,
  KnowledgeControlExceptionType,
  KnowledgeExtractionStatus,
  KnowledgePublicationStatus,
  KnowledgeImprovementReportStatus,
  KnowledgeImprovementReportType,
  KnowledgeReviewPriority,
  KnowledgeReviewSourceReferenceAction,
  KnowledgeReviewStatus,
  KnowledgeReviewTaskStatus,
  KnowledgeSourceType,
  KnowledgeSupportType,
  KnowledgeSourceControlStatus,
  KnowledgeTemporalStatus,
  KnowledgeValidationStatus,
} from '@/generated/prisma/enums'

const temporalStatusLabels: Record<KnowledgeTemporalStatus, string> = {
  UNKNOWN: 'Actualiteit onbekend',
  CURRENT: 'Actueel',
  HISTORICAL: 'Historisch',
  SUPERSEDED: 'Vervangen',
  WITHDRAWN: 'Ingetrokken',
  UNDER_REVIEW: 'Wordt gecontroleerd',
}

const validationStatusLabels: Record<KnowledgeValidationStatus, string> = {
  UNVALIDATED: 'Ongevalideerd',
  PARTIALLY_VALIDATED: 'Gedeeltelijk gevalideerd',
  VALIDATED: 'Gevalideerd',
  CONFLICTING: 'Tegenstrijdig',
  REJECTED: 'Afgewezen',
  EXPIRED: 'Verlopen',
  REVIEW_REQUIRED: 'Hercontrole nodig',
}

const publicationStatusLabels: Record<KnowledgePublicationStatus, string> = {
  DRAFT: 'Concept',
  INTERNAL_REVIEW: 'Interne controle',
  APPROVED: 'Goedgekeurd',
  PUBLISHED: 'Gepubliceerd',
  ARCHIVED: 'Gearchiveerd',
  REJECTED: 'Afgewezen',
}

const accessTierLabels: Record<KnowledgeAccessTier, string> = {
  PUBLIC_BASIC: 'Publiek',
  REGISTERED_BASIC: 'Geregistreerde gebruikers',
  PROFESSIONAL_PRO: 'Professionals',
  ORGANIZATION_BUSINESS: 'Organisaties',
  INTERNAL_REVIEWER: 'Alleen interne controle',
  PLATFORM_ADMIN: 'Alleen platformbeheer',
}

const extractionStatusLabels: Record<KnowledgeExtractionStatus, string> = {
  NOT_STARTED: 'Niet gestart',
  READY: 'Gereed voor verwerking',
  EXTRACTED: 'Verwerkt',
  UNSUPPORTED_FOR_EXTRACTION: 'Bestandsformaat niet ondersteund',
  FAILED: 'Verwerking mislukt',
}

const reviewStatusLabels: Record<KnowledgeReviewStatus, string> = {
  NOT_REVIEWED: 'Niet gecontroleerd',
  REVIEW_REQUIRED: 'Hercontrole nodig',
  IN_REVIEW: 'In controle',
  REVIEWED: 'Gecontroleerd',
  REJECTED: 'Afgewezen',
}

const reviewTaskStatusLabels: Record<KnowledgeReviewTaskStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In behandeling',
  DEFERRED: 'Later controleren',
  CHANGES_REQUIRED: 'Hercontrole nodig',
  CONTENT_APPROVED: 'Broncontrole afgerond',
  REJECTED: 'Afgewezen',
  COMPLETED: 'Afgerond',
  CANCELLED: 'Geannuleerd',
}

const controlRiskLabels: Record<KnowledgeControlRisk, string> = {
  LOW: 'Laag',
  MEDIUM: 'Middel',
  HIGH: 'Hoog',
  CRITICAL: 'Kritiek',
}

const controlExceptionLabels: Record<KnowledgeControlExceptionType, string> = {
  SOURCE_CONFLICT: 'Bronconflict',
  INSUFFICIENT_TRACEABILITY: 'Onvoldoende bronherleidbaarheid',
  SOURCE_EXPIRED: 'Verouderde of verlopen bron',
  PROFESSIONAL_REPORT: 'Inhoudelijke melding',
  PUBLICATION_BLOCKED: 'Publicatie onvoldoende onderbouwd',
  APPLICABILITY_UNCLEAR: 'Toepassingsgebied onduidelijk',
  SITUATIONAL_USE: 'Actief gebruikt in situatieadvies',
  HIGH_RISK_PUBLICATION: 'Publicatie met hoog risico',
}

const sourceControlStatusLabels: Record<KnowledgeSourceControlStatus, string> = {
  NOT_STARTED: 'Niet gestart',
  SOURCES_REQUIRED: 'Bronnen nodig',
  SOURCES_COLLECTED: 'Bronnen verzameld',
  CONSISTENT: 'Bronnen consistent',
  CONFLICT_DETECTED: 'Bronconflict vastgesteld',
  OUTDATED: 'Bronnen verouderd',
  HUMAN_EXCEPTION_REQUIRED: 'Gerichte menselijke controle nodig',
  CONTROL_COMPLETE: 'Broncontrole afgerond',
}

const improvementReportTypeLabels: Record<KnowledgeImprovementReportType, string> = {
  OUTDATED: 'Verouderd',
  INCORRECT: 'Onjuist',
  INCOMPLETE: 'Onvolledig',
  SOURCE_CHANGED: 'Bron gewijzigd',
  APPLICABILITY_UNCLEAR: 'Toepassingsgebied onduidelijk',
  OTHER: 'Overige',
}

const improvementReportStatusLabels: Record<KnowledgeImprovementReportStatus, string> = {
  NEW: 'Nieuw',
  UNDER_INVESTIGATION: 'In onderzoek',
  PROCESSED: 'Verwerkt',
  REJECTED: 'Afgewezen',
  DUPLICATE: 'Dubbel',
}

const claimTypeLabels: Record<KnowledgeClaimType, string> = {
  DEFINITION: 'Definitie', HAZARD: 'Gevaar', RISK: 'Risico', HEALTH_EFFECT: 'Gezondheidseffect',
  LEGAL_REQUIREMENT: 'Wettelijke verplichting', PROHIBITION: 'Verbod', THRESHOLD: 'Grenswaarde',
  RECOMMENDATION: 'Aanbeveling', CONTROL_MEASURE: 'Beheersmaatregel', RESPONSIBILITY: 'Verantwoordelijkheid',
  ROLE: 'Rol', EXCEPTION: 'Uitzondering', CONDITION: 'Voorwaarde', PROCEDURAL_STEP: 'Processtap',
  INSPECTION_POINT: 'Controlepunt', MEASUREMENT_REQUIREMENT: 'Meetverplichting', RECORD_RETENTION: 'Bewaarverplichting',
  TRAINING_REQUIREMENT: 'Opleidingsvereiste', PPE_REQUIREMENT: 'Persoonlijk beschermingsmiddel',
  EMERGENCY_REQUIREMENT: 'Noodmaatregel', OTHER: 'Overige kennis',
}

const sourceTypeLabels: Record<KnowledgeSourceType, string> = {
  AI_SHEET: 'Historisch AI-blad', LEGISLATION: 'Wetgeving', REGULATION: 'Regelgeving',
  INSPECTORATE_GUIDANCE: 'Toezichthouder', ARBOCATALOGUE: 'Arbocatalogus', STANDARD: 'Norm',
  RESEARCH: 'Onderzoek', PROFESSIONAL_GUIDANCE: 'Vakinhoudelijke richtlijn', INTERNAL_EXPERTISE: 'Interne expertise',
  CASE_LAW: 'Rechtspraak', OTHER: 'Andere bron',
}

const authorityLevelLabels: Record<KnowledgeAuthorityLevel, string> = {
  PRIMARY_LEGAL: 'Primaire juridische bron', OFFICIAL_GUIDANCE: 'Officiële uitleg',
  CONSENSUS_STANDARD: 'Breed gedragen norm', PROFESSIONAL_GUIDANCE: 'Vakinhoudelijke richtlijn',
  RESEARCH: 'Onderzoek', INTERNAL: 'Interne bron', UNKNOWN: 'Gezag nog niet beoordeeld',
}

const supportTypeLabels: Record<KnowledgeSupportType, string> = {
  DIRECT_SUPPORT: 'Ondersteunt', PARTIAL_SUPPORT: 'Ondersteunt gedeeltelijk', CONTEXT: 'Geeft context',
  CONTRADICTS: 'Spreekt tegen', SUPERSEDES: 'Vervangt historische informatie', HISTORICAL_ORIGIN: 'Historische herkomst',
}

const sourceReferenceActionLabels: Record<KnowledgeReviewSourceReferenceAction, string> = {
  ADDED: 'Toegevoegd', WITHDRAWN: 'Ingetrokken',
}

const reviewPriorityLabels: Record<KnowledgeReviewPriority, string> = {
  LOW: 'Laag',
  NORMAL: 'Normaal',
  HIGH: 'Hoog',
  CRITICAL: 'Kritiek',
}

const auditEventLabels: Record<KnowledgeAuditEventType, string> = {
  SOURCE_REGISTERED: 'Bron geregistreerd',
  SOURCE_VERSION_ADDED: 'Bronversie toegevoegd',
  EXTRACTION_STARTED: 'Verwerking gestart',
  EXTRACTION_COMPLETED: 'Verwerking afgerond',
  EXTRACTION_FAILED: 'Verwerking mislukt',
  CLAIM_CREATED: 'Kennisitem aangemaakt',
  CLAIM_UPDATED: 'Kennisitem gewijzigd',
  VALIDATION_ADDED: 'Validatie toegevoegd',
  VALIDATION_REVOKED: 'Validatie ingetrokken',
  CLAIM_APPROVED: 'Kennisitem goedgekeurd',
  CLAIM_PUBLISHED: 'Kennisitem gepubliceerd',
  CLAIM_ARCHIVED: 'Kennisitem gearchiveerd',
  CONFLICT_DETECTED: 'Conflict vastgesteld',
  IMPORT_STARTED: 'Import gestart',
  IMPORT_COMPLETED: 'Import afgerond',
  IMPORT_FAILED: 'Import mislukt',
  REVIEW_STARTED: 'Kenniscontrole gestart',
  REVIEW_DRAFT_SAVED: 'Controleconcept opgeslagen',
  REVIEW_DEFERRED: 'Kenniscontrole uitgesteld',
  CLAIM_REWORDING_PROPOSED: 'Eigen formulering voorgesteld',
  CHANGES_REQUIRED: 'Aanpassing nodig',
  CONTENT_REVIEW_APPROVED: 'Broncontrole afgerond',
  CONTENT_REVIEW_REJECTED: 'Conceptkennis afgewezen',
  VALIDATION_WITHDRAWN: 'Broncontrole ingetrokken',
  SUPPORTING_SOURCE_ADDED: 'Ondersteunende bron toegevoegd',
  SUPPORTING_SOURCE_REMOVED: 'Ondersteunende bron ingetrokken',
  REVIEW_REOPENED: 'Kenniscontrole heropend',
  IMPROVEMENT_REPORTED: 'Inhoudelijke verbetering gemeld',
  IMPROVEMENT_STATUS_CHANGED: 'Afhandeling inhoudelijke melding gewijzigd',
  CONTROL_EXCEPTION_ACTIVATED: 'Menselijke uitzondering geactiveerd',
  CONTROL_EXCEPTION_DEACTIVATED: 'Menselijke uitzondering afgehandeld',
}

export const knowledgeAdminLabels = {
  temporalStatus: (value: KnowledgeTemporalStatus) => temporalStatusLabels[value],
  validationStatus: (value: KnowledgeValidationStatus) => validationStatusLabels[value],
  publicationStatus: (value: KnowledgePublicationStatus) => publicationStatusLabels[value],
  accessTier: (value: KnowledgeAccessTier) => accessTierLabels[value],
  extractionStatus: (value: KnowledgeExtractionStatus) => extractionStatusLabels[value],
  reviewStatus: (value: KnowledgeReviewStatus) => reviewStatusLabels[value],
  reviewTaskStatus: (value: KnowledgeReviewTaskStatus) => reviewTaskStatusLabels[value],
  reviewPriority: (value: KnowledgeReviewPriority) => reviewPriorityLabels[value],
  controlRisk: (value: KnowledgeControlRisk) => controlRiskLabels[value],
  controlException: (value: KnowledgeControlExceptionType) => controlExceptionLabels[value],
  sourceControlStatus: (value: KnowledgeSourceControlStatus) => sourceControlStatusLabels[value],
  improvementReportType: (value: KnowledgeImprovementReportType) => improvementReportTypeLabels[value],
  improvementReportStatus: (value: KnowledgeImprovementReportStatus) => improvementReportStatusLabels[value],
  claimType: (value: KnowledgeClaimType) => claimTypeLabels[value],
  sourceType: (value: KnowledgeSourceType) => sourceTypeLabels[value],
  authorityLevel: (value: KnowledgeAuthorityLevel) => authorityLevelLabels[value],
  supportType: (value: KnowledgeSupportType) => supportTypeLabels[value],
  sourceReferenceAction: (value: KnowledgeReviewSourceReferenceAction) => sourceReferenceActionLabels[value],
  auditEvent: (value: KnowledgeAuditEventType) => auditEventLabels[value],
}

export function formatKnowledgePublicationYear(value: Date | null) {
  return value ? String(value.getUTCFullYear()) : 'Onbekend'
}

export function formatKnowledgeCitationLocation({
  pageFrom,
  pageTo,
  sectionPath,
}: {
  pageFrom: number | null
  pageTo: number | null
  sectionPath: string | null
}) {
  const page = pageFrom
    ? `pagina ${pageFrom}${pageTo && pageTo !== pageFrom ? `–${pageTo}` : ''}`
    : 'pagina onbekend'
  return sectionPath ? `${page}, ${sectionPath}` : page
}

export function formatKnowledgeInternalExcerpt(value: string | null, maximum = 240) {
  if (!value) return 'Geen intern bronfragment vastgelegd.'
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`
}
