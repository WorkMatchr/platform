import { describe, expect, it, vi } from 'vitest'
import { buildInvoiceV2Line, formatFinancialDocumentNumber, issueInvoiceForPaidPurchase, issueInvoiceForPaidSubscriptionPayment } from './invoice-service'

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
      financialInvoiceLine: { create: vi.fn() },
      financialInvoiceVatSummary: { create: vi.fn() },
      financialPurchase: { findUnique: vi.fn().mockResolvedValue({
        id: 'purchase-id', organizationId: 'organization-id', createdByUserId: 'user-id', status: 'PAID', kind: 'CREDIT_PACKAGE',
        pricingMode: 'MOLLIE_TEST_ACCEPTANCE', packageSku: 'CREDITS_25', packageLabel: '25 credits', credits: 25,
        baseAmountCents: 100, packageDiscountCents: 0, proDiscountCents: 0, discountCodeDiscountCents: 0,
        amountExclVatCents: 100, vatRateBps: 2_100, vatAmountCents: 21, amountInclVatCents: 121, currency: 'EUR',
        billingOrganizationName: 'Voorbeeldorganisatie', billingAddressLine: 'Teststraat 1', billingPostalCode: '1234 AB',
        billingCity: 'Teststad', billingCountryCode: 'NL', billingKvKNumber: null, billingVatId: null,
        molliePaymentId: 'tr_testpayment', paidAt: new Date('2026-08-09T11:59:00Z'),
        creditedTransaction: { createdAt: new Date('2026-08-09T12:00:00Z') },
      }) },
      financialJorttSync: { create: vi.fn() },
      financialEvent: { create: vi.fn() },
    }

    await issueInvoiceForPaidPurchase(transaction as never, 'purchase-id', new Date('2026-08-09T12:00:00Z'))

    expect(createInvoice).toHaveBeenCalledWith({ data: expect.objectContaining({
      pricingMode: 'MOLLIE_TEST_ACCEPTANCE', credits: 25, baseAmountCents: 100,
      amountExclVatCents: 100, vatAmountCents: 21, amountInclVatCents: 121,
      snapshotVersion: 2, supplyDate: new Date('2026-08-09T12:00:00Z'),
    }) })
    expect(transaction.financialEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      metadata: expect.objectContaining({
        pricingPolicy: 'MOLLIE_SANDBOX_ACCEPTANCE_PRICING',
        amountExclVatCents: 100,
        vatAmountCents: 21,
        amountInclVatCents: 121,
      }),
    }) })
    expect(transaction.financialJorttSync.create).toHaveBeenCalledWith({
      data: { invoiceId: 'invoice-id', technicalReference: 'workmatchr-invoice:invoice-id' },
    })
  })

  it('berekent bruto, korting, netto en btw voor een creditregel deterministisch', () => {
    expect(buildInvoiceV2Line({ description: '100 WorkMatchr credits', quantity: 100, unit: 'credit',
      unitPriceExclVatCents: 100, discountAmountCents: 500, vatRateBps: 2_100, vatAmountCents: 1_995 }))
      .toMatchObject({ grossAmountExclVatCents: 10_000, discountAmountCents: 500,
        netAmountExclVatCents: 9_500, amountInclVatCents: 11_495 })
  })

  it('houdt een creditaankoop zonder korting op bruto = netto', () => {
    expect(buildInvoiceV2Line({ description: '25 WorkMatchr credits', quantity: 25, unit: 'credit',
      unitPriceExclVatCents: 100, discountAmountCents: 0, vatRateBps: 2_100, vatAmountCents: 525 }))
      .toMatchObject({ grossAmountExclVatCents: 2_500, discountAmountCents: 0,
        netAmountExclVatCents: 2_500, amountInclVatCents: 3_025 })
  })

  it('verwerkt een kortingscodebedrag afzonderlijk zichtbaar in de regel', () => {
    expect(buildInvoiceV2Line({ description: '50 WorkMatchr credits', quantity: 50, unit: 'credit',
      unitPriceExclVatCents: 100, discountAmountCents: 1_000, vatRateBps: 2_100, vatAmountCents: 840 }))
      .toMatchObject({ grossAmountExclVatCents: 5_000, discountAmountCents: 1_000,
        netAmountExclVatCents: 4_000, amountInclVatCents: 4_840 })
  })

  it('weigert een onvolledige of ongeldige v2-regel', () => {
    expect(() => buildInvoiceV2Line({ description: '', quantity: 1, unit: 'maand', unitPriceExclVatCents: 4_900,
      discountAmountCents: 0, vatRateBps: 2_100, vatAmountCents: 1_029 })).toThrow('INVOICE_V2_LINE_IDENTITY_REQUIRED')
    expect(() => buildInvoiceV2Line({ description: 'WorkMatchr Pro', quantity: 1, unit: 'maand', unitPriceExclVatCents: 4_900,
      discountAmountCents: 0, vatRateBps: 2_100, vatAmountCents: 1_029,
      servicePeriodStart: new Date('2026-09-01'), servicePeriodEnd: new Date('2026-08-01') })).toThrow('INVOICE_V2_SERVICE_PERIOD_INVALID')
  })

  it('bevriest een terugkerende Pro-dienstperiode in factuur en regel', async () => {
    const createInvoice = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'invoice-pro', ...data }))
    const createLine = vi.fn()
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ nextNumber: 2 }]), $executeRaw: vi.fn(),
      financialInvoiceCounter: { update: vi.fn() },
      financialInvoice: { findUnique: vi.fn().mockResolvedValue(null), create: createInvoice },
      financialInvoiceLine: { create: createLine }, financialInvoiceVatSummary: { create: vi.fn() },
      professionalSubscriptionPayment: { findUnique: vi.fn().mockResolvedValue({
        id: 'payment-pro', status: 'PAID', molliePaymentId: 'tr_pro', amountExclVatCents: 4_900,
        vatRateBps: 2_100, vatAmountCents: 1_029, amountInclVatCents: 5_929, currency: 'EUR',
        periodStart: new Date('2026-09-01T00:00:00Z'), periodEnd: new Date('2026-10-01T00:00:00Z'),
        subscriptionId: 'subscription-pro', subscription: { organizationId: 'organization-id', planCode: 'WORKMATCHR_PRO_MONTHLY',
          planLabel: 'WorkMatchr Pro', firstPaymentPurchase: { invoice: {
            customerOrganizationName: 'Voorbeeldorganisatie', customerAddressLine: 'Teststraat 1', customerPostalCode: '1234 AB',
            customerCity: 'Teststad', customerCountryCode: 'NL', customerKvKNumber: null, customerVatId: null,
          } } },
      }) },
      financialJorttSync: { create: vi.fn() }, financialEvent: { create: vi.fn() },
    }
    await issueInvoiceForPaidSubscriptionPayment(transaction as never, 'payment-pro', new Date('2026-08-31T12:00:00Z'))
    expect(createInvoice).toHaveBeenCalledWith({ data: expect.objectContaining({ snapshotVersion: 2,
      supplyDate: new Date('2026-09-01T00:00:00Z'), advancePaymentDate: new Date('2026-08-31T12:00:00Z'),
      servicePeriodStart: new Date('2026-09-01T00:00:00Z'), servicePeriodEnd: new Date('2026-10-01T00:00:00Z') }) })
    expect(createLine).toHaveBeenCalledWith({ data: expect.objectContaining({ description: 'WorkMatchr Pro', quantity: 1,
      unit: 'maand', servicePeriodStart: new Date('2026-09-01T00:00:00Z'), servicePeriodEnd: new Date('2026-10-01T00:00:00Z') }) })
  })
})
