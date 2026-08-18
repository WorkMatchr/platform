import { createHash } from 'node:crypto'
import type { KnowledgeImportPackage } from './knowledge-import-schema'

type FingerprintFragment = {
  key: string
  pageFrom: number | null
  pageTo: number | null
  sectionPath: string | null
  fragmentType: string
  internalExcerpt: string | null
  excerptHash: string | null
  sourceBlockEvidence?: Array<{ sourceVersionId: string; sourceBlockId: string; evidenceRole: string; blockTextHash: string }>
}

type FingerprintClaim = {
  key: string
  topicSlug: string
  claimType: string
  statement: string
  normalizedStatement: string | null
  applicability: string
  jurisdiction: string
  validFrom: string | null
  validUntil: string | null
  temporalStatus: string
  validationStatus: string
  publicationStatus: string
  confidenceLevel: string
  accessTier: string
  controlRisk: string
}

type FingerprintCitation = {
  claimKey: string
  fragmentKey: string
  supportType: string
  citationNote: string | null
}

export type KnowledgeImportFingerprintSnapshot = {
  source: {
    code: string
    sourceType: string
    sourceFormat: string
    title: string
    publisher: string | null
    publicationDate: string | null
    sourceModifiedDate: string | null
    edition: string | null
    applicabilityScope: string | null
    metadataStatus: string
    language: string
    jurisdiction: string
    copyrightClassification: string
    authorityLevel: string
    temporalStatus: string
    sourceFamily: string
    independenceGroup: string
    isPrimarySource: boolean
    notes: string | null
  }
  sourceVersion: {
    versionLabel: string
    publicationDate: string | null
    validFrom: string | null
    validUntil: string | null
    checksum: string | null
    extractionStatus: string
    reviewStatus: string
  }
  fragments: FingerprintFragment[]
  claims: FingerprintClaim[]
  citations: FingerprintCitation[]
}

function sortByKey<T>(values: T[], key: (value: T) => string) {
  return [...values].sort((left, right) => key(left).localeCompare(key(right), 'en'))
}

function dateOnly(value: Date | string | null | undefined) {
  if (!value) return null
  return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
}

export function snapshotKnowledgeImportPackage(data: KnowledgeImportPackage): KnowledgeImportFingerprintSnapshot {
  const topicSlugs = new Map(data.topics.map((topic) => [topic.externalKey, topic.slug]))
  return {
    source: {
      code: data.source.code,
      sourceType: data.source.sourceType,
      sourceFormat: data.source.sourceFormat,
      title: data.source.title,
      publisher: data.source.publisher ?? null,
      publicationDate: dateOnly(data.source.publicationDate),
      sourceModifiedDate: dateOnly(data.source.sourceModifiedDate),
      edition: data.source.edition ?? null,
      applicabilityScope: data.source.applicabilityScope ?? null,
      metadataStatus: data.source.metadataStatus,
      language: data.source.language,
      jurisdiction: data.source.jurisdiction,
      copyrightClassification: data.source.copyrightClassification,
      authorityLevel: data.source.authorityLevel,
      temporalStatus: data.source.temporalStatus,
      sourceFamily: data.source.sourceFamily,
      independenceGroup: data.source.independenceGroup,
      isPrimarySource: data.source.isPrimarySource,
      notes: data.source.notes ?? null,
    },
    sourceVersion: {
      versionLabel: data.sourceVersion.versionLabel,
      publicationDate: dateOnly(data.sourceVersion.publicationDate),
      validFrom: dateOnly(data.sourceVersion.validFrom),
      validUntil: dateOnly(data.sourceVersion.validUntil),
      checksum: data.sourceVersion.checksum ?? null,
      extractionStatus: data.sourceVersion.extractionStatus,
      reviewStatus: data.sourceVersion.reviewStatus,
    },
    fragments: sortByKey(data.fragments.map((fragment) => ({
      key: fragment.externalKey,
      pageFrom: fragment.pageFrom ?? null,
      pageTo: fragment.pageTo ?? null,
      sectionPath: fragment.sectionPath ?? null,
      fragmentType: fragment.fragmentType,
      internalExcerpt: fragment.internalExcerpt ?? null,
      excerptHash: fragment.excerptHash ?? null,
      ...(fragment.sourceBlockEvidence ? { sourceBlockEvidence: sortByKey(fragment.sourceBlockEvidence, (evidence) => `${evidence.sourceBlockId}\u0000${evidence.evidenceRole}`) } : {}),
    })), (fragment) => fragment.key),
    claims: sortByKey(data.claims.map((claim) => ({
      key: claim.externalKey,
      topicSlug: topicSlugs.get(claim.topicKey) ?? claim.topicKey,
      claimType: claim.claimType,
      statement: claim.statement,
      normalizedStatement: claim.normalizedStatement ?? null,
      applicability: claim.applicability,
      jurisdiction: claim.jurisdiction,
      validFrom: dateOnly(claim.validFrom),
      validUntil: dateOnly(claim.validUntil),
      temporalStatus: claim.temporalStatus,
      validationStatus: claim.validationStatus,
      publicationStatus: claim.publicationStatus,
      confidenceLevel: claim.confidenceLevel,
      accessTier: claim.accessTier,
      controlRisk: claim.controlRisk,
    })), (claim) => claim.key),
    citations: sortByKey(data.citations.map((citation) => ({
      claimKey: citation.claimKey,
      fragmentKey: citation.fragmentKey ?? '',
      supportType: citation.supportType,
      citationNote: citation.citationNote ?? null,
    })), (citation) => `${citation.claimKey}\u0000${citation.fragmentKey}\u0000${citation.supportType}\u0000${citation.citationNote ?? ''}`),
  }
}

export function createKnowledgeImportFingerprint(snapshot: KnowledgeImportFingerprintSnapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
}

export function fingerprintKnowledgeImportPackage(data: KnowledgeImportPackage) {
  return createKnowledgeImportFingerprint(snapshotKnowledgeImportPackage(data))
}
