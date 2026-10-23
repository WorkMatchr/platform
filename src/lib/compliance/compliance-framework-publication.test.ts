import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Prisma } from '@/generated/prisma/client'
import { f4TestDefinition } from '@/test-fixtures/compliance-f4'
import { v2Context } from '@/test-fixtures/compliance-v2'
import { testFragmentId, testSourceExcerptHash } from '@/test-fixtures/compliance-source-fragment'
import { complianceChecksum } from './compliance-v2'
import { buildF4Definition } from './compliance-f4-definition'
import { f4RuleReviewHolds } from './compliance-f4-rule-review'
import { evaluateComplianceClaim } from './compliance-knowledge-publication'
import { inspectComplianceFramework, loadComplianceV2Framework } from './compliance-v2-framework'

vi.mock('server-only', () => ({}))
// Policy cases are exercised separately without mocks; here prove EVERY rule is checked.
vi.mock('./compliance-knowledge-publication', async original => ({ ...await original<object>(), evaluateComplianceClaim: vi.fn() }))

function frameworkRecord() {
  const d = f4TestDefinition()
  return { ...d, status: 'PUBLISHED', checksum: complianceChecksum(d), modules: d.modules.map(m => ({ ...m, isActive: true,
    questions: m.questions.map(q => ({ ...q, isRequired: q.required, visibilityCondition: q.visibleWhen, options: q.options.map(o => ({ ...o, isExclusive: o.exclusive })) })),
    rules: m.rules.map(r => ({ ...r, conditionSchema: r.condition, assessmentStatus: r.status, assessmentMode: r.mode, findingBody: r.explanation, recommendedAction: r.nextStep,
      knowledgeReferences: r.sources.map(s => ({ supportType: 'DIRECT_SUPPORT', knowledgeClaimId: s.claimId,
        knowledgeClaim: { id: s.claimId, publicationStatus: 'PUBLISHED', reviewedAt: new Date(v2Context.scannedAt),
          claimType: s.claimId.endsWith('3') ? 'CONDITION' : s.claimId.endsWith('2') ? 'RECOMMENDATION' : 'LEGAL_REQUIREMENT',
          statement: s.claimId.endsWith('3') ? 'Synthetische werkgeversscope' : s.claimId.endsWith('2') ? 'Synthetische aanbeveling' : 'Synthetische F4-testclaim', applicability: 'Test',
          citations: [{ id: s.id, supportType: 'DIRECT_SUPPORT', fragmentId: testFragmentId(s.id), fragment: { excerptHash: testSourceExcerptHash }, sourceVersion: { id: s.sourceVersionId, contentFingerprint: null, checksum: s.sourceChecksum,
            source: { title: s.title, publisher: s.publisher, sourceUrl: s.url, sourceType: 'LEGISLATION', authorityLevel: 'PRIMARY_LEGAL' } } }],
        },
      })),
    })),
  })) }
}
function database(record: ReturnType<typeof frameworkRecord> | null) {
  const findUnique = vi.fn().mockResolvedValue(record)
  return { tx: { complianceFrameworkVersion: { findUnique } } as unknown as Prisma.TransactionClient, findUnique }
}
beforeEach(() => vi.mocked(evaluateComplianceClaim).mockReset().mockReturnValue({ publishable: true, reasons: [], independentSourceGroups: 1 }))

