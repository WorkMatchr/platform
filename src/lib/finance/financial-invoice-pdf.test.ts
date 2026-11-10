import { describe, expect, it, vi } from 'vitest'
import { PDFDocument, PDFRawStream, decodePDFRawStream } from 'pdf-lib'
import { buildFinancialInvoicePdf, financialInvoicePdfFilename, type FinancialInvoicePdfSnapshot } from './financial-invoice-pdf'

vi.mock('server-only', () => ({}))

const invoice = {
  documentType: 'INVOICE',
  invoiceNumber: 'WM-26085001',
  issuedAt: new Date('2026-08-09T12:00:00.000Z'),
  snapshotVersion: 1,
  supplyDate: null,
  advancePaymentDate: null,
  servicePeriodStart: null,
  servicePeriodEnd: null,
  sellerLegalName: 'Feenstra Safety Consulting',
  sellerTradeName: 'WorkMatchr',
  sellerAddressLine: 'Kennemerland 71',
  sellerPostalCode: '9405 LC',
  sellerCity: 'Assen',
  sellerCountryCode: 'NL',
  sellerKvKNumber: '57788863',
  sellerVatId: 'NL002107278B11',
  customerOrganizationName: 'Voorbeeldorganisatie',
  customerAddressLine: 'Teststraat 1',
  customerPostalCode: '1234 AB',
  customerCity: 'Teststad',
  customerCountryCode: 'NL',
  customerKvKNumber: '12345678',
  customerVatId: 'NL123456789B01',
  packageLabel: '25 credits',
  credits: 25,
  amountExclVatCents: 2_500,
  vatRateBps: 2_100,
  vatAmountCents: 525,
  amountInclVatCents: 3_025,
} satisfies FinancialInvoicePdfSnapshot

