import { PDFDocument } from 'pdf-lib'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { adviceDossierSnapshotFixture } from './advice-dossier-contract.test'
import { buildAdviceDossierPdf } from './advice-dossier-pdf'

describe('Adviesdossier-PDF', () => {
  it('maakt een geldige PDF met dossiermetadata', async () => {
    const bytes = await buildAdviceDossierPdf({
      dossierCode: 'WM-2026-000001',
      createdAt: new Date('2026-07-29T12:00:00Z'),
      status: 'ADVICE_READY',
      versionNumber: 1,
      snapshot: adviceDossierSnapshotFixture,
    })
    const document = await PDFDocument.load(bytes)

    expect(bytes.slice(0, 4).toString()).toContain('37,80,68,70')
    expect(document.getTitle()).toBe(
      'WorkMatchr Adviesdossier WM-2026-000001',
    )
    expect(document.getSubject()).toBe('Bedrijfshulpverlening')
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1)
    const pdfSource = readFileSync(
      new URL('./advice-dossier-pdf.ts', import.meta.url),
      'utf8',
    )
    expect(pdfSource).toContain(
      'text(input.snapshot.originalHelpRequest)',
    )
    expect(pdfSource).toContain(
      'text(input.snapshot.situationSummary)',
    )
    expect(pdfSource).toContain(
      "professionalRequirement('Aanvullend', requirement)",
    )
    expect(pdfSource).toContain(
      "professionalRequirement('Mogelijk', requirement)",
    )
  })

  it('verdeelt lange inhoud over meerdere A4-pagina’s', async () => {
    const longReasons = Array.from(
      { length: 45 },
      (_, index) =>
        `Reden ${index + 1}: deze langere tekst controleert dat inhoud veilig over pagina’s doorloopt zonder de opgeslagen adviesversie te wijzigen.`,
    )
    const bytes = await buildAdviceDossierPdf({
      dossierCode: 'WM-2026-000002',
      createdAt: new Date('2026-07-29T12:00:00Z'),
      status: 'COMPLETED',
      versionNumber: 2,
      snapshot: {
        ...adviceDossierSnapshotFixture,
        adviceReasons: longReasons,
      },
    })

    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1)
  })
})
