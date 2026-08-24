import { createHash } from 'node:crypto'
import path from 'node:path'
import type {
  KnowledgeCanonicalSourceFamily,
  KnowledgeScopeEffect,
  KnowledgeSourceAuthorityStatus,
  KnowledgeSourceType,
  KnowledgeTemporalStatus,
} from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { extractPdfFullSource } from './knowledge-extractor'
import { ingestKnowledgeLibraryDocument } from './knowledge-library-ingest-service'
import { analyzeKnowledgeSourceUploadBatch, proposeKnowledgeSourceMetadata, type KnowledgeBatchAnalysis, type KnowledgeSourceMetadataProposal, type UploadComparisonProfile } from './knowledge-source-upload-metadata'
import type { KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'
import type { KnowledgeSourceUploadStorage } from './knowledge-source-upload-storage'
import { KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES } from './knowledge-source-upload-batch-contract'

export { KNOWLEDGE_SOURCE_UPLOAD_CONCURRENCY, KNOWLEDGE_SOURCE_UPLOAD_MAX_BATCH_BYTES, KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES, KNOWLEDGE_SOURCE_UPLOAD_MAX_FILES } from './knowledge-source-upload-batch-contract'
export type KnowledgeSourceUploadStatus = 'READY_FOR_IMPORT' | 'HUMAN_REVIEW_REQUIRED' | 'DUPLICATE' | 'CONFLICT' | 'UNPROCESSABLE'

type Database = Pick<ReturnType<typeof getPrisma>, 'knowledgeSourceVersion'> & Partial<Pick<ReturnType<typeof getPrisma>, 'knowledgeSource'>>

export type KnowledgeSourceUploadPreview = {
  storageKey: string
  fileName: string
  checksum: string
  bytes: number
  pageCount: number
  blockCount: number
  extractionFingerprint: string
  proposedTitle: string
  proposal: KnowledgeSourceMetadataProposal
  comparison: UploadComparisonProfile
  status: KnowledgeSourceUploadStatus
  warnings: string[]
  duplicate: { sourceId: string; sourceCode: string; sourceTitle: string; versionLabel: string } | null
  existingRelations: Array<{ sourceId: string; sourceCode: string; sourceTitle: string; relationship: 'POSSIBLE_NEW_VERSION' | 'POSSIBLE_RELATED_SOURCE'; rationale: string }>
}

export type KnowledgeSourceUploadMetadata = {
  sourceCode: string
  title: string
  publisher: string
  versionLabel: string
  canonicalFamily: KnowledgeCanonicalSourceFamily | ''
  sourceType: KnowledgeSourceType | ''
  authorityStatus: KnowledgeSourceAuthorityStatus | ''
  temporalStatus: KnowledgeTemporalStatus | ''
  canonicalUrl: string
  series: string
  publicationCode: string
  edition: string
  publicationYear: string
  isbn: string
  jurisdiction: string
  applicabilityScope: string
  scopeCode: string
  scopeEffect: KnowledgeScopeEffect
  topics: string[]
}

export class KnowledgeSourceUploadError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeSourceUploadError'
  }
}

const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function cleanText(value: string, maximum: number) {
  return value.replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maximum)
}

function titleFromFileName(fileName: string) {
  return cleanText(path.basename(fileName, path.extname(fileName)).replace(/[_+]+/gu, ' '), 300) || 'Titel controleren'
}

function assertPdf(bytes: Uint8Array, fileName: string, mediaType: string) {
  if (!bytes.length) throw new KnowledgeSourceUploadError('EMPTY_FILE', 'Selecteer een niet-leeg PDF-bestand.')
  if (bytes.length > KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES) throw new KnowledgeSourceUploadError('FILE_TOO_LARGE', 'Het PDF-bestand is groter dan 10 MB.')
  if (mediaType !== 'application/pdf' || path.extname(fileName).toLowerCase() !== '.pdf') throw new KnowledgeSourceUploadError('FILE_TYPE_INVALID', 'Alleen PDF-bestanden zijn toegestaan.')
  if (new TextDecoder('latin1').decode(bytes.slice(0, 5)) !== '%PDF-') throw new KnowledgeSourceUploadError('PDF_SIGNATURE_INVALID', 'Het geselecteerde bestand is geen geldige PDF.')
}

