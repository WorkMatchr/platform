import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const sourceCodeSchema = z.string().regex(/^[A-Z0-9][A-Z0-9._:-]{1,79}$/)
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/)
const sourceTypeSchema = z.enum([
  'AI_SHEET',
  'LEGISLATION',
  'REGULATION',
  'INSPECTORATE_GUIDANCE',
  'ARBOCATALOGUE',
  'STANDARD',
  'RESEARCH',
  'PROFESSIONAL_GUIDANCE',
  'INTERNAL_EXPERTISE',
  'CASE_LAW',
  'OTHER',
])

export type SupportedKnowledgeSourceKind =
  | 'AI_SHEET'
  | 'ARBO_WET'
  | 'ARBO_DECREE'
  | 'ARBO_REGULATION'
  | 'ARBOCATALOGUE'
  | 'POLICY_RULE'
  | 'LABOUR_INSPECTORATE_PUBLICATION'
  | 'TNO_PUBLICATION'
  | 'JURISPRUDENCE'
  | 'KNOWLEDGE'
  | 'STANDARD'
  | 'RIVM_PUBLICATION'
  | 'SER_PUBLICATION'
  | 'LEGISLATION'

const sourceKindSchema = z.enum([
  'AI_SHEET',
  'ARBO_WET',
  'ARBO_DECREE',
  'ARBO_REGULATION',
  'ARBOCATALOGUE',
  'POLICY_RULE',
  'LABOUR_INSPECTORATE_PUBLICATION',
  'TNO_PUBLICATION',
  'JURISPRUDENCE',
  'KNOWLEDGE',
  'STANDARD',
  'RIVM_PUBLICATION',
  'SER_PUBLICATION',
  'LEGISLATION',
])

function isSafeRelativePath(value: string) {
  const normalized = value.replaceAll('\\', '/')
  return (
    normalized.length > 0 &&
    !path.isAbsolute(value) &&
    !/^[A-Za-z]:/.test(value) &&
    !normalized.split('/').includes('..')
  )
}

const manifestSourceSchema = z
  .object({
    code: sourceCodeSchema,
    sourceKind: sourceKindSchema.optional(),
    sourceType: sourceTypeSchema.optional(),
    format: z.enum(['PDF', 'LEGACY_DOC']),
    logicalPath: z.string().min(1).max(180).refine(isSafeRelativePath, 'Alleen een relatief bronpad binnen de bronmap is toegestaan.').optional(),
    fileName: z.string().min(1).max(255).refine((value) => path.basename(value) === value, 'Alleen een bestandsnaam zonder pad is toegestaan.').optional(),
    sha256: sha256Schema,
  })
  .strict()
  .superRefine((source, context) => {
    if (!source.logicalPath && !source.fileName) {
      context.addIssue({ code: 'custom', path: ['logicalPath'], message: 'Een logisch bronpad is verplicht.' })
    }
    if (source.logicalPath && source.fileName) {
      context.addIssue({ code: 'custom', path: ['logicalPath'], message: 'Gebruik logicalPath of de legacy fileName, niet beide.' })
    }
    if (source.sourceKind && source.sourceType && mapSourceKindToType(source.sourceKind) !== source.sourceType) {
      context.addIssue({ code: 'custom', path: ['sourceType'], message: 'Bronsoort en databasebrontype spreken elkaar tegen.' })
    }
  })

export const knowledgeSourceManifestSchema = z
  .object({
    schemaVersion: z.enum(['1.0', '2.0']),
    sources: z.array(manifestSourceSchema).min(1).max(500),
  })
  .strict()
  .superRefine((manifest, context) => {
    const codes = new Set<string>()
    const paths = new Set<string>()
    for (const [index, source] of manifest.sources.entries()) {
      if (manifest.schemaVersion === '2.0' && (!source.sourceKind || !source.sourceType || !source.logicalPath)) {
        context.addIssue({ code: 'custom', path: ['sources', index], message: 'Manifest v2 vereist sourceKind, sourceType en logicalPath.' })
      }
      if (codes.has(source.code)) context.addIssue({ code: 'custom', path: ['sources', index, 'code'], message: 'Een broncode mag maar één keer voorkomen.' })
      const logicalPath = getManifestLogicalPath(source).toLocaleLowerCase('nl-NL')
      if (paths.has(logicalPath)) context.addIssue({ code: 'custom', path: ['sources', index, 'logicalPath'], message: 'Een bronbestand mag maar één keer voorkomen.' })
      codes.add(source.code)
      paths.add(logicalPath)
    }
  })

export type KnowledgeSourceManifest = z.infer<typeof knowledgeSourceManifestSchema>
export type KnowledgeManifestSource = KnowledgeSourceManifest['sources'][number]

