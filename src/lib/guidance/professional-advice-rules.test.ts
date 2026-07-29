import { describe, expect, it } from 'vitest'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from './guidance-contract'
import { guidanceEngine } from './guidance-engine'
import {
  PROFESSIONAL_ADVICE_DISCLAIMER,
  PROFESSIONAL_ADVICE_RULE_SET_VERSION,
} from './professional-advice-rules'

const timestamp = '2026-07-29T10:00:00.000Z'
const provenance = {
  sources: [],
  rules: [],
} as const

function contract(
  situationCode: string,
  helpRequest: string,
  facts: GuidanceContract['facts'] = [],
): GuidanceContract {
  return {
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: `contract:${situationCode}:${helpRequest.length}`,
    version: 1,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'professional-advice-test',
      version: '1',
    },
    questionSetVersion: 'public-intake/1.0.0',
    situation: {
      code: situationCode,
      description: helpRequest,
      provenance,
    },
    helpRequest: {
      originalInput: helpRequest,
      confirmedDescription: null,
      confirmation: { status: 'UNCONFIRMED' },
    },
    facts,
    uncertainties: [],
    createdAt: timestamp,
  }
}

describe('M7B Professional Advice-ruleset', () => {
  it('bouwt voor RI&E concreet en niet leeg advies', () => {
    const outcome = guidanceEngine.evaluate(
      contract('RIE', 'Wij willen onze RI&E actualiseren.'),
    )

    expect(outcome.professionalAdvice).toMatchObject({
      outcomeSpecificity: 'SPECIFIC',
      primaryProfessionalRequirement: {
        professionalType: 'RIE_ADVISOR',
        priority: 'PRIMARY',
      },
    })
    expect(outcome.professionalAdvice.adviceReasons.length).toBeGreaterThan(0)
    expect(outcome.professionalAdvice.selfActions.length).toBeGreaterThan(0)
    expect(outcome.professionalAdvice.knowledgeReferences).toContainEqual({
      contentId: 'knowledge:rie-required',
    })
  })

  it('adviseert bij een incident primair incidentonderzoek en bij letsel aanvullend een bedrijfsarts', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'INCIDENT',
        'Een medewerker is tijdens het werk gevallen.',
        [
          {
            key: 'INCIDENT_INJURY_OCCURRED',
            valueType: 'BOOLEAN',
            value: true,
            status: 'CONFIRMED',
            provenance,
          },
        ],
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('INCIDENT_INVESTIGATOR')
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements,
    ).toEqual([
      expect.objectContaining({
        professionalType: 'OCCUPATIONAL_PHYSICIAN',
        priority: 'ADDITIONAL',
      }),
    ])
  })

  it('koppelt gevaarlijke stoffen aan arbeidshygiënische expertise', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Wij werken met brandstoffen tijdens laden en lossen.',
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement,
    ).toMatchObject({
      professionalType: 'OCCUPATIONAL_HYGIENIST',
      expertise: expect.arrayContaining([
        'Gevaarlijke stoffen',
        'Blootstellingsbeoordeling',
      ]),
    })
  })

  it('maakt PMO-advies arbeidsrisicogericht en kiest een bedrijfsarts', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'OCCUPATIONAL_HEALTH',
        'Welke deskundigheid hebben wij nodig voor een PMO?',
      ),
    )

    expect(outcome.professionalAdvice.adviceBody).toContain('PAGO')
    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('OCCUPATIONAL_PHYSICIAN')
    expect(outcome.professionalAdvice.knowledgeReferences).toContainEqual({
      contentId: 'knowledge:pmo-pago',
    })
  })

  it('maakt bij een onvoldoende geveerde chauffeursstoel fysieke belasting leidend', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'OCCUPATIONAL_HEALTH',
        'De vering van de chauffeursstoel is onvoldoende en veroorzaakt rugbelasting.',
      ),
    )

    expect(outcome.professionalAdvice.adviceTitle).toContain(
      'fysieke belasting',
    )
    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('PHYSICAL_WORKLOAD_SPECIALIST')
  })

  it('laat een afgeleide samenvatting nooit de professionele vereiste bepalen', () => {
    const input = contract(
      'OCCUPATIONAL_HEALTH',
      'Wij hebben een algemene vraag over gezondheid en werk.',
    )
    const outcome = guidanceEngine.evaluate({
      ...input,
      helpRequest: {
        ...input.helpRequest,
        confirmedDescription:
          'Een afgeleide samenvatting noemt een chauffeursstoel.',
      },
    })

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('OCCUPATIONAL_PHYSICIAN')
  })

  it('maakt duidelijk dat een oud EHBO-diploma niet gelijkstaat aan een complete BHV-organisatie', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'EMERGENCY_RESPONSE',
        'Ik heb tien jaar geleden een EHBO-diploma gehaald. Is onze BHV daarmee geregeld?',
      ),
    )

    expect(outcome.professionalAdvice.adviceBody).toContain(
      'niet vanzelf aan dat de huidige BHV-organisatie doeltreffend is',
    )
    expect(outcome.professionalAdvice.selfActions).toEqual(
      expect.arrayContaining([
        expect.stringContaining('opleidingsactualiteit'),
      ]),
    )
    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('BHV_ADVISOR')
  })

  it('valt bij een onbekend onderwerp veilig en zonder verzonnen deskundigheid terug', () => {
    const outcome = guidanceEngine.evaluate(
      contract('UNSUPPORTED', 'Een brede hulpvraag zonder bevestigd onderwerp.'),
    )

    expect(outcome.professionalAdvice).toMatchObject({
      outcomeSpecificity: 'SAFE_FALLBACK',
      primaryProfessionalRequirement: null,
      knowledgeReferences: [],
      sourceReferences: [],
    })
  })

  it('levert deterministische, immutable en versieerbare uitvoer', () => {
    const input = contract(
      'EMERGENCY_RESPONSE',
      'Hoe beoordelen wij onze BHV-organisatie?',
    )
    const first = guidanceEngine.evaluate(input)
    const second = guidanceEngine.evaluate(input)

    expect(first).toEqual(second)
    expect(first.professionalAdvice.disclaimer).toBe(
      PROFESSIONAL_ADVICE_DISCLAIMER,
    )
    expect(PROFESSIONAL_ADVICE_RULE_SET_VERSION).toBe(
      'professional-advice-rules/1.0.0',
    )
    expect(Object.isFrozen(first.professionalAdvice)).toBe(true)
    expect(
      Object.isFrozen(first.professionalAdvice.adviceReasons),
    ).toBe(true)
    expect(
      Object.isFrozen(
        first.professionalAdvice.primaryProfessionalRequirement,
      ),
    ).toBe(true)
  })
})