export async function analyzeKnowledgeSourceUpload(input: {
  bytes: Uint8Array
  fileName: string
  mediaType: string
  storage: KnowledgeSourceUploadStorage
  database: Database
}): Promise<KnowledgeSourceUploadPreview> {
  assertPdf(input.bytes, input.fileName, input.mediaType)
  const artifactChecksum = checksum(input.bytes)
  return analyzeBytes({ ...input, artifactChecksum, storageKey: null })
}

async function analyzeBytes(input: {
  bytes: Uint8Array
  fileName: string
  mediaType: string
  storage: KnowledgeSourceUploadStorage
  database: Database
  artifactChecksum: string
  storageKey: string | null
}): Promise<KnowledgeSourceUploadPreview> {
  const duplicate = await input.database.knowledgeSourceVersion.findFirst({
    where: { checksum: input.artifactChecksum },
    select: { id: true, sourceId: true, versionLabel: true, source: { select: { code: true, title: true } } },
  })
  let extraction
  try {
    extraction = await extractPdfFullSource(input.bytes)
  } catch {
    throw new KnowledgeSourceUploadError('EXTRACTION_UNSUPPORTED', 'De PDF kon niet betrouwbaar worden uitgelezen.')
  }
  const stored = input.storageKey
    ? { storageKey: input.storageKey, locator: (await input.storage.read(input.storageKey))?.locator ?? '' }
    : duplicate ? { storageKey: '', locator: '' } : await input.storage.save(input.bytes, { checksum: input.artifactChecksum, mediaType: 'application/pdf' })
  if (!duplicate && !stored.locator) throw new KnowledgeSourceUploadError('ARTIFACT_CHANGED', 'Het opgeslagen bronbestand ontbreekt of is gewijzigd.')
  const proposals = proposeKnowledgeSourceMetadata(input.fileName, extraction)
  const proposedCode = proposals.metadata.sourceCode.value
  const proposedTitle = proposals.metadata.title.value
  const existing = input.database.knowledgeSource && (proposedCode || proposedTitle)
    ? await input.database.knowledgeSource.findMany({
      where: { OR: [...(proposedCode ? [{ code: proposedCode }] : []), ...(proposedTitle ? [{ title: { contains: proposedTitle.slice(0, 80), mode: 'insensitive' as const } }] : [])] },
      select: { id: true, code: true, title: true, publisher: true }, take: 10,
    }) : []
  const sourceCodeConflict = Boolean(proposedCode && existing.some((source) => source.code === proposedCode && source.title.localeCompare(proposedTitle ?? '', 'nl-NL', { sensitivity: 'base' }) !== 0))
  const existingRelations = existing.map((source) => {
    const sameTitle = source.title.localeCompare(proposedTitle ?? '', 'nl-NL', { sensitivity: 'base' }) === 0
    const samePublisher = Boolean(source.publisher && proposals.metadata.publisher.value && source.publisher.localeCompare(proposals.metadata.publisher.value, 'nl-NL', { sensitivity: 'base' }) === 0)
    return { sourceId: source.id, sourceCode: source.code, sourceTitle: source.title, relationship: sameTitle && samePublisher ? 'POSSIBLE_NEW_VERSION' as const : 'POSSIBLE_RELATED_SOURCE' as const, rationale: sameTitle && samePublisher ? 'Titel en uitgever komen overeen; controleer of dit een nieuwe versie is.' : 'Broncode of titel vertoont overeenkomst; controleer de relatie.' }
  })
  return {
    storageKey: stored.storageKey,
    fileName: cleanText(path.basename(input.fileName), 255),
    checksum: input.artifactChecksum,
    bytes: input.bytes.length,
    pageCount: extraction.pageCount,
    blockCount: extraction.pages.reduce((total, page) => total + page.blocks.length, 0),
    extractionFingerprint: extraction.extractionFingerprint,
    proposedTitle: proposals.metadata.title.value ?? titleFromFileName(input.fileName),
    proposal: proposals.metadata,
    comparison: proposals.comparison,
    status: duplicate ? 'DUPLICATE' : sourceCodeConflict ? 'CONFLICT' : 'HUMAN_REVIEW_REQUIRED',
    warnings: ['Titel en overige bronmetadata zijn voorstellen en moeten door een beheerder worden gecontroleerd.', ...(sourceCodeConflict ? ['De voorgestelde broncode hoort al bij een andere brontitel.'] : []), ...(extraction.warningSummary ? [extraction.warningSummary] : [])],
    duplicate: duplicate ? { sourceId: duplicate.sourceId, sourceCode: duplicate.source.code, sourceTitle: duplicate.source.title, versionLabel: duplicate.versionLabel } : null,
    existingRelations,
  }
}

