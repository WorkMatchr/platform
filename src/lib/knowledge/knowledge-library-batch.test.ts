import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { afterEach, describe, expect, it } from 'vitest'
import { inventoryKnowledgeLibrary } from './knowledge-library-batch'

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
afterEach(async () => { await Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true }))) })

describe('Knowledge Library batchinventarisatie', () => {
  it('classificeert betrouwbare bronfamilies en houdt onzekere metadata fail-closed', async () => {
    const directory = await root()
    await writeFile(path.join(directory, 'nvab', '2026-NVAB_Richtlijn-Overgang-en-Werk.pdf'), await pdf('Richtlijn overgang en werk'))
    await writeFile(path.join(directory, 'arbocatalogi', 'onbekende-catalogus.pdf'), await pdf('Arbocatalogus'))
    const report = await inventoryKnowledgeLibrary(directory, { limit: 10, fullExtractionLimit: 2 })
    expect(report.files.find((file) => file.canonicalFamily === 'NVAB')).toMatchObject({ status: 'READY', publisher: 'NVAB', publicationYear: 2026 })
    expect(report.files.find((file) => file.canonicalFamily === 'ARBOCATALOGUE')).toMatchObject({ status: 'NEEDS_METADATA_REVIEW', publisher: null })
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
