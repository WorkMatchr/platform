import { describe, expect, it } from 'vitest'
import { complianceReportSources } from './compliance-report-sources'
import { multiSourceReport } from '@/test-fixtures/compliance-multi-source'


describe('Volledige bronbindingen uit de historische snapshot', () => {
  it('behoudt verschillende claims en revisies met hetzelfde bron-ID en alle richtlijnen', () => {
    const report = multiSourceReport(), before = JSON.stringify(report)
    expect(complianceReportSources(report).map(s => s.title)).toEqual(['Synthetische bron', 'Tweede beoordeelde claim', 'Andere bronrevisie', 'Tweede richtlijn'])
    expect(complianceReportSources(report, 'C01')).toHaveLength(2)
    expect(complianceReportSources(report, 'C04')).toHaveLength(0)
    expect(JSON.stringify(report)).toBe(before)
  })
  it('gebruikt geen gewijzigde catalogus of verkorte summary en voegt geen unmatched bronnen toe', () => {
    const report = multiSourceReport()
    report.sources = []
    report.results.forEach(result => { result.sources = [] })
    report.definitionSnapshot.modules[3].rules[0].sources[0].title = 'Niet toegepast'
    expect(complianceReportSources(report)).toHaveLength(4)
    expect(complianceReportSources(report).map(s => s.title)).not.toContain('Niet toegepast')
  })
  it('verzint geen bron bij een niet-herleidbare regel', () => {
    const report = multiSourceReport()
    report.results[0].evidence[0].ruleId = '00000000-0000-4000-8000-000000000000'
    expect(() => complianceReportSources(report)).toThrow('Rapportbron')
  })
})
