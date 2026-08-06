import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260805110000_add_professional_credit_wallet_ledger/migration.sql'),
  'utf8',
)
const projectionProtectionMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260805111000_protect_credit_wallet_projections/migration.sql'),
  'utf8',
)
const spentProjectionMigration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260805112000_derive_credit_wallet_spent_projection/migration.sql'),
  'utf8',
)

describe('professionele creditwalletmigratie', () => {
  it('is additief en verwijdert geen bestaande zakelijke data', () => {
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(migration).not.toMatch(/DELETE\s+FROM\s+"(CreditAccount|CreditTransaction)"/i)
    expect(migration).toContain('legacyOpeningBalance')
  })

  it('maakt het ledger expliciet en beschermt professionele tenantbinding', () => {
    expect(migration).toContain('"totalDelta"')
    expect(migration).toContain('"reservedDelta"')
    expect(migration).toContain('CreditAccount_professional_only')
    expect(migration).toContain('CreditTransaction_validate_ledger_insert')
    expect(migration).toContain('CreditTransaction_refresh_projection')
  })

  it('weigert negatieve saldi en ontbrekende auditvelden fail-closed', () => {
    expect(migration).toContain('next_total - next_reserved < 0')
    expect(migration).toContain('Iedere nieuwe creditmutatie vereist een idempotentiesleutel.')
    expect(migration).toContain('Iedere nieuwe creditmutatie vereist een actor.')
    expect(migration).toContain('Iedere nieuwe creditmutatie vereist een reden.')
  })

  it('maakt losse saldoprojecties onveranderbaar en leidt ook besteed af', () => {
    expect(projectionProtectionMigration).toContain('CreditAccount_protect_ledger_projections')
    expect(projectionProtectionMigration).toContain('uitsluitend afleidbaar uit CreditTransaction')
    expect(spentProjectionMigration).toContain('workmatchr_refresh_credit_projection')
    expect(spentProjectionMigration).toContain('"spentBalance" = ledger_spent')
  })
})
