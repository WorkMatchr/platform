import { describe, expect, it, vi } from 'vitest'
import { formatFinancialDocumentNumber, issueInvoiceForPaidPurchase } from './invoice-service'

vi.mock('server-only', () => ({}))

describe('financiële documentnummering', () => {
  it('gebruikt WM-YYMM5NNN met een globale sequence', () => {
    expect(formatFinancialDocumentNumber(1, new Date('2026-08-09T12:00:00Z'))).toBe('WM-26085001')
    expect(formatFinancialDocumentNumber(42, new Date('2026-08-09T12:00:00Z'))).toBe('WM-26085042')
  })

  it('groeit zonder duplicerende afkap voorbij 999', () => {
    expect(formatFinancialDocumentNumber(1_000, new Date('2026-09-01T12:00:00Z'))).toBe('WM-260951000')
  })

  it('weigert ongeldige sequences', () => {
    expect(() => formatFinancialDocumentNumber(0, new Date())).toThrow('INVALID_INVOICE_SEQUENCE')
  })

  it('neemt de sandboxprijs en prijsmodus exact over in de immutable factuursnapshot', async () => {
    const createInvoice = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'invoice-id', ...data }))
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 1 }]),
      $executeRaw: vi.fn().mockResolvedValue(1),
      financialInvoiceCounter: { update: vi.fn() },
      financialInvoice: { findUnique: vi.fn().mockResolvedValue(null), create: createInvoice },
      financialPurchase: { findUnique: vi.fn().mockResolvedValue({
        id: 'purchase-id', organizationId: 'organization-id', createdByUserId: 'user-id', status: 'PAID',
        pricingMode: 'MOLLIE_TEST_ACCEPTANCE', packageSku: 'CREDITS_25', packageLabel: '25 credits', credits: 25,
        baseAmountCents: 100, packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0,
        amountExclVatCents: 100, vatRateBps: 2_100, vatAmountCents: 21, amountInclVatCents: 121, currency: 'EUR',
        billingOrganizationName: 'Voorbeeldorganisatie', billingAddressLine: 'Teststraat 1', billingPostalCode: '1234 AB',
        billingCity: 'Teststad', billingCountryCode: 'NL', billingKvKNumber: null, billingVatId: null,
        molliePaymentId: 'tr_testpayment',
      }) },
      financialJorttSync: { create: vi.fn() },
      financialEvent: { create: vi.fn() },
    }

    await issueInvoiceForPaidPurchase(transaction as never, 'purchase-id', new Date('2026-08-09T12:00:00Z'))

    expect(createInvoice).toHaveBeenCalledWith({ data: expect.objectContaining({
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE', credits: 25, baseAmountCents: 100,
      amountExclVatCents: 100, vatAmountCents: 21, amountInclVatCents: 121,
    }) })
    expect(transaction.financialEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      metadata: expect.objectContaining({
        pricingPolicy: 'MOLLIE_SANDBOX_ACCEPTANCE_PRICING',
        amountExclVatCents: 100,
        vatAmountCents: 21,
        amountInclVatCents: 121,
      }),
    }) })
  })
})
