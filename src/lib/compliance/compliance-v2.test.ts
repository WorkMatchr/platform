import { describe, expect, it } from 'vitest'
import { buildComplianceV2Report, complianceV2ReportSchema, evaluateComplianceV2Condition, normalizeComplianceV2Answers, complianceChecksum } from './compliance-v2'
import { v2Definition, v2Context, v2Answers } from '../../test-fixtures/compliance-v2'

describe('Compliance v2, zonder interpretatie van legacy CHECK', () => {
  it('legt exact vijf statussen vast en leest ze verliesloos terug', () => {
    const report = buildComplianceV2Report(v2Definition(), v2Answers, v2Context)
    expect(report.results.map(r => r.status)).toEqual(['IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE'])
    expect(report.summary).toEqual({ order: 1, attention: 1, action: 1, notAssessed: 1, notApplicable: 1 })
    expect(complianceV2ReportSchema.parse(JSON.parse(JSON.stringify(report)))).toEqual(report)
  })
  it.each([undefined, null, '', 'UNKNOWN', 'SKIPPED_DEPENDENCY', []])('maakt onbekend %j nooit positief via negatie', value => {
    expect(evaluateComplianceV2Condition({ not: { question: 'Q1', equals: false } }, { Q1: value })).toBeNull()
    expect(evaluateComplianceV2Condition({ question: 'Q1', notEquals: false }, { Q1: value })).toBeNull()
    expect(buildComplianceV2Report(v2Definition(), value === undefined ? {} : { Q1: value }, v2Context).results[0].status).toBe('NOT_ASSESSED')
  })
  it('behoudt een tekortkoming ondanks ontbrekende informatie en conflicterende uitsluiting', () => {
    const d = v2Definition(); const m = d.modules[2]
    m.questions.push({ ...m.questions[0], id: '20000000-0000-4000-8000-000000000099', code: 'Q99' })
    m.rules.push({ ...m.rules[0], id: '30000000-0000-4000-8000-000000000099', code: 'EXCLUDE', status: 'NOT_APPLICABLE', applicability: 'NOT_APPLICABLE' })
    const r = buildComplianceV2Report(d, v2Answers, v2Context).results[2]
    expect(r.status).toBe('ACTION_REQUIRED'); expect(r.sufficientlyAssessed).toBe(false)
    expect(r.missingQuestionCodes).toEqual(['Q99'])
  })
  it('weigert uitsluiting door negatie en onbekende/ongedekte positieve vragen', () => {
    const d = v2Definition(); d.modules[4].rules[0].condition = { not: { question: 'Q5', equals: false } }
    expect(buildComplianceV2Report(d, v2Answers, v2Context).results[4].status).toBe('NOT_ASSESSED')
    d.modules[0].questions.push({ ...d.modules[0].questions[0], id: '20000000-0000-4000-8000-000000000099', code: 'Q99' })
    expect(buildComplianceV2Report(d, { ...v2Answers, Q99: true }, v2Context).results[0].status).toBe('NOT_ASSESSED')
  })
  it('normaliseert alleen v2-setantwoorden en weigert onbekende codes/waarden', () => {
    expect(normalizeComplianceV2Answers({ x: ['b', 'a', 'b'] })).toEqual({ x: ['a', 'b'] })
    expect(() => buildComplianceV2Report(v2Definition(), { UNKNOWN_CODE: true }, v2Context)).toThrow()
    expect(() => buildComplianceV2Report(v2Definition(), { Q1: 'YES' }, v2Context)).toThrow()
    expect(() => buildComplianceV2Report(v2Definition(), { Q1: [true, 'UNKNOWN'] }, v2Context)).toThrow()
  })
  it('behoudt aandacht bij onvolledigheid en blokkeert uitsluiting die specialistbeoordeling vereist', () => {
    const d = v2Definition()
    d.modules[1].questions.push({ ...d.modules[1].questions[0], id: '20000000-0000-4000-8000-000000000099', code: 'Q99' })
    d.modules[4].rules[0].mode = 'SPECIALIST_REQUIRED'
    d.modules[0].rules[0].applicability = 'POSSIBLY_RELEVANT'
    const r = buildComplianceV2Report(d, v2Answers, v2Context)
    expect(r.results[1].status).toBe('ATTENTION_REQUIRED')
    expect(r.results[1].sufficientlyAssessed).toBe(false)
    expect(r.results[4].status).toBe('NOT_ASSESSED')
    expect(r.results[0].status).toBe('NOT_ASSESSED')
  })
  it('bindt bronnen, regels en vragen aan de checksum en valideert telling/labels', () => {
    const d = v2Definition(), original = complianceChecksum(d)
    d.modules[0].rules[0].sources[0].sourceChecksum = 'b'.repeat(64)
    expect(complianceChecksum(d)).not.toBe(original)
    const r = buildComplianceV2Report(d, v2Answers, v2Context)
    expect(complianceV2ReportSchema.safeParse({ ...r, summary: { ...r.summary, order: 8 } }).success).toBe(false)
    r.results[0].statusLabel = 'Gecertificeerd'
    expect(complianceV2ReportSchema.safeParse(r).success).toBe(false)
  })
  it('behoudt een oud rapport wanneer een afzonderlijke v2-frameworkrevisie verschijnt', () => {
    const d = v2Definition(), old = buildComplianceV2Report(d, v2Answers, v2Context), before = JSON.stringify(old)
    d.id = '10000000-0000-4000-8000-000000000002'; d.version = '2.1'
    d.modules[0].rules[0].explanation = 'Nieuwe synthetische uitleg.'
    const revised = buildComplianceV2Report(d, v2Answers, v2Context)
    expect(revised.framework.version).toBe('2.1')
    expect(revised.framework.checksum).not.toBe(old.framework.checksum)
    expect(JSON.stringify(complianceV2ReportSchema.parse(old))).toBe(before)
    expect(complianceV2ReportSchema.safeParse({ ...old, framework: revised.framework }).success).toBe(false)
    d.version = '3'
    expect(() => buildComplianceV2Report(d, v2Answers, v2Context)).toThrow()
  })
})
