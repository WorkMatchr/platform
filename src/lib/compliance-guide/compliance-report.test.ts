import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { initialComplianceGuideAnswers, type ComplianceGuideAnswers } from './compliance-guide'
import { buildComplianceReportData, collectComplianceSources, COMPLIANCE_REPORT_DISCLAIMER } from './compliance-report'
import { buildComplianceReportPdf } from './compliance-report-pdf'

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

describe('Compliance-rapportage', () => {
  it('dedupliceert uitsluitend daadwerkelijk gebruikte bronnen op de centrale bron-ID', () => {
    const multiple = collectComplianceSources([
      { sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'] },
      { sourceIds: ['arbowet-current', 'arbeidsinspectie-rie'] },
    ])
    const single = collectComplianceSources([{ sourceIds: ['arbowet-current'] }])

    expect(multiple.map((source) => source.id)).toEqual([
      'arbowet-current', 'arboportaal-arbobeleid', 'arbeidsinspectie-rie',
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
    const text = await extractPdfText(bytes)

    expect(pdf.getTitle()).toBe('WorkMatchr Compliance-wijzer rapport')
    expect(pdf.getPageCount()).toBeGreaterThan(1)
    expect(text).toContain('Voorbeeld Organisatie')
    expect(text).toContain('20 augustus 2026')
    expect(text).toContain('Beoordelingsset: versie 1')
    expect(text).toContain('Status: Actie nodig')
    expect(text).toContain('Status: Controleren')
    expect(text).toContain('Arbeidsomstandighedenwet')
    expect(text).toContain(COMPLIANCE_REPORT_DISCLAIMER)
    expect(text).not.toContain('U voldoet aan de Arbowet')
    expect(text).not.toContain('Uw organisatie is compliant')
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
