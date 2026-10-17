import { describe, expect, it } from 'vitest'
import type { IntakeAnswers } from './free-intake-v2'
import { sectors } from '@/content/sectors'
import { complianceFreeIntakeModuleTitles } from './free-intake'
import { employeeScopeConflict, freeIntakeV2Error, freeIntakeV2Questions as questions, normalizeFreeIntakeV2, orientFreeIntakeV2, toggleFreeIntakeV2 } from './free-intake-v2'

describe('FREE_INTAKE/2.0 — expliciete signalen, geen beoordeling', () => {
  it('heeft exact vijf unieke hoofdvragen en bestaande zes sectoridentiteiten', () => {
    expect(questions.map(q => q.code)).toEqual(['FI2-01', 'FI2-02', 'FI2-03', 'FI2-04', 'FI2-05'])
    expect(questions.map(q => q.options.length)).toEqual([5, 8, 4, 28, 12])
    expect(questions[1].options.slice(0, 6).map(o => o.value)).toEqual(sectors.map(s => s.id))
    for (const q of questions) expect(new Set(q.options.map(o => o.value)).size).toBe(q.options.length)
  })
  it.each(questions.flatMap(q => q.options.map(o => [q.code, q.multiple, o.value] as const)))('valideert %s %s %s', (code, multiple, value) => {
    expect(normalizeFreeIntakeV2({ [code]: multiple ? [value] : value })[code]).toEqual(multiple ? [value] : value)
  })
  it.each(['NONE_RECOGNIZED', 'UNKNOWN', 'OTHER'])('sluit zonder positief signaal %s geen enkele module uit', value => {
    const r = orientFreeIntakeV2({ 'FI2-01': 'NONE', 'FI2-04': [value] })
    expect(r.modules.map(m => m.code).sort()).toEqual(Object.keys(complianceFreeIntakeModuleTitles).sort())
    expect(r.relevant).toBe(0); expect(r.possiblyRelevant).toBe(33)
    expect(JSON.stringify(r)).not.toMatch(/NOT_APPLICABLE|IN_ORDER|ACTION_REQUIRED/)
  })
  it('houdt onbekend/ontbrekend/tegenstrijdig conservatief', () => {
    const cases: IntakeAnswers[] = [{}, { 'FI2-04': ['MACHINES', 'UNKNOWN'] }, { 'FI2-04': ['MACHINES', 'invalid'] }, { 'FI2-01': 'EMPLOYEES', 'FI2-03': 'ZERO' }]
    for (const raw of cases) expect(orientFreeIntakeV2(raw).relevant).toBe(0)
    expect(normalizeFreeIntakeV2({ email: 'synthetic@example.invalid', 'FI-01': 'YES' })).toEqual({})
  })
  it('sector/interesse verandert geen relevantie; interesse ordent uitsluitend', () => {
    const first = orientFreeIntakeV2({}), second = orientFreeIntakeV2({ 'FI2-02': ['sector:bouw'], 'FI2-05': ['BHV'] })
    expect(second.modules[0].code).toBe('C05')
    expect(Object.fromEntries(second.modules.map(m => [m.code, m.applicability]))).toEqual(Object.fromEntries(first.modules.map(m => [m.code, m.applicability])))
  })
  it('neemt alle 23 risicomappings mee, PBM blijft onzeker en PSA blijft zichtbaar', () => {
    const r = orientFreeIntakeV2({ 'FI2-01': 'EMPLOYEES', 'FI2-04': questions[3].options.map(o => o.value).filter(v => !['UNKNOWN', 'NONE_RECOGNIZED'].includes(v)) })
    expect(r.relevant).toBe(32); expect(r.modules.find(m => m.code === 'R02')?.applicability).toBe('POSSIBLY_RELEVANT')
    expect(orientFreeIntakeV2({ 'FI2-01': 'EMPLOYEES' }).modules.find(m => m.code === 'R06')?.applicability).toBe('POSSIBLY_RELEVANT')
  })
  it.each([['HOME', ['R05', 'R18']], ['ATEX', ['R19', 'R23']], ['FIRE', ['R19']], ['HAZARDOUS_SUBSTANCES', ['R03']], ['MULTIPLE_LOCATIONS', []]] as const)('positief signaal %s heeft alleen bedoelde mapping', (value, codes) => {
    expect(orientFreeIntakeV2({ 'FI2-04': [value] }).modules.filter(m => m.applicability === 'RELEVANT').map(m => m.code)).toEqual(codes)
  })
  it.each(['NONE', 'VOLUNTEERS_ONLY', 'OTHERS_UNDER_AUTHORITY'])('bewaakt aantal bij %s zonder automatische vrijstelling', scope => {
    expect(employeeScopeConflict({ 'FI2-01': scope, 'FI2-03': 'ONE_TO_25' })).toBe(true)
    expect(employeeScopeConflict({ 'FI2-01': scope, 'FI2-03': 'ZERO' })).toBe(false)
  })
  it('valideert exclusieve keuzes en levert herstelmelding', () => {
    expect(freeIntakeV2Error({}, 'FI2-01')).toContain('Kies een antwoord')
    expect(freeIntakeV2Error({ 'FI2-01': 'EMPLOYEES', 'FI2-03': 'ZERO' }, 'FI2-03')).toContain('spreken elkaar tegen')
    expect(toggleFreeIntakeV2(questions[3], ['MACHINES'], 'UNKNOWN')).toEqual(['UNKNOWN'])
    expect(toggleFreeIntakeV2(questions[3], ['UNKNOWN'], 'FIRE')).toEqual(['FIRE'])
    expect(toggleFreeIntakeV2(questions[3], ['FIRE'], 'OTHER')).toEqual(['FIRE', 'OTHER'])
  })
})
