import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('BHV structured component evidence migration', () => {
  it('is additief, immutable en vereist evidence per regel en stap', async () => {
    const sql = await readFile(path.join(process.cwd(), 'prisma/migrations/20260816100000_add_bhv_structured_component_evidence/migration.sql'), 'utf8')
    expect(sql).toContain('CREATE TABLE "KnowledgeStructuredComponentEvidence"')
    expect(sql).toContain('KnowledgeStructuredComponentEvidence_exactly_one_parent_check')
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(sql).toContain('KnowledgeChecklistItem_evidence_required')
    expect(sql).toContain('KnowledgeProcedureStep_evidence_required')
    expect(sql.match(/append_only/g)).toHaveLength(5)
    expect(sql).not.toMatch(/\b(DROP|TRUNCATE)\b/u)
  })
})
