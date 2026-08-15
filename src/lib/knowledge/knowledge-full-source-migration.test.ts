import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const migrationPath = 'prisma/migrations/20260815100000_add_knowledge_full_source_foundation/migration.sql'

describe('Knowledge full-source migratie', () => {
  it('is additief, geïndexeerd en databasebreed immutable', async () => {
    const sql = await readFile(migrationPath, 'utf8')
    for (const table of ['KnowledgeExtractionRun', 'KnowledgeSourcePage', 'KnowledgeSourceBlock', 'KnowledgeFragmentBlock']) {
      expect(sql).toContain(`CREATE TABLE "${table}"`)
      expect(sql).toContain(`CREATE TRIGGER "${table}_append_only"`)
    }
    expect(sql).toContain('USING GIN ("searchVector")')
    expect(sql).toContain("to_tsvector('dutch'")
    expect(sql).toContain('BEFORE UPDATE OR DELETE')
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE\s+"/u)
  })
})
