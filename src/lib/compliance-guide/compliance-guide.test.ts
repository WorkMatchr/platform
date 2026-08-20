import { describe, expect, it } from 'vitest'
import {
  complianceResultLabels,
  complianceStepScrollBehavior,
  evaluateComplianceGuide,
  initialComplianceGuideAnswers,
  normalizeComplianceGuideAnswers,
  summarizeComplianceResults,
  type ComplianceGuideAnswers,
} from './compliance-guide'

const allYes = {
  ...Object.fromEntries(Object.keys(initialComplianceGuideAnswers).map((key) => [key, 'YES'])),
  employeeCount: 'ONE_TO_25',
  representation: 'OR',
} as unknown as ComplianceGuideAnswers

describe('Compliance-wijzer v1', () => {
  it('levert negen onderwerpresultaten zonder algemene compliance-score', () => {
    const results = evaluateComplianceGuide(allYes)
    expect(results).toHaveLength(9)
    expect(summarizeComplianceResults(results)).toEqual({ order: 9, action: 0, check: 0, notApplicable: 0 })
    expect(JSON.stringify(results)).not.toMatch(/score|percentage|compliant/i)
    expect(results.every((result) => result.relevance.length >= 150)).toBe(true)
    expect(results.every((result) => result.nextStep.length >= 150)).toBe(true)
  })

  it('ondersteunt zowel 1–25 als meer dan 25 werknemers', () => {
    const small = evaluateComplianceGuide({ ...allYes, employeeCount: 'ONE_TO_25' })
    const large = evaluateComplianceGuide({ ...allYes, employeeCount: 'MORE_THAN_25' })
    expect(small.find((result) => result.id === 'prevention')?.explanation).toContain('maximaal 25 werknemers')
    expect(large.find((result) => result.id === 'prevention')?.explanation).not.toContain('maximaal 25 werknemers')
  })

  it.each([
    ['rie', 'actionPlan'], ['prevention', 'preventionOfficer'], ['bhv', 'bhvOrganized'],
    ['contract', 'basicContract'], ['pago', 'pagoOffered'], ['instruction', 'instruction'],
    ['consultation', 'workerConsultation'], ['accidents', 'accidentReporting'],
  ] as const)('markeert %s als Actie nodig wanneer %s ontbreekt', (resultId, answerKey) => {
    const results = evaluateComplianceGuide({ ...allYes, [answerKey]: 'NO' })
    expect(results.find((result) => result.id === resultId)?.status).toBe('ACTION')
  })

  it('maakt onderdelen niet van toepassing wanneer er geen werknemers zijn', () => {
    const results = evaluateComplianceGuide({ ...initialComplianceGuideAnswers, hasEmployees: 'NO' })
    expect(results.every((result) => result.status === 'NOT_APPLICABLE')).toBe(true)
  })

  it('blijft fail-safe bij onbekende of gemanipuleerde invoer', () => {
    const normalized = normalizeComplianceGuideAnswers({ hasEmployees: 'FORGED', employeeCount: 'A_LOT', representation: '<script>' })
    expect(normalized).toMatchObject({ hasEmployees: 'UNKNOWN', employeeCount: null, representation: null })
    expect(evaluateComplianceGuide(normalized).every((result) => result.status === 'CHECK')).toBe(true)
  })

  it('gebruikt uitsluitend de vier afgesproken klantstatussen', () => {
    expect(Object.values(complianceResultLabels)).toEqual(['Op orde', 'Actie nodig', 'Controleren', 'Niet van toepassing'])
  })

  it('respecteert reduced-motion bij stapnavigatie', () => {
    expect(complianceStepScrollBehavior(false)).toBe('smooth')
    expect(complianceStepScrollBehavior(true)).toBe('auto')
  })
})
