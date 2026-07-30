import { describe, expect, it } from 'vitest'
import { PROFESSIONAL_ADVICE_DISCLAIMER } from '@/lib/guidance/professional-advice-rules'
import { adviceDossierSnapshotSchema } from './advice-dossier-contract'

export const adviceDossierSnapshotFixture = {
  originalHelpRequest:
    'Wij willen weten of onze BHV-organisatie nog passend is.',
  situationSummary:
    'U wilt weten of uw bestaande BHV-organisatie nog aansluit op de actuele risico’s.',
  subject: 'Bedrijfshulpverlening',
  adviceTitle: 'Beoordeel de BHV-organisatie opnieuw',
  adviceBody:
    'Een oud EHBO-diploma toont niet aan dat de huidige organisatie doeltreffend is.',
  adviceReasons: [
    'De organisatie moet aansluiten op risico’s, bezetting en locaties.',
  ],
  selfActions: ['Controleer bezetting, middelen en oefeningen.'],
  primaryProfessionalRequirement: {
    label: 'BHV-adviseur',
    priority: 'PRIMARY' as const,
    reason: 'Een adviseur kan de organisatie in samenhang beoordelen.',
    expertise: ['Bedrijfshulpverlening'],
    capabilityCodes: ['SAFETY_ADVICE', 'TRAINING'],
  },
  additionalProfessionalRequirements: [],
  possibleProfessionalRequirements: [],
  knowledgeReferences: [
    {
      id: 'obligation:bhv',
      title: 'Bedrijfshulpverlening organiseren',
      summary: 'Lees hoe u BHV doeltreffend organiseert.',
      href: '/wettelijke-verplichtingen/bhv',
    },
  ],
  sourceReferences: [
    {
      id: 'arbowet-current',
      title: 'Arbeidsomstandighedenwet',
      publisher: 'Overheid.nl',
      url: 'https://wetten.overheid.nl/',
    },
  ],
  uncertainties: [],
  disclaimer: PROFESSIONAL_ADVICE_DISCLAIMER,
  outcomeSpecificity: 'SPECIFIC' as const,
  completionStatus: 'COMPLETED_WITH_GUIDANCE' as const,
}

describe('AdviceDossier-snapshotcontract', () => {
  it('accepteert een volledige immutable M7B-snapshot', () => {
    expect(
      adviceDossierSnapshotSchema.parse(adviceDossierSnapshotFixture),
    ).toEqual(adviceDossierSnapshotFixture)
  })

  it('weigert een afwijkende disclaimer en extra velden', () => {
    expect(() =>
      adviceDossierSnapshotSchema.parse({
        ...adviceDossierSnapshotFixture,
        disclaimer: 'Andere tekst',
      }),
    ).toThrow()
    expect(() =>
      adviceDossierSnapshotSchema.parse({
        ...adviceDossierSnapshotFixture,
        technicalCode: 'NIET_TOEGESTAAN',
      }),
    ).toThrow()
  })

  it('leest historische secundaire deskundigheden zonder prioriteit als aanvullend', () => {
    const parsed = adviceDossierSnapshotSchema.parse({
      ...adviceDossierSnapshotFixture,
      additionalProfessionalRequirements: [
        {
          label: 'Arbeidshygiënist',
          reason: 'Historisch aanvullend advies.',
          expertise: ['Blootstellingsbeoordeling'],
        },
      ],
    })

    expect(parsed.additionalProfessionalRequirements[0]?.priority).toBe(
      'ADDITIONAL',
    )
  })

  it('bewaart primaire, aanvullende en mogelijke deskundigheden afzonderlijk', () => {
    const parsed = adviceDossierSnapshotSchema.parse({
      ...adviceDossierSnapshotFixture,
      additionalProfessionalRequirements: [
        {
          label: 'Arbeidshygiënist',
          priority: 'ADDITIONAL',
          reason: 'Beoordeelt mogelijke blootstelling.',
          expertise: ['Blootstellingsbeoordeling'],
        },
      ],
      possibleProfessionalRequirements: [
        {
          label: 'Milieudeskundige',
          priority: 'POSSIBLE',
          reason: 'Kan vergunning- en milieuaspecten beoordelen.',
          expertise: ['Omgevingswet'],
        },
      ],
    })

    expect(parsed.primaryProfessionalRequirement?.priority).toBe(
      'PRIMARY',
    )
    expect(parsed.additionalProfessionalRequirements[0]?.priority).toBe(
      'ADDITIONAL',
    )
    expect(parsed.possibleProfessionalRequirements[0]?.priority).toBe(
      'POSSIBLE',
    )
  })
})
