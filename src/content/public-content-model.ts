import type { PublicRoute } from './public-routes'

export type PublicContentType = 'knowledge' | 'service' | 'obligation' | 'sector' | 'tool' | 'overview'
export type PublicContentStatus = 'PUBLISHED' | 'IN_REVIEW'
export type ValidationStatus = 'VALIDATED' | 'CONTEXT_DEPENDENT'
export type EvidenceLevel = 'PRIMARY' | 'AUTHORITATIVE'
export type PublicSourceType = 'LAW' | 'OFFICIAL_GUIDANCE' | 'ENFORCEMENT_GUIDANCE' | 'OFFICIAL_RESEARCH'

export type PublicSource = {
  id: string
  title: string
  publisher: string
  url: string
  type: PublicSourceType
  evidenceLevel: EvidenceLevel
  reviewedAt: string
  note: string
}

export type PublicFaq = {
  id: string
  question: string
  answer: string
}

export type PublicMetadata = {
  title: string
  description: string
}

export type PublicContentBase = {
  id: string
  type: Exclude<PublicContentType, 'tool' | 'overview'>
  slug: string
  title: string
  summary: string
  href: PublicRoute
  status: PublicContentStatus
  validationStatus: ValidationStatus
  evidenceLevel: EvidenceLevel
  lastReviewed: string
  sourceIds: readonly string[]
  searchTerms: readonly string[]
  metadata: PublicMetadata
  faq: readonly PublicFaq[]
}

export type ServiceContent = PublicContentBase & {
  type: 'service'
  positioning: string
  problem: string
  appropriateWhen: readonly string[]
  notDirectlyWhen: readonly string[]
  audience: string
  process: readonly string[]
  outcomes: readonly string[]
  expertise: readonly string[]
  organizationResponsibility: string
  legalContext: string
}

export type ObligationContent = PublicContentBase & {
  type: 'obligation'
  explanation: string
  potentiallyRelevantFor: string
  legalBasis: string
  practicalActions: readonly string[]
  nuances: readonly string[]
  responsibilities: string
  rieRelationship: string
  suitableSupport: string
  disclaimer: string
}

export type SectorContent = PublicContentBase & {
  type: 'sector'
  description: string
  activities: readonly string[]
  risks: readonly string[]
  organizationalPoints: readonly string[]
  obligationIds: readonly string[]
  serviceIds: readonly string[]
  firstSteps: readonly string[]
  supportWhen: string
  nuance: string
}

export type KnowledgeArticleContent = PublicContentBase & {
  type: 'knowledge'
  shortAnswer: string
  context: readonly string[]
  practicalPoints: readonly string[]
  legalContext: string
}

export type DetailContent = ServiceContent | ObligationContent | SectorContent | KnowledgeArticleContent
