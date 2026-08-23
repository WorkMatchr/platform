import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPrisma } from '@/lib/prisma'
import { extractBwbXmlFullSource } from './knowledge-bwb-xml-adapter'
import { extractHtmlFullSource, extractLegacyDocFullSource, extractPdfFullSource, extractStructuredTextFullSource, type FullSourceExtraction } from './knowledge-extractor'
import { storeKnowledgeFullSourceInTransaction } from './knowledge-full-source-service'
import type { KnowledgeLibraryFileReport } from './knowledge-library-batch'
import { onboardKnowledgeSourceInTransaction, type KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'

type DatabaseClient = ReturnType<typeof getPrisma>

// Grote, reeds geëxtraheerde documenten schrijven duizenden immutable blokken in
// batches binnen één transactie. De grens blijft bewust beperkt: voldoende voor
// de 10.000-blokken-acceptatieproef, zonder vastgelopen writes minutenlang vast te houden.
export const KNOWLEDGE_LIBRARY_INGEST_TRANSACTION_OPTIONS = {
  isolationLevel: 'Serializable' as const,
  maxWait: 10_000,
  timeout: 30_000,
}

export type KnowledgeLibraryIngestInput = {
  onboarding: KnowledgeOnboardingInput
  extract: () => Promise<FullSourceExtraction>
  audit?: { actorUserId: string; checksum: string; origin: 'PLATFORM_UPLOAD'; topics?: string[] }
}

const sourceTypes: Record<KnowledgeLibraryFileReport['canonicalFamily'], KnowledgeOnboardingInput['source']['sourceType']> = {
  ARBOCATALOGUE: 'ARBOCATALOGUE', SER: 'PROFESSIONAL_GUIDANCE', TNO: 'RESEARCH', RIVM: 'RESEARCH', NVAB: 'PROFESSIONAL_GUIDANCE',
  PGS: 'PROFESSIONAL_GUIDANCE', LABOUR_INSPECTORATE: 'INSPECTORATE_GUIDANCE', LEGISLATION: 'LEGISLATION',
}

function assertReady(file: KnowledgeLibraryFileReport) {
  if (file.status !== 'READY' || !file.checksum || !file.publisher || !file.sourceCode || !file.canonicalUrl || !file.canonicalIdentity || !file.authorityStatus || !file.temporalStatus || !file.jurisdiction || !file.applicabilityScope || !file.scopeCode || !file.scopeEffect || (!file.versionLabel && !file.publicationYear)) throw new Error('KNOWLEDGE_LIBRARY_DOCUMENT_NOT_READY')
}

function onboardingInput(file: KnowledgeLibraryFileReport, retrievedAt: Date): KnowledgeOnboardingInput {
  assertReady(file)
  return {
    source: {
      code: file.sourceCode!, title: file.title, publisher: file.publisher!, sourceType: sourceTypes[file.canonicalFamily],
      sourceFormat: file.format === 'BWB_XML' ? 'TEXT' : file.format as 'PDF' | 'HTML' | 'TEXT' | 'LEGACY_DOC', canonicalFamily: file.canonicalFamily,
      authorityStatus: file.authorityStatus!, canonicalUrl: file.canonicalUrl!, jurisdiction: file.jurisdiction!, applicabilityScope: file.applicabilityScope!,
      temporalStatus: file.temporalStatus!, sourceFamily: file.canonicalFamily, independenceGroup: file.canonicalIdentity!, isPrimarySource: file.authorityStatus === 'OFFICIAL_PRIMARY',
    },
    version: { versionLabel: file.versionLabel ?? String(file.publicationYear), checksum: file.checksum! },
    artifact: { type: 'LOCAL_SNAPSHOT', mediaType: file.format === 'PDF' ? 'application/pdf' : file.format === 'LEGACY_DOC' ? 'application/msword' : file.format === 'HTML' ? 'text/html' : file.format === 'BWB_XML' ? 'application/xml' : 'text/plain', locator: `manifest:${file.relativePath}`, checksum: file.checksum!, retrievedAt },
    scopes: [{ jurisdiction: file.jurisdiction!, scopeCode: file.scopeCode!, effect: file.scopeEffect!, rationale: 'Gecontroleerde scope uit het lokale Knowledge Library-reviewmanifest.' }],
  }
}

export async function ingestKnowledgeLibraryFile(rootPath: string, file: KnowledgeLibraryFileReport, retrievedAt: Date, database: DatabaseClient = getPrisma()) {
  assertReady(file)
  const root = path.resolve(rootPath)
  const filePath = path.resolve(root, ...file.relativePath.split('/'))
  const relative = path.relative(root, filePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('KNOWLEDGE_LIBRARY_PATH_INVALID')
  const bytes = await readFile(filePath)
  if (createHash('sha256').update(bytes).digest('hex') !== file.checksum) throw new Error('KNOWLEDGE_LIBRARY_ARTIFACT_CHANGED')
  return ingestKnowledgeLibraryDocument({
    onboarding: onboardingInput(file, retrievedAt),
    extract: async () => {
      if (file.format === 'PDF') return extractPdfFullSource(bytes)
      if (file.format === 'LEGACY_DOC') return extractLegacyDocFullSource(bytes)
      const text = new TextDecoder().decode(bytes)
      if (file.format === 'HTML') return extractHtmlFullSource(text)
      if (file.format === 'BWB_XML') return extractBwbXmlFullSource(text)
      if (file.format === 'TEXT') return extractStructuredTextFullSource([{ paragraphs: text.split(/\r?\n\r?\n/gu) }])
      throw new Error('KNOWLEDGE_LIBRARY_EXTRACTION_UNSUPPORTED')
    },
  }, database)
}

/**
 * Extractie gebeurt vóór de eerste write. Daarna worden bron, versie, artifact,
 * applicability en volledige bronlaag in één serializable transactie opgeslagen.
 */
export async function ingestKnowledgeLibraryDocument(
  input: KnowledgeLibraryIngestInput,
  database: DatabaseClient = getPrisma(),
) {
  try {
    const extraction = await input.extract()
    return await database.$transaction(async (tx) => {
      const onboarding = await onboardKnowledgeSourceInTransaction(input.onboarding, tx)
      const fullSource = await storeKnowledgeFullSourceInTransaction(onboarding.sourceVersionId, extraction, tx)
      if (input.audit) {
        await tx.knowledgeAuditEvent.create({ data: {
          eventType: 'IMPORT_COMPLETED', entityType: 'KnowledgeSourceVersion', entityId: onboarding.sourceVersionId,
          actorUserId: input.audit.actorUserId, actorType: 'PLATFORM_ADMIN', result: 'SUCCESS',
          metadata: { origin: input.audit.origin, checksum: input.audit.checksum, topics: input.audit.topics ?? [], pageCount: extraction.pageCount, blockCount: extraction.pages.reduce((total, page) => total + page.blocks.length, 0) },
        } })
      }
      return {
        sourceId: onboarding.sourceId,
        sourceVersionId: onboarding.sourceVersionId,
        extractionRunId: fullSource.extractionRunId,
        created: onboarding.created || fullSource.created,
        sourceCreated: onboarding.created,
        extractionCreated: fullSource.created,
        linkedFragmentCount: fullSource.linkedFragmentCount,
      }
    }, KNOWLEDGE_LIBRARY_INGEST_TRANSACTION_OPTIONS)
  } catch (error) {
    if (input.audit) {
      await database.knowledgeAuditEvent.create({ data: {
        eventType: 'IMPORT_FAILED', entityType: 'KnowledgeSourceVersion', entityId: null,
        actorUserId: input.audit.actorUserId, actorType: 'PLATFORM_ADMIN', result: 'FAILED',
        reason: error instanceof Error ? error.name.slice(0, 1000) : 'UNKNOWN_ERROR',
        metadata: { origin: input.audit.origin, checksum: input.audit.checksum },
      } })
    }
    throw error
  }
}
