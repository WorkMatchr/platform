import type { InternalHref } from '@/content/public-homepage'

export type KnowledgeContentType = 'EXPLANATION' | 'LEGAL_OBLIGATION' | 'SERVICE'
export type KnowledgeContentStatus = 'PUBLISHED' | 'IN_REVIEW'
export type KnowledgeSourceType = 'LAW' | 'OFFICIAL_GUIDANCE' | 'ENFORCEMENT_GUIDANCE'
export type EvidenceLevel = 'PRIMARY' | 'AUTHORITATIVE'
export type ValidationStatus = 'VALIDATED' | 'CONTEXT_DEPENDENT'

export type KnowledgeSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  items?: readonly string[]
}

export type KnowledgeSource = {
  id: string
  title: string
  sourceType: KnowledgeSourceType
  owner: string
  location: string
  evidenceLevel: EvidenceLevel
  validationStatus: ValidationStatus
  note: string
}

export type KnowledgeLink = {
  title: string
  description: string
  href: InternalHref
}

export type KnowledgeCallToActionContent = {
  title: string
  description: string
  primary: { label: string; href: InternalHref }
  secondary?: { label: string; href: InternalHref }
}

export type KnowledgeDocument = {
  id: string
  type: KnowledgeContentType
  slug: string
  title: string
  summary: string
  status: KnowledgeContentStatus
  lastReviewed: string
  sections: readonly KnowledgeSection[]
  relatedTopics: readonly KnowledgeLink[]
  callToAction: KnowledgeCallToActionContent
  sources: readonly KnowledgeSource[]
}
