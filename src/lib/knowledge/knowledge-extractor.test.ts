import { readFile } from 'node:fs/promises'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import ai02Package from '../../../data/knowledge/poc/AI-02.v1.json'
import { extractHtmlFullSource, extractPdfFullSource, extractStructuredTextFullSource, normalizeKnowledgeSourceText, removePostgresUnsafeNullBytes } from './knowledge-extractor'

async function fixturePdf(pageCount = 3) {
  const document = await PDFDocument.create()
  const font = await document.embedFont(StandardFonts.Helvetica)
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = document.addPage([595, 842])
    page.drawText('WorkMatchr testdocument', { x: 50, y: 810, size: 9, font })
    page.drawText(`${pageNumber}. Beeldschermwerk`, { x: 50, y: 740, size: 18, font })
    page.drawText('Dit is een volledige alinea met reproduceerbare embedded PDF-tekst.', { x: 50, y: 720, size: 11, font })
    page.drawText('- Eerste controlepunt', { x: 50, y: 690, size: 11, font })
    page.drawText(`Pagina ${pageNumber}`, { x: 50, y: 25, size: 9, font })
  }
  return document.save()
}

describe('volledige Knowledge-bronextractie', () => {
  it('normaliseert uitsluitend PostgreSQL-onveilige NUL-bytes vóór hashing', () => {
    const unchanged = 'Tekst met accenten, tabs\ten emoji 🦺.'
    expect(removePostgresUnsafeNullBytes(unchanged)).toBe(unchanged)

    const first = extractStructuredTextFullSource([{ heading: 'Kop\u0000', paragraphs: ['veilige\u0000 tekst\u0000 blijft vindbaar'] }])
    const replay = extractStructuredTextFullSource([{ heading: 'Kop\u0000', paragraphs: ['veilige\u0000 tekst\u0000 blijft vindbaar'] }])
    expect(first.pages[0].blocks.map((block) => block.exactText)).toEqual(['Kop', 'veilige tekst blijft vindbaar'])
    expect(first.pages[0].blocks.every((block) => !block.exactText.includes('\u0000') && !block.normalizedSearchText.includes('\u0000'))).toBe(true)
    expect(first.warningSummary).toContain('3 PostgreSQL-onveilige NUL-byte(s)')
    expect(first.extractionFingerprint).toBe(replay.extractionFingerprint)
    expect(first.pages[0].blocks[1].normalizedSearchText).toContain('veilige tekst blijft vindbaar')
  })
  it('zet officiële HTML en wetstekst deterministisch om naar dezelfde bronlaag', () => {
    const html = '<html><script>niet opslaan</script><h1>Bedrijfshulpverlening</h1><p>De werkgever organiseert doeltreffende bijstand.</p><ul><li>Eerste hulp</li></ul></html>'
    const first = extractHtmlFullSource(html)
    const replay = extractHtmlFullSource(html)
    const law = extractStructuredTextFullSource([{ heading: 'Artikel 15', paragraphs: ['De werkgever laat zich bijstaan door een of meer bedrijfshulpverleners.'] }])
    expect(first.extractionFingerprint).toBe(replay.extractionFingerprint)
    expect(first.pages[0].blocks.map((block) => block.blockType)).toEqual(['HEADING', 'PARAGRAPH', 'LIST_ITEM'])
    expect(first.pages[0].blocks.some((block) => block.exactText.includes('niet opslaan'))).toBe(false)
    expect(law.pages[0].blocks[0].sectionPath).toBe('Artikel 15')
    expect(law.extractorName).toBe('WORKMATCHR_LEGAL_TEXT')
  })
  it('extraheert pagina’s en blokken deterministisch zonder OCR', async () => {
    const bytes = await fixturePdf()
    const first = await extractPdfFullSource(bytes)
    const replay = await extractPdfFullSource(bytes)

    expect(first.pageCount).toBe(3)
    expect(first.pages.every((page) => page.ocrUsed === false)).toBe(true)
    const blockTypes = first.pages.flatMap((page) => page.blocks.map((block) => block.blockType))
    expect(blockTypes).toContain('HEADING')
    expect(blockTypes).toContain('LIST_ITEM')
    expect(blockTypes).toContain('HEADER_FOOTER')
    expect(replay.extractionFingerprint).toBe(first.extractionFingerprint)
    expect(replay.pages).toEqual(first.pages)
  })

  it('maakt een nieuwe fingerprint bij een gewijzigde extractorconfiguratie', async () => {
    const bytes = await fixturePdf(1)
    const original = await extractPdfFullSource(bytes)
    const changed = await extractPdfFullSource(bytes, {
      name: original.extractorName,
      version: original.extractorVersion,
      configurationVersion: 'FULL_SOURCE_V2',
    })
    expect(changed.extractionFingerprint).not.toBe(original.extractionFingerprint)
  })

  it('weigert invoer die geen PDF is', async () => {
    await expect(extractPdfFullSource(new TextEncoder().encode('not-a-pdf'))).rejects.toThrow('KNOWLEDGE_FULL_SOURCE_INVALID_PDF')
  })
})

const ai02Path = process.env.KNOWLEDGE_AI02_TEST_PDF
const describeAi02 = ai02Path ? describe : describe.skip

describeAi02('AI-02 volledige bronproef', () => {
  it('ontsluit alle 51 pagina’s zonder bestaande packagekennis te reduceren', async () => {
    const bytes = await readFile(ai02Path!)
    const extraction = await extractPdfFullSource(bytes)
    const existingExcerpts = ai02Package.fragments
      .map((fragment) => normalizeKnowledgeSourceText('internalExcerpt' in fragment ? String(fragment.internalExcerpt ?? '') : ''))
      .filter(Boolean)
    const outsideExistingClaims = extraction.pages
      .flatMap((page) => page.blocks.map((block) => ({ page: page.pageNumber, block })))
      .find(({ block }) => block.blockType === 'PARAGRAPH' && block.exactText.length >= 100 && !existingExcerpts.some((excerpt) => normalizeKnowledgeSourceText(block.exactText).includes(excerpt)))

    expect(extraction.pageCount).toBe(51)
    expect(extraction.pages.map((page) => page.pageNumber)).toEqual(Array.from({ length: 51 }, (_, index) => index + 1))
    expect(extraction.pages.flatMap((page) => page.blocks).length).toBeGreaterThan(100)
    expect(outsideExistingClaims).toBeDefined()
    expect(ai02Package.claims).toHaveLength(8)
    expect(ai02Package.fragments).toHaveLength(8)
    expect(ai02Package.citations).toHaveLength(8)
  }, 60_000)
})
