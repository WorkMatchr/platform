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