export class KnowledgeSourceManifestError extends Error {
  constructor(
    public readonly code: 'CONFIGURATION_INVALID' | 'SOURCE_MISSING' | 'SOURCE_INVALID' | 'CHECKSUM_MISMATCH',
    message: string,
  ) {
    super(message)
    this.name = 'KnowledgeSourceManifestError'
  }
}

export function mapSourceKindToType(kind: SupportedKnowledgeSourceKind) {
  const mapping = {
    AI_SHEET: 'AI_SHEET',
    ARBO_WET: 'LEGISLATION',
    ARBO_DECREE: 'REGULATION',
    ARBO_REGULATION: 'REGULATION',
    ARBOCATALOGUE: 'ARBOCATALOGUE',
    POLICY_RULE: 'REGULATION',
    LABOUR_INSPECTORATE_PUBLICATION: 'INSPECTORATE_GUIDANCE',
    TNO_PUBLICATION: 'RESEARCH',
    JURISPRUDENCE: 'CASE_LAW',
    KNOWLEDGE: 'OTHER',
    STANDARD: 'STANDARD',
    RIVM_PUBLICATION: 'RESEARCH',
    SER_PUBLICATION: 'PROFESSIONAL_GUIDANCE',
    LEGISLATION: 'LEGISLATION',
  } as const
  return mapping[kind]
}

export function detectKnowledgeSourceKind(logicalPath: string): SupportedKnowledgeSourceKind | null {
  const value = logicalPath
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('\\', '/')
    .toLocaleLowerCase('nl-NL')
  const segments = value.split('/').filter(Boolean)
  const [category, legislationFamily] = segments

  // Een expliciete AI-broncode blijft leidend, ook voor de bestaande PoC-map
  // local-sources/knowledge.
  if (/(^|[/\\(\s_-])ai[-_ ]*0*\d+/.test(value)) return 'AI_SHEET'
  if (category === 'ai-bladen') return 'AI_SHEET'
  if (category === 'arbocatalogi') return 'ARBOCATALOGUE'
  if (category === 'beleidsregels') return 'POLICY_RULE'
  if (category === 'inspectie') return 'LABOUR_INSPECTORATE_PUBLICATION'
  if (category === 'jurisprudentie') return 'JURISPRUDENCE'
  if (category === 'knowledge') return 'KNOWLEDGE'
  if (category === 'normen') return 'STANDARD'
  if (category === 'rivm') return 'RIVM_PUBLICATION'
  if (category === 'ser') return 'SER_PUBLICATION'
  if (category === 'tno') return 'TNO_PUBLICATION'
  if (category === 'legislation') {
    if (legislationFamily === 'arbowet') return 'ARBO_WET'
    if (legislationFamily === 'arbobesluit') return 'ARBO_DECREE'
    if (legislationFamily === 'arboregeling') return 'ARBO_REGULATION'
    return 'LEGISLATION'
  }

  // Compatibiliteit voor bestaande manifesten die het brontype in de
  // bestandsnaam vastleggen en nog niet naar de mappenstructuur zijn verplaatst.
  if (/arbocatalog/.test(value)) return 'ARBOCATALOGUE'
  if (/arbobesluit/.test(value)) return 'ARBO_DECREE'
  if (/arboregeling/.test(value)) return 'ARBO_REGULATION'
  if (/arbowet|arbeidsomstandighedenwet/.test(value)) return 'ARBO_WET'
  if (/beleidsregel/.test(value)) return 'POLICY_RULE'
  if (/nederlandse[-_ ]arbeidsinspectie|inspectie[-_ ]szw|arbeidsinspectie/.test(value)) return 'LABOUR_INSPECTORATE_PUBLICATION'
  if (/(^|[/\\(\s_-])tno([/\\)\s_.-]|$)/.test(value)) return 'TNO_PUBLICATION'
  return null
}

export function getManifestLogicalPath(source: Pick<KnowledgeManifestSource, 'logicalPath' | 'fileName'>) {
  return (source.logicalPath ?? source.fileName)!.replaceAll('\\', '/')
}

export function resolveManifestSourceKind(
  source: Pick<KnowledgeManifestSource, 'code' | 'sourceKind' | 'logicalPath' | 'fileName'>,
) {
  const detectedKind = detectKnowledgeSourceKind(getManifestLogicalPath(source))
  if (!detectedKind) {
    throw new KnowledgeSourceManifestError(
      'SOURCE_INVALID',
      `Het logische bronpad voor ${source.code} hoort niet bij een ondersteunde bronmap.`,
    )
  }
  if (source.sourceKind && source.sourceKind !== detectedKind) {
    throw new KnowledgeSourceManifestError(
      'SOURCE_INVALID',
      `De vastgelegde bronsoort voor ${source.code} spreekt het logische bronpad tegen.`,
    )
  }
  return detectedKind
}

function configuredPath(value: string | undefined, fallback: string) {
  return path.resolve(process.cwd(), value?.trim() || fallback)
}

export function getKnowledgeSourceConfiguration() {
  return {
    rootPath: configuredPath(process.env.KNOWLEDGE_SOURCE_ROOT, 'local-sources'),
    manifestPath: configuredPath(process.env.KNOWLEDGE_SOURCE_MANIFEST, 'local-sources/knowledge/knowledge-sources.local.json'),
  }
}

export async function loadKnowledgeSourceManifest() {
  const { manifestPath } = getKnowledgeSourceConfiguration()
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'))
    return knowledgeSourceManifestSchema.parse(parsed)
  } catch {
    throw new KnowledgeSourceManifestError('CONFIGURATION_INVALID', 'Het lokale kennisbronmanifest ontbreekt of is ongeldig.')
  }
}

