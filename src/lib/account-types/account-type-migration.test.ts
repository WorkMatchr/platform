import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  join(process.cwd(), 'prisma/migrations/20260805100000_add_user_account_types/migration.sql'),
  'utf8',
)

describe('veilige accounttypemigratie', () => {
  it('behoudt platformaccounts zonder tenanttype en migreert bestaande tenants deterministisch', () => {
    expect(migration).toContain("organization.\"organizationType\" IN ('PROVIDER', 'BOTH') THEN 'PROFESSIONAL'")
    expect(migration).toContain("organization.\"organizationType\" = 'CLIENT' THEN 'CLIENT'")
    expect(migration).toContain("organization.\"organizationType\" <> 'PLATFORM_OPERATOR'")
  })

  it('legt de backfill append-only en idempotent vast', () => {
    expect(migration).toContain('INSERT INTO "AccountProvisioningEvent"')
    expect(migration).toContain("'MIGRATED_UNKNOWN'::\"AccountProvisioningEventType\"")
    expect(migration).toContain("'account-type-v1:' || account.id::text")
    expect(migration).toContain('ON CONFLICT ("idempotencyKey") DO NOTHING')
  })

  it('borgt toekomstige memberships zonder destructieve migratie', () => {
    expect(migration).toContain('CREATE TRIGGER "OrganizationMembership_sync_tenant_account_type"')
    expect(migration).toContain("RAISE EXCEPTION 'Account type is incompatible with organization type'")
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(migration).not.toContain('SET NOT NULL')
  })
})
