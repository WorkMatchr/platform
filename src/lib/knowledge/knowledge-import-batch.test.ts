import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { afterEach, describe, expect, it } from 'vitest'
import { formatKnowledgeBatchReportMarkdown, validateKnowledgeImportBatch } from './knowledge-import-batch'

const originalRoot = process.env.KNOWLEDGE_SOURCE_ROOT
const originalManifest = process.env.KNOWLEDGE_SOURCE_MANIFEST
const temporaryDirectories: string[] = []

afterEach(async () => {
  process.env.KNOWLEDGE_SOURCE_ROOT = originalRoot
  process.env.KNOWLEDGE_SOURCE_MANIFEST = originalManifest
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function fixture(options: { schemaVersion?: '1.0' | '1.1'; controlRisk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; extractionMethod?: string } = {}) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'knowledge-batch-'))
  temporaryDirectories.push(directory)
  const pdf = await PDFDocument.create()
  pdf.addPage()
  pdf.addPage()
  const pdfBytes = await pdf.save()
  const pdfName = 'AI-03.pdf'
  const pdfPath = path.join(directory, pdfName)
  await writeFile(pdfPath, pdfBytes)
  const checksum = createHash('sha256').update(pdfBytes).digest('hex')
  const excerpt = 'Gecontroleerde korte bronpassage voor de batchvalidatietest.'
  const excerptHash = createHash('sha256').update(excerpt).digest('hex')
  const manifestPath = path.join(directory, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: '1.0', sources: [{ code: 'AI-03', sourceType: 'AI_SHEET', format: 'PDF', fileName: pdfName, sha256: checksum }] }))
  process.env.KNOWLEDGE_SOURCE_ROOT = directory
  process.env.KNOWLEDGE_SOURCE_MANIFEST = manifestPath
  const claim = {
    externalKey: 'ai-03:c1', topicKey: 'ai-03:topic', claimType: 'HEALTH_EFFECT', statement: 'Een toetsbare historische claim.',
    applicability: 'Historische context.', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT',
    confidenceLevel: 'LOW', accessTier: 'INTERNAL_REVIEWER', ...(options.controlRisk ? { controlRisk: options.controlRisk } : {}),
  }
  const packageData = {
    schemaVersion: options.schemaVersion ?? '1.1',
    source: { code: 'AI-03', title: 'Testbron', metadataStatus: 'INCOMPLETE', language: 'nl', jurisdiction: 'NL', sourceType: 'AI_SHEET', sourceFormat: 'PDF', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'TEST', independenceGroup: 'TEST', isPrimarySource: false },
    sourceVersion: { externalKey: 'ai-03:v1', versionLabel: '1', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED' },
    topics: [{ externalKey: 'ai-03:topic', slug: 'ai-03-test', title: 'Test', description: 'Testtopic.', domain: 'OCCUPATIONAL_HEALTH' }],
    fragments: [{ externalKey: 'ai-03:f1', sourceVersionKey: 'ai-03:v1', pageFrom: 1, sectionPath: '1 Test', fragmentType: 'DIRECT_EXCERPT', internalExcerpt: excerpt, excerptHash, extractionMethod: options.extractionMethod ?? 'MANUAL_VERIFIED', requiresReview: true }],
    claims: [claim],
    citations: [{ claimKey: 'ai-03:c1', sourceVersionKey: 'ai-03:v1', fragmentKey: 'ai-03:f1', supportType: 'DIRECT_SUPPORT' }],
    relations: [], rules: [], calculations: [], checklists: [], procedures: [], roles: [], formTemplates: [],
    importMetadata: { createdAt: '2026-08-15T00:00:00.000Z', createdBy: 'TEST', uncertainties: ['Historische bron.'] },
  }
  const packagePath = path.join(directory, 'AI-03.json')
  await writeFile(packagePath, JSON.stringify(packageData))
  return { packagePath }
}

