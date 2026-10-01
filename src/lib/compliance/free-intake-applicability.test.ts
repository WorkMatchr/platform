import { describe, expect, it } from 'vitest'
import {
  buildComplianceFreeIntakeTeaser,
  determineComplianceModuleApplicability,
  normalizeComplianceFreeIntakeAnswers,
} from '@/lib/compliance/free-intake-applicability'

describe('compliance free intake', () => {
  it('normaliseert uitsluitend bekende antwoordopties', () => {
    expect(normalizeComplianceFreeIntakeAnswers({
      'FI-01': 'YES',
      'FI-03': ['HOME', 'INVALID', 'THIRD_PARTY_LOCATIONS'],
      'FI-04': ['NONE', 'MACHINES'],
      unknown: 'YES',
    })).toEqual({
      'FI-01': 'YES',
      'FI-03': ['HOME', 'THIRD_PARTY_LOCATIONS'],
      'FI-04': ['NONE'],
    })
  })

  it('maakt kernmodules relevant voor een werkgever met werknemers', () => {
    const modules = determineComplianceModuleApplicability({ 'FI-01': 'YES' })
    const core = modules.filter((module) => module.moduleCode.startsWith('C'))
    expect(core).toHaveLength(10)
    expect(core.every((module) => module.applicability === 'RELEVANT')).toBe(true)
  })

  it('activeert risicomodules vanuit profielantwoorden', () => {
    const modules = determineComplianceModuleApplicability({
      'FI-01': 'YES',
      'FI-03': ['HOME', 'THIRD_PARTY_LOCATIONS'],
      'FI-04': ['MACHINES', 'VEHICLES'],
      'FI-05': ['HAZARDOUS_SUBSTANCES', 'ATEX'],
      'FI-06': ['DISPLAY_SCREEN'],
      'FI-07': 'YES',
      'FI-08': ['NOISE'],
      'FI-09': ['HEIGHT', 'ELECTRICAL'],
      'FI-10': ['LONE_WORK', 'NIGHT_OR_SHIFT'],
      'FI-11': 'YES',
      'FI-12': 'NO',
    })

    const byCode = new Map(modules.map((module) => [module.moduleCode, module]))
    expect(byCode.get('R01')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R03')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R05')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R06')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R09')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R10')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R11')?.applicability).toBe('NOT_APPLICABLE')
    expect(byCode.get('R13')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R14')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R15')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R16')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R20')?.applicability).toBe('RELEVANT')
    expect(byCode.get('R23')?.applicability).toBe('RELEVANT')
  })

  it('maakt UNKNOWN nooit automatisch niet van toepassing', () => {
    const modules = determineComplianceModuleApplicability({
      'FI-01': 'UNKNOWN',
      'FI-03': ['UNKNOWN'],
      'FI-04': ['UNKNOWN'],
      'FI-05': ['UNKNOWN'],
      'FI-06': ['UNKNOWN'],
      'FI-07': 'UNKNOWN',
      'FI-08': ['UNKNOWN'],
      'FI-09': ['UNKNOWN'],
      'FI-10': ['UNKNOWN'],
      'FI-11': 'UNKNOWN',
      'FI-12': 'UNKNOWN',
    })

    expect(modules.every((module) => module.applicability !== 'NOT_APPLICABLE')).toBe(true)
  })

  it('geeft alleen een teaser en geen detailbevindingen', () => {
    const teaser = buildComplianceFreeIntakeTeaser({
      'FI-01': 'YES',
      'FI-13': 'NO',
      'FI-14': 'PARTIAL',
      'FI-15': 'YES',
    })

    expect(teaser.coreSignals).toBe(2)
    expect(teaser.detailFindingsAvailable).toBe(false)
    expect(teaser.teaserText).toContain('volledige scan')
  })

  it('kan harde afwezigheid voor jongeren als niet van toepassing markeren', () => {
    const modules = determineComplianceModuleApplicability({
      'FI-01': 'YES',
      'FI-11': 'NO',
    })
    expect(modules.find((module) => module.moduleCode === 'R10')).toMatchObject({
      applicability: 'NOT_APPLICABLE',
      reasonCode: 'NO_YOUNG_WORKERS',
    })
  })
})
