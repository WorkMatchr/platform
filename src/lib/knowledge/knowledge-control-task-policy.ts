import type {
  KnowledgeControlExceptionType,
  KnowledgeControlRisk,
  KnowledgeCopyrightClassification,
  KnowledgePublicationStatus,
  KnowledgeTemporalStatus,
} from '@/generated/prisma/enums'

export type KnowledgeHumanControlInput = Readonly<{
  risk: KnowledgeControlRisk
  temporalStatus: KnowledgeTemporalStatus
  copyrightClassification: KnowledgeCopyrightClassification
  publicationStatus: KnowledgePublicationStatus
  usedInSituationalAdvice: boolean
  hasSourceConflict: boolean
  hasSufficientTraceability: boolean
  hasExpiredSource: boolean
  hasProfessionalReport: boolean
  hasUnclearApplicability: boolean
}>

export type KnowledgeHumanControlDecision = Readonly<{
  requiresHumanAction: boolean
  exceptionType: KnowledgeControlExceptionType | null
  reason: string | null
  historicalInternalOnly: boolean
}>

const decisions: ReadonlyArray<Readonly<{
  type: KnowledgeControlExceptionType
  reason: string
  matches: (input: KnowledgeHumanControlInput) => boolean
}>> = [
  { type: 'PROFESSIONAL_REPORT', reason: 'Een professional heeft een inhoudelijke verbetering gemeld.', matches: (input) => input.hasProfessionalReport },
  { type: 'SOURCE_CONFLICT', reason: 'De bronnen spreken elkaar tegen.', matches: (input) => input.hasSourceConflict },
  { type: 'SOURCE_EXPIRED', reason: 'Een onderliggende bron is verlopen of verouderd.', matches: (input) => input.hasExpiredSource },
  { type: 'APPLICABILITY_UNCLEAR', reason: 'Het toepassingsgebied is onduidelijk of tegenstrijdig.', matches: (input) => input.hasUnclearApplicability },
  { type: 'SITUATIONAL_USE', reason: 'Het kennisitem wordt actief in situatieadvies gebruikt.', matches: (input) => input.usedInSituationalAdvice },
  { type: 'INSUFFICIENT_TRACEABILITY', reason: 'De bronherleidbaarheid is onvoldoende voor het voorgenomen gebruik.', matches: (input) => !input.hasSufficientTraceability },
  { type: 'HIGH_RISK_PUBLICATION', reason: 'Publicatie van kennis met een hoog of kritiek risico wordt overwogen.', matches: (input) => ['HIGH', 'CRITICAL'].includes(input.risk) && input.publicationStatus === 'APPROVED' },
  { type: 'PUBLICATION_BLOCKED', reason: 'De voorgenomen publicatie is onvoldoende onderbouwd.', matches: (input) => input.publicationStatus === 'APPROVED' },
]

export function determineKnowledgeHumanControl(input: KnowledgeHumanControlInput): KnowledgeHumanControlDecision {
  const historicalInternalOnly = input.temporalStatus === 'HISTORICAL'
    || input.temporalStatus === 'SUPERSEDED'
    || input.copyrightClassification === 'RESTRICTED_REFERENCE_ONLY'

  const publicationOrUseConsidered = input.publicationStatus === 'APPROVED' || input.usedInSituationalAdvice
  if (historicalInternalOnly && !publicationOrUseConsidered && !input.hasProfessionalReport) {
    return Object.freeze({ requiresHumanAction: false, exceptionType: null, reason: null, historicalInternalOnly: true })
  }

  const decision = decisions.find((candidate) => candidate.matches(input))
  return Object.freeze({
    requiresHumanAction: Boolean(decision),
    exceptionType: decision?.type ?? null,
    reason: decision?.reason ?? null,
    historicalInternalOnly,
  })
}
