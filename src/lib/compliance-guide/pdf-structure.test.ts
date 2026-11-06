import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFDict, PDFName, PDFArray } from 'pdf-lib'
import { buildComplianceReportPdf } from './compliance-report-pdf'
import { multiSourceReport } from '@/test-fixtures/compliance-multi-source'

describe('Toegankelijke rapportstructuur', () => {
  it('bindt koppen, tabelcellen, tekst en logo aan marked content en behoudt historische bronnen', async () => {
    const report = multiSourceReport(), snapshot = JSON.stringify(report)
    const bytes = await buildComplianceReportPdf(report)
    const document = await PDFDocument.load(bytes)
    expect(document.catalog.get(PDFName.of('Lang'))?.toString()).toBe('(nl-NL)')
    const root = document.catalog.lookup(PDFName.of('StructTreeRoot'), PDFDict)
    const roles: string[] = []
    function walk(dict: PDFDict) {
      if (dict.has(PDFName.of('S'))) roles.push(dict.get(PDFName.of('S'))!.toString())
      const kids = dict.lookupMaybe(PDFName.of('K'), PDFArray)
      for (const kid of kids?.asArray() ?? []) {
        const child = document.context.lookup(kid, PDFDict)
        if (child.get(PDFName.of('Type'))?.toString() === '/StructElem') walk(child)
      }
    }
    walk(root)
    expect(roles.filter(r => r === '/H1')).toHaveLength(1)
    expect(roles).toEqual(expect.arrayContaining(['/Document', '/H2', '/H3', '/P', '/Table', '/TR', '/TH', '/TD', '/Figure']))
    expect(root.lookup(PDFName.of('ParentTree'), PDFDict).lookup(PDFName.of('Nums'), PDFArray).size()).toBe(document.getPageCount() * 2)
    expect(JSON.stringify(report)).toBe(snapshot)
  }, 30000)
})
