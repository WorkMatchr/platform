import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { afterEach, describe, expect, it } from 'vitest'
import { inventoryKnowledgeLibrary, parseKnowledgeLibraryMetadataManifest } from './knowledge-library-batch'

const roots: string[] = []
async function root() {
  const value = await mkdtemp(path.join(tmpdir(), 'knowledge-library-'))
  roots.push(value)
  for (const folder of ['arbocatalogi', 'ser', 'tno', 'rivm', 'nvab', 'pgs', 'inspectie', 'legislation']) await mkdir(path.join(value, folder), { recursive: true })
  return value
}
async function pdf(text: string) {
  const document = await PDFDocument.create(); const page = document.addPage(); const font = await document.embedFont(StandardFonts.Helvetica)
  page.drawText(text, { x: 40, y: 700, size: 12, font }); return document.save()
}
const checksum = (value: Uint8Array) => createHash('sha256').update(value).digest('hex')
function metadata(relativePath: string, bytes: Uint8Array) {
  return {
    relativePath, checksum: checksum(bytes), sourceCode: 'NVAB-OVERGANG-WERK', canonicalUrl: 'https://nvab-online.nl/richtlijnen/overgang-en-werk',
    canonicalIdentity: 'NVAB:OVERGANG-EN-WERK', authorityStatus: 'PROFESSIONAL_REFERENCE' as const, jurisdiction: 'NL',
    temporalStatus: 'CURRENT' as const,
    applicabilityScope: 'Nederlandse arbeidsgezondheidszorg', scopeCode: 'GENERAL', scopeEffect: 'APPLIES' as const,
    publisher: 'NVAB', title: 'Richtlijn Overgang en werk', publicationYear: 2026,
  }
}
afterEach(async () => { await Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))) })

