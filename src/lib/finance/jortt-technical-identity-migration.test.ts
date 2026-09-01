import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Jortt technische identiteit migration', () => {
  const migration = readFileSync('prisma/migrations/20260901100000_harden_jortt_invoice_identity/migration.sql', 'utf8')

  it('voegt alleen een nullable unieke technische referentie toe zonder historische backfill', () => {
    expect(migration).toContain('ADD COLUMN "technicalReference" VARCHAR(80)')
    expect(migration).toContain('FinancialJorttSync_technicalReference_key')
    expect(migration).toContain('FinancialJorttSync_technicalReference_matches_invoice_check')
    expect(migration).toContain("'workmatchr-invoice:' || \"invoiceId\"::text")
    expect(migration).not.toMatch(/\b(?:DROP|DELETE|UPDATE|INSERT|RENAME|TRUNCATE)\b/i)
  })
})
