import { describe, expect, it } from 'vitest'
import { evaluateFullComplianceScan } from '@/lib/compliance/full-scan-assessment'

const baseIntake = {
  'FI-01': 'YES',
  'FI-03': ['NONE'],
  'FI-04': ['MACHINES'],
  'FI-05': ['ATEX'],
  'FI-06': ['DISPLAY_SCREEN'],
  'FI-07': 'NO',
  'FI-08': ['NOISE'],
  'FI-09': ['RADIATION'],
  'FI-10': ['NONE'],
  'FI-11': 'NO',
  'FI-12': 'NO',
}

function yesAnswers() {
  const answers: Record<string, string> = {}
  for (const code of ['C02','C03','C04','C05','C06','C07','C08','C09','C10','R01','R02','R05','R07','R19','R21','R23']) {
    for (let index = 1; index <= 3; index += 1) answers[code + '-Q' + String(index).padStart(2, '0')] = 'YES'
  }
  return answers
}

describe('full compliance scan', () => {
  it('houdt FULL, SCREENING en SPECIALIST_REQUIRED semantisch uit elkaar', () => {
    const result = evaluateFullComplianceScan({
      intakeAnswers: baseIntake,
      scanAnswers: yesAnswers(),
    })
    const byCode = new Map(result.results.map((item) => [item.moduleCode, item]))

    expect(byCode.get('C02')?.assessmentStatus).toBe('IN_ORDER')
    expect(byCode.get('R01')?.assessmentMode).toBe('SCREENING')
    expect(byCode.get('R01')?.assessmentStatus).toBe('NOT_ASSESSED')
    expect(byCode.get('R21')?.assessmentMode).toBe('SPECIALIST_REQUIRED')
    expect(byCode.get('R21')?.assessmentStatus).toBe('NOT_ASSESSED')
  })

  it('maakt een expliciet negatief antwoord actie vereist', () => {
    const result = evaluateFullComplianceScan({
      intakeAnswers: { ...baseIntake, 'FI-07': 'YES' },
      scanAnswers: { 'R06-Q01': 'NO', 'R06-Q02': 'YES', 'R06-Q03': 'YES' },
    })
    const r06 = result.results.find((item) => item.moduleCode === 'R06')
    expect(r06?.assessmentStatus).toBe('ACTION_REQUIRED')
    expect(r06?.priority).toBe('HIGH')
  })

  it('neemt harde niet-toepasselijkheid uit de intake over zonder extra vragen', () => {
    const result = evaluateFullComplianceScan({
      intakeAnswers: { ...baseIntake, 'FI-11': 'NO', 'FI-12': 'NO' },
      scanAnswers: {},
    })
    expect(result.results.find((item) => item.moduleCode === 'R10')?.assessmentStatus).toBe('NOT_APPLICABLE')
    expect(result.results.find((item) => item.moduleCode === 'R11')?.assessmentStatus).toBe('NOT_APPLICABLE')
  })

  it('maakt ontbrekende antwoorden nooit impliciet op orde', () => {
    const result = evaluateFullComplianceScan({
      intakeAnswers: { 'FI-01': 'YES' },
      scanAnswers: {},
    })
    expect(result.results.find((item) => item.moduleCode === 'C02')?.assessmentStatus).toBe('NOT_ASSESSED')
  })
})
