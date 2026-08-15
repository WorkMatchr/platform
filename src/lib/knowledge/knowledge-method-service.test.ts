import { describe, expect, it } from 'vitest'
import { fingerprintKnowledgeMethod, KnowledgeMethodError, storeKnowledgeMethod, type KnowledgeMethodInput } from './knowledge-method-service'

const base: KnowledgeMethodInput = {
  code: 'BHV_MAATGEVENDE_SCENARIOS', title: 'Maatgevende scenario’s', purpose: 'Bepaal een onderbouwde BHV-organisatie.',
  applicability: { source: 'AI-10', historical: true }, inputContract: { required: ['rie', 'restRisks'] },
  outputContract: { produces: ['scenarios', 'tasks', 'bhvPlan'] }, limitations: 'Historische vakmethodiek; geen actuele aantalsnorm.',
  temporalStatus: 'HISTORICAL', createdByActor: 'KNOWLEDGE_METHOD_TEST',
  evidence: [{ sourceBlockId: '00000000-0000-4000-8000-000000000001', role: 'BASIS', rationale: 'Methodische basis.' }],
  components: [{ type: 'PROCEDURE', procedureId: '00000000-0000-4000-8000-000000000002', sequence: 1, label: 'Scenarioanalyse', evidence: [{ sourceBlockId: '00000000-0000-4000-8000-000000000003', role: 'STEP', rationale: 'Beschreven proces.' }] }],
}

describe('KnowledgeMethod-service', () => {
  it('maakt een deterministische inhoudsfingerprint waarin bewijs en volgorde meetellen', () => {
    expect(fingerprintKnowledgeMethod(base)).toBe(fingerprintKnowledgeMethod(structuredClone(base)))
    expect(fingerprintKnowledgeMethod(base)).not.toBe(fingerprintKnowledgeMethod({ ...base, components: [{ ...base.components[0], sequence: 2 }] }))
    expect(fingerprintKnowledgeMethod(base)).not.toBe(fingerprintKnowledgeMethod({ ...base, evidence: [{ ...base.evidence[0], sourceBlockId: '00000000-0000-4000-8000-000000000099' }] }))
  })

  it('weigert een component zonder evidence vóór databasegebruik', async () => {
    const database = { $transaction: () => { throw new Error('database should not be reached') } }
    await expect(storeKnowledgeMethod({ ...base, components: [{ ...base.components[0], evidence: [] }] }, database as never)).rejects.toMatchObject({ code: 'METHOD_COMPONENT_EVIDENCE_REQUIRED' } satisfies Partial<KnowledgeMethodError>)
  })

  it('neemt actor en supersession niet op in de inhoudsfingerprint', () => {
    expect(fingerprintKnowledgeMethod(base)).toBe(fingerprintKnowledgeMethod({ ...base, createdByActor: 'ANOTHER_ACTOR', supersedesMethodId: '00000000-0000-4000-8000-000000000004' }))
  })
})