describe('Knowledge import batch', () => {
  it('controleert bron, pagina-aantal, expliciet risico, fingerprint en veilige statussen zonder writepad', async () => {
    const { packagePath } = await fixture({ controlRisk: 'HIGH' })
    const report = await validateKnowledgeImportBatch([packagePath])
    expect(report.sources[0]).toMatchObject({ sourceCode: 'AI-03', pageCount: 2, claimCount: 1, risks: { LOW: 0, MEDIUM: 0, HIGH: 1, CRITICAL: 0 }, technicalStatus: 'READY', readyForPreflight: true })
    expect(report.sources[0].fingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(report.exceptions.map((entry) => entry.code)).toEqual(expect.arrayContaining(['ELEVATED_CONTROL_RISK', 'HEALTH_CLAIM_REVIEW_REQUIRED', 'CURRENT_CROSS_SOURCE_REQUIRED']))
  })

  it('blokkeert legacy 1.0 zonder expliciet risico en behandelt dit conservatief als CRITICAL', async () => {
    const { packagePath } = await fixture({ schemaVersion: '1.0' })
    const report = await validateKnowledgeImportBatch([packagePath])
    expect(report.sources[0]).toMatchObject({ technicalStatus: 'BLOCKED', readyForPreflight: false, risks: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 1 } })
    expect(report.exceptions.map((entry) => entry.code)).toEqual(expect.arrayContaining(['LEGACY_PACKAGE_1_0', 'EXPLICIT_CONTROL_RISK_REQUIRED']))
  })

  it('markeert niet-geverifieerde passages als menselijke blocker', async () => {
    const { packagePath } = await fixture({ controlRisk: 'MEDIUM', extractionMethod: 'MANUAL_POC' })
    const report = await validateKnowledgeImportBatch([packagePath])
    expect(report.sources[0].technicalStatus).toBe('READY')
    expect(report.sources[0].readyForPreflight).toBe(false)
    expect(report.exceptions).toContainEqual(expect.objectContaining({ code: 'PASSAGE_REVIEW_REQUIRED', kind: 'CONTENT_REVIEW' }))
  })

  it('roept alleen voor technisch geldige bronnen de bestaande read-only preview aan', async () => {
    const { packagePath } = await fixture({ controlRisk: 'MEDIUM' })
    let calls = 0
    const report = await validateKnowledgeImportBatch([packagePath], { preview: true, previewPackage: async () => {
      calls += 1
      return { writable: true } as Awaited<ReturnType<typeof import('./knowledge-import-service').previewKnowledgeImport>>
    } })
    expect(calls).toBe(1)
    expect(report.sources[0].preview).toEqual({ writable: true })
  })

  it('herkent een identieke replay en blokkeert een afwijkende replay fail-closed', async () => {
    const first = await fixture({ controlRisk: 'MEDIUM' })
    const identical = await validateKnowledgeImportBatch([first.packagePath], { preview: true, previewPackage: async () => ({
      writable: false,
      idempotentReplay: true,
    }) as Awaited<ReturnType<typeof import('./knowledge-import-service').previewKnowledgeImport>> })
    expect(identical.sources[0].technicalStatus).toBe('READY')
    expect(identical.exceptions.map((entry) => entry.code)).not.toContain('IMPORT_CONFLICT')

    const divergent = await validateKnowledgeImportBatch([first.packagePath], { preview: true, previewPackage: async () => ({
      writable: false,
      idempotentReplay: false,
    }) as Awaited<ReturnType<typeof import('./knowledge-import-service').previewKnowledgeImport>> })
    expect(divergent.sources[0].technicalStatus).toBe('BLOCKED')
    expect(divergent.exceptions).toContainEqual(expect.objectContaining({ code: 'IMPORT_CONFLICT', kind: 'TECHNICAL' }))
  })

  it('levert het vereiste compacte batchoverzicht', async () => {
    const { packagePath } = await fixture({ controlRisk: 'LOW' })
    const markdown = formatKnowledgeBatchReportMarkdown(await validateKnowledgeImportBatch([packagePath]))
    expect(markdown).toContain('| bron | claims | LOW | MEDIUM | HIGH | CRITICAL | technische status | inhoudelijke uitzonderingen | klaar voor preflight |')
    expect(markdown).toContain('| AI-03 | 1 | 1 | 0 | 0 | 0 | READY |')
  })

  it('begrensd batches server-side op maximaal tien bronnen', async () => {
    await expect(validateKnowledgeImportBatch(Array.from({ length: 11 }, (_, index) => `source-${index}.json`))).rejects.toThrow('maximaal 10')
  })
})
