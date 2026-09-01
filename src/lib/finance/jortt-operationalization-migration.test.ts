import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Jortt operationalization migration', () => {
  const migration = readFileSync('prisma/migrations/20260825140000_operationalize_jortt_sync/migration.sql', 'utf8')

  it('is uitsluitend additief en bewaart het remote administratieve factuurnummer', () => {
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'RETRY_REQUIRED'")
    expect(migration).toContain('ADD COLUMN "remoteInvoiceNumber"')
    expect(migration).toContain('FinancialJorttSync_remoteInvoiceNumber_idx')
    expect(migration).not.toMatch(/\b(?:DROP|DELETE|UPDATE|INSERT|RENAME|TRUNCATE)\b/i)
  })
})
