import { describe, expect, it } from 'vitest'
import { evaluateComplianceCondition, evaluateComplianceRules } from '@/lib/compliance/rule-engine'
import { aggregateComplianceModule } from '@/lib/compliance/module-aggregation'

describe('compliance rule engine', () => {
  it('evalueert equals, includes, all, any en not deterministisch', () => {
    const answers = {
      'RIE-001': 'NO',
      'RISK-SET': ['CHEMICALS', 'HEIGHT'],
      'COUNT': 12,
    } as const

    expect(evaluateComplianceCondition({ question: 'RIE-001', equals: 'NO' }, answers)).toBe(true)
    expect(evaluateComplianceCondition({ question: 'RISK-SET', includes: 'CHEMICALS' }, answers)).toBe(true)
    expect(evaluateComplianceCondition({
      all: [
        { question: 'RIE-001', equals: 'NO' },
        { any: [
          { question: 'COUNT', equals: 12 },
          { question: 'COUNT', equals: 25 },
        ] },
      ],
    }, answers)).toBe(true)
    expect(evaluateComplianceCondition({ not: { question: 'RIE-001', equals: 'YES' } }, answers)).toBe(true)
  })

  it('weigert regels met meerdere vraagoperators', () => {
    expect(() => evaluateComplianceRules([{
      code: 'BAD',
      moduleCode: 'C01',
      condition: { question: 'RIE-001', equals: 'NO', exists: true },
      assessmentStatus: 'ACTION_REQUIRED',
      priority: 'HIGH',
      assessmentMode: 'FULL',
      findingCode: 'BAD',
      findingTitle: 'Bad',
      findingBody: 'Bad',
      position: 1,
    }], { 'RIE-001': 'NO' })).toThrow()
  })

  it('UNKNOWN wordt niet impliciet groen', () => {
    const rules = evaluateComplianceRules([{
      code: 'RIE-UNKNOWN',
      moduleCode: 'C01',
      condition: { question: 'RIE-001', equals: 'UNKNOWN' },
      assessmentStatus: 'ATTENTION_REQUIRED',
      priority: 'HIGH',
      assessmentMode: 'FULL',
      findingCode: 'RIE_UNKNOWN',
      findingTitle: 'Niet vastgesteld',
      findingBody: 'Niet vastgesteld of een RI&E aanwezig is.',
      recommendedAction: 'Controleer of een actuele RI&E aanwezig is.',
      position: 1,
    }], { 'RIE-001': 'UNKNOWN' })

    expect(rules).toHaveLength(1)
    expect(rules[0]?.assessmentStatus).toBe('ATTENTION_REQUIRED')
  })

  it('sorteert matches stabiel op position en code', () => {
    const rules = evaluateComplianceRules([
      {
        code: 'B',
        moduleCode: 'C01',
        condition: { question: 'Q', equals: 'YES' },
        applicability: 'RELEVANT',
        assessmentMode: 'FULL',
        position: 2,
      },
      {
        code: 'A',
        moduleCode: 'C01',
        condition: { question: 'Q', equals: 'YES' },
        applicability: 'RELEVANT',
        assessmentMode: 'FULL',
        position: 1,
      },
    ], { Q: 'YES' })

    expect(rules.map((rule) => rule.code)).toEqual(['A', 'B'])
  })
})

describe('compliance module aggregation', () => {
  it('maakt NOT_APPLICABLE alleen bij harde not-applicable rules', () => {
    const result = aggregateComplianceModule({
      moduleCode: 'R10',
      matchedRules: [{
        code: 'NO-YOUTH',
        moduleCode: 'R10',
        applicability: 'NOT_APPLICABLE',
        assessmentMode: 'FULL',
        position: 1,
      }],
      requiredQuestionCodes: [],
      answeredQuestionCodes: new Set(),
    })

    expect(result.applicability).toBe('NOT_APPLICABLE')
    expect(result.assessmentStatus).toBe('NOT_APPLICABLE')
    expect(result.sufficientlyAssessed).toBe(true)
  })

  it('houdt een relevante module NOT_ASSESSED bij ontbrekende verplichte vragen', () => {
    const result = aggregateComplianceModule({
      moduleCode: 'C01',
      matchedRules: [{
        code: 'CORE-RELEVANT',
        moduleCode: 'C01',
        applicability: 'RELEVANT',
        assessmentMode: 'FULL',
        position: 1,
      }],
      requiredQuestionCodes: ['RIE-001'],
      answeredQuestionCodes: new Set(),
    })

    expect(result.applicability).toBe('RELEVANT')
    expect(result.assessmentStatus).toBe('NOT_ASSESSED')
    expect(result.sufficientlyAssessed).toBe(false)
  })

  it('laat een concrete rode bevinding staan ondanks specialistische verdieping', () => {
    const result = aggregateComplianceModule({
      moduleCode: 'R03',
      matchedRules: [
        {
          code: 'CHEMICALS-MISSING-INVENTORY',
          moduleCode: 'R03',
          applicability: 'RELEVANT',
          assessmentStatus: 'ACTION_REQUIRED',
          priority: 'HIGH',
          assessmentMode: 'FULL',
          findingCode: 'CHEMICALS_MISSING',
          findingTitle: 'Stoffeninventarisatie ontbreekt',
          findingBody: 'De organisatie geeft aan met gevaarlijke stoffen te werken zonder volledige inventarisatie.',
          position: 1,
        },
        {
          code: 'CHEMICALS-MEASUREMENT',
          moduleCode: 'R03',
          applicability: 'RELEVANT',
          assessmentStatus: 'NOT_ASSESSED',
          priority: 'HIGH',
          assessmentMode: 'SPECIALIST_REQUIRED',
          findingCode: 'MEASUREMENT_REQUIRED',
          findingTitle: 'Nadere beoordeling nodig',
          findingBody: 'Een specialistische blootstellingsbeoordeling is nodig.',
          position: 2,
        },
      ],
      requiredQuestionCodes: [],
      answeredQuestionCodes: new Set(),
    })

    expect(result.assessmentStatus).toBe('ACTION_REQUIRED')
    expect(result.priority).toBe('HIGH')
    expect(result.assessmentMode).toBe('SPECIALIST_REQUIRED')
    expect(result.sufficientlyAssessed).toBe(false)
  })

  it('kiest de zwaarste prioriteit onafhankelijk van status', () => {
    const result = aggregateComplianceModule({
      moduleCode: 'C01',
      matchedRules: [
        {
          code: 'A',
          moduleCode: 'C01',
          assessmentStatus: 'ATTENTION_REQUIRED',
          priority: 'CRITICAL',
          assessmentMode: 'FULL',
          findingCode: 'A',
          findingTitle: 'A',
          findingBody: 'A',
          position: 1,
        },
        {
          code: 'B',
          moduleCode: 'C01',
          assessmentStatus: 'ACTION_REQUIRED',
          priority: 'NORMAL',
          assessmentMode: 'FULL',
          findingCode: 'B',
          findingTitle: 'B',
          findingBody: 'B',
          position: 2,
        },
      ],
      requiredQuestionCodes: [],
      answeredQuestionCodes: new Set(),
    })

    expect(result.assessmentStatus).toBe('ACTION_REQUIRED')
    expect(result.priority).toBe('CRITICAL')
  })
})
