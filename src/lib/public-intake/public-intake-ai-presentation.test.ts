import { describe, expect, it } from 'vitest'
import { getAIIntakeUnderstanding, getPublicIntakeDirection } from './public-intake-ai-presentation'
import type { MatchingReadyProfile } from './case-understanding'

describe('AI-begripsvoorstel in Public Intake', () => {
  const legacy = { summary: 'U wilt de gewijzigde machine laten beoordelen.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
  it('toont primaire expertise zonder specialisme in plaats van legacy RI&E', () => {
    const profile = { primaryExpertise: 'MACHINEVEILIGHEIDSDESKUNDIGE', requiredSpecialisms: [] } as unknown as MatchingReadyProfile
    expect(getPublicIntakeDirection(legacy, profile)).toEqual({
      code: 'MACHINEVEILIGHEIDSDESKUNDIGE', label: 'Machineveiligheidsdeskundige', source: 'EXPERT_ROUTING',
    })
  })

  it('combineert primaire expertise met één vereist specialisme', () => {
    const profile = {
      primaryExpertise: 'ARBEIDSHYGIENIST',
      requiredSpecialisms: ['INDOOR_ENVIRONMENT'],
    } as unknown as MatchingReadyProfile
    expect(getPublicIntakeDirection(legacy, profile)).toEqual({
      code: 'ARBEIDSHYGIENIST', label: 'Arbeidshygiënist / binnenmilieu', source: 'EXPERT_ROUTING',
    })
  })

  it('combineert meerdere vereiste specialismen in een leesbare vaste volgorde', () => {
    const profile = {
      primaryExpertise: 'MACHINEVEILIGHEIDSDESKUNDIGE',
      requiredSpecialisms: ['MACHINE_SAFETY', 'CE_MARKING'],
    } as unknown as MatchingReadyProfile
    expect(getPublicIntakeDirection(legacy, profile)).toEqual({
      code: 'MACHINEVEILIGHEIDSDESKUNDIGE',
      label: 'Machineveiligheidsdeskundige / machineveiligheid / CE-markering',
      source: 'EXPERT_ROUTING',
    })
  })

  it('gebruikt legacy uitsluitend bij een ontbrekend routingprofiel', () => {
    expect(getPublicIntakeDirection(legacy, null)?.source).toBe('LEGACY_COMPATIBILITY')
    expect(getPublicIntakeDirection(legacy, { primaryExpertise: 'FUTURE_DISCIPLINE', requiredSpecialisms: [] } as unknown as MatchingReadyProfile)).toMatchObject({
      code: 'FUTURE_DISCIPLINE', source: 'EXPERT_ROUTING', label: 'Deskundigheidsrichting wordt gecontroleerd',
    })
  })
  it('bouwt bij hoge confidence één controleerbaar voorstel', () => {
    expect(
      getAIIntakeUnderstanding({
        summary:
          'U wilt weten hoe veilig werken met gevaarlijke stoffen kan worden georganiseerd.',
        primarySubject: 'HAZARDOUS_SUBSTANCES',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: ['INCIDENT'],
      }),
    ).toEqual({
      summary:
        'U wilt weten hoe veilig werken met gevaarlijke stoffen kan worden georganiseerd.',
      subjectCode: 'HAZARDOUS_SUBSTANCES',
      subjectLabel: 'Gevaarlijke stoffen of brandstof',
    })
  })

  it.each([
    {
      label: 'onbekend onderwerp',
      primarySubject: 'UNKNOWN' as const,
      confidence: 'HIGH' as const,
    },
    {
      label: 'lage confidence',
      primarySubject: 'RIE' as const,
      confidence: 'LOW' as const,
    },
  ])('bouwt bij $label geen bevestiging', (input) => {
    expect(
      getAIIntakeUnderstanding({
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: input.primarySubject,
        secondarySubjects: [],
        confidence: input.confidence,
        alternatives: [],
      }),
    ).toBeNull()
  })

  it('presenteert gezondheid in begrijpelijke producttaal', () => {
    expect(
      getAIIntakeUnderstanding({
        summary:
          'U wilt weten welke gevolgen een slechte chauffeursstoel kan hebben voor de fysieke belasting.',
        primarySubject: 'OCCUPATIONAL_HEALTH',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: [],
      }),
    ).toEqual({
      summary:
        'U wilt weten welke gevolgen een slechte chauffeursstoel kan hebben voor de fysieke belasting.',
      subjectCode: 'OCCUPATIONAL_HEALTH',
      subjectLabel: 'Gezondheid en fysieke belasting',
    })
  })

  it('weigert een onbruikbaar korte samenvatting', () => {
    expect(
      getAIIntakeUnderstanding({
        summary: 'Te kort',
        primarySubject: 'RIE',
        secondarySubjects: [],
        confidence: 'HIGH',
        alternatives: [],
      }),
    ).toBeNull()
  })
})
