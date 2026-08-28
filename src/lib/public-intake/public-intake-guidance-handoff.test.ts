import { describe, expect, it } from 'vitest'
import type { PublicIntakeAnswerView } from './public-intake-types'
import { buildPublicIntakeGuidanceHandoff } from './public-intake-guidance-handoff'
import { PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION } from './public-intake-config'

const startedAt = new Date('2026-07-27T12:00:00.000Z')

function answer(
  questionKey: string,
  answerType: PublicIntakeAnswerView['answerType'],
  value: string | number | boolean | null,
  disposition: PublicIntakeAnswerView['disposition'] = 'ANSWERED',
): PublicIntakeAnswerView {
  return {
    questionKey,
    questionVersion: 1,
    answerType,
    disposition,
    source: 'USER_INPUT',
    version: 1,
    value,
  }
}

function draft(
  answers: readonly PublicIntakeAnswerView[] = [],
  overrides: Partial<{
    entryPoint: 'FREE_TEXT' | 'RECOGNIZABLE_REQUEST'
    originalInput: string | null
    selectedRequestKey: string | null
    flowVersion: string
  }> = {},
) {
  return {
    phase: 'CLARIFYING' as const,
    entryPoint: overrides.entryPoint ?? ('RECOGNIZABLE_REQUEST' as const),
    originalInput:
      'originalInput' in overrides
        ? (overrides.originalInput ?? null)
        : null,
    selectedRequestKey:
      'selectedRequestKey' in overrides
        ? (overrides.selectedRequestKey ?? null)
        : 'rie_needed',
    flowVersion: overrides.flowVersion ?? 'public-intake/1.0.0',
    currentStep: 'rie_existing_status',
    version: 4,
    startedAt,
    lastInteractionAt: startedAt,
    expiresAt: new Date('2026-10-25T12:00:00.000Z'),
    answers: [...answers],
  }
}

