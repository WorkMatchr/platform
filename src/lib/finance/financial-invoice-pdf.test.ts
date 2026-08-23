import { describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildFinancialInvoicePdf, financialInvoicePdfFilename, type FinancialInvoicePdfSnapshot } from './financial-invoice-pdf'

vi.mock('server-only', () => ({}))

const invoice = {
  documentType: 'INVOICE',
  invoiceNumber: 'WM-26085001',
  issuedAt: new Date('2026-08-09T12:00:00.000Z'),
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
})
