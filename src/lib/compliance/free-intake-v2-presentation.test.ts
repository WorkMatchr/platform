import { describe, expect, it } from 'vitest'
import { complianceFreeIntakeModuleTitles } from './free-intake'
import { freeIntakeV2Questions, orientFreeIntakeV2, type IntakeAnswers } from './free-intake-v2'
import { FREE_INTAKE_SHORTLIST_LIMIT, freeIntakeV2DisplayQuestions, presentFreeIntakeV2 } from './free-intake-v2-presentation'
import { freeIntakeV2Guidance } from './free-intake-v2-guidance'

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
    expect(result.shortlist.map(m => m.code)).toEqual(['C05', 'R01', 'R07', 'C01'])
    expect(result.shortlist[0].explanation).toContain('informatiebehoefte')
    expect(result.shortlist[1].explanation).toContain('Machines')
    expect(result.shortlist[2].explanation).toContain('Lawaai')
    expect(new Set(result.shortlist.map(m => m.explanation)).size).toBe(4)
    expect(result.remaining).toHaveLength(29)
    expect(result.shortlist.map(m => m.category)).toEqual(['Algemene werkgeversbasis', 'Herkende werksituatie', 'Herkende werksituatie', 'Algemene werkgeversbasis'])
  })
  it('verandert interesse nooit in bewijs van toepasselijkheid', () => {
    const result = presentFreeIntakeV2({ 'FI2-01': 'UNKNOWN', 'FI2-05': ['BHV'] })
    expect(result.shortlist.map(m => m.code)).toEqual(['C05'])
    expect(result.shortlist[0].applicability).toBe('POSSIBLY_RELEVANT')
    expect(result.shortlist[0].category).toBe('Uw informatiebehoefte')
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
  it('biedt alle 33 onderwerpen concrete, verschillende controlepunten en primaire toelichting', () => {
    expect(Object.keys(freeIntakeV2Guidance).sort()).toEqual(Object.keys(complianceFreeIntakeModuleTitles).sort())
    const topics = Object.values(freeIntakeV2Guidance)
    expect(new Set(topics.map(topic => topic.check)).size).toBe(33)
    expect(new Set(topics.map(topic => topic.next)).size).toBe(33)
    for (const topic of topics) {
      expect(topic.about.length).toBeGreaterThan(30)
      expect(topic.check.endsWith('?')).toBe(true)
      expect(topic.next.length).toBeGreaterThan(30)
      const source = new URL(topic.source)
      expect(source.protocol).toBe('https:')
      expect(['www.arboportaal.nl', 'www.nlarbeidsinspectie.nl']).toContain(source.hostname)
      expect(`${topic.about} ${topic.check} ${topic.next}`).not.toMatch(/u voldoet|u bent vrijgesteld|uw organisatie is veilig/i)
    }
    expect(freeIntakeV2Guidance.C01.about).toContain('alleen bepaalt niet')
    expect(freeIntakeV2Guidance.C06.about).toContain('vrijwillig')
    expect(freeIntakeV2Guidance.C09.about).toContain('overlijden, ziekenhuisopname of blijvend letsel')
  })
  it.each(freeIntakeV2Questions[0].options.flatMap(scope => freeIntakeV2Questions[2].options.map(count => [scope.value, count.value])))('behoudt toepasselijkheid en alle onderwerpen bij personeel %s / aantal %s', (scope, count) => {
    // Cover every personnel/count pair, each risk option and each information interest.
    for (const risk of freeIntakeV2Questions[3].options) for (const interest of freeIntakeV2Questions[4].options) {
      const answers = { 'FI2-01': scope, 'FI2-03': count, 'FI2-04': [risk.value], 'FI2-05': [interest.value] }
      const result = presentFreeIntakeV2(answers)
      const topics = [...result.shortlist, ...result.remaining]
      expect(topics).toHaveLength(33)
      expect(new Set(topics.map(topic => topic.code)).size).toBe(33)
      expect(result.shortlist.length).toBeLessThanOrEqual(4)
      expect(Object.fromEntries(topics.map(topic => [topic.code, topic.applicability]))).toEqual(Object.fromEntries(orientFreeIntakeV2(answers).modules.map(topic => [topic.code, topic.applicability])))
      if (scope !== 'EMPLOYEES' || count === 'ZERO') expect(topics.some(topic => topic.category === 'Algemene werkgeversbasis')).toBe(false)
    }
  })
})
