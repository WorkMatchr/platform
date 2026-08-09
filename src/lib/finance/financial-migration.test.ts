import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260809100000_add_financial_chain_f3_f9/migration.sql'),
  'utf8',
)
const cancellationMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260809110000_add_pro_cancellation_at_period_end/migration.sql'),
  'utf8',
)
const refundLifecycleMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260809120000_harden_financial_refund_lifecycle/migration.sql'),
  'utf8',
)
const sandboxPricingMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260809130000_add_mollie_test_acceptance_pricing/migration.sql'),
  'utf8',
)
const proMandateMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260809140000_add_pro_mollie_mandate_projection/migration.sql'),
  'utf8',
)

describe('financiële F3-F9-migratie', () => {
  it('is additief en bevat geen destructieve schema- of datamutaties', () => {
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(migration).not.toMatch(/DELETE\s+FROM/i)
    expect(migration).not.toMatch(/ALTER\s+COLUMN/i)
  })

  it('borgt bedragen, factuurbronnen en de unieke globale teller', () => {
    expect(migration).toContain('FinancialPurchase_amounts_check')
    expect(migration).toContain('FinancialInvoice_source_check')
    expect(migration).toContain('FinancialInvoiceCounter_singleton_check')
    expect(migration).toContain('FinancialInvoice_sequenceNumber_key')
  })

  it('beschermt append-only historie en financiële snapshots', () => {
    expect(migration).toContain('FinancialPaymentEvent_immutable')
    expect(migration).toContain('FinancialInvoice_immutable')
    expect(migration).toContain('FinancialEvent_immutable')
    expect(migration).toContain('FinancialPurchase_snapshot_immutable')
    expect(migration).toContain('ProfessionalSubscription_snapshot_immutable')
  })

  it('modelleert terugkerende betaalstatussen append-only en idempotent', () => {
    expect(migration).not.toContain('ProfessionalSubscriptionPayment_molliePaymentId_key')
    expect(migration).toContain('ProfessionalSubscriptionPayment_idempotencyKey_key')
    expect(migration).toContain('ProfessionalSubscriptionPayment_molliePaymentId_createdAt_idx')
  })
})

describe('WorkMatchr Pro-opzegmigratie', () => {
  it('is additief en bewaakt een volledige consistente opzegplanning', () => {
    expect(cancellationMigration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(cancellationMigration).not.toMatch(/DELETE\s+FROM/i)
    expect(cancellationMigration).toContain('ProfessionalSubscription_cancellation_schedule_check')
    expect(cancellationMigration).toContain('cancellationEffectiveAt')
  })
})

describe('financiële refund-lifecyclemigratie', () => {
  it('is additief en koppelt auditgebeurtenissen onveranderbaar aan een refund', () => {
    expect(refundLifecycleMigration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(refundLifecycleMigration).not.toMatch(/DELETE\s+FROM/i)
    expect(refundLifecycleMigration).toContain('ADD COLUMN "refundId" UUID')
    expect(refundLifecycleMigration).toContain('FinancialEvent_refundId_fkey')
    expect(refundLifecycleMigration).toContain('ON DELETE RESTRICT')
  })
})

describe('Mollie sandboxacceptatieprijsmigratie', () => {
  it('is additief en markeert aankoop en factuur met een expliciete prijsmodus', () => {
    expect(sandboxPricingMigration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(sandboxPricingMigration).not.toMatch(/DELETE\s+FROM/i)
    expect(sandboxPricingMigration).toContain('FinancialPricingMode')
    expect(sandboxPricingMigration).toContain('FinancialPurchase_test_pricing_check')
    expect(sandboxPricingMigration).toContain('MOLLIE_TEST_ACCEPTANCE')
  })

  it('borgt databasebreed exact 25 credits voor 1 euro plus 21 procent btw zonder kortingen', () => {
    expect(sandboxPricingMigration).toContain('"packageSku" = \'CREDITS_25\'')
    expect(sandboxPricingMigration).toContain('"credits" = 25')
    expect(sandboxPricingMigration).toContain('"amountExclVatCents" = 100')
    expect(sandboxPricingMigration).toContain('"vatAmountCents" = 21')
    expect(sandboxPricingMigration).toContain('"amountInclVatCents" = 121')
    expect(sandboxPricingMigration).toContain('"discountCodeId" IS NULL')
  })
})

describe('Mollie Pro-mandaatprojectiemigratie', () => {
  it('is additief, privacybeperkt en laat bestaande abonnementen compatibel', () => {
    expect(proMandateMigration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(proMandateMigration).not.toMatch(/DELETE\s+FROM/i)
    expect(proMandateMigration).not.toMatch(/UPDATE\s+"ProfessionalSubscription"/i)
    expect(proMandateMigration).toContain('mollieMandateStatus')
    expect(proMandateMigration).toContain('mollieMandateMethod')
    expect(proMandateMigration).toContain('mollieMandateVerifiedAt')
  })

  it('accepteert uitsluitend een volledig geldig SEPA- of kaartmandate', () => {
    expect(proMandateMigration).toContain('mollieMandateId" LIKE \'mdt\\_%\'')
    expect(proMandateMigration).toContain('mollieMandateStatus" = \'valid\'')
    expect(proMandateMigration).toContain("mollieMandateMethod\" IN ('directdebit', 'creditcard')")
  })
})
