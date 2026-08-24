import { describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
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

  it('faalt gesloten bij een onvolledige v2-snapshot', async () => {
    await expect(buildFinancialInvoicePdf({ ...invoice, snapshotVersion: 2 })).rejects.toThrow('INVOICE_V2_PDF_SNAPSHOT_INCOMPLETE')
  })
})
