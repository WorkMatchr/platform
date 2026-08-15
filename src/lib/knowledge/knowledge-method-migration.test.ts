import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const path = 'prisma/migrations/20260815110000_add_knowledge_method_foundation/migration.sql'

describe('KnowledgeMethod-migratie', () => {
  it('is additief, fail-closed en append-only', async () => {
    const sql = await readFile(path, 'utf8')
    for (const table of ['KnowledgeMethod', 'KnowledgeMethodComponent', 'KnowledgeMethodEvidence']) {
      expect(sql).toContain(`CREATE TABLE "${table}"`)
      expect(sql).toContain(`CREATE TRIGGER "${table}_append_only"`)
    }
    expect(sql).toContain('num_nonnulls("procedureId", "checklistId", "ruleId", "calculationId", "formTemplateId") = 1')
    expect(sql).toContain('KnowledgeMethodComponent_evidence_required')
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(sql).toContain('KnowledgeMethod_safe_status_check')
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM|UPDATE\s+"/u)
  })
})
