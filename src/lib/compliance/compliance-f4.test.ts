import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { f4TestDefinition, f4PositiveAnswers } from '@/test-fixtures/compliance-f4'
import { v2Context, v2Definition, v2Answers } from '@/test-fixtures/compliance-v2'
import { buildComplianceV2Report, complianceChecksum, complianceV2DefinitionSchema } from './compliance-v2'
import { f4Catalog, f4LegacyQuestionMap } from './compliance-f4-catalog'
import { buildF4Definition } from './compliance-f4-definition'
import { resolveComplianceQuestions } from './compliance-question-visibility'

const definition = f4TestDefinition(), questions = definition.modules.flatMap(m => m.questions)
const report = (patch: Record<string, unknown> = {}) => buildComplianceV2Report(definition, { ...f4PositiveAnswers, ...patch }, v2Context)
describe('F4 versiegebonden catalogus en beoordeling', () => {
  it('behoudt 21 oude definities, voegt 25 toe en telt twee contextvelden apart', () => {
    const legacy = readFileSync('src/components/public/compliance-guide.tsx', 'utf8')
    const oldQuestions = [...legacy.matchAll(/\{ key: '(\w+)', label: '([^']+)'/g)]
    expect(oldQuestions).toHaveLength(21)
    for (const [, key, prompt] of oldQuestions) expect(f4Catalog.find(q => q.code === f4LegacyQuestionMap[key as keyof typeof f4LegacyQuestionMap])?.prompt).toBe(prompt)
    expect(f4Catalog).toHaveLength(48)
    expect(f4Catalog.filter(q => q.code.startsWith('CW2-'))).toHaveLength(25)
    expect(new Set(f4Catalog.map(q => q.code)).size).toBe(48)
    expect(definition.modules).toHaveLength(10)
    expect(report().summary.order).toBe(10)
    expect(() => buildF4Definition({})).toThrow(/bronbinding/)
  })
  for (const q of f4Catalog.filter(q => q.kind === 'LEGAL' || q.kind === 'RECOMMENDATION')) {
    for (const answer of ['YES', 'NO', 'PARTIAL', 'UNKNOWN']) it(`${q.code}: ${answer}`, () => {
      const result = report({ [q.code]: answer, ...(q.code === 'RIETESTING' ? { 'CW2-RIE-04': 'NO' } : {}) }).results.find(r => r.id === q.module)!
      expect(result.status).toBe(answer === 'YES' ? 'IN_ORDER' : answer === 'UNKNOWN' ? 'NOT_ASSESSED' : q.kind === 'RECOMMENDATION' ? 'ATTENTION_REQUIRED' : 'ACTION_REQUIRED')
    })
  }
  it('verbergt afhankelijke vragen en negeert hun achtergebleven antwoorden', () => {
    const raw = { ...f4PositiveAnswers, RIE: 'NO', 'CW2-RIE-01': 'NO' }
    const visibility = resolveComplianceQuestions(questions, raw)
    expect(visibility.visibleCodes).not.toContain('CW2-RIE-01')
    expect(visibility.answers['CW2-RIE-01']).toBeUndefined()
    expect(raw['CW2-RIE-01']).toBe('NO')
    expect(resolveComplianceQuestions(questions, { ...raw, RIE: 'YES' }).visibleCodes).toContain('CW2-RIE-01')
    expect(report(raw).results[0].evidence.some(e => e.ruleCode.startsWith('CW2-RIE-01'))).toBe(false)
  })
  it('behoudt bekende tekortkomingen bij onvolledige antwoorden', () => {
    const r = report({ RIE: 'UNKNOWN', 'CW2-RIE-01': 'NO' }).results[0]
    expect(r.status).toBe('ACTION_REQUIRED'); expect(r.sufficientlyAssessed).toBe(false)
    expect(r.missingQuestionCodes).toContain('RIE')
  })
  for (const scope of ['NO', 'UNKNOWN', 'VOLUNTEERS', 'OTHERS']) it(`geen algemene vrijstelling voor ${scope}`, () => {
    expect(report({ HASEMPLOYEES: scope }).results.every(r => r.status === 'NOT_ASSESSED')).toBe(true)
  })
  for (const count of ['ONE_TO_25', 'MORE_THAN_25', 'UNKNOWN']) it(`geen onbewezen toetsingsuitzondering bij ${count}`, () => {
    expect(report({ EMPLOYEECOUNT: count, RIETESTING: 'NO', 'CW2-RIE-04': 'YES' }).results[0].status).toBe('NOT_ASSESSED')
    expect(report({ EMPLOYEECOUNT: count, RIETESTING: 'UNKNOWN' }).results[0].status).toBe('NOT_ASSESSED')
  })
  it('tegenstrijdige personeelsomvang geeft geen groen', () => {
    expect(report({ HASEMPLOYEES: 'YES', EMPLOYEECOUNT: 'ZERO' }).summary.order).toBe(0)
  })
  it('erkende branche-RI&E is geen bewezen erkenning, >25 kent geen branchevrijstelling', () => {
    expect(report({ RIETESTING: 'NO', 'CW2-RIE-04': 'NO', 'CW2-RIE-05': 'RECOGNIZED_INSTRUMENT' }).results[0].status).toBe('NOT_ASSESSED')
    expect(report({ EMPLOYEECOUNT: 'MORE_THAN_25', RIETESTING: 'NO', 'CW2-RIE-04': 'NO' }).results[0].status).toBe('ACTION_REQUIRED')
  })
  it('lokale uitsluiting maakt nooit heel BHV/PSA niet van toepassing', () => {
    expect(report({ 'CW2-BHV-03': 'NO_SHARED_WORKPLACE', 'CW2-PSA-02': 'NONE_IDENTIFIED' }).summary.notApplicable).toBe(0)
    expect(report({ 'CW2-PSA-01': 'UNKNOWN', 'CW2-PSA-02': 'NONE_IDENTIFIED' }).results.find(r => r.id === 'R06')?.status).toBe('NOT_ASSESSED')
  })
  it('weigert onbekende antwoorden, vragen en cyclische afhankelijkheden', () => {
    expect(() => report({ bogus: 'YES' })).toThrow()
    expect(() => report({ RIE: 'INVALID' })).toThrow()
    const d = structuredClone(definition); d.modules[0].questions[0].visibleWhen = { question: 'HASEMPLOYEES', equals: 'YES' }
    expect(complianceV2DefinitionSchema.safeParse(d).success).toBe(false)
  })
  it('laat historische F2-definities en vijfstatusresultaten intact', () => {
    const d = v2Definition(), checksum = complianceChecksum(d)
    expect(complianceChecksum(complianceV2DefinitionSchema.parse(d))).toBe(checksum)
    expect(buildComplianceV2Report(d, v2Answers, v2Context).results.map(r => r.status)).toEqual(['IN_ORDER','ATTENTION_REQUIRED','ACTION_REQUIRED','NOT_ASSESSED','NOT_APPLICABLE'])
  })
})
