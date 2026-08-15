import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { fingerprintKnowledgeImportPackage } from './knowledge-import-fingerprint'
import { KNOWLEDGE_IMPORT_MAX_BYTES, type KnowledgeImportPackage } from './knowledge-import-schema'
import { previewKnowledgeImport } from './knowledge-import-service'
import { validateKnowledgeImport } from './knowledge-import-validation'
import {
  getKnowledgeSourceConfiguration,
  getManifestLogicalPath,
  loadKnowledgeSourceManifest,
  verifyManifestSource,
  type KnowledgeManifestSource,
} from './knowledge-source-manifest'

const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
type RiskLevel = (typeof riskLevels)[number]

const normativeClaimTypes = new Set([
  'LEGAL_REQUIREMENT',
  'PROHIBITION',
  'THRESHOLD',
  'MEASUREMENT_REQUIREMENT',
  'RECORD_RETENTION',
  'TRAINING_REQUIREMENT',
  'PPE_REQUIREMENT',
  'EMERGENCY_REQUIREMENT',
])

const preflightBlockingContentCodes = new Set(['PASSAGE_REVIEW_REQUIRED', 'OVERLAPPING_CLAIM'])

function isPreflightBlocking(entry: KnowledgeBatchException) {
  return entry.kind === 'TECHNICAL' || preflightBlockingContentCodes.has(entry.code)
}

export type KnowledgeBatchException = {
  code: string
  sourceCode: string
  claimKey?: string
  kind: 'TECHNICAL' | 'CONTENT_REVIEW'
  message: string
}

export type KnowledgeBatchSourceReport = {
  sourceCode: string
  packageFile: string
  schemaVersion: string | null
  pageCount: number | null
  fingerprint: string | null
  claimCount: number
  risks: Record<RiskLevel, number>
  technicalStatus: 'READY' | 'BLOCKED'
  readyForPreflight: boolean
  preview: Awaited<ReturnType<typeof previewKnowledgeImport>> | null
  exceptions: KnowledgeBatchException[]
}

export type KnowledgeBatchReport = {
  generatedAt: string
  sourceCount: number
  readyCount: number
  blockedCount: number
  sources: KnowledgeBatchSourceReport[]
  exceptions: KnowledgeBatchException[]
}

type BatchOptions = {
  preview?: boolean
  previewPackage?: typeof previewKnowledgeImport
}

type RawPackage = {
  schemaVersion?: unknown
  source?: { code?: unknown; temporalStatus?: unknown }
  sourceVersion?: { checksum?: unknown }
  claims?: Array<Record<string, unknown>>
  fragments?: Array<Record<string, unknown>>
  citations?: Array<Record<string, unknown>>
}

function exception(
  sourceCode: string,
  code: string,
  kind: KnowledgeBatchException['kind'],
  message: string,
  claimKey?: string,
): KnowledgeBatchException {
  return { code, sourceCode, claimKey, kind, message }
}