describe('financiële factuur-pdf', () => {
  it('genereert een leesbare PDF uitsluitend uit de immutable factuursnapshot', async () => {
    const pdf = await buildFinancialInvoicePdf(invoice)
    const loaded = await PDFDocument.load(pdf)
    expect(loaded.getPageCount()).toBeGreaterThan(0)
    expect(loaded.getTitle()).toBe('WorkMatchr factuur WM-26085001')
    expect(loaded.getCreationDate()?.toISOString()).toBe(invoice.issuedAt.toISOString())
  })

  it('is reproduceerbaar voor dezelfde historische snapshot en bestandsnaam', async () => {
    const first = await buildFinancialInvoicePdf(invoice)
    const second = await buildFinancialInvoicePdf({ ...invoice })
    expect(Buffer.from(second)).toEqual(Buffer.from(first))
    expect(financialInvoicePdfFilename(invoice.invoiceNumber)).toBe('WorkMatchr-factuur-WM-26085001.pdf')
  })

  it('wijzigt de btw-snapshot niet tijdens rendering', async () => {
    const pdf = await buildFinancialInvoicePdf(invoice)
    expect(pdf.byteLength).toBeGreaterThan(1_000)
    expect(invoice).toMatchObject({ amountExclVatCents: 2_500, vatRateBps: 2_100, vatAmountCents: 525, amountInclVatCents: 3_025 })
  })

  it('rendert een volledige v2-regel, leverdatum, korting en btw-samenvatting', async () => {
    const line = {
      id: 'line-1', invoiceId: 'invoice-1', position: 1, description: '100 WorkMatchr credits',
      quantity: 100, unit: 'credit', unitPriceExclVatCents: 100, grossAmountExclVatCents: 10_000,
      discountAmountCents: 500, netAmountExclVatCents: 9_500, vatRateBps: 2_100,
      vatAmountCents: 1_995, amountInclVatCents: 11_495, servicePeriodStart: null,
      servicePeriodEnd: null, createdAt: invoice.issuedAt,
    }
    const summary = {
      id: 'vat-1', invoiceId: 'invoice-1', vatRateBps: 2_100, taxableAmountExclVatCents: 9_500,
      vatAmountCents: 1_995, amountInclVatCents: 11_495, createdAt: invoice.issuedAt,
    }
    const pdf = await buildFinancialInvoicePdf({ ...invoice, snapshotVersion: 2, supplyDate: invoice.issuedAt,
      customerOrganizationName: 'Voorbeeldorganisatie met een uitzonderlijk lange geregistreerde handelsnaam B.V.',
      customerAddressLine: 'Een zeer lange straatnaam met toevoeging 123 bis en aanvullende adresaanduiding',
      amountExclVatCents: 9_500, vatAmountCents: 1_995, amountInclVatCents: 11_495, lines: [line], vatSummaries: [summary] })
    expect((await PDFDocument.load(pdf)).getPageCount()).toBeGreaterThan(0)
  })

  it('drukt de KOR-verklaring en pilotprijs af zonder btw-tarief of btw-bedrag',async()=>{
    const line={id:'synthetic',invoiceId:'pilot',position:1,description:'Pilotcursus',quantity:1,unit:'cursus',unitPriceExclVatCents:14900,grossAmountExclVatCents:14900,discountAmountCents:14751,netAmountExclVatCents:149,vatRateBps:0,vatAmountCents:0,amountInclVatCents:149,servicePeriodStart:null,servicePeriodEnd:null,createdAt:invoice.issuedAt}
    const document=await PDFDocument.load(await buildFinancialInvoicePdf({...invoice,academyTaxTreatment:'NL_KOR',snapshotVersion:2,supplyDate:invoice.issuedAt,amountExclVatCents:149,vatRateBps:0,vatAmountCents:0,amountInclVatCents:149,lines:[line],vatSummaries:[{id:'summary',invoiceId:'pilot',createdAt:invoice.issuedAt,vatRateBps:0,vatAmountCents:0,taxableAmountExclVatCents:149,amountInclVatCents:149}]}))
    const texts=document.context.enumerateIndirectObjects().flatMap(([,obj])=>{
      if(!(obj instanceof PDFRawStream) || obj.dict.get(document.context.obj('Subtype')))return []
      const content=Buffer.from(decodePDFRawStream(obj).decode()).toString('latin1')
      return Array.from(content.matchAll(/<([A-F0-9]+)> Tj/g),m=>Buffer.from(m[1],'hex').toString('latin1'))
    }).join(' ')
    expect(texts).toContain('kleineondernemersregeling (KOR)')
    expect(texts).toContain('1,49')
    expect(texts).not.toMatch(/btw\s*[\d%]|totaal btw|incl\. btw|excl\. btw/i)
  })

  it('rendert een Pro-factuur met immutable dienstperiode', async () => {
    const periodStart = new Date('2026-08-01T00:00:00.000Z')
    const periodEnd = new Date('2026-08-31T23:59:59.000Z')
    const line = {
      id: 'line-pro', invoiceId: 'invoice-pro', position: 1, description: 'WorkMatchr Pro',
      quantity: 1, unit: 'maand', unitPriceExclVatCents: 4_900, grossAmountExclVatCents: 4_900,
      discountAmountCents: 0, netAmountExclVatCents: 4_900, vatRateBps: 2_100,
      vatAmountCents: 1_029, amountInclVatCents: 5_929, servicePeriodStart: periodStart,
      servicePeriodEnd: periodEnd, createdAt: invoice.issuedAt,
    }
    const summary = {
      id: 'vat-pro', invoiceId: 'invoice-pro', vatRateBps: 2_100, taxableAmountExclVatCents: 4_900,
      vatAmountCents: 1_029, amountInclVatCents: 5_929, createdAt: invoice.issuedAt,
    }
    const pdf = await buildFinancialInvoicePdf({
      ...invoice,
      snapshotVersion: 2,
      supplyDate: periodStart,
      servicePeriodStart: periodStart,
      servicePeriodEnd: periodEnd,
      amountExclVatCents: 4_900,
      vatAmountCents: 1_029,
      amountInclVatCents: 5_929,
      lines: [line],
      vatSummaries: [summary],
    })
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(1)
  })

  it('faalt gesloten bij een onvolledige v2-snapshot', async () => {
    await expect(buildFinancialInvoicePdf({ ...invoice, snapshotVersion: 2 })).rejects.toThrow('INVOICE_V2_PDF_SNAPSHOT_INCOMPLETE')
  })
})
