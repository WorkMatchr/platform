import { createHash } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { extractHtmlFullSource, extractPdfFullSource, extractStructuredTextFullSource, type FullSourceExtraction } from './knowledge-extractor'

export const KNOWLEDGE_LIBRARY_MAX_BATCH_SIZE = 100
export const KNOWLEDGE_LIBRARY_FULL_EXTRACTION_LIMIT = 10

const supportedFolders = ['arbocatalogi', 'ser', 'tno', 'rivm', 'nvab', 'pgs', 'inspectie', 'legislation'] as const
export type KnowledgeLibraryFolder = (typeof supportedFolders)[number]
export type KnowledgeLibraryStatus = 'READY' | 'NEEDS_METADATA_REVIEW' | 'POSSIBLE_DUPLICATE' | 'VERSION_CONFLICT' | 'SOURCE_IDENTITY_UNCERTAIN' | 'EXTRACTION_UNSUPPORTED'
export type KnowledgeDocumentFamilyRole = 'PRIMARY_GUIDELINE' | 'BACKGROUND_EVIDENCE' | 'SUMMARY' | 'CHECKLIST' | 'APPENDIX' | 'TOOL'

export type KnowledgeLibraryMetadataOverride = {
  relativePath: string
  checksum: string
  sourceCode: string
  title: string
  publisher: string
  versionLabel?: string
  publicationYear?: number
  canonicalUrl: string
  canonicalIdentity: string
  authorityStatus: 'OFFICIAL_PRIMARY' | 'OFFICIAL_GUIDANCE' | 'AUTHORIZED_PUBLICATION' | 'PROFESSIONAL_REFERENCE' | 'UNKNOWN'
  temporalStatus: 'UNKNOWN' | 'CURRENT' | 'HISTORICAL' | 'SUPERSEDED' | 'WITHDRAWN' | 'UNDER_REVIEW'
  jurisdiction: string
  applicabilityScope: string
  scopeCode: string
  scopeEffect: 'APPLIES' | 'CONDITIONAL' | 'EXCLUDES'
  familyCode?: string
  familyRole?: KnowledgeDocumentFamilyRole
}

export type KnowledgeLibraryMetadataManifest = {
  schemaVersion: 1
  documents: KnowledgeLibraryMetadataOverride[]
}

export type KnowledgeLibraryBatchOptions = {
  limit?: number
  fullExtractionLimit?: number
  metadataOverrides?: KnowledgeLibraryMetadataOverride[]
}

export type KnowledgeLibraryFileReport = {
  relativePath: string
  status: KnowledgeLibraryStatus
  reasons: string[]
  checksum: string | null
  bytes: number
  format: 'PDF' | 'HTML' | 'TEXT' | 'BWB_XML' | 'UNSUPPORTED'
  canonicalFamily: 'ARBOCATALOGUE' | 'SER' | 'TNO' | 'RIVM' | 'NVAB' | 'PGS' | 'LABOUR_INSPECTORATE' | 'LEGISLATION'
  publisher: string | null
  title: string
  documentType: string | null
  topics: string[]
  versionLabel: string | null
  publicationYear: number | null
  jurisdiction: string | null
  scopeCode: string | null
  canonicalUrl: string | null
  canonicalIdentity: string | null
  sourceCode: string | null
  authorityStatus: KnowledgeLibraryMetadataOverride['authorityStatus'] | null
  temporalStatus: KnowledgeLibraryMetadataOverride['temporalStatus'] | null
  applicabilityScope: string | null
  scopeEffect: KnowledgeLibraryMetadataOverride['scopeEffect'] | null
  pageCount: number | null
  estimatedBlocks: number | null
  extractionFingerprint: string | null
  documentFamily: { code: string; role: KnowledgeDocumentFamilyRole } | null
}

export type KnowledgeLibraryBatchReport = {
  generatedAt: string
  rootPath: string
  totalFiles: number
  ready: number
  needsMetadataReview: number
  possibleDuplicates: number
  versionConflicts: number
  extractionUnsupported: number
  unknownFamilies: number
  estimatedPages: number
  estimatedBlocks: number
  potentialDocumentFamilies: number
  files: KnowledgeLibraryFileReport[]
}