function resolveSourcePath(rootPath: string, logicalPath: string) {
  const filePath = path.resolve(rootPath, logicalPath)
  const relative = path.relative(rootPath, filePath)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new KnowledgeSourceManifestError('SOURCE_INVALID', 'De bronverwijzing valt buiten de geconfigureerde bronmap.')
  }
  return filePath
}

export async function verifyManifestSource(source: KnowledgeManifestSource) {
  const { rootPath } = getKnowledgeSourceConfiguration()
  const effectiveRootPath = source.fileName && !process.env.KNOWLEDGE_SOURCE_ROOT
    ? configuredPath(undefined, 'local-sources/knowledge')
    : rootPath
  const logicalPath = getManifestLogicalPath(source)
  const detectedKind = resolveManifestSourceKind(source)
  const filePath = resolveSourcePath(effectiveRootPath, logicalPath)
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not-file')
  } catch {
    throw new KnowledgeSourceManifestError('SOURCE_MISSING', `De lokale bron voor ${source.code} ontbreekt.`)
  }
  if (source.format !== 'PDF') {
    return { code: source.code, sourceKind: source.sourceKind ?? detectedKind, format: source.format, logicalPath, extractionStatus: 'UNSUPPORTED_FOR_EXTRACTION' as const }
  }
  const bytes = await readFile(filePath)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new KnowledgeSourceManifestError('SOURCE_INVALID', `De lokale bron voor ${source.code} is geen geldig PDF-bestand.`)
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) throw new KnowledgeSourceManifestError('CHECKSUM_MISMATCH', `De lokale bron voor ${source.code} komt niet overeen met het manifest.`)
  return { code: source.code, sourceKind: source.sourceKind ?? detectedKind, format: source.format, logicalPath, filePath, extractionStatus: 'READY' as const, checksum: source.sha256 }
}

async function listFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const entryPath = path.join(currentPath, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(rootPath, entryPath)))
    if (entry.isFile()) files.push(path.relative(rootPath, entryPath).replaceAll('\\', '/'))
  }
  return files
}

export async function inventoryKnowledgeSourceDirectory() {
  const { rootPath } = getKnowledgeSourceConfiguration()
  const files = await listFiles(rootPath)
  const recognized = files.flatMap((logicalPath) => {
    const extension = path.extname(logicalPath).toLocaleLowerCase('nl-NL')
    if (!['.pdf', '.doc'].includes(extension)) return []
    const aiMatch = /(?:^|\()AI[-_ ]*0*(\d+)(?:\)|\s|[-_])/i.exec(path.basename(logicalPath))
    return [{ logicalPath, extension, sourceKind: detectKnowledgeSourceKind(logicalPath), aiNumber: aiMatch ? Number(aiMatch[1]) : null }]
  })
  const aiGroups = Map.groupBy(recognized.filter((entry) => entry.aiNumber !== null), (entry) => entry.aiNumber!)
  return {
    pdfCount: recognized.filter((entry) => entry.extension === '.pdf').length,
    legacyDocCount: recognized.filter((entry) => entry.extension === '.doc').length,
    sources: recognized,
    detectedSourceNumbers: [...aiGroups.keys()].sort((left, right) => left - right),
    duplicateNumbers: [...aiGroups.entries()].filter(([, group]) => group.length > 1).map(([number, group]) => ({ number, files: group.map((entry) => entry.logicalPath).sort(), multipleFormats: new Set(group.map((entry) => entry.extension)).size > 1 })),
  }
}
