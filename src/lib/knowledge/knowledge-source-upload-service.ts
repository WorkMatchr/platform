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
import type { KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'
import type { KnowledgeSourceUploadStorage } from './knowledge-source-upload-storage'

export const KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
export type KnowledgeSourceUploadStatus = 'READY' | 'NEEDS_METADATA_REVIEW' | 'POSSIBLE_DUPLICATE' | 'VERSION_CONFLICT' | 'SOURCE_IDENTITY_UNCERTAIN' | 'EXTRACTION_UNSUPPORTED'

type Database = Pick<ReturnType<typeof getPrisma>, 'knowledgeSourceVersion'>

export type KnowledgeSourceUploadPreview = {
  storageKey: string
  fileName: string
  checksum: string
  bytes: number
  pageCount: number
  blockCount: number
  extractionFingerprint: string
  proposedTitle: string
  status: KnowledgeSourceUploadStatus
  warnings: string[]
  duplicate: { sourceId: string; sourceCode: string; sourceTitle: string; versionLabel: string } | null
}

export type KnowledgeSourceUploadMetadata = {
  sourceCode: string
  title: string
  publisher: string
  versionLabel: string
  canonicalFamily: KnowledgeCanonicalSourceFamily
  sourceType: KnowledgeSourceType
  authorityStatus: KnowledgeSourceAuthorityStatus
  temporalStatus: KnowledgeTemporalStatus
  canonicalUrl: string
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
  const duplicate = await input.database.knowledgeSourceVersion.findFirst({
    where: { checksum: artifactChecksum },
    select: { id: true, sourceId: true, versionLabel: true, source: { select: { code: true, title: true } } },
  })
  let extraction
  try {
    extraction = await extractPdfFullSource(input.bytes)
  } catch {
    throw new KnowledgeSourceUploadError('EXTRACTION_UNSUPPORTED', 'De PDF kon niet betrouwbaar worden uitgelezen.')
  }
  const stored = duplicate
    ? { storageKey: '', locator: '' }
    : await input.storage.save(input.bytes, { checksum: artifactChecksum, mediaType: 'application/pdf' })
  return {
    storageKey: stored.storageKey,
    fileName: cleanText(path.basename(input.fileName), 255),
    checksum: artifactChecksum,
    bytes: input.bytes.length,
    pageCount: extraction.pageCount,
    blockCount: extraction.pages.reduce((total, page) => total + page.blocks.length, 0),
    extractionFingerprint: extraction.extractionFingerprint,
    proposedTitle: titleFromFileName(input.fileName),
    status: duplicate ? 'POSSIBLE_DUPLICATE' : 'NEEDS_METADATA_REVIEW',
    warnings: ['Titel en overige bronmetadata zijn voorstellen en moeten door een beheerder worden gecontroleerd.', ...(extraction.warningSummary ? [extraction.warningSummary] : [])],
    duplicate: duplicate ? { sourceId: duplicate.sourceId, sourceCode: duplicate.source.code, sourceTitle: duplicate.source.title, versionLabel: duplicate.versionLabel } : null,
  }
}

function required(value: string, field: string, maximum = 500) {
  const result = cleanText(value, maximum)
  if (!result) throw new KnowledgeSourceUploadError('METADATA_REQUIRED', `${field} is verplicht.`)
  return result
}

function onboarding(preview: KnowledgeSourceUploadPreview, metadata: KnowledgeSourceUploadMetadata, storageLocator: string): KnowledgeOnboardingInput {
  const canonicalUrl = required(metadata.canonicalUrl, 'Canonieke HTTPS-URL', 1000)
  let parsedUrl: URL
  try { parsedUrl = new URL(canonicalUrl) } catch { throw new KnowledgeSourceUploadError('CANONICAL_URL_INVALID', 'De canonieke URL is ongeldig.') }
  if (parsedUrl.protocol !== 'https:') throw new KnowledgeSourceUploadError('CANONICAL_URL_INVALID', 'De canonieke URL moet HTTPS gebruiken.')
  if (!metadata.topics.map((topic) => cleanText(topic, 100)).filter(Boolean).length) throw new KnowledgeSourceUploadError('METADATA_REQUIRED', 'Minimaal één onderwerp is verplicht.')
  const sourceCode = required(metadata.sourceCode.toUpperCase(), 'Broncode', 80)
  const title = required(metadata.title, 'Titel', 300)
  const publisher = required(metadata.publisher, 'Uitgever', 300)
  const jurisdiction = required(metadata.jurisdiction.toUpperCase(), 'Jurisdictie', 20)
  const applicabilityScope = required(metadata.applicabilityScope, 'Toepassingsgebied', 500)
  return {
    source: {
      code: sourceCode,
      title,
      publisher,
      sourceType: metadata.sourceType,
      sourceFormat: 'PDF',
      canonicalFamily: metadata.canonicalFamily,
      authorityStatus: metadata.authorityStatus,
      canonicalUrl: parsedUrl.toString(),
      jurisdiction,
      applicabilityScope,
      temporalStatus: metadata.temporalStatus,
      sourceFamily: metadata.canonicalFamily,
      independenceGroup: parsedUrl.toString(),
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
  actorUserId: string
  storage: KnowledgeSourceUploadStorage
  database: Parameters<typeof ingestKnowledgeLibraryDocument>[1]
}) {
  if (!input.explicitlyConfirmed) throw new KnowledgeSourceUploadError('EXPLICIT_CONFIRMATION_REQUIRED', 'Bevestig de gecontroleerde metadata vóór import.')
  if (input.preview.duplicate) throw new KnowledgeSourceUploadError('POSSIBLE_DUPLICATE', 'Beoordeel het mogelijke duplicaat voordat import mogelijk is.')
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
