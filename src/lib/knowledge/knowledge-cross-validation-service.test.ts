import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { storeKnowledgeCrossValidationAssessment, type KnowledgeCrossValidationAssessmentInput } from './knowledge-cross-validation-service'

const claimId = '00000000-0000-4000-8000-000000000001'
const reviewerUserId = '00000000-0000-4000-8000-000000000002'
const blockId = '00000000-0000-4000-8000-000000000003'
const hash = 'a'.repeat(64)

function input(overrides: Partial<KnowledgeCrossValidationAssessmentInput> = {}): KnowledgeCrossValidationAssessmentInput {
  return {
    claimId,
    outcome: 'CONFIRMED',
    rationale: 'De actuele bron ondersteunt de historische kernclaim.',
    checkedAt: new Date('2026-08-18T12:00:00Z'),
    reviewerUserId,
    evidence: [{ sourceBlockId: blockId, blockTextHash: hash, supportType: 'DIRECT_SUPPORT', sequence: 1, rationale: 'Directe actuele ondersteuning.' }],
    ...overrides,
  }
}

function database(identical: { id: string; revision: number } | null = null) {
  const tx = {
    user: { findFirst: vi.fn().mockResolvedValue({ id: reviewerUserId }) },
    $executeRaw: vi.fn().mockResolvedValue(1),
    knowledgeClaim: { findUnique: vi.fn().mockResolvedValue({ id: claimId }) },
    knowledgeReviewTask: { findFirst: vi.fn() },
    knowledgeSourceBlock: { findMany: vi.fn().mockResolvedValue([{
      id: blockId, textHash: hash, applicabilityScopes: [],
      sourcePage: { extractionRun: { sourceVersion: { applicabilityScopes: [], source: { jurisdiction: 'NL', applicabilityScope: 'GENERAL', independenceGroup: 'OFFICIAL:SOURCE', applicabilityScopes: [] } } } },
    }]) },
    knowledgeCrossValidationAssessment: {
      findUnique: vi.fn().mockResolvedValue(identical),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    knowledgeCrossValidationEvidence: { create: vi.fn().mockResolvedValue({}) },
  }
  return { tx, database: { $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)) } }
}

describe('Knowledge cross-validation assessment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('bewaart afgeleide contextsnapshots zonder een validatie- of claimmutatie', async () => {
    const context = database()
    const result = await storeKnowledgeCrossValidationAssessment(input(), context.database as never)
    expect(result).toMatchObject({ created: true, revision: 1 })
    expect(context.tx.knowledgeCrossValidationEvidence.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      sourceBlockId: blockId,
      blockTextHash: hash,
      jurisdictionSnapshot: 'NL',
      applicabilityScopeSnapshot: 'GENERAL',
      independenceGroupSnapshot: 'OFFICIAL:SOURCE',
    }) })
    expect(context.tx.knowledgeClaim).not.toHaveProperty('update')
  })

  it('herkent een identieke fingerprint als idempotente replay', async () => {
    const context = database({ id: '00000000-0000-4000-8000-000000000099', revision: 1 })
    await expect(storeKnowledgeCrossValidationAssessment(input(), context.database as never)).resolves.toMatchObject({ created: false, revision: 1 })
    expect(context.tx.knowledgeCrossValidationAssessment.create).not.toHaveBeenCalled()
    expect(context.tx.knowledgeCrossValidationEvidence.create).not.toHaveBeenCalled()
  })

  it.each([
    ['lege rationale', { rationale: ' ' }, 'ASSESSMENT_RATIONALE_REQUIRED'],
    ['ontbrekende evidence', { evidence: [] }, 'ASSESSMENT_EVIDENCE_REQUIRED'],
    ['ongeldige volgorde', { evidence: [{ sourceBlockId: blockId, blockTextHash: hash, supportType: 'DIRECT_SUPPORT' as const, sequence: 0, rationale: 'Evidence.' }] }, 'ASSESSMENT_EVIDENCE_SEQUENCE_INVALID'],
  ])('weigert %s vóór databasewrite', async (_label, override, code) => {
    const context = database()
    await expect(storeKnowledgeCrossValidationAssessment(input(override), context.database as never)).rejects.toMatchObject({ code })
    expect(context.database.$transaction).not.toHaveBeenCalled()
  })

  it('weigert een hash-mismatch fail-closed', async () => {
    const context = database()
    await expect(storeKnowledgeCrossValidationAssessment(input({ evidence: [{ ...input().evidence[0], blockTextHash: 'b'.repeat(64) }] }), context.database as never)).rejects.toMatchObject({ code: 'ASSESSMENT_BLOCK_HASH_MISMATCH' })
    expect(context.tx.knowledgeCrossValidationAssessment.create).not.toHaveBeenCalled()
  })
})
