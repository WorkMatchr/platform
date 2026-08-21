import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { bhvBooleanKeys, type BhvGuideAnswers } from './bhv-guide'
import { buildBhvReportData, BHV_REPORT_DISCLAIMER } from './bhv-report'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'

const answers = { ...Object.fromEntries(bhvBooleanKeys.map((key) => [key, 'YES'])), employeeCount: 30, maximumPresent: 45, trainedBhvCount: 6, minimumBhvPresent: 2 } as BhvGuideAnswers

describe('BHV-basisrapport', () => {
  it('gebruikt één immutable rapportprojectie voor scherm, historie en PDF', () => {
    const report = buildBhvReportData({ answers, organizationName: '  Voorbeeld   BV ', scannedAt: new Date('2026-08-21T10:00:00Z'), tier: 'BASIC' })
    expect(report.organizationName).toBe('Voorbeeld BV')
    expect(report.results).toHaveLength(10)
    expect(report.scenarioLabels).toContain('Brand en rookontwikkeling')
    expect(report.disclaimer).toBe(BHV_REPORT_DISCLAIMER)
    expect(report.sources.map((source) => source.id)).toEqual(['arbowet-current', 'arboportaal-bhv', 'arbeidsinspectie-bhv-2025'])
  })

  it('maakt een meerpagina-bestendige geldige basis-PDF zonder formele goedkeuring', async () => {
    const report = buildBhvReportData({ answers, scannedAt: new Date('2026-08-21T10:00:00Z'), tier: 'BASIC' })
    const bytes = await buildComplianceReportPdf(report, { guideTitle: 'BHV-wijzer', reportNumber: 'BHV-2026-000001' })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(1)
    expect(pdf.getTitle()).toContain('BHV-wijzer')
  })
})