describe('Framework dry-run en runtime delen de Knowledge-publicatiecontrole', () => {
  it('controleert 141 regels en checksums met uitsluitend één read', async () => {
    const f = frameworkRecord(), { tx, findUnique } = database(f)
    const result = await inspectComplianceFramework(tx, f.id)
    expect(result.decision).toBe('GO'); expect(result.errors).toEqual([])
    expect(result.rules).toHaveLength(141)
    expect(evaluateComplianceClaim).toHaveBeenCalledTimes(141)
    expect(findUnique).toHaveBeenCalledTimes(1)
    expect(result.rules.every(r => /^[a-f0-9]{64}$/.test(r.expectedChecksum!))).toBe(true)
    expect(await loadComplianceV2Framework(tx, f.id)).toEqual(f4TestDefinition())
  })
  it('DRAFT mag gecontroleerd maar nooit voor nieuwe runs geladen worden', async () => {
    const f = frameworkRecord(); f.status = 'DRAFT'; const { tx } = database(f)
    expect((await inspectComplianceFramework(tx, f.id)).decision).toBe('GO')
    await expect(loadComplianceV2Framework(tx, f.id)).rejects.toThrow()
  })
  it('weigert ontbrekende versie, binding en onjuiste frameworkchecksum', async () => {
    expect((await inspectComplianceFramework(database(null).tx, 'missing')).errors).toContain('FRAMEWORK_NOT_REGISTERED')
    const f = frameworkRecord(); f.modules[0].rules[0].knowledgeReferences = []
    expect((await inspectComplianceFramework(database(f).tx, f.id)).rules[0].errors).toContain('CLAIM_BINDING_MISSING')
    f.checksum = '0'.repeat(64)
    expect((await inspectComplianceFramework(database(f).tx, f.id)).decision).toBe('NO_GO')
    const valid = frameworkRecord(); valid.checksum = '0'.repeat(64)
    expect((await inspectComplianceFramework(database(valid).tx, valid.id)).errors).toContain('FRAMEWORK_CHECKSUM_MISMATCH')
  })
  it('een PUBLISHED-status kan een falende Knowledge-policy niet omzeilen', async () => {
    vi.mocked(evaluateComplianceClaim).mockReturnValue({ publishable: false, reasons: ['REVIEW_EXPIRED'], independentSourceGroups: 1 })
    const f = frameworkRecord(), { tx } = database(f)
    expect((await inspectComplianceFramework(tx, f.id)).rules.every(r => r.claims.every(c => c.reasons.includes('REVIEW_EXPIRED')))).toBe(true)
    await expect(loadComplianceV2Framework(tx, f.id)).rejects.toThrow()
  })
  it('wettelijke regels vereisen directe primaire wettelijke onderbouwing', async () => {
    const f = frameworkRecord()
    f.modules[0].rules[0].knowledgeReferences[0].knowledgeClaim.citations[0].sourceVersion.source.authorityLevel = 'PROFESSIONAL_GUIDANCE'
    expect((await inspectComplianceFramework(database(f).tx, f.id)).rules[0].errors).toContain('PRIMARY_LEGAL_SUPPORT_REQUIRED')
  })
  it('verwisselen van het geciteerde fragment binnen dezelfde bronrevisie wijzigt de frameworkhash', async () => {
    const f = frameworkRecord()
    f.modules[0].rules[0].knowledgeReferences[0].knowledgeClaim.citations[0].fragmentId = '71000000-0000-4000-8000-000000000099'
    expect((await inspectComplianceFramework(database(f).tx, f.id)).errors).toContain('FRAMEWORK_CHECKSUM_MISMATCH')
  })
  it('eist een aparte werkgeversscopeclaim en kent geen RI&E-fallback', async () => {
    const d = f4TestDefinition(), bindings = Object.fromEntries(d.modules.flatMap(m => m.rules.filter(r => !r.code.endsWith('-SCOPE-UNCERTAIN')).map(r => [r.code, r.sources])))
    expect(() => buildF4Definition(bindings)).toThrow()
    const f = frameworkRecord(), scope = f.modules[0].rules.find(r => r.code.endsWith('-SCOPE-UNCERTAIN'))!
    scope.knowledgeReferences = f.modules[0].rules[0].knowledgeReferences
    const result = await inspectComplianceFramework(database(f).tx, f.id)
    expect(result.rules.find(r => r.code === scope.code)?.errors).toContain('DEDICATED_EMPLOYER_SCOPE_CLAIM_REQUIRED')
  })
  it.each(Object.keys(f4RuleReviewHolds))('weigert het opheffen van reviewhold %s', async code => {
    const f = frameworkRecord(), r = f.modules.flatMap(m => m.rules).find(r => r.code === `${code}-YES`)!
    r.assessmentStatus = 'IN_ORDER'; r.assessmentMode = 'FULL'
    const result = await inspectComplianceFramework(database(f).tx, f.id)
    // Recomputing the aggregate checksum cannot approve a changed template either.
    f.checksum = result.calculatedChecksum!
    expect((await inspectComplianceFramework(database(f).tx, f.id)).errors).toContain('F4_RULE_OR_QUESTION_CONTRACT_MISMATCH')
  })
})