function emptyRisks(): Record<RiskLevel, number> {
  return { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
}

function effectiveRoot(source: KnowledgeManifestSource) {
  const { rootPath } = getKnowledgeSourceConfiguration()
  if (source.fileName && !process.env.KNOWLEDGE_SOURCE_ROOT) return path.resolve('local-sources/knowledge')
  return rootPath
}

async function inspectPdf(source: KnowledgeManifestSource) {
  const filePath = path.resolve(effectiveRoot(source), getManifestLogicalPath(source))
  const bytes = await readFile(filePath)
  const document = await PDFDocument.load(bytes, { updateMetadata: false })
  return { pageCount: document.getPageCount(), sha256: createHash('sha256').update(bytes).digest('hex') }
}

function analyzeClaims(sourceCode: string, raw: RawPackage, data: KnowledgeImportPackage) {
  const exceptions: KnowledgeBatchException[] = []
  const risks = emptyRisks()
  data.claims.forEach((claim, index) => {
    risks[claim.controlRisk] += 1
    const rawClaim = raw.claims?.[index]
    if (raw.schemaVersion !== '1.1' || !rawClaim || !riskLevels.includes(rawClaim.controlRisk as RiskLevel)) {
      exceptions.push(exception(sourceCode, 'EXPLICIT_CONTROL_RISK_REQUIRED', 'TECHNICAL', 'Contract 1.1 vereist een expliciete controlRisk; legacy wordt alleen conservatief als CRITICAL gelezen.', claim.externalKey))
    }
    if (claim.controlRisk === 'HIGH' || claim.controlRisk === 'CRITICAL') {
      exceptions.push(exception(sourceCode, 'ELEVATED_CONTROL_RISK', 'CONTENT_REVIEW', `Claim vereist menselijke beoordeling wegens ${claim.controlRisk}-risico.`, claim.externalKey))
    }
    if (claim.claimType === 'HEALTH_EFFECT') {
      exceptions.push(exception(sourceCode, 'HEALTH_CLAIM_REVIEW_REQUIRED', 'CONTENT_REVIEW', 'Gezondheidsclaim vereist inhoudelijke en actuele kruisbroncontrole.', claim.externalKey))
    }
    if (normativeClaimTypes.has(claim.claimType)) {
      exceptions.push(exception(sourceCode, 'NORMATIVE_CLAIM_REVIEW_REQUIRED', 'CONTENT_REVIEW', 'Juridische of normatieve claim vereist actuele primaire/gezaghebbende kruisbroncontrole.', claim.externalKey))
    }
  })
  return { exceptions, risks }
}

function analyzeEvidence(sourceCode: string, data: KnowledgeImportPackage) {
  const exceptions: KnowledgeBatchException[] = []
  for (const fragment of data.fragments) {
    if (!fragment.pageFrom) exceptions.push(exception(sourceCode, 'PAGE_REQUIRED', 'TECHNICAL', 'Bronfragment mist een paginanummer.', fragment.externalKey))
    if (!fragment.sectionPath) exceptions.push(exception(sourceCode, 'SECTION_REQUIRED', 'TECHNICAL', 'Bronfragment mist een sectiepad.', fragment.externalKey))
    if (!fragment.internalExcerpt || !fragment.excerptHash) {
      exceptions.push(exception(sourceCode, 'TRACEABLE_EXCERPT_REQUIRED', 'TECHNICAL', 'Definitieve verwerking vereist een concrete passage en bijbehorende SHA-256-fragmenthash.', fragment.externalKey))
    }
    if (fragment.extractionMethod !== 'MANUAL_VERIFIED') {
      exceptions.push(exception(sourceCode, 'PASSAGE_REVIEW_REQUIRED', 'CONTENT_REVIEW', 'De passage is nog niet als MANUAL_VERIFIED tegen het bronbestand gecontroleerd.', fragment.externalKey))
    }
  }
  for (const citation of data.citations) {
    if (citation.supportType !== 'DIRECT_SUPPORT') {
      exceptions.push(exception(sourceCode, 'DIRECT_SUPPORT_REQUIRED', 'TECHNICAL', 'Een definitief reference-pakket vereist DIRECT_SUPPORT voor deze bronclaim.', citation.claimKey))
    }
  }
  return exceptions
}

function analyzeStatus(sourceCode: string, data: KnowledgeImportPackage) {
  const exceptions: KnowledgeBatchException[] = []
  if (data.source.temporalStatus !== 'HISTORICAL') exceptions.push(exception(sourceCode, 'HISTORICAL_STATUS_REQUIRED', 'TECHNICAL', 'AI-bladen moeten in deze batch HISTORICAL blijven.'))
  for (const claim of data.claims) {
    if (claim.temporalStatus !== 'HISTORICAL' || claim.publicationStatus !== 'DRAFT' || claim.validationStatus !== 'UNVALIDATED' || claim.accessTier !== 'INTERNAL_REVIEWER') {
      exceptions.push(exception(sourceCode, 'SAFE_STATUS_REQUIRED', 'TECHNICAL', 'Claim moet HISTORICAL, DRAFT, UNVALIDATED en INTERNAL_REVIEWER blijven.', claim.externalKey))
    }
  }
  exceptions.push(exception(sourceCode, 'CURRENT_CROSS_SOURCE_REQUIRED', 'CONTENT_REVIEW', 'Historische bron vereist actuele kruisbronnen voordat claims gevalideerd of gepubliceerd kunnen worden.'))
  return exceptions
}

async function inspectPackage(packageFile: string, options: BatchOptions): Promise<KnowledgeBatchSourceReport> {
  let raw: RawPackage = {}
  let sourceCode = path.basename(packageFile)
  const exceptions: KnowledgeBatchException[] = []
  try {
    if ((await stat(packageFile)).size > KNOWLEDGE_IMPORT_MAX_BYTES) throw new Error('PACKAGE_TOO_LARGE')
    raw = JSON.parse(await readFile(packageFile, 'utf8')) as RawPackage
    if (typeof raw.source?.code === 'string') sourceCode = raw.source.code
  } catch (error) {
    exceptions.push(exception(sourceCode, 'PACKAGE_UNREADABLE', 'TECHNICAL', error instanceof Error ? error.message : 'Pakket kan niet worden gelezen.'))
    return { sourceCode, packageFile, schemaVersion: null, pageCount: null, fingerprint: null, claimCount: 0, risks: emptyRisks(), technicalStatus: 'BLOCKED', readyForPreflight: false, preview: null, exceptions }
  }

  const validation = validateKnowledgeImport(raw)
  if (!validation.valid || !validation.package) {
    exceptions.push(...validation.issues.map((issue) => exception(sourceCode, issue.code, 'TECHNICAL', `${issue.path}: ${issue.message}`)))
    return { sourceCode, packageFile, schemaVersion: typeof raw.schemaVersion === 'string' ? raw.schemaVersion : null, pageCount: null, fingerprint: null, claimCount: Array.isArray(raw.claims) ? raw.claims.length : 0, risks: emptyRisks(), technicalStatus: 'BLOCKED', readyForPreflight: false, preview: null, exceptions }
  }

  const data = validation.package
  const manifest = await loadKnowledgeSourceManifest()
  const manifestSource = manifest.sources.find((entry) => entry.code === data.source.code)
  let pageCount: number | null = null
  if (!manifestSource) {
    exceptions.push(exception(sourceCode, 'SOURCE_NOT_CONFIGURED', 'TECHNICAL', 'Bron ontbreekt in het lokale manifest.'))
  } else {
    if (manifestSource.sha256 !== data.sourceVersion.checksum) exceptions.push(exception(sourceCode, 'PACKAGE_MANIFEST_CHECKSUM_MISMATCH', 'TECHNICAL', 'Pakketchecksum wijkt af van het manifest.'))
    try {
      await verifyManifestSource(manifestSource)
      const pdf = await inspectPdf(manifestSource)
      pageCount = pdf.pageCount
      if (pdf.sha256 !== data.sourceVersion.checksum) exceptions.push(exception(sourceCode, 'PACKAGE_SOURCE_CHECKSUM_MISMATCH', 'TECHNICAL', 'Pakketchecksum wijkt af van het bronbestand.'))
    } catch (error) {
      exceptions.push(exception(sourceCode, 'SOURCE_VERIFICATION_FAILED', 'TECHNICAL', error instanceof Error ? error.message : 'Broncontrole mislukt.'))
    }
  }

  if (raw.schemaVersion !== '1.1') exceptions.push(exception(sourceCode, 'LEGACY_PACKAGE_1_0', 'TECHNICAL', 'Legacy package 1.0 moet eerst als gecontroleerd reference-pakket 1.1 worden voorbereid.'))
  const claimAnalysis = analyzeClaims(sourceCode, raw, data)
  exceptions.push(...claimAnalysis.exceptions, ...analyzeEvidence(sourceCode, data), ...analyzeStatus(sourceCode, data))
  const fingerprint = fingerprintKnowledgeImportPackage(data)
  if (fingerprint !== fingerprintKnowledgeImportPackage(data)) exceptions.push(exception(sourceCode, 'NON_DETERMINISTIC_FINGERPRINT', 'TECHNICAL', 'De inhoudsfingerprint is niet deterministisch.'))

  const technicalStatus = exceptions.some((entry) => entry.kind === 'TECHNICAL') ? 'BLOCKED' : 'READY'
  let preview: KnowledgeBatchSourceReport['preview'] = null
  if (options.preview && technicalStatus === 'READY') {
    try {
      preview = await (options.previewPackage ?? previewKnowledgeImport)(packageFile)
      if (!preview.writable && !preview.idempotentReplay) exceptions.push(exception(sourceCode, 'IMPORT_CONFLICT', 'TECHNICAL', 'Preview bevat een importconflict of afwijkende replay.'))
    } catch (error) {
      exceptions.push(exception(sourceCode, 'PREVIEW_FAILED', 'TECHNICAL', error instanceof Error ? error.message : 'Preview is mislukt.'))
    }
  }

  return {
    sourceCode,
    packageFile,
    schemaVersion: data.schemaVersion,
    pageCount,
    fingerprint,
    claimCount: data.claims.length,
    risks: claimAnalysis.risks,
    technicalStatus: exceptions.some((entry) => entry.kind === 'TECHNICAL') ? 'BLOCKED' : 'READY',
    readyForPreflight: !exceptions.some(isPreflightBlocking),
    preview,
    exceptions,
  }
}

function addDuplicateClaimExceptions(sources: KnowledgeBatchSourceReport[], packages: Map<string, KnowledgeImportPackage>) {
  const statements = new Map<string, Array<{ sourceCode: string; claimKey: string }>>()
  for (const [sourceCode, data] of packages) {
    for (const claim of data.claims) {
      const normalized = (claim.normalizedStatement ?? claim.statement).trim().toLocaleLowerCase('nl-NL')
      statements.set(normalized, [...(statements.get(normalized) ?? []), { sourceCode, claimKey: claim.externalKey }])
    }
  }
  for (const matches of statements.values()) {
    if (matches.length < 2) continue
    for (const match of matches) {
      sources.find((source) => source.sourceCode === match.sourceCode)?.exceptions.push(exception(match.sourceCode, 'OVERLAPPING_CLAIM', 'CONTENT_REVIEW', 'Dezelfde genormaliseerde claim komt in meerdere batchbronnen voor.', match.claimKey))
    }
  }
}

export async function validateKnowledgeImportBatch(packageFiles: string[], options: BatchOptions = {}): Promise<KnowledgeBatchReport> {
  if (packageFiles.length === 0 || packageFiles.length > 10) throw new Error('Een batch bevat minimaal 1 en maximaal 10 bronnen.')
  const sources = await Promise.all(packageFiles.map((file) => inspectPackage(path.resolve(file), options)))
  const packages = new Map<string, KnowledgeImportPackage>()
  for (const source of sources) {
    try {
      const validation = validateKnowledgeImport(JSON.parse(await readFile(source.packageFile, 'utf8')) as unknown)
      if (validation.package) packages.set(source.sourceCode, validation.package)
    } catch { /* De bron heeft al een technische uitzondering. */ }
  }
  addDuplicateClaimExceptions(sources, packages)
  for (const source of sources) source.readyForPreflight = !source.exceptions.some(isPreflightBlocking)
  const exceptions = sources.flatMap((source) => source.exceptions)
  return {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    readyCount: sources.filter((source) => source.readyForPreflight).length,
    blockedCount: sources.filter((source) => !source.readyForPreflight).length,
    sources,
    exceptions,
  }
}

export function formatKnowledgeBatchReportMarkdown(report: KnowledgeBatchReport) {
  const lines = [
    '| bron | claims | LOW | MEDIUM | HIGH | CRITICAL | technische status | inhoudelijke uitzonderingen | klaar voor preflight |',
    '|---|---:|---:|---:|---:|---:|---|---:|---|',
    ...report.sources.map((source) => `| ${source.sourceCode} | ${source.claimCount} | ${source.risks.LOW} | ${source.risks.MEDIUM} | ${source.risks.HIGH} | ${source.risks.CRITICAL} | ${source.technicalStatus} | ${source.exceptions.filter((entry) => entry.kind === 'CONTENT_REVIEW').length} | ${source.readyForPreflight ? 'ja' : 'nee'} |`),
    '',
    '## Uitzonderingen',
    ...report.exceptions.map((entry) => `- ${entry.sourceCode}${entry.claimKey ? ` / ${entry.claimKey}` : ''}: ${entry.code} — ${entry.message}`),
  ]
  return lines.join('\n')
}
