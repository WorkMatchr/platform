import { describe, expect, it } from 'vitest'
import { extractPdfFullSource, type FullSourceExtraction } from './knowledge-extractor'
import { IMA_RIE_ACCEPTANCE_SOURCE_CODES, IMA_RIE_DOCUMENTS, imaRieOnboardingInput, preflightImaRieDocuments, redactImaRieExtraction, renderPrivacySafeImaRiePdf, type PreparedImaRieDocument } from './knowledge-rie-import'

const definition = IMA_RIE_DOCUMENTS[0]

function block(globalSequence: number, exactText: string, blockType: 'HEADING' | 'PARAGRAPH' = 'PARAGRAPH') {
  return { globalSequence, pageSequence: globalSequence, sectionPath: null, blockType, exactText, normalizedSearchText: exactText.toLowerCase(), textHash: `${globalSequence}`.padStart(64, '0'), extractionMethod: 'PDFJS_EMBEDDED_TEXT' as const, confidence: 1, requiresReview: false }
}

const extraction: FullSourceExtraction = {
  extractorName: 'test', extractorVersion: '1', configurationVersion: '1', pageCount: 2, extractionFingerprint: 'a'.repeat(64), warningSummary: null,
  pages: [
    { pageNumber: 1, status: 'EXTRACTED', textHash: 'b'.repeat(64), ocrUsed: false, confidence: 1, blocks: [
      block(1, 'Rapport Risico-Inventarisatie en -Evaluatie'), block(2, 'Titel:'), block(3, 'OOCL / Jistarc', 'HEADING'), block(4, 'Gegevens gebruiker', 'HEADING'), block(5, 'Dhr. Voorbeeld'), block(6, 'Straat 1, 1234 AB Plaats'), block(7, '06-12345678'), block(8, 'Colofon', 'HEADING'), block(9, 'Generieke inhoud blijft behouden.'),
    ] },
    { pageNumber: 2, status: 'EXTRACTED', textHash: 'c'.repeat(64), ocrUsed: false, confidence: 1, blocks: [block(10, 'Is het arbobeleid vastgelegd?')] },
  ],
}

describe('IMA RI&E privacyveilige importvoorbereiding', () => {
  it('definieert 33 unieke bronnen en exact de drie acceptatiebronnen', () => {
    expect(IMA_RIE_DOCUMENTS).toHaveLength(33)
    expect(new Set(IMA_RIE_DOCUMENTS.map((item) => item.sourceCode)).size).toBe(33)
    expect(IMA_RIE_ACCEPTANCE_SOURCE_CODES).toEqual(['IMA-RIE-2016-01', 'IMA-RIE-2016-09-2', 'IMA-RIE-2016-30'])
  })

  it('verwijdert dossieridentiteit zonder generieke RI&E-inhoud te herschrijven', () => {
    const result = redactImaRieExtraction(extraction, definition)
    const text = result.pages.flatMap((page) => page.blocks.map((item) => item.exactText)).join('\n')
    expect(text).not.toMatch(/OOCL|Jistarc|Voorbeeld|1234 AB|06-12345678/iu)
    expect(text).toContain('Generieke inhoud blijft behouden.')
    expect(text).toContain('Is het arbobeleid vastgelegd?')
    expect(text).toContain('Bron/herkomst: IMA Online')
    expect(result.counts.ORGANIZATION_IDENTIFIER).toBeGreaterThan(0)
    expect(result.counts.POSTAL_ADDRESS).toBeGreaterThan(0)
  })

  it('genereert een deterministisch, opnieuw extraheerbaar privacyveilig PDF-artifact', async () => {
    const redacted = redactImaRieExtraction(extraction, definition)
    const first = await renderPrivacySafeImaRiePdf(definition, redacted.pages)
    const replay = await renderPrivacySafeImaRiePdf(definition, redacted.pages)
    expect(Buffer.from(first).equals(Buffer.from(replay))).toBe(true)
    const extracted = await extractPdfFullSource(first)
    const text = extracted.pages.flatMap((page) => page.blocks.map((item) => item.exactText)).join('\n')
    expect(text).toContain('IMA Online')
    expect(text).toContain('Is het arbobeleid vastgelegd?')
    expect(text).not.toMatch(/OOCL|Jistarc|1234 AB|06-12345678/iu)
  })

  it('bouwt bibliografische identiteit zonder synthetische URL en houdt reviewstatus historisch', () => {
    const prepared = { definition, sanitizedPath: 'ima-rie-2016-01.pdf', sanitizedChecksum: 'd'.repeat(64) } as PreparedImaRieDocument
    const input = imaRieOnboardingInput(prepared, new Date('2026-08-25T00:00:00Z'))
    expect(input.source).toMatchObject({ publisher: 'IMA Online', sourceType: 'PROFESSIONAL_GUIDANCE', canonicalFamily: 'IMA_ONLINE', authorityStatus: 'PROFESSIONAL_REFERENCE', temporalStatus: 'HISTORICAL', sourceFamily: 'IMA_RIE' })
    expect(input.source.canonicalUrl).toBeUndefined()
    expect(input.source.canonicalIdentity).toMatchObject({ type: 'BIBLIOGRAPHIC', publicationCode: 'IMA-RIE-01', edition: 'IMA-A', publicationYear: 2016 })
  })

  it('onderscheidt een identieke replay van een identityconflict', async () => {
    const prepared = { definition, sanitizedChecksum: 'd'.repeat(64) } as PreparedImaRieDocument
    const database = {
      knowledgeSource: { findMany: async () => [{ id: 'source-1', code: definition.sourceCode }] },
      knowledgeSourceVersion: { findMany: async () => [{ id: 'version-1', checksum: prepared.sanitizedChecksum, sourceId: 'source-1' }] },
      knowledgeSourceCanonicalIdentity: { findMany: async (query: { where: { canonicalFingerprint: { in: string[] } } }) => [{ sourceId: 'source-1', canonicalFingerprint: query.where.canonicalFingerprint.in[0] }] },
    }
    const identical = await preflightImaRieDocuments([prepared], database as never)
    expect(identical.documents).toEqual([{ sourceCode: definition.sourceCode, status: 'IDENTICAL_REPLAY' }])
    database.knowledgeSourceVersion.findMany = async () => [{ id: 'version-2', checksum: prepared.sanitizedChecksum, sourceId: 'source-2' }]
    const conflict = await preflightImaRieDocuments([prepared], database as never)
    expect(conflict.documents).toEqual([{ sourceCode: definition.sourceCode, status: 'CONFLICT' }])
  })
})
