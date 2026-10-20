import { describe, expect, it } from 'vitest'
import { complianceFreeIntakeModuleTitles } from './free-intake'
import { freeIntakeV2Questions, orientFreeIntakeV2, type IntakeAnswers } from './free-intake-v2'
import { FREE_INTAKE_SHORTLIST_LIMIT, freeIntakeV2DisplayQuestions, presentFreeIntakeV2 } from './free-intake-v2-presentation'

describe('F3 compacte oriëntatie — uitsluitend presentatie', () => {
  it('behoudt het versiegebonden antwoordcontract en wijzigt alleen FI2-04-presentatie', () => {
    for (const [index, question] of freeIntakeV2Questions.entries()) {
      const display = freeIntakeV2DisplayQuestions[index]
      expect(display.code).toBe(question.code)
      expect(display.multiple).toBe(question.multiple)
      expect(display.exclusive).toEqual(question.exclusive)
      expect(display.options.map(o => o.value).sort()).toEqual(question.options.map(o => o.value).sort())
      if (question.code !== 'FI2-04') expect(display).toBe(question)
    }
  })
  const allSignals = freeIntakeV2Questions[3].options.map(o => o.value).filter(v => !['NONE_RECOGNIZED', 'UNKNOWN'].includes(v))
  const allInterests = freeIntakeV2Questions[4].options.map(o => o.value).filter(v => !['GENERAL', 'UNKNOWN'].includes(v))
  it.each<IntakeAnswers>([
    {}, { 'FI2-01': 'UNKNOWN', 'FI2-04': ['UNKNOWN'], 'FI2-05': ['UNKNOWN'] },
    { 'FI2-01': 'NONE', 'FI2-03': 'ZERO', 'FI2-04': ['NONE_RECOGNIZED'] },
    { 'FI2-04': ['OTHER'] }, { 'FI2-04': ['UNKNOWN', 'MACHINES'] },
  ])('maakt zonder concrete aanleiding geen schijnselectie of vrijstelling: %j', answers => {
    const result = presentFreeIntakeV2(answers)
    expect(result.shortlist).toEqual([])
    expect(result.remaining).toHaveLength(33)
    expect(result.remaining.every(m => m.applicability === 'POSSIBLY_RELEVANT')).toBe(true)
  })
  it('prioriteert interesse, concrete signalen, daarna personeel; geeft specifieke redenen', () => {
    const result = presentFreeIntakeV2({ 'FI2-01': 'EMPLOYEES', 'FI2-04': ['NOISE', 'MACHINES'], 'FI2-05': ['BHV'] })
    expect(result.shortlist.map(m => m.code)).toEqual(['C05', 'R01', 'R07', 'C01', 'C02', 'C03'])
    expect(result.shortlist[0].explanation).toContain('informatiebehoefte')
    expect(result.shortlist[1].explanation).toContain('Machines')
    expect(result.shortlist[2].explanation).toContain('Lawaai')
    expect(new Set(result.shortlist.map(m => m.explanation)).size).toBe(6)
    expect(result.remaining).toHaveLength(27)
  })
  it('verandert interesse nooit in bewijs van toepasselijkheid', () => {
    const result = presentFreeIntakeV2({ 'FI2-01': 'UNKNOWN', 'FI2-05': ['BHV'] })
    expect(result.shortlist.map(m => m.code)).toEqual(['C05'])
    expect(result.shortlist[0].applicability).toBe('POSSIBLY_RELEVANT')
    expect(result.shortlist[0].explanation).not.toContain('werknemers in dienst')
  })
  it('toont meerdere locaties als aanleiding, zonder die keuze tot werkgeversbewijs te maken', () => {
    const result = presentFreeIntakeV2({ 'FI2-04': ['MULTIPLE_LOCATIONS'] })
    expect(result.shortlist.map(m => m.code)).toEqual(['C01', 'C05'])
    expect(result.shortlist.every(m => m.explanation.includes('meerdere locaties'))).toBe(true)
    expect(result.shortlist.every(m => m.applicability === 'POSSIBLY_RELEVANT')).toBe(true)
  })
  it('houdt alle 33 onderwerpen éénmaal, ook bij veel signalen en omgekeerde antwoordvolgorde', () => {
    const answers = { 'FI2-01': 'EMPLOYEES', 'FI2-04': allSignals, 'FI2-05': allInterests }
    const result = presentFreeIntakeV2(answers)
    expect(result.shortlist).toHaveLength(FREE_INTAKE_SHORTLIST_LIMIT)
    expect(presentFreeIntakeV2({ ...answers, 'FI2-04': [...allSignals].reverse(), 'FI2-05': [...allInterests].reverse() })).toEqual(result)
    const combined = [...result.shortlist, ...result.remaining]
    expect(combined.map(m => m.code).sort()).toEqual(Object.keys(complianceFreeIntakeModuleTitles).sort())
    expect(Object.fromEntries(combined.map(m => [m.code, m.applicability]))).toEqual(Object.fromEntries(orientFreeIntakeV2(answers).modules.map(m => [m.code, m.applicability])))
  })
  it('leidt geen nieuwe onderwerpen af uit een sector of brede interesse in andere risico’s', () => {
    expect(presentFreeIntakeV2({ 'FI2-02': ['sector:industrie'], 'FI2-05': ['OTHER_RISKS'] }).shortlist).toEqual([])
  })
})