export async function analyzeStoredKnowledgeSourceUpload(input: {
  storageKey: string
  fileName: string
  mediaType: string
  storage: KnowledgeSourceUploadStorage
  database: Database
}) {
  const stored = await input.storage.read(input.storageKey)
  if (!stored) throw new KnowledgeSourceUploadError('ARTIFACT_CHANGED', 'Het opgeslagen bronbestand ontbreekt.')
  assertPdf(stored.bytes, input.fileName, input.mediaType)
  if (checksum(stored.bytes) !== stored.checksum) throw new KnowledgeSourceUploadError('ARTIFACT_CHANGED', 'De checksum van het opgeslagen bronbestand wijkt af.')
  return analyzeBytes({ ...input, bytes: stored.bytes, artifactChecksum: stored.checksum })
}

export function analyzeKnowledgeSourceUploadPreviews(previews: KnowledgeSourceUploadPreview[]): KnowledgeBatchAnalysis {
  return analyzeKnowledgeSourceUploadBatch(previews.map((preview) => ({ checksum: preview.checksum, fileName: preview.fileName, proposal: preview.proposal, comparison: preview.comparison })))
}

function required(value: string, field: string, maximum = 500) {
  const result = cleanText(value, maximum)
  if (!result) throw new KnowledgeSourceUploadError('METADATA_REQUIRED', `${field} is verplicht.`)
  return result
}

function onboarding(preview: KnowledgeSourceUploadPreview, metadata: KnowledgeSourceUploadMetadata, storageLocator: string): KnowledgeOnboardingInput {
  const canonicalUrl = cleanText(metadata.canonicalUrl, 1000)
  let parsedUrl: URL | null = null
  if (canonicalUrl) {
    try { parsedUrl = new URL(canonicalUrl) } catch { throw new KnowledgeSourceUploadError('CANONICAL_URL_INVALID', 'De openbare bron-URL is ongeldig.') }
    if (parsedUrl.protocol !== 'https:') throw new KnowledgeSourceUploadError('CANONICAL_URL_INVALID', 'De openbare bron-URL moet HTTPS gebruiken.')
  }
  if (!metadata.topics.map((topic) => cleanText(topic, 100)).filter(Boolean).length) throw new KnowledgeSourceUploadError('METADATA_REQUIRED', 'Minimaal één onderwerp is verplicht.')
  const sourceCode = required(metadata.sourceCode.toUpperCase(), 'Broncode', 80)
  const title = required(metadata.title, 'Titel', 300)
  const publisher = required(metadata.publisher, 'Uitgever', 300)
  const jurisdiction = required(metadata.jurisdiction.toUpperCase(), 'Jurisdictie', 20)
  const applicabilityScope = required(metadata.applicabilityScope, 'Toepassingsgebied', 500)
  if (!metadata.canonicalFamily || !metadata.sourceType || !metadata.authorityStatus || !metadata.temporalStatus) throw new KnowledgeSourceUploadError('METADATA_REQUIRED', 'Bronfamilie, documenttype, autoriteitsstatus en temporaliteit zijn verplicht.')
  const publicationYear = cleanText(metadata.publicationYear, 4)
  if (publicationYear && !/^(?:19|20)\d{2}$/u.test(publicationYear)) throw new KnowledgeSourceUploadError('BIBLIOGRAPHIC_YEAR_INVALID', 'Het publicatiejaar is ongeldig.')
  const canonicalIdentity = parsedUrl ? { type: 'URL' as const, url: parsedUrl.toString() } : {
    type: 'BIBLIOGRAPHIC' as const,
    publisher,
    series: required(metadata.series, 'Reeks', 200),
    title,
    publicationCode: required(metadata.publicationCode || sourceCode, 'Publicatiecode', 120),
    edition: cleanText(metadata.edition, 120) || undefined,
    publicationYear: publicationYear ? Number(publicationYear) : undefined,
    isbn: cleanText(metadata.isbn, 32) || undefined,
  }
  const independenceGroup = parsedUrl ? parsedUrl.toString() : `BIBLIOGRAPHIC:${createHash('sha256').update(`${publisher}|${metadata.series}|${metadata.publicationCode || sourceCode}`).digest('hex').slice(0, 32)}`
  return {
    source: {
      code: sourceCode,
      title,
      publisher,
      sourceType: metadata.sourceType,
      sourceFormat: 'PDF',
      canonicalFamily: metadata.canonicalFamily,
      authorityStatus: metadata.authorityStatus,
      canonicalUrl: parsedUrl?.toString(),
      canonicalIdentity,
      jurisdiction,
      applicabilityScope,
      temporalStatus: metadata.temporalStatus,
      sourceFamily: metadata.canonicalFamily,
      independenceGroup,
      isPrimarySource: metadata.authorityStatus === 'OFFICIAL_PRIMARY',
    },
    version: { versionLabel: required(metadata.versionLabel, 'Versie of publicatiejaar', 100), checksum: preview.checksum },
    artifact: { type: 'LOCAL_SNAPSHOT', mediaType: 'application/pdf', locator: storageLocator, checksum: preview.checksum, retrievedAt: new Date() },
    scopes: [{ jurisdiction, scopeCode: required(metadata.scopeCode, 'Scopecode', 100), effect: metadata.scopeEffect, rationale: 'Door platformbeheer gecontroleerd bij bronupload.' }],
  }
}