describe('Public Intake Guidance-handoff', () => {
  it('rondt Hulpvraag Intake v2 na maximaal vijf antwoorden veilig af', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft(
        [
          answer('context_employee_count', 'NUMBER', 18),
          answer('context_location_count', 'NUMBER', 2),
          answer('context_preferred_start', 'TEXT', 'Binnen drie maanden'),
          answer('context_rie_status', 'OPTION', 'NEW'),
          answer('context_affected_scope', 'OPTION', 'ORGANIZATION_WIDE'),
        ],
        {
          entryPoint: 'FREE_TEXT',
          originalInput: 'Wij hebben een RI&E nodig voor ons bedrijf.',
          selectedRequestKey: null,
          flowVersion: PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION,
        },
      ),
    )

    expect(handoff.clarification).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'QUESTION_BUDGET_EXHAUSTED',
    })
  })

  it('presenteert een onbekende RI&E-onderzoeksstatus inhoudelijk herleidbaar', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer(
          'context_existing_investigation',
          'OPTION',
          null,
          'UNKNOWN',
        ),
      ]),
    )

    expect(handoff.contract.uncertainties).toEqual([
      expect.objectContaining({
        reason: 'UNKNOWN',
        sourceQuestionKey: 'context_existing_investigation',
        description:
          'Het is niet bekend of deze situatie al is onderzocht of in de RI&E is opgenomen.',
      }),
    ])
  })

  it('behoudt de generieke onzekerheidstekst zonder catalogustekst', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('context_affected_scope', 'OPTION', null, 'UNKNOWN'),
      ]),
    )

    expect(handoff.contract.uncertainties[0]?.description).toBe(
      'De bezoeker heeft aangegeven deze informatie niet te weten.',
    )
  })

  it('laat bekende context en professioneel advies ongewijzigd', () => {
    const known = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('context_existing_investigation', 'OPTION', 'Nee'),
      ]),
    )
    const baseline = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([answer('rie_existing_status', 'OPTION', 'NONE')]),
    )

    expect(known.contract.uncertainties).toEqual([])
    expect(known.contract.facts).toContainEqual(
      expect.objectContaining({
        key: 'PUBLIC_INTAKE_CONTEXT_EXISTING_INVESTIGATION',
        value: 'Nee',
        status: 'CONFIRMED',
      }),
    )
    expect(known.outcome?.professionalAdvice.appliedRuleCode).toBe(
      baseline.outcome?.professionalAdvice.appliedRuleCode,
    )
    expect(
      known.outcome?.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    ).toBe(
      baseline.outcome?.professionalAdvice.primaryProfessionalRequirement
        ?.professionalType,
    )
  })

  it('bouwt een GuidanceContract uit uitsluitend bestaande draftgegevens', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('rie_existing_status', 'OPTION', 'NONE'),
        answer('sector', 'TEXT', 'Bouw'),
      ]),
    )

    expect(handoff.contract).toMatchObject({
      id: 'guidance-contract:public-intake:public-draft-fixture',
      version: 4,
      questionSetVersion: 'public-intake/1.0.0',
      situation: {
        code: 'RIE',
        description: 'Wij hebben een RI&E nodig',
      },
      helpRequest: {
        originalInput: 'Wij hebben een RI&E nodig',
        confirmedDescription: null,
        confirmation: { status: 'UNCONFIRMED' },
      },
    })
    expect(handoff.contract.facts.map((fact) => fact.key)).toEqual([
      'PUBLIC_INTAKE_RIE_EXISTING_STATUS',
      'PUBLIC_INTAKE_SECTOR',
    ])
  })

  it('retourneert alleen de eerstvolgende Clarification-vraag zolang informatie ontbreekt', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft(),
    )

    expect(handoff.clarification).toMatchObject({
      isComplete: false,
      nextQuestion: {
        key: 'rie_has_employees',
        text: 'Heeft u personeel?',
        resultingFactKey: 'HAS_EMPLOYEES',
      },
      missingFacts: ['HAS_EMPLOYEES'],
      completionReason: 'NEXT_QUESTION_AVAILABLE',
    })
    expect(handoff.outcome).toBeNull()
    expect(handoff.completion.status).toBe('IN_PROGRESS')
  })

  it.each([true, false])(
    'maakt pas na een bevestigd booleanantwoord een GuidanceOutcome voor waarde %s',
    (hasEmployees) => {
      const handoff = buildPublicIntakeGuidanceHandoff(
        'public-draft-fixture',
        draft([
          answer('rie_has_employees', 'BOOLEAN', hasEmployees),
        ]),
      )

      expect(handoff.clarification).toMatchObject({
        isComplete: true,
        nextQuestion: null,
        missingFacts: [],
        completionReason: 'REQUIRED_INFORMATION_AVAILABLE',
      })
      expect(handoff.outcome).toMatchObject({
        status: 'DRAFT',
        relevantTopicCodes: ['RIE'],
        professionalSupportNeed: {
          state: 'POSSIBLE',
          confirmation: { status: 'UNCONFIRMED' },
        },
        professionalRequirements: [
          {
            professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
            priority: 'PRIMARY',
            status: 'DRAFT',
          },
        ],
      })
      expect(handoff.completion.status).toBe(
        'COMPLETED_WITH_GUIDANCE',
      )
      expect(
        handoff.contract.facts.find(
          (fact) => fact.key === 'HAS_EMPLOYEES',
        )?.value,
      ).toBe(hasEmployees)
    },
  )

  it('leidt personeel semantisch af uit een bevestigde organisatieomvang', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('context_employee_count', 'OPTION', '11 tot en met 50 medewerkers'),
      ]),
    )

    expect(handoff.contract.facts).toContainEqual(
      expect.objectContaining({
        key: 'PUBLIC_INTAKE_CONTEXT_EMPLOYEE_COUNT',
        value: '11 tot en met 50 medewerkers',
      }),
    )
    expect(handoff.contract.facts).toContainEqual(
      expect.objectContaining({
        key: 'HAS_EMPLOYEES',
        valueType: 'BOOLEAN',
        value: true,
      }),
    )
    expect(handoff.clarification).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'REQUIRED_INFORMATION_AVAILABLE',
    })
  })

  it('leidt personeel semantisch af wanneer het risico meerdere medewerkers raakt', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('context_affected_scope', 'OPTION', 'Bij meerdere medewerkers'),
      ]),
    )

    expect(handoff.contract.facts).toContainEqual(
      expect.objectContaining({
        key: 'PUBLIC_INTAKE_CONTEXT_AFFECTED_SCOPE',
        value: 'Bij meerdere medewerkers',
      }),
    )
    expect(handoff.contract.facts).toContainEqual(
      expect.objectContaining({
        key: 'HAS_EMPLOYEES',
        valueType: 'BOOLEAN',
        value: true,
      }),
    )
    expect(handoff.clarification).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'REQUIRED_INFORMATION_AVAILABLE',
    })
  })

  it('behoudt onbekende informatie en rondt zonder dubbele vraag veilig af', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('rie_has_employees', 'BOOLEAN', null, 'UNKNOWN'),
      ]),
    )

    expect(handoff.clarification.missingUncertainties).toEqual([
      'HAS_EMPLOYEES_UNKNOWN',
    ])
    expect(handoff.clarification).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'NO_FURTHER_QUESTION_AVAILABLE',
    })
    expect(handoff.completion.status).toBe(
      'COMPLETED_WITH_SAFE_FALLBACK',
    )
    expect(handoff.outcome).not.toBeNull()
  })

  it('stelt bij een vrije brandstofvraag eerst de neutrale onderwerpvraag en geen RI&E-vraag', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([], {
        entryPoint: 'FREE_TEXT',
        originalInput:
          'Ik heb een transportbedrijf en we gaan brandstof vervoeren. Welk effect heeft dit op het personeel?',
        selectedRequestKey: null,
      }),
    )

    expect(handoff.contract.situation.code).toBe('UNCLASSIFIED')
    expect(handoff.clarification).toMatchObject({
      isComplete: false,
      nextQuestion: {
        key: 'guidance_topic',
        text: 'Waar gaat uw vraag vooral over?',
        resultingFactKey: 'GUIDANCE_TOPIC',
      },
      completionReason: 'NEXT_QUESTION_AVAILABLE',
    })
    expect(handoff.clarification.nextQuestion?.key).not.toMatch(/^rie_/)
    expect(handoff.outcome).toBeNull()
  })

  it('activeert gevaarlijke stoffen alleen na een expliciete onderwerpkeuze', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft(
        [
          answer(
            'guidance_topic',
            'OPTION',
            'HAZARDOUS_SUBSTANCES',
          ),
        ],
        {
          entryPoint: 'FREE_TEXT',
          originalInput:
            'Ik heb een transportbedrijf en we gaan brandstof vervoeren.',
          selectedRequestKey: null,
        },
      ),
    )

    expect(handoff.contract.situation.code).toBe(
      'HAZARDOUS_SUBSTANCES',
    )
    expect(handoff.clarification.nextQuestion?.key).toBe(
      'hazardous_substances_storage',
    )
    expect(handoff.clarification.isComplete).toBe(false)
    expect(handoff.outcome).toBeNull()
  })

  it('doorloopt gevaarlijke-stoffenvragen in vaste volgorde en maakt pas daarna een uitkomst', () => {
    const partial = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft(
        [
          answer(
            'guidance_topic',
            'OPTION',
            'HAZARDOUS_SUBSTANCES',
          ),
          answer('hazardous_substances_storage', 'BOOLEAN', false),
        ],
        {
          entryPoint: 'FREE_TEXT',
          originalInput:
            'Wij vervoeren brandstof en willen onze situatie verduidelijken.',
          selectedRequestKey: null,
        },
      ),
    )

    expect(partial.clarification.nextQuestion?.key).toBe(
      'hazardous_substances_transport',
    )
    expect(partial.outcome).toBeNull()

    const complete = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft(
        [
          answer(
            'guidance_topic',
            'OPTION',
            'HAZARDOUS_SUBSTANCES',
          ),
          answer('hazardous_substances_storage', 'BOOLEAN', false),
          answer('hazardous_substances_transport', 'BOOLEAN', true),
          answer(
            'hazardous_substances_loading_unloading',
            'BOOLEAN',
            true,
          ),
        ],
        {
          entryPoint: 'FREE_TEXT',
          originalInput:
            'Wij vervoeren brandstof en willen onze situatie verduidelijken.',
          selectedRequestKey: null,
        },
      ),
    )

    expect(complete.clarification.isComplete).toBe(true)
    expect(complete.outcome?.relevantTopicCodes).toEqual([
      'HAZARDOUS_SUBSTANCES',
    ])
  })

  it.each([
    ['HEALTH_WORKLOAD', 'OCCUPATIONAL_HEALTH', 'BEDRIJFSARTS'],
    ['OCCUPATIONAL_HEALTH', 'OCCUPATIONAL_HEALTH', 'BEDRIJFSARTS'],
    ['EMERGENCY_RESPONSE', 'EMERGENCY_RESPONSE', 'BHV_ADVISEUR'],
  ])(
    'levert voor de ondersteunde onderwerpkeuze %s direct een advies',
    (topic, situation, professionalType) => {
      const handoff = buildPublicIntakeGuidanceHandoff(
        'public-draft-fixture',
        draft(
          [answer('guidance_topic', 'OPTION', topic)],
          {
            entryPoint: 'FREE_TEXT',
            originalInput:
              'Dit is een fictieve vrije hulpvraag voor een ondersteund onderwerp.',
            selectedRequestKey: null,
          },
        ),
      )

      expect(handoff.contract.situation.code).toBe(situation)
      expect(handoff.clarification).toMatchObject({
        isComplete: true,
        nextQuestion: null,
        completionReason: 'REQUIRED_INFORMATION_AVAILABLE',
      })
      expect(handoff.completion.status).toBe('COMPLETED_WITH_GUIDANCE')
      expect(
        handoff.outcome?.professionalAdvice
          .primaryProfessionalRequirement?.professionalType,
      ).toBe(professionalType)
    },
  )

  it('houdt de nog niet ondersteunde onderwerpkeuze OTHER fail-closed', () => {
      const topic = 'OTHER'
      const handoff = buildPublicIntakeGuidanceHandoff(
        'public-draft-fixture',
        draft(
          [answer('guidance_topic', 'OPTION', topic)],
          {
            entryPoint: 'FREE_TEXT',
            originalInput:
              'Dit is een fictieve vrije hulpvraag zonder beschikbare route.',
            selectedRequestKey: null,
          },
        ),
      )

      expect(handoff.contract.situation.code).toBe('UNSUPPORTED')
      expect(handoff.clarification).toMatchObject({
        isComplete: true,
        nextQuestion: null,
        completionReason: 'UNSUPPORTED_SITUATION',
      })
      expect(handoff.completion.status).toBe(
        'COMPLETED_WITH_SAFE_FALLBACK',
      )
      expect(handoff.outcome).toMatchObject({
        relevantTopicCodes: [],
        professionalSupportNeed: { state: 'POSSIBLE' },
        professionalRequirements: [],
        professionalAdvice: {
          outcomeSpecificity: 'SAFE_FALLBACK',
          primaryProfessionalRequirement: null,
        },
        solutionDirections: [
          {
            code: 'GENERAL_SITUATION_REVIEW',
          },
        ],
      })
      expect(handoff.outcome?.summary).not.toContain('RI&E')
    })

  it('rondt na een onbekend noodzakelijk antwoord af met een bruikbare fallback', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([
        answer('rie_has_employees', 'BOOLEAN', null, 'UNKNOWN'),
      ]),
    )

    expect(handoff.clarification).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'NO_FURTHER_QUESTION_AVAILABLE',
    })
    expect(handoff.completion.status).toBe(
      'COMPLETED_WITH_SAFE_FALLBACK',
    )
    expect(handoff.outcome?.solutionDirections[0]?.description).toContain(
      'nog geen specifiek advies',
    )
    expect(handoff.outcome).toMatchObject({
      professionalRequirements: [],
      professionalAdvice: {
        outcomeSpecificity: 'SAFE_FALLBACK',
        primaryProfessionalRequirement: null,
      },
    })
  })

  it('houdt expliciete RI&E-entrypoints op de RI&E-route', () => {
    const handoff = buildPublicIntakeGuidanceHandoff(
      'public-draft-fixture',
      draft([], {
        entryPoint: 'RECOGNIZABLE_REQUEST',
        originalInput: null,
        selectedRequestKey: 'rie_update',
      }),
    )

    expect(handoff.contract.situation.code).toBe('RIE')
    expect(handoff.clarification.nextQuestion?.key).toBe(
      'rie_has_employees',
    )
  })

  it('levert bij hervatten van dezelfde draft exact dezelfde handoff', () => {
    const snapshot = draft(
      [
        answer(
          'guidance_topic',
          'OPTION',
          'HAZARDOUS_SUBSTANCES',
        ),
        answer('hazardous_substances_storage', 'BOOLEAN', true),
      ],
      {
        entryPoint: 'FREE_TEXT',
        originalInput:
          'Wij slaan fictieve brandstof op en willen onze situatie verduidelijken.',
        selectedRequestKey: null,
      },
    )

    expect(
      buildPublicIntakeGuidanceHandoff('public-draft-fixture', snapshot),
    ).toEqual(
      buildPublicIntakeGuidanceHandoff('public-draft-fixture', {
        ...snapshot,
        answers: [...snapshot.answers],
      }),
    )
  })
})
