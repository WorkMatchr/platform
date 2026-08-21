import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { join } from 'node:path'
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { initialComplianceGuideAnswers, type ComplianceGuideAnswers } from './compliance-guide'
import { buildComplianceReportData, collectComplianceSources, COMPLIANCE_REPORT_DISCLAIMER } from './compliance-report'
import { buildComplianceReportPdf, WORKMATCHR_LOGO_HEIGHT_PX, WORKMATCHR_LOGO_WIDTH_PX } from './compliance-report-pdf'

const mixedAnswers: ComplianceGuideAnswers = {
  ...initialComplianceGuideAnswers,
  hasEmployees: 'YES',
  employeeCount: 'ONE_TO_25',
  generalPolicy: 'NO',
  rie: 'YES',
  actionPlan: 'YES',
  rieUpdated: 'YES',
  rieTesting: 'YES',
  preventionOfficer: 'YES',
  preventionConsultation: 'YES',
  bhvOrganized: 'YES',
  bhvAppointed: 'YES',
  bhvRiskBased: 'YES',
  bhvPrepared: 'YES',
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const task = getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
  const document = await task.promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await (await document.getPage(pageNumber)).getTextContent()
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
  }
  await task.destroy()
  return pages.join('\n')
}

async function extractPdfPages(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
  const document = await task.promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await (await document.getPage(pageNumber)).getTextContent()
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '))
  }
  await task.destroy()
  return pages
}

describe('Compliance-rapportage', () => {
  it('gebruikt het transparante officiële logo zonder de verhoudingen te wijzigen', async () => {
    const metadata = await sharp(join(process.cwd(), 'public', 'branding', 'workmatchr-logo.png')).metadata()

    expect(metadata).toMatchObject({
      format: 'png',
      width: WORKMATCHR_LOGO_WIDTH_PX,
      height: WORKMATCHR_LOGO_HEIGHT_PX,
      hasAlpha: true,
    })
  })

  it('dedupliceert uitsluitend daadwerkelijk gebruikte bronnen op de centrale bron-ID', () => {
    const multiple = collectComplianceSources([
      { sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'] },
      { sourceIds: ['arbowet-current', 'arbeidsinspectie-rie'] },
    ])
    const single = collectComplianceSources([{ sourceIds: ['arbowet-current'] }])

    expect(multiple.map((source) => source.id)).toEqual([
      'arbowet-current', 'arboportaal-arbobeleid',
    ])
    expect(single).toHaveLength(1)
    expect(single[0]?.id).toBe('arbowet-current')
  })

  it('bouwt BASIC en EXTENDED vanuit dezelfde versieerbare uitkomst', () => {
    const basic = buildComplianceReportData({ answers: mixedAnswers, organizationName: '  Voorbeeld   Organisatie  ', scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'BASIC' })
    const extended = buildComplianceReportData({ answers: mixedAnswers, organizationName: null, scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'EXTENDED' })

    expect(basic.organizationName).toBe('Voorbeeld Organisatie')
    expect(basic.assessmentVersion).toBe(1)
    expect(basic.summary).toEqual({ order: 3, action: 1, check: 5, notApplicable: 0 })
    expect(basic.attentionItems.every((item) => item.status === 'ACTION' || item.status === 'CHECK')).toBe(true)
    expect(extended.results).toEqual(basic.results)
    expect(extended.extendedCapabilities).toContain('HISTORY_COMPARISON')
    expect(JSON.stringify(basic)).not.toMatch(/employeeName|medical|victim/i)
  })

  it('genereert een professionele meerpagina-PDF met metadata, statussen, bronnen en disclaimer', async () => {
    const report = buildComplianceReportData({ answers: mixedAnswers, organizationName: 'Voorbeeld Organisatie', scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'BASIC' })
    const bytes = await buildComplianceReportPdf(report)
    const pdf = await PDFDocument.load(bytes)
    const text = await extractPdfText(new Uint8Array(bytes))

    expect(pdf.getTitle()).toBe('WorkMatchr Compliance-wijzer rapport')
    expect(pdf.getPageCount()).toBeGreaterThan(1)
    const logo = [...pdf.context.enumerateIndirectObjects()].map(([, object]) => object).find((object) =>
      object instanceof PDFRawStream
      && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image'
      && object.dict.get(PDFName.of('Width')) instanceof PDFNumber
      && (object.dict.get(PDFName.of('Width')) as PDFNumber).asNumber() === WORKMATCHR_LOGO_WIDTH_PX,
    ) as PDFRawStream | undefined
    expect(logo).toBeDefined()
    expect((logo?.dict.get(PDFName.of('Height')) as PDFNumber).asNumber()).toBe(WORKMATCHR_LOGO_HEIGHT_PX)
    expect(text).toContain('Voorbeeld Organisatie')
    expect(text).toContain('20 augustus 2026')
    expect(text).toContain('Beoordelingsset: versie 1')
    expect(text).toContain('Rapportstructuur: versie 1.0')
    expect(text).toContain('Status: Actie nodig')
    expect(text).toContain('Status: Controleren')
    expect(text).toContain('Arbeidsomstandighedenwet')
    expect(text).toContain(COMPLIANCE_REPORT_DISCLAIMER)
    const pages = await extractPdfPages(new Uint8Array(bytes))
    expect(pages[0]).not.toContain('Resultaten per onderwerp')
    expect(pages[1]).toContain('Resultaten per onderwerp')
    expect(text).toContain('Geraadpleegde bronnen')
    expect(text).toContain('Wetgeving')
    expect(text).not.toContain('U voldoet aan de Arbowet')
    expect(text).not.toContain('Uw organisatie is compliant')
  })

  it('neemt een vast historisch rapportnummer op zonder de inhoud opnieuw te beoordelen', async () => {
    const report = buildComplianceReportData({ answers: mixedAnswers, scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'BASIC' })
    const text = await extractPdfText(await buildComplianceReportPdf(report, { reportNumber: 'CW-2026-000001' }))
    expect(text).toContain('Rapportnummer: CW-2026-000001')
  })

  it('verdeelt uitzonderlijk lange resultaten zonder inhoud te verliezen', async () => {
    const report = buildComplianceReportData({ answers: mixedAnswers, scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'BASIC' })
    const longReport = {
      ...report,
      results: report.results.map((result) => ({ ...result, explanation: `${result.explanation} ${'Langere toelichting voor visuele paginering. '.repeat(35)}` })),
    }
    const bytes = await buildComplianceReportPdf(longReport)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(4)
    expect(await extractPdfText(bytes)).toContain('Langere toelichting voor visuele paginering')
  })

  it('stelt EXTENDED nog niet als downloadbaar PDF-product beschikbaar', async () => {
    const report = buildComplianceReportData({ answers: mixedAnswers, scannedAt: new Date('2026-08-20T10:00:00Z'), tier: 'EXTENDED' })
    await expect(buildComplianceReportPdf(report)).rejects.toThrow('nog niet beschikbaar')
  })
})