export async function confirmKnowledgeSourceUpload(input: {
  preview: KnowledgeSourceUploadPreview
  metadata: KnowledgeSourceUploadMetadata
  explicitlyConfirmed: boolean
  relationshipReviewed: boolean
  actorUserId: string
  storage: KnowledgeSourceUploadStorage
  database: Parameters<typeof ingestKnowledgeLibraryDocument>[1]
}) {
  if (!input.explicitlyConfirmed) throw new KnowledgeSourceUploadError('EXPLICIT_CONFIRMATION_REQUIRED', 'Bevestig de gecontroleerde metadata vóór import.')
  if (!input.relationshipReviewed) throw new KnowledgeSourceUploadError('RELATIONSHIP_REVIEW_REQUIRED', 'Beoordeel de voorgestelde documentrelatie vóór import.')
  if (input.preview.duplicate) throw new KnowledgeSourceUploadError('POSSIBLE_DUPLICATE', 'Beoordeel het mogelijke duplicaat voordat import mogelijk is.')
  if (input.preview.status === 'CONFLICT' || input.preview.status === 'UNPROCESSABLE') throw new KnowledgeSourceUploadError('UPLOAD_NOT_IMPORTABLE', 'Los het bronconflict op voordat import mogelijk is.')
  const stored = await input.storage.read(input.preview.storageKey)
  if (!stored || stored.checksum !== input.preview.checksum || checksum(stored.bytes) !== input.preview.checksum) throw new KnowledgeSourceUploadError('ARTIFACT_CHANGED', 'Het opgeslagen bronbestand ontbreekt of is gewijzigd.')
  assertPdf(stored.bytes, input.preview.fileName, stored.mediaType)
  const result = await ingestKnowledgeLibraryDocument({
    onboarding: onboarding(input.preview, input.metadata, stored.locator),
    extract: () => extractPdfFullSource(stored.bytes),
    audit: { actorUserId: input.actorUserId, checksum: input.preview.checksum, origin: 'PLATFORM_UPLOAD', topics: input.metadata.topics.map((topic) => cleanText(topic, 100)).filter(Boolean) },
  }, input.database)
  return { ...result, status: 'REVIEW_REQUIRED' as const }
}
