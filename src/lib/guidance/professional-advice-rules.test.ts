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
        professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
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
    ).toBe('HOGER_VEILIGHEIDSKUNDIGE')
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements,
    ).toEqual([
      expect.objectContaining({
        professionalType: 'BEDRIJFSARTS',
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
      professionalType: 'ARBEIDSHYGIENIST',
      expertise: expect.arrayContaining([
        'Gevaarlijke stoffen',
        'Blootstellingsbeoordeling',
      ]),
    })
  })

  it('maakt grootschalige brandstofopslag multidisciplinair met HVK als primaire deskundigheid', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Wij gaan van 5.000 liter brandstof naar een opslag van 50.000 liter. Zijn er voor ons bedrijf nog regels waar we om moeten denken?',
      ),
    )

    expect(outcome.professionalAdvice.dominantContext).toBe(
      'LARGE_SCALE_STORAGE',
    )
    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement,
    ).toMatchObject({
      professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
      priority: 'PRIMARY',
      expertise: expect.arrayContaining([
        'PGS',
        'Brand- en explosieveiligheid',
      ]),
    })
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          professionalType: 'BRANDVEILIGHEIDSDESKUNDIGE',
          priority: 'ADDITIONAL',
        }),
        expect.objectContaining({
          professionalType: 'MILIEUDESKUNDIGE',
          priority: 'ADDITIONAL',
        }),
      ]),
    )
    expect(
      outcome.professionalAdvice.possibleProfessionalRequirements,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          professionalType: 'ARBEIDSHYGIENIST',
          priority: 'POSSIBLE',
        }),
      ]),
    )
    expect(outcome.professionalAdvice.adviceBody).toContain(
      'Welke PGS-richtlijn en vergunningseisen van toepassing zijn, hangt',
    )
    expect(outcome.professionalAdvice.adviceBody).not.toMatch(
      /PGS \d+ is van toepassing|vergunning is verplicht/i,
    )
  })

  it('maakt dagelijkse dieseldampen een blootstellingsvraag met arbeidshygiënist als primair', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Onze medewerkers ruiken dagelijks dieseldampen tijdens het tanken.',
      ),
    )

    expect(outcome.professionalAdvice.dominantContext).toBe('EXPOSURE')
    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement,
    ).toMatchObject({
      professionalType: 'ARBEIDSHYGIENIST',
      priority: 'PRIMARY',
    })
    expect(
      outcome.professionalAdvice.possibleProfessionalRequirements,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
          priority: 'POSSIBLE',
        }),
        expect.objectContaining({
          professionalType: 'BEDRIJFSARTS',
          priority: 'POSSIBLE',
        }),
      ]),
    )
  })

  it('adviseert bij hoofdpijn door oplosmiddelen arbeidshygiëne met mogelijk medische duiding', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Medewerkers hebben hoofdpijn na blootstelling aan oplosmiddelen en dampen.',
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('ARBEIDSHYGIENIST')
    expect(
      outcome.professionalAdvice.possibleProfessionalRequirements,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          professionalType: 'BEDRIJFSARTS',
          priority: 'POSSIBLE',
        }),
      ]),
    )
  })

  it('behandelt enkele jerrycans proportioneel en niet als grootschalige opslag', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'We bewaren enkele jerrycans diesel voor een noodaggregaat.',
      ),
    )

    expect(outcome.professionalAdvice.dominantContext).toBe(
      'FIRE_SAFETY',
    )
    expect(outcome.professionalAdvice.appliedRuleCode).toBe(
      'PROFESSIONAL_ADVICE_HAZARDOUS_SUBSTANCES_STORAGE',
    )
    expect(outcome.professionalAdvice.adviceBody).toContain(
      'proportioneel',
    )
    expect(outcome.professionalAdvice.adviceBody).not.toContain(
      'grote volumetoename',
    )
  })

  it('levert voor hetzelfde hoofdonderwerp afhankelijk van de context een andere primaire deskundigheid', () => {
    const storage = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Wij slaan 50.000 liter diesel op in een opslagtank.',
      ),
    )
    const exposure = guidanceEngine.evaluate(
      contract(
        'HAZARDOUS_SUBSTANCES',
        'Medewerkers ruiken dagelijks dieseldampen door onvoldoende ventilatie.',
      ),
    )

    expect(
      storage.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('HOGER_VEILIGHEIDSKUNDIGE')
    expect(
      exposure.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('ARBEIDSHYGIENIST')
  })

  it('levert maximaal één primaire deskundigheid en deterministische prioriteiten', () => {
    const input = contract(
      'HAZARDOUS_SUBSTANCES',
      'Wij breiden onze dieselopslag uit naar 50.000 liter.',
    )
    const first = guidanceEngine.evaluate(input)
    const second = guidanceEngine.evaluate(input)

    expect(first.professionalRequirements).toEqual(
      second.professionalRequirements,
    )
    expect(
      first.professionalRequirements.filter(
        (requirement) => requirement.priority === 'PRIMARY',
      ),
    ).toHaveLength(1)
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
    ).toBe('BEDRIJFSARTS')
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
    ).toBe('ERGONOOM')
  })

  it('classificeert een tillift over een vloer als ergonomie met concrete nevendisciplines', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'OCCUPATIONAL_HEALTH',
        'Zijn er richtlijnen voor wat betreft vloeren in een verzorgingstehuis, om er met een tillift overheen te rijden?',
      ),
    )

    expect(outcome.professionalAdvice).toMatchObject({
      dominantContext: 'ERGONOMICS',
      primaryProfessionalRequirement: {
        professionalType: 'ERGONOOM',
        priority: 'PRIMARY',
      },
    })
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements,
    ).toEqual([
      expect.objectContaining({
        professionalType: 'ARBEIDSDESKUNDIGE',
        priority: 'ADDITIONAL',
      }),
    ])
    expect(
      outcome.professionalAdvice.possibleProfessionalRequirements,
    ).toEqual([
      expect.objectContaining({
        professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
        priority: 'POSSIBLE',
      }),
    ])
    const explanation = JSON.stringify(outcome.professionalAdvice)
    expect(explanation).toMatch(/fysieke belasting/i)
    expect(explanation).toMatch(/duw- en trekkrachten/i)
    expect(explanation).toMatch(/rolweerstand|begaanbaarheid/i)
    expect(explanation).toMatch(/tillift/i)
    expect(explanation).toMatch(/werkplekinrichting/i)
    expect(explanation).not.toMatch(/RI&E-deskundige/i)
  })

  it('classificeert machine zonder CE-documentatie als machineveiligheid', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'RIE',
        'Een machine heeft geen CE-documentatie en de afscherming is onduidelijk.',
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('MACHINEVEILIGHEIDSDESKUNDIGE')
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements[0]
        ?.professionalType,
    ).toBe('HOGER_VEILIGHEIDSKUNDIGE')
  })

  it('classificeert werkdruk en ongewenst gedrag als arbeids- en organisatiekunde', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'OCCUPATIONAL_HEALTH',
        'Er is hoge werkdruk en ongewenst gedrag binnen het team.',
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('ARBEIDS_EN_ORGANISATIEDESKUNDIGE')
  })

  it('classificeert re-integratie en passende werkzaamheden als arbeidsdeskundig', () => {
    const outcome = guidanceEngine.evaluate(
      contract(
        'OCCUPATIONAL_HEALTH',
        'Welke passende werkzaamheden zijn mogelijk bij de re-integratie en belastbaarheid?',
      ),
    )

    expect(
      outcome.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('ARBEIDSDESKUNDIGE')
    expect(
      outcome.professionalAdvice.additionalProfessionalRequirements[0]
        ?.professionalType,
    ).toBe('BEDRIJFSARTS')
  })

  it('onderscheidt praktische operationele veiligheid van complexe veiligheidsvragen', () => {
    const practical = guidanceEngine.evaluate(
      contract(
        'RIE',
        'Wij willen een praktische veiligheidsinspectie van de werkplek en beheersmaatregelen.',
      ),
    )
    const complex = guidanceEngine.evaluate(
      contract(
        'RIE',
        'Een complexe majeure wijziging raakt meerdere processen en locaties.',
      ),
    )

    expect(
      practical.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('MIDDELBAAR_VEILIGHEIDSKUNDIGE')
    expect(
      complex.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe('HOGER_VEILIGHEIDSKUNDIGE')
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
    ).toBe('BEDRIJFSARTS')
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
    ).toBe('BHV_ADVISEUR')
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
      'professional-advice-rules/1.2.0',
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