const familyConfiguration: Record<KnowledgeLibraryFolder, { canonicalFamily: KnowledgeLibraryFileReport['canonicalFamily']; publisher: string | null; jurisdiction: string | null }> = {
  arbocatalogi: { canonicalFamily: 'ARBOCATALOGUE', publisher: null, jurisdiction: 'NL' },
  ser: { canonicalFamily: 'SER', publisher: 'Sociaal-Economische Raad', jurisdiction: 'NL' },
  tno: { canonicalFamily: 'TNO', publisher: 'TNO', jurisdiction: 'NL' },
  rivm: { canonicalFamily: 'RIVM', publisher: 'RIVM', jurisdiction: 'NL' },
  nvab: { canonicalFamily: 'NVAB', publisher: 'NVAB', jurisdiction: 'NL' },
  pgs: { canonicalFamily: 'PGS', publisher: 'PGS-beheerorganisatie', jurisdiction: 'NL' },
  inspectie: { canonicalFamily: 'LABOUR_INSPECTORATE', publisher: 'Nederlandse Arbeidsinspectie', jurisdiction: 'NL' },
  legislation: { canonicalFamily: 'LEGISLATION', publisher: 'Nederlandse overheid', jurisdiction: 'NL' },
}

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const normalizePath = (value: string) => value.replaceAll('\\', '/')
const normalizeTitle = (fileName: string) => path.basename(fileName, path.extname(fileName))
  .replace(/^\d{10,}[-_ ]*/u, '')
  .replace(/[_+]+/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim()

const allowedAuthorityStatuses = new Set<KnowledgeLibraryMetadataOverride['authorityStatus']>(['OFFICIAL_PRIMARY', 'OFFICIAL_GUIDANCE', 'AUTHORIZED_PUBLICATION', 'PROFESSIONAL_REFERENCE', 'UNKNOWN'])
const allowedScopeEffects = new Set<KnowledgeLibraryMetadataOverride['scopeEffect']>(['APPLIES', 'CONDITIONAL', 'EXCLUDES'])
const allowedTemporalStatuses = new Set<KnowledgeLibraryMetadataOverride['temporalStatus']>(['UNKNOWN', 'CURRENT', 'HISTORICAL', 'SUPERSEDED', 'WITHDRAWN', 'UNDER_REVIEW'])

export function parseKnowledgeLibraryMetadataManifest(value: unknown): KnowledgeLibraryMetadataOverride[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_MANIFEST_INVALID')
  const manifest = value as Partial<KnowledgeLibraryMetadataManifest>
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.documents)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_MANIFEST_INVALID')
  const seen = new Set<string>()
  return manifest.documents.map((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_ENTRY_INVALID')
    const entry = candidate as Partial<KnowledgeLibraryMetadataOverride>
    const relativePath = normalizePath(String(entry.relativePath ?? '')).replace(/^\.\//u, '')
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.split('/').includes('..') || seen.has(relativePath)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_PATH_INVALID')
    seen.add(relativePath)
    if (!/^[0-9a-f]{64}$/u.test(String(entry.checksum ?? ''))) throw new Error('KNOWLEDGE_LIBRARY_METADATA_CHECKSUM_INVALID')
    if (!/^[A-Z0-9][A-Z0-9._:-]{1,79}$/u.test(String(entry.sourceCode ?? ''))) throw new Error('KNOWLEDGE_LIBRARY_METADATA_SOURCE_CODE_INVALID')
    let canonicalUrl: URL
    try { canonicalUrl = new URL(String(entry.canonicalUrl ?? '')) } catch { throw new Error('KNOWLEDGE_LIBRARY_METADATA_CANONICAL_URL_INVALID') }
    if (canonicalUrl.protocol !== 'https:') throw new Error('KNOWLEDGE_LIBRARY_METADATA_CANONICAL_URL_INVALID')
    if (!String(entry.canonicalIdentity ?? '').trim() || !String(entry.jurisdiction ?? '').trim() || !String(entry.applicabilityScope ?? '').trim() || !String(entry.scopeCode ?? '').trim()) throw new Error('KNOWLEDGE_LIBRARY_METADATA_CANONICAL_FIELDS_REQUIRED')
    if (!String(entry.title ?? '').trim() || !String(entry.publisher ?? '').trim() || (!String(entry.versionLabel ?? '').trim() && entry.publicationYear === undefined)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_DESCRIPTIVE_FIELDS_REQUIRED')
    if (!allowedAuthorityStatuses.has(entry.authorityStatus as KnowledgeLibraryMetadataOverride['authorityStatus'])) throw new Error('KNOWLEDGE_LIBRARY_METADATA_AUTHORITY_INVALID')
    if (!allowedTemporalStatuses.has(entry.temporalStatus as KnowledgeLibraryMetadataOverride['temporalStatus'])) throw new Error('KNOWLEDGE_LIBRARY_METADATA_TEMPORAL_STATUS_INVALID')
    if (!allowedScopeEffects.has(entry.scopeEffect as KnowledgeLibraryMetadataOverride['scopeEffect'])) throw new Error('KNOWLEDGE_LIBRARY_METADATA_SCOPE_EFFECT_INVALID')
    if (entry.publicationYear !== undefined && (!Number.isInteger(entry.publicationYear) || entry.publicationYear < 1800 || entry.publicationYear > 2200)) throw new Error('KNOWLEDGE_LIBRARY_METADATA_YEAR_INVALID')
    return { ...entry, relativePath, canonicalUrl: canonicalUrl.toString() } as KnowledgeLibraryMetadataOverride
  })
}

function formatOf(fileName: string, bytes: Uint8Array): KnowledgeLibraryFileReport['format'] {
  const extension = path.extname(fileName).toLowerCase()
  if (extension === '.pdf') return new TextDecoder('ascii').decode(bytes.subarray(0, 5)) === '%PDF-' ? 'PDF' : 'UNSUPPORTED'
  if (extension === '.html' || extension === '.htm') return 'HTML'
  if (extension === '.txt') return 'TEXT'
  if (extension === '.xml' && /<\?xml|<toestand|<wetgeving/iu.test(new TextDecoder().decode(bytes.subarray(0, 1024)))) return 'BWB_XML'
  return 'UNSUPPORTED'
}

function estimatePdfPageCount(bytes: Uint8Array) {
  const binary = new TextDecoder('latin1').decode(bytes)
  const count = binary.match(/\/Type\s*\/Page\b/gu)?.length ?? 0
  return count > 0 ? count : null
}

function explicitYear(value: string) {
  const matches = [...value.matchAll(/(?:^|\D)((?:19|20)\d{2})(?!\d)/gu)].map((match) => Number(match[1]))
  return matches.length === 1 ? matches[0] : null
}

function explicitVersion(value: string) {
  const match = value.match(/(?:versie|version|vs|v)[-_ ]?(\d+(?:[._-]\d+){0,2})/iu)
  return match ? match[1].replaceAll('_', '.').replaceAll('-', '.') : null
}

function documentRole(value: string): KnowledgeDocumentFamilyRole | null {
  if (/achtergrond|evidence|onderbouwing/iu.test(value)) return 'BACKGROUND_EVIDENCE'
  if (/samenvatting|infographic|summary/iu.test(value)) return 'SUMMARY'
  if (/checklist|vragenlijst/iu.test(value)) return 'CHECKLIST'
  if (/bijlage|appendix/iu.test(value)) return 'APPENDIX'
  if (/tool|instrument|rekentool/iu.test(value)) return 'TOOL'
  if (/richtlijn|leidraad|handreiking|arbocatalogus|pgs[-_ ]?\d/iu.test(value)) return 'PRIMARY_GUIDELINE'
  return null
}

function familyStem(value: string) {
  return normalizeTitle(value).toLocaleLowerCase('nl-NL')
    .replace(/\b(?:achtergronddocument|achtergrond|samenvatting|infographic|checklist|bijlage|appendix|tool|instrument|richtlijn|leidraad|handreiking|def|definitief|final)\b/giu, ' ')
    .replace(/\b(?:19|20)\d{2}\b/gu, ' ')
    .replace(/\b(?:v|versie|version)\s*\d+(?:[.\-_]\d+)*\b/giu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
}

function inferDocumentType(value: string) {
  const types = ['richtlijn', 'achtergronddocument', 'arbocatalogus', 'handreiking', 'factsheet', 'rapport', 'checklist', 'samenvatting', 'infographic', 'werkinstructie', 'beleidsregel']
  return types.find((candidate) => value.toLocaleLowerCase('nl-NL').includes(candidate))?.toUpperCase() ?? null
}

function inferTopics(value: string) {
  const topics: Array<[RegExp, string]> = [
    [/bhv|bedrijfshulp/iu, 'BHV'], [/beeldscherm|zitten|thuiswerk/iu, 'BEELDSCHERMWERK'],
    [/fysiek|lichamelijk|tillen|ergonom/iu, 'FYSIEKE_BELASTING'], [/psych|psa|stress|agressie/iu, 'PSA'],
    [/ongeval|incident/iu, 'ARBEIDSONGEVALLEN'], [/gevaarlijke stoffen|pgs/iu, 'GEVAARLIJKE_STOFFEN'],
    [/ri.?e/iu, 'RIE'], [/zwanger|overgang|gezondheid/iu, 'GEZONDHEID_EN_WERK'],
  ]
  return topics.filter(([pattern]) => pattern.test(value)).map(([, topic]) => topic)
}

async function listFiles(rootPath: string) {
  const byFolder: string[][] = []
  for (const folder of supportedFolders) {
    const found: string[] = []
    const start = path.join(rootPath, folder)
    try {
      const visit = async (directory: string): Promise<void> => {
        const entries = await readdir(directory, { withFileTypes: true })
        for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, 'nl'))) {
          const target = path.join(directory, entry.name)
          if (entry.isDirectory()) await visit(target)
          else if (entry.isFile()) found.push(target)
        }
      }
      await visit(start)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    byFolder.push(found)
  }
  const interleaved: string[] = []
  for (let index = 0; byFolder.some((files) => index < files.length); index += 1) {
    for (const files of byFolder) if (files[index]) interleaved.push(files[index])
  }
  return interleaved
}

async function extractForInventory(format: KnowledgeLibraryFileReport['format'], bytes: Uint8Array): Promise<FullSourceExtraction | null> {
  if (format === 'PDF') return extractPdfFullSource(bytes)
  const text = new TextDecoder().decode(bytes)
  if (format === 'HTML') return extractHtmlFullSource(text)
  if (format === 'TEXT') return extractStructuredTextFullSource([{ paragraphs: text.split(/\r?\n\r?\n/gu) }])
  return null // BWB-XML requires the existing explicit BWB adapter and canonical identity metadata.
}

export async function inventoryKnowledgeLibrary(rootPath: string, options: KnowledgeLibraryBatchOptions = {}): Promise<KnowledgeLibraryBatchReport> {
  const limit = options.limit ?? KNOWLEDGE_LIBRARY_MAX_BATCH_SIZE
  if (limit < 1 || limit > KNOWLEDGE_LIBRARY_MAX_BATCH_SIZE) throw new Error('KNOWLEDGE_LIBRARY_BATCH_LIMIT_INVALID')
  const extractionLimit = options.fullExtractionLimit ?? 0
  if (extractionLimit < 0 || extractionLimit > KNOWLEDGE_LIBRARY_FULL_EXTRACTION_LIMIT) throw new Error('KNOWLEDGE_LIBRARY_EXTRACTION_LIMIT_INVALID')
  const overrides = new Map((options.metadataOverrides ?? []).map((entry) => [normalizePath(entry.relativePath), entry]))
  const candidates = (await listFiles(rootPath)).slice(0, limit)
  const files: KnowledgeLibraryFileReport[] = []

  for (const [index, filePath] of candidates.entries()) {
    const relativePath = normalizePath(path.relative(rootPath, filePath))
    const folder = relativePath.split('/')[0] as KnowledgeLibraryFolder
    const config = familyConfiguration[folder]
    const override = overrides.get(relativePath)
    let bytes: Uint8Array
    let fileStat: Awaited<ReturnType<typeof stat>>
    try { bytes = await readFile(filePath); fileStat = await stat(filePath) } catch {
      files.push({ relativePath, status: 'EXTRACTION_UNSUPPORTED', reasons: ['FILE_READ_FAILED'], checksum: null, bytes: 0, format: 'UNSUPPORTED', canonicalFamily: config.canonicalFamily, publisher: config.publisher, title: normalizeTitle(filePath), documentType: null, topics: [], versionLabel: null, publicationYear: null, jurisdiction: config.jurisdiction, scopeCode: null, canonicalUrl: null, canonicalIdentity: null, sourceCode: null, authorityStatus: null, temporalStatus: null, applicabilityScope: null, scopeEffect: null, pageCount: null, estimatedBlocks: null, extractionFingerprint: null, documentFamily: null })
      continue
    }
    const checksum = sha256(bytes)
    const format = formatOf(filePath, bytes)
    const title = override?.title ?? normalizeTitle(filePath)
    const role = override?.familyRole ?? documentRole(title)
    const stem = familyStem(title)
    const reasons: string[] = []
    let pageCount: number | null = null
    let estimatedBlocks: number | null = null
    let extractionFingerprint: string | null = null

    if (format === 'PDF') {
      pageCount = estimatePdfPageCount(bytes)
      if (pageCount === null && index >= extractionLimit) reasons.push('PAGE_COUNT_REVIEW_REQUIRED')
    }
    if (index < extractionLimit && format !== 'BWB_XML' && format !== 'UNSUPPORTED') {
      try {
        const extraction = await extractForInventory(format, bytes)
        extractionFingerprint = extraction?.extractionFingerprint ?? null
        estimatedBlocks = extraction?.pages.reduce((total, page) => total + page.blocks.length, 0) ?? null
        pageCount ??= extraction?.pageCount ?? null
      } catch { reasons.push('EXTRACTION_FAILED') }
    } else if (pageCount !== null) estimatedBlocks = pageCount * 25

    const publicationYear = override?.publicationYear ?? explicitYear(title)
    const versionLabel = override?.versionLabel ?? explicitVersion(title)
    const jurisdiction = override?.jurisdiction ?? config.jurisdiction
    const scopeCode = override?.scopeCode ?? null
    const canonicalIdentity = override?.canonicalIdentity ?? (folder === 'legislation' ? title.match(/BWBR\d+/iu)?.[0]?.toUpperCase() ?? null : null)
    const canonicalUrl = override?.canonicalUrl ?? null
    const sourceCode = override?.sourceCode ?? null
    const authorityStatus = override?.authorityStatus ?? null
    const temporalStatus = override?.temporalStatus ?? null
    const applicabilityScope = override?.applicabilityScope ?? null
    const scopeEffect = override?.scopeEffect ?? null
    const publisher = override?.publisher ?? config.publisher
    const familyCode = override?.familyCode ?? (role && stem.length >= 8 ? `${config.canonicalFamily}-${stem}`.slice(0, 160) : null)

    if (format === 'UNSUPPORTED') reasons.push('EXTRACTION_UNSUPPORTED')
    if (!publisher) reasons.push('PUBLISHER_REVIEW_REQUIRED')
    if (!override) reasons.push('CANONICAL_METADATA_REVIEW_REQUIRED')
    else if (override.checksum !== checksum) reasons.push('METADATA_CHECKSUM_MISMATCH')
    if (override) {
      let controlledUrl = false
      try { controlledUrl = new URL(override.canonicalUrl).protocol === 'https:' } catch { controlledUrl = false }
      if (!override.title.trim() || !override.publisher.trim() || (!override.versionLabel?.trim() && override.publicationYear === undefined) || !controlledUrl || !allowedTemporalStatuses.has(override.temporalStatus)) reasons.push('CONTROLLED_METADATA_INCOMPLETE')
    }
    if (!canonicalIdentity || !canonicalUrl || !sourceCode || !authorityStatus) reasons.push('SOURCE_IDENTITY_UNCERTAIN')
    if (!jurisdiction || !applicabilityScope || !scopeCode || !scopeEffect) reasons.push('SOURCE_SCOPE_REQUIRED')
    if (folder === 'pgs' && !(jurisdiction === 'NL' && scopeCode === 'SEVESO' && scopeEffect === 'CONDITIONAL')) reasons.push('PGS_SCOPE_INVALID')
    if (!publicationYear && !versionLabel) reasons.push('VERSION_METADATA_REVIEW_REQUIRED')
    if (format === 'BWB_XML' && !canonicalIdentity) reasons.push('BWB_ID_REQUIRED')

    files.push({
      relativePath, status: 'READY', reasons, checksum, bytes: fileStat.size, format,
      canonicalFamily: config.canonicalFamily, publisher, title, documentType: inferDocumentType(title), topics: inferTopics(title),
      versionLabel, publicationYear, jurisdiction, scopeCode, canonicalUrl, canonicalIdentity, sourceCode, authorityStatus, temporalStatus, applicabilityScope, scopeEffect, pageCount, estimatedBlocks, extractionFingerprint,
      documentFamily: familyCode && role ? { code: familyCode, role } : null,
    })
  }

  const byChecksum = new Map<string, KnowledgeLibraryFileReport[]>()
  const byIdentityVersion = new Map<string, KnowledgeLibraryFileReport[]>()
  for (const file of files) {
    if (file.checksum) byChecksum.set(file.checksum, [...(byChecksum.get(file.checksum) ?? []), file])
    const identity = `${file.canonicalFamily}|${file.canonicalIdentity ?? familyStem(file.title)}|${file.versionLabel ?? file.publicationYear ?? 'unknown'}`
    byIdentityVersion.set(identity, [...(byIdentityVersion.get(identity) ?? []), file])
  }
  for (const file of files) {
    if (file.checksum && (byChecksum.get(file.checksum)?.length ?? 0) > 1) {
      file.status = 'POSSIBLE_DUPLICATE'; file.reasons.push('IDENTICAL_CHECKSUM_IN_BATCH'); continue
    }
    const identity = `${file.canonicalFamily}|${file.canonicalIdentity ?? familyStem(file.title)}|${file.versionLabel ?? file.publicationYear ?? 'unknown'}`
    if ((byIdentityVersion.get(identity)?.length ?? 0) > 1) {
      file.status = 'VERSION_CONFLICT'; file.reasons.push('SAME_IDENTITY_VERSION_DIFFERENT_CONTENT'); continue
    }
    if (file.format === 'UNSUPPORTED' || file.reasons.includes('EXTRACTION_FAILED') || file.reasons.includes('PDF_PARSE_FAILED')) file.status = 'EXTRACTION_UNSUPPORTED'
    else if (file.reasons.includes('SOURCE_IDENTITY_UNCERTAIN') || file.reasons.includes('PGS_SCOPE_INVALID') || file.reasons.includes('BWB_ID_REQUIRED') || file.reasons.includes('METADATA_CHECKSUM_MISMATCH') || file.reasons.includes('CONTROLLED_METADATA_INCOMPLETE')) file.status = 'SOURCE_IDENTITY_UNCERTAIN'
    else if (file.reasons.length > 0) file.status = 'NEEDS_METADATA_REVIEW'
  }

  const familyCounts = new Map<string, number>()
  for (const file of files) if (file.documentFamily) familyCounts.set(file.documentFamily.code, (familyCounts.get(file.documentFamily.code) ?? 0) + 1)
  return {
    generatedAt: new Date().toISOString(), rootPath: path.resolve(rootPath), totalFiles: files.length,
    ready: files.filter((file) => file.status === 'READY').length,
    needsMetadataReview: files.filter((file) => file.status === 'NEEDS_METADATA_REVIEW').length,
    possibleDuplicates: files.filter((file) => file.status === 'POSSIBLE_DUPLICATE').length,
    versionConflicts: files.filter((file) => file.status === 'VERSION_CONFLICT').length,
    extractionUnsupported: files.filter((file) => file.status === 'EXTRACTION_UNSUPPORTED').length,
    unknownFamilies: files.filter((file) => file.status === 'SOURCE_IDENTITY_UNCERTAIN').length,
    estimatedPages: files.reduce((total, file) => total + (file.pageCount ?? 0), 0),
    estimatedBlocks: files.reduce((total, file) => total + (file.estimatedBlocks ?? 0), 0),
    potentialDocumentFamilies: [...familyCounts.values()].filter((count) => count > 1).length,
    files,
  }
}

export function formatKnowledgeLibraryReport(report: KnowledgeLibraryBatchReport) {
  const lines = [
    `# Knowledge Library batch (${report.totalFiles} bestanden)`, '',
    `READY: ${report.ready}; metadatareview: ${report.needsMetadataReview}; duplicaten: ${report.possibleDuplicates}; versieconflicten: ${report.versionConflicts}; extractiefouten: ${report.extractionUnsupported}; onzekere identiteit: ${report.unknownFamilies}.`, '',
    '| bestand | familie | status | pagina\'s | blokken (schatting) | documentfamilie | redenen |',
    '|---|---|---|---:|---:|---|---|',
    ...report.files.map((file) => `| ${file.relativePath} | ${file.canonicalFamily} | ${file.status} | ${file.pageCount ?? '-'} | ${file.estimatedBlocks ?? '-'} | ${file.documentFamily ? `${file.documentFamily.code} (${file.documentFamily.role})` : '-'} | ${file.reasons.join(', ') || '-'} |`),
  ]
  return lines.join('\n')
}
