import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const migrationPath = 'prisma/migrations/20260817100000_add_knowledge_canonical_source_identity/migration.sql'

describe('canonical source identity migration', () => {
  it('is uitsluitend additief en bevat geen bestaande datamutatie', async () => {
    const sql = await readFile(migrationPath, 'utf8')
    expect(sql).toContain('CREATE TABLE "KnowledgeSourceCanonicalIdentity"')
    expect(sql).toContain("CREATE TYPE \"KnowledgeCanonicalIdentityType\" AS ENUM ('URL', 'BIBLIOGRAPHIC')")
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE)\b/iu)
    expect(sql).not.toMatch(/(?:UPDATE|DELETE FROM|INSERT INTO)\s+"KnowledgeSource"/iu)
  })

  it('borgt shape, uniqueness, immutability en deferred bronverplichting', async () => {
    const sql = await readFile(migrationPath, 'utf8')
    expect(sql).toContain('KnowledgeSourceCanonicalIdentity_shape_check')
    expect(sql).toContain('KnowledgeSourceCanonicalIdentity_bibliographicIsbn_key')
    expect(sql).toContain('KnowledgeSourceCanonicalIdentity_append_only')
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(sql).toContain('KnowledgeSource_requires_canonical_identity')
    expect(sql).toContain('KnowledgeSource_matches_existing_canonical_identity')
  })
})
