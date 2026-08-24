import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(join(process.cwd(), 'prisma', 'migrations', '20260824100000_add_financial_invoice_snapshot_v2', 'migration.sql'), 'utf8')

describe('FinancialInvoice snapshot v2 migration', () => {
  it('is additief en laat bestaande records logisch v1', () => {
    expect(migration).toContain('ADD COLUMN "snapshotVersion" INTEGER NOT NULL DEFAULT 1')
    expect(migration).not.toMatch(/^\s*(?:UPDATE|DELETE FROM|DROP TABLE|TRUNCATE)\b/im)
  })

  it('borgt immutable regels, btw-groepen en uitgestelde totaliteitscontrole', () => {
    expect(migration).toContain('CREATE TABLE "FinancialInvoiceLine"')
    expect(migration).toContain('CREATE TABLE "FinancialInvoiceVatSummary"')
    expect(migration).toContain('FinancialInvoiceLine_immutable')
    expect(migration).toContain('FinancialInvoiceVatSummary_immutable')
    expect(migration).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(migration).toContain('financial_validate_invoice_v2')
  })
})
