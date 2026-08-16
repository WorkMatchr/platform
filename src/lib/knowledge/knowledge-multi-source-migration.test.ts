import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Multi-Source Knowledge onboarding-migratie', () => {
  it('is additief, begrenst scope en maakt artifact/scope immutable', async () => {
    const sql = await readFile('prisma/migrations/20260816110000_add_multi_source_knowledge_onboarding/migration.sql', 'utf8')
    expect(sql).toContain('KnowledgeSourceArtifact')
    expect(sql).toContain('KnowledgeSourceApplicability_exactly_one_parent_check')
    expect(sql).toContain('num_nonnulls')
    expect(sql).toContain('KnowledgeSourceArtifact_append_only')
    expect(sql).toContain('KnowledgeSourceApplicability_append_only')
    expect(sql).toContain('KnowledgeSource_canonical_identity_immutable')
    expect(sql).toContain('knowledge_assert_pgs_scope')
    expect(sql).toContain('KnowledgeSource_pgs_scope_required')
    expect(sql).toContain('KnowledgeSourceApplicability_pgs_scope_required')
    expect(sql).toContain('DEFERRABLE INITIALLY DEFERRED')
    expect(sql).toContain(`a."jurisdiction" <> 'NL' OR a."scopeCode" <> 'SEVESO' OR a."effect" <> 'CONDITIONAL'`)
    expect(sql).toContain("ADD VALUE 'HTML'")
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/iu)
    expect(sql).not.toMatch(/DELETE\s+FROM/iu)
  })
})
