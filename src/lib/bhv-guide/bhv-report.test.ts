import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib'
import { bhvBooleanKeys, type BhvGuideAnswers } from './bhv-guide'
import { buildBhvReportData, BHV_REPORT_DISCLAIMER } from './bhv-report'
import { buildComplianceReportPdf, WORKMATCHR_LOGO_ASPECT_RATIO, WORKMATCHR_LOGO_HEIGHT_PX, WORKMATCHR_LOGO_WIDTH_PX } from '@/lib/compliance-guide/compliance-report-pdf'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const answers = { ...Object.fromEntries(bhvBooleanKeys.map((key) => [key, 'YES'])), employeeCount: 30, maximumPresent: 45, trainedBhvCount: 6, minimumBhvPresent: 2 } as BhvGuideAnswers

describe('BHV-basisrapport', () => {
  it('gebruikt één immutable rapportprojectie voor scherm, historie en PDF', () => {
    const report = buildBhvReportData({ answers, organizationName: '  Voorbeeld   BV ', scannedAt: new Date('2026-08-21T10:00:00Z'), tier: 'BASIC' })
    expect(report.organizationName).toBe('Voorbeeld BV')
    expect(report.results).toHaveLength(10)
    expect(report.scenarioLabels).toContain('Brand en rookontwikkeling')
    expect(report.disclaimer).toBe(BHV_REPORT_DISCLAIMER)
    expect(report.sources.map((source) => source.id)).toEqual(['arbowet-current', 'arbeidsinspectie-bhv-2025', 'ai-10-bhv-2001'])
    expect(report.sources.map((source) => source.category)).toEqual(['LEGISLATION', 'GUIDANCE', 'SUPPLEMENTARY'])
  })

  it('maakt een meerpagina-bestendige geldige basis-PDF zonder formele goedkeuring', async () => {
    const report = buildBhvReportData({ answers: { ...answers, coverageNormal: 'NO', alarmOrganized: 'NO', firstAidResources: 'NO', trained: 'NO', rieAligned: 'NO' }, scannedAt: new Date('2026-08-21T10:00:00Z'), tier: 'BASIC' })
    const bytes = await buildComplianceReportPdf(report, { guideTitle: 'BHV-wijzer', reportNumber: 'BHV-2026-000001' })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(1)
    expect(pdf.getTitle()).toContain('BHV-wijzer')
    const logo = [...pdf.context.enumerateIndirectObjects()].map(([, object]) => object).find((object) =>
      object instanceof PDFRawStream
      && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image'
      && object.dict.get(PDFName.of('Width')) instanceof PDFNumber
      && (object.dict.get(PDFName.of('Width')) as PDFNumber).asNumber() === WORKMATCHR_LOGO_WIDTH_PX,
    ) as PDFRawStream | undefined
    expect(logo).toBeDefined()
    expect((logo?.dict.get(PDFName.of('Height')) as PDFNumber).asNumber()).toBe(WORKMATCHR_LOGO_HEIGHT_PX)
    expect(WORKMATCHR_LOGO_ASPECT_RATIO).toBeCloseTo(1321 / 372, 8)
    const task = getDocument({ data: new Uint8Array(bytes), disableFontFace: true, useSystemFonts: false, verbosity: 0 })
    const parsed = await task.promise
    const pageOne = (await (await parsed.getPage(1)).getTextContent()).items.map((item) => 'str' in item ? item.str : '').join(' ')
    const pageTwo = (await (await parsed.getPage(2)).getTextContent()).items.map((item) => 'str' in item ? item.str : '').join(' ')
    expect(pageOne).not.toContain('Resultaten per onderwerp')
    expect(pageTwo).toContain('Resultaten per onderwerp')
    const allText = [pageOne]
    for (let pageNumber = 2; pageNumber <= parsed.numPages; pageNumber += 1) allText.push((await (await parsed.getPage(pageNumber)).getTextContent()).items.map((item) => 'str' in item ? item.str : '').join(' '))
    expect(allText.join('\n')).toContain('Aanvullende bron')
    expect(allText.join('\n')).toContain('AI-10 - Bedrijfshulpverlening')
    await task.destroy()
  })
})
