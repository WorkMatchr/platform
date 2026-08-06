import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const sourceCodeSchema = z.string().regex(/^AI-\d{2,3}$/)
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/)

export const knowledgeSourceManifestSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    sources: z
      .array(
        z
          .object({
            code: sourceCodeSchema,
            format: z.enum(['PDF', 'LEGACY_DOC']),
            fileName: z
              .string()
              .min(1)
              .max(255)
              .refine(
                (value) => path.basename(value) === value,
                'Alleen een bestandsnaam zonder pad is toegestaan.',
              ),
            sha256: sha256Schema,
          })
          .strict(),
      )
      .min(1)
      .max(250),
  })
  .strict()
  .superRefine((manifest, context) => {
    const codes = new Set<string>()
    const files = new Set<string>()
    for (const [index, source] of manifest.sources.entries()) {
      if (codes.has(source.code)) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'code'],
          message: 'Een broncode mag maar één keer voorkomen.',
        })
      }
      const normalizedFile = source.fileName.toLocaleLowerCase('nl-NL')
      if (files.has(normalizedFile)) {
        context.addIssue({
          code: 'custom',
          path: ['sources', index, 'fileName'],
          message: 'Een bronbestand mag maar één keer voorkomen.',
        })
      }
      codes.add(source.code)
      files.add(normalizedFile)
    }
  })

export type KnowledgeSourceManifest = z.infer<
  typeof knowledgeSourceManifestSchema
>

export class KnowledgeSourceManifestError extends Error {
  constructor(
    public readonly code:
      | 'CONFIGURATION_INVALID'
      | 'SOURCE_MISSING'
      | 'SOURCE_INVALID'
      | 'CHECKSUM_MISMATCH',
    message: string,
  ) {
    super(message)
    this.name = 'KnowledgeSourceManifestError'
  }
}

function configuredPath(value: string | undefined, fallback: string) {
  return path.resolve(process.cwd(), value?.trim() || fallback)
}

export function getKnowledgeSourceConfiguration() {
  return {
    rootPath: configuredPath(
      process.env.KNOWLEDGE_SOURCE_ROOT,
      'local-sources/knowledge',
    ),
    manifestPath: configuredPath(
      process.env.KNOWLEDGE_SOURCE_MANIFEST,
      'local-sources/knowledge/knowledge-sources.local.json',
    ),
  }
}

export async function loadKnowledgeSourceManifest() {
  const { manifestPath } = getKnowledgeSourceConfiguration()
  try {
    const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'))
    return knowledgeSourceManifestSchema.parse(parsed)
  } catch {
    throw new KnowledgeSourceManifestError(
      'CONFIGURATION_INVALID',
      'Het lokale kennisbronmanifest ontbreekt of is ongeldig.',
    )
  }
}

export async function verifyManifestSource(
  source: KnowledgeSourceManifest['sources'][number],
) {
  const { rootPath } = getKnowledgeSourceConfiguration()
  const filePath = path.resolve(rootPath, source.fileName)
  if (path.dirname(filePath) !== rootPath) {
    throw new KnowledgeSourceManifestError(
      'SOURCE_INVALID',
      'De bronverwijzing valt buiten de geconfigureerde bronmap.',
    )
  }
  try {
    if (!(await stat(filePath)).isFile()) throw new Error('not-file')
  } catch {
    throw new KnowledgeSourceManifestError(
      'SOURCE_MISSING',
      `De lokale bron voor ${source.code} ontbreekt.`,
    )
  }
  if (source.format !== 'PDF') {
    return {
      code: source.code,
      format: source.format,
      extractionStatus: 'UNSUPPORTED_FOR_EXTRACTION' as const,
    }
  }
  const bytes = await readFile(filePath)
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new KnowledgeSourceManifestError(
      'SOURCE_INVALID',
      `De lokale bron voor ${source.code} is geen geldig PDF-bestand.`,
    )
  }
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) {
    throw new KnowledgeSourceManifestError(
      'CHECKSUM_MISMATCH',
      `De lokale bron voor ${source.code} komt niet overeen met het manifest.`,
    )
  }
  return {
    code: source.code,
    format: source.format,
    extractionStatus: 'READY' as const,
    checksum: source.sha256,
  }
}

export async function inventoryKnowledgeSourceDirectory() {
  const { rootPath } = getKnowledgeSourceConfiguration()
  const entries = await readdir(rootPath, { withFileTypes: true })
  const recognized = entries.flatMap((entry) => {
    if (!entry.isFile()) return []
    const match = /(?:^|\()AI[-_ ]*0*(\d+)(?:\)|\s|[-_])/i.exec(entry.name)
    const extension = path.extname(entry.name).toLocaleLowerCase('nl-NL')
    if (!match || !['.pdf', '.doc'].includes(extension)) return []
    return [{ number: Number(match[1]), extension, fileName: entry.name }]
  })
  const groups = Map.groupBy(recognized, (entry) => entry.number)
  return {
    pdfCount: recognized.filter((entry) => entry.extension === '.pdf').length,
    legacyDocCount: recognized.filter((entry) => entry.extension === '.doc').length,
    detectedSourceNumbers: [...groups.keys()].sort((left, right) => left - right),
    duplicateNumbers: [...groups.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([number, group]) => ({
        number,
        files: group.map((entry) => entry.fileName).sort(),
        multipleFormats:
          new Set(group.map((entry) => entry.extension)).size > 1,
      })),
  }
}