describe('Knowledge Library batchinventarisatie', () => {
  it('classificeert betrouwbare bronfamilies en houdt onzekere metadata fail-closed', async () => {
    const directory = await root()
    const nvab = await pdf('Richtlijn overgang en werk')
    await writeFile(path.join(directory, 'nvab', '2026-NVAB_Richtlijn-Overgang-en-Werk.pdf'), nvab)
    await writeFile(path.join(directory, 'arbocatalogi', 'onbekende-catalogus.pdf'), await pdf('Arbocatalogus'))
    const report = await inventoryKnowledgeLibrary(directory, { limit: 10, fullExtractionLimit: 2 })
    expect(report.files.find((file) => file.canonicalFamily === 'NVAB')).toMatchObject({ status: 'SOURCE_IDENTITY_UNCERTAIN', publisher: 'NVAB', publicationYear: 2026, reasons: expect.arrayContaining(['CANONICAL_METADATA_REVIEW_REQUIRED']) })
    expect(report.files.find((file) => file.canonicalFamily === 'ARBOCATALOGUE')).toMatchObject({ status: 'SOURCE_IDENTITY_UNCERTAIN', publisher: null })
  })

  it('maakt een document alleen READY met checksum-gebonden gecontroleerde canonieke metadata', async () => {
    const directory = await root(); const bytes = await pdf('Richtlijn overgang en werk')
    const relativePath = 'nvab/2026-NVAB_Richtlijn-Overgang-en-Werk.pdf'
    await writeFile(path.join(directory, ...relativePath.split('/')), bytes)
    const withoutMetadata = await inventoryKnowledgeLibrary(directory)
    expect(withoutMetadata.files[0].status).toBe('SOURCE_IDENTITY_UNCERTAIN')
    const withMetadata = await inventoryKnowledgeLibrary(directory, { fullExtractionLimit: 1, metadataOverrides: [metadata(relativePath, bytes)] })
    expect(withMetadata.files[0]).toMatchObject({ status: 'READY', sourceCode: 'NVAB-OVERGANG-WERK', canonicalIdentity: 'NVAB:OVERGANG-EN-WERK', authorityStatus: 'PROFESSIONAL_REFERENCE' })
    const changed = await inventoryKnowledgeLibrary(directory, { metadataOverrides: [{ ...metadata(relativePath, bytes), checksum: 'a'.repeat(64) }] })
    expect(changed.files[0]).toMatchObject({ status: 'SOURCE_IDENTITY_UNCERTAIN', reasons: expect.arrayContaining(['METADATA_CHECKSUM_MISMATCH']) })
  })

  it('valideert het herbruikbare reviewmanifest fail-closed', async () => {
    const bytes = await pdf('Richtlijn')
    const valid = { schemaVersion: 1, documents: [metadata('nvab/richtlijn.pdf', bytes)] }
    expect(parseKnowledgeLibraryMetadataManifest(valid)).toHaveLength(1)
    expect(() => parseKnowledgeLibraryMetadataManifest({ ...valid, documents: [{ ...valid.documents[0], canonicalUrl: 'http://example.invalid' }] })).toThrow('KNOWLEDGE_LIBRARY_METADATA_CANONICAL_URL_INVALID')
    expect(() => parseKnowledgeLibraryMetadataManifest({ ...valid, documents: [{ ...valid.documents[0], relativePath: '../richtlijn.pdf' }] })).toThrow('KNOWLEDGE_LIBRARY_METADATA_PATH_INVALID')
  })

  it('detecteert identieke bestanden en versieconflicten zonder ingest', async () => {
    const directory = await root(); const same = await pdf('zelfde bron'); const changed = await pdf('gewijzigde bron')
    await writeFile(path.join(directory, 'tno', 'TNO-rapport-2025-v1.pdf'), same)
    await writeFile(path.join(directory, 'ser', 'SER-rapport-2025-v1.pdf'), same)
    await writeFile(path.join(directory, 'rivm', 'RIVM-rapport-2025-v1.pdf'), changed)
    await writeFile(path.join(directory, 'rivm', 'RIVM rapport 2025 v1.pdf'), await pdf('andere inhoud'))
    const report = await inventoryKnowledgeLibrary(directory, { limit: 10 })
    expect(report.possibleDuplicates).toBe(2)
    expect(report.versionConflicts).toBe(2)
  })

  it('herkent een expliciete richtlijnfamilie en documentrollen', async () => {
    const directory = await root()
    await writeFile(path.join(directory, 'nvab', '2026-NVAB_Richtlijn-Overgang-en-Werk.pdf'), await pdf('Richtlijn'))
    await writeFile(path.join(directory, 'nvab', '2026-NVAB_Achtergronddocument-Overgang-en-Werk.pdf'), await pdf('Achtergrond'))
    const report = await inventoryKnowledgeLibrary(directory, { limit: 10 })
    expect(report.potentialDocumentFamilies).toBe(1)
    expect(report.files.map((file) => file.documentFamily?.role).sort()).toEqual(['BACKGROUND_EVIDENCE', 'PRIMARY_GUIDELINE'])
  })

  it('voert maximaal tien volledige extracties uit en is deterministisch bij replay', async () => {
    const directory = await root()
    for (let index = 1; index <= 11; index += 1) await writeFile(path.join(directory, 'tno', `TNO-rapport-2025-v${index}.pdf`), await pdf(`Rapport ${index}`))
    const first = await inventoryKnowledgeLibrary(directory, { limit: 11, fullExtractionLimit: 10 })
    const replay = await inventoryKnowledgeLibrary(directory, { limit: 11, fullExtractionLimit: 10 })
    expect(first.files.filter((file) => file.extractionFingerprint).length).toBe(10)
    expect(replay.files.map((file) => file.extractionFingerprint)).toEqual(first.files.map((file) => file.extractionFingerprint))
  })

  it('weigert batches groter dan honderd en markeert niet-ondersteunde extractie', async () => {
    const directory = await root(); await writeFile(path.join(directory, 'legislation', 'wet.zip'), 'zip')
    await expect(inventoryKnowledgeLibrary(directory, { limit: 101 })).rejects.toThrow('KNOWLEDGE_LIBRARY_BATCH_LIMIT_INVALID')
    expect((await inventoryKnowledgeLibrary(directory)).files[0].status).toBe('EXTRACTION_UNSUPPORTED')
  })
})
