import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('providerkwalificatie databasecontract', () => {
  it('bevat harde vier-ogen-, capacity- en immutabilityregels', async () => {
    const migrations = await Promise.all([
      readFile('prisma/migrations/20260714183000_add_provider_qualification_foundation/migration.sql', 'utf8'),
      readFile('prisma/migrations/20260714184950_add_provider_block_four_eyes/migration.sql', 'utf8'),
      readFile('prisma/migrations/20260714210500_harden_provider_qualification_immutability/migration.sql', 'utf8'),
    ])
    const sql = migrations.join('\n')
    expect(sql).toContain('ProviderQualificationDecision_four_eyes_check')
    expect(sql).toContain("INTERVAL '30 days'")
    expect(sql).toContain('workmatchr_reject_provider_history_mutation')
    expect(sql).toContain('ProviderBlock_four_eyes_check')
    expect(sql).toContain('immutable_published_capability_requirement_config')
    expect(sql).toContain('immutable_published_insurance_requirement_config')
    expect(sql).toContain('immutable_providerplatformpermissiongrant')
    expect(sql).toContain(`NEW."status" <> 'RETIRED'`)
    expect(sql).not.toContain('ON DELETE CASCADE')
  })
})
