import { describe, expect, it } from 'vitest'
import { bhvBooleanKeys, bhvResultCodes, evaluateBhvGuide, initialBhvGuideAnswers, normalizeBhvGuideAnswers, selectBhvScenarios, type BhvGuideAnswers } from './bhv-guide'

const allYes = { ...Object.fromEntries(bhvBooleanKeys.map((key) => [key, 'YES'])), employeeCount: 40, maximumPresent: 60, trainedBhvCount: 8, minimumBhvPresent: 3 } as BhvGuideAnswers

describe('BHV-wijzer v1', () => {
  it('levert de tien gestandaardiseerde onderwerpen zonder ratio of exact capaciteitsadvies', () => {
    const results = evaluateBhvGuide(allYes)
    expect(results.map((result) => result.id)).toEqual(bhvResultCodes)
    expect(JSON.stringify(results)).not.toMatch(/1\s*(op|:|per)\s*\d|exact aantal|percentage/i)
  })

  it('selecteert algemene en risicospecifieke scenario’s deterministisch', () => {
    const base = selectBhvScenarios(normalizeBhvGuideAnswers({ hazardousSubstances: 'NO', confinedSpaces: 'NO' }))
    const expanded = selectBhvScenarios(normalizeBhvGuideAnswers({ hazardousSubstances: 'YES', confinedSpaces: 'YES' }))
    expect(base.map((item) => item.id)).toEqual(['MEDICAL_EMERGENCY', 'INJURY', 'FIRE', 'EVACUATION'])
    expect(expanded.map((item) => item.id)).toContain('HAZARDOUS_RELEASE')
    expect(expanded.map((item) => item.id)).toContain('CONFINED_SPACE')
    expect(selectBhvScenarios(normalizeBhvGuideAnswers({ hazardousSubstances: 'YES', confinedSpaces: 'YES' }))).toEqual(expanded)
  })

  it('markeert ontbrekende feitelijke dekking als Actie nodig, ook bij opgeleide BHV’ers', () => {
    const result = evaluateBhvGuide({ ...allYes, coverageNormal: 'NO', trainedBhvCount: 12 }).find((item) => item.id === 'AVAILABILITY_COVERAGE')
    expect(result?.status).toBe('ACTION')
  })

  it('markeert onbekende antwoorden als Controleren en negatieve antwoorden als Actie nodig', () => {
    expect(evaluateBhvGuide(initialBhvGuideAnswers).every((result) => result.status === 'CHECK')).toBe(true)
    expect(evaluateBhvGuide({ ...allYes, exercisesHeld: 'NO' }).find((item) => item.id === 'TRAINING_EXERCISES')?.status).toBe('ACTION')
  })

  it('schrijft bij bijzondere risico’s geen specialistisch middel voor maar verlangt beoordeling', () => {
    const result = evaluateBhvGuide({ ...allYes, confinedSpaces: 'YES', scenarioSpecificMeansAssessed: 'NO' }).find((item) => item.id === 'EQUIPMENT_PROVISIONS')
    expect(result?.status).toBe('ACTION')
    expect(result?.explanation).toContain('deskundigheid')
  })

  it('normaliseert ongeldige waarden fail-safe', () => {
    const normalized = normalizeBhvGuideAnswers({ employeeCount: -1, maximumPresent: 1.5, trained: 'MAYBE' })
    expect(normalized.employeeCount).toBeNull()
    expect(normalized.maximumPresent).toBeNull()
    expect(normalized.trained).toBe('UNKNOWN')
  })
})
