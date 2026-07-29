import { describe, expect, it } from 'vitest'
import { getAIIntakeUnderstanding } from './public-intake-ai-presentation'

describe('AI-begripsvoorstel in Public Intake', () => {
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
