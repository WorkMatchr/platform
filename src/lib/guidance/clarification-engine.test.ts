import { describe, expect, it } from 'vitest'
import {
  CLARIFICATION_ENGINE_VERSION,
  ClarificationEngineValidationError,
  clarificationEngine,
} from './clarification-engine'
import { CLARIFICATION_RESULT_SCHEMA_VERSION } from './clarification-contract'
import { CLARIFICATION_RULE_SET_VERSION } from './clarification-ruleset-v1'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from './guidance-contract'
import type { ContextFact, HelpRequest, Uncertainty } from './guidance-domain'

const timestamp = '2026-07-27T12:00:00.000Z'
const emptyProvenance = {
  sources: [],
  rules: [],
} as const

function createFact(key: string, value = true): ContextFact {
  return {
    key,
    valueType: 'BOOLEAN',
    value,
    status: 'CONFIRMED',
    provenance: emptyProvenance,
  }
}

function createUncertainty(key: string): Uncertainty {
  return {
    key,
    reason: 'UNKNOWN',
    description: 'Fictieve onzekerheid voor een contracttest.',
    sourceQuestionKey: null,
    provenance: emptyProvenance,
  }
}

function createHelpRequest(): HelpRequest {
  return {
    originalInput: 'Fictieve hulpvraag voor de Clarification Engine.',
    confirmedDescription: null,
    confirmation: { status: 'UNCONFIRMED' },
  }
}

function createContract(
  situationCode: string,
  facts: readonly ContextFact[] = [],
  uncertainties: readonly Uncertainty[] = [],
): GuidanceContract {
  return {
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: 'clarification-contract-fixture',
    version: 2,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'public-intake-fixture',
      version: '1',
    },
    questionSetVersion: 'question-set/fixture',
    situation: {
      code: situationCode,
      description: 'Fictieve situatie voor een contracttest.',
      provenance: emptyProvenance,
    },
    helpRequest: createHelpRequest(),
    facts,
    uncertainties,
    createdAt: timestamp,
  }
}

describe('ADR-021 Clarification Engine v1', () => {
  it.each([
    ['UNCLASSIFIED', 'guidance_topic', 'GUIDANCE_TOPIC'],
    ['RIE', 'rie_has_employees', 'HAS_EMPLOYEES'],
    ['INCIDENT', 'incident_injury_occurred', 'INCIDENT_INJURY_OCCURRED'],
    [
      'HAZARDOUS_SUBSTANCES',
      'hazardous_substances_storage',
      'HAZARDOUS_SUBSTANCES_STORAGE',
    ],
  ])(
    'geeft voor %s exact één eerste verduidelijkingsvraag',
    (situationCode, questionKey, factKey) => {
      const result = clarificationEngine.evaluate(
        createContract(situationCode),
        createHelpRequest(),
      )

      expect(result).toMatchObject({
        schemaVersion: CLARIFICATION_RESULT_SCHEMA_VERSION,
        isComplete: false,
        nextQuestion: {
          key: questionKey,
          resultingFactKey: factKey,
        },
        completionReason: 'NEXT_QUESTION_AVAILABLE',
      })
      expect(result.missingFacts[0]).toBe(factKey)
    },
  )

  it('stelt vragen voor gevaarlijke stoffen in vaste volgorde', () => {
    const helpRequest = createHelpRequest()
    const storageAnswered = createContract('HAZARDOUS_SUBSTANCES', [
      createFact('HAZARDOUS_SUBSTANCES_STORAGE', false),
    ])
    const transportAnswered = createContract('HAZARDOUS_SUBSTANCES', [
      createFact('HAZARDOUS_SUBSTANCES_STORAGE', false),
      createFact('HAZARDOUS_SUBSTANCES_TRANSPORT', true),
    ])

    expect(
      clarificationEngine.evaluate(storageAnswered, helpRequest).nextQuestion
        ?.key,
    ).toBe('hazardous_substances_transport')
    expect(
      clarificationEngine.evaluate(transportAnswered, helpRequest).nextQuestion
        ?.key,
    ).toBe('hazardous_substances_loading_unloading')
  })

  it('markeert een hulpvraag compleet wanneer alle vereiste feiten aanwezig zijn', () => {
    const result = clarificationEngine.evaluate(
      createContract('RIE', [createFact('HAS_EMPLOYEES')]),
      createHelpRequest(),
    )

    expect(result).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      missingFacts: [],
      missingUncertainties: [],
      completionReason: 'REQUIRED_INFORMATION_AVAILABLE',
      questionLimit: 5,
      remainingQuestionBudget: 4,
      askedQuestionKeys: ['rie_has_employees'],
    })
  })

  it('houdt expliciete relevante onzekerheden zichtbaar', () => {
    const result = clarificationEngine.evaluate(
      createContract(
        'INCIDENT',
        [],
        [createUncertainty('INCIDENT_INJURY_UNKNOWN')],
      ),
      createHelpRequest(),
    )

    expect(result.missingFacts).toEqual(['INCIDENT_INJURY_OCCURRED'])
    expect(result.missingUncertainties).toEqual([
      'INCIDENT_INJURY_UNKNOWN',
    ])
    expect(result.nextQuestion?.key).toBe('incident_injury_occurred')
  })

  it('behandelt een onbekende situatie fail-closed', () => {
    const result = clarificationEngine.evaluate(
      createContract('ONBEKENDE_SITUATIE'),
      createHelpRequest(),
    )

    expect(result).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      missingFacts: [],
      missingUncertainties: [],
      completionReason: 'UNSUPPORTED_SITUATION',
    })
  })

  it('stelt een reeds beantwoorde of onbekend beantwoorde vraag nooit opnieuw', () => {
    const result = clarificationEngine.evaluate(
      createContract(
        'INCIDENT',
        [],
        [
          {
            ...createUncertainty('INCIDENT_INJURY_UNKNOWN'),
            sourceQuestionKey: 'incident_injury_occurred',
          },
        ],
      ),
      createHelpRequest(),
    )

    expect(result).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'NO_FURTHER_QUESTION_AVAILABLE',
      askedQuestionKeys: ['incident_injury_occurred'],
    })
  })

  it('rondt altijd af wanneer het budget van vijf unieke vragen is verbruikt', () => {
    const result = clarificationEngine.evaluate(
      createContract(
        'HAZARDOUS_SUBSTANCES',
        [
          createFact('GUIDANCE_TOPIC'),
          createFact('HAS_EMPLOYEES'),
          createFact('INCIDENT_INJURY_OCCURRED'),
          createFact('HAZARDOUS_SUBSTANCES_STORAGE'),
          createFact('HAZARDOUS_SUBSTANCES_TRANSPORT'),
        ],
      ),
      createHelpRequest(),
    )

    expect(result).toMatchObject({
      isComplete: true,
      nextQuestion: null,
      completionReason: 'QUESTION_BUDGET_EXHAUSTED',
      questionLimit: 5,
      remainingQuestionBudget: 0,
    })
    expect(result.askedQuestionKeys).toHaveLength(5)
  })

  it('levert voor identieke invoer exact hetzelfde resultaat', () => {
    const contract = createContract('INCIDENT')
    const helpRequest = createHelpRequest()

    expect(clarificationEngine.evaluate(contract, helpRequest)).toEqual(
      clarificationEngine.evaluate(contract, helpRequest),
    )
  })

  it('registreert schema-, contract-, ruleset- en engineversies', () => {
    const contract = createContract('RIE')
    const result = clarificationEngine.evaluate(
      contract,
      createHelpRequest(),
    )

    expect(result.schemaVersion).toBe(CLARIFICATION_RESULT_SCHEMA_VERSION)
    expect(result.provenance).toEqual({
      contract: {
        schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
        id: contract.id,
        version: contract.version,
      },
      helpRequestConfirmationStatus: 'UNCONFIRMED',
      ruleSetVersion: CLARIFICATION_RULE_SET_VERSION,
      engineVersion: CLARIFICATION_ENGINE_VERSION,
      appliedRuleCodes: ['CLARIFY_RIE_EMPLOYEES'],
    })
  })

  it('retourneert een recursief immutable resultaat', () => {
    const result = clarificationEngine.evaluate(
      createContract('RIE'),
      createHelpRequest(),
    )

    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.nextQuestion)).toBe(true)
    expect(Object.isFrozen(result.missingFacts)).toBe(true)
    expect(Object.isFrozen(result.missingUncertainties)).toBe(true)
    expect(Object.isFrozen(result.provenance)).toBe(true)
    expect(Object.isFrozen(result.provenance.contract)).toBe(true)
    expect(Object.isFrozen(result.provenance.appliedRuleCodes)).toBe(true)
  })

  it('weigert een structureel ongeldige HelpRequest', () => {
    const invalidHelpRequest = {
      ...createHelpRequest(),
      originalInput: '',
    }

    expect(() =>
      clarificationEngine.evaluate(
        createContract('RIE'),
        invalidHelpRequest,
      ),
    ).toThrow(ClarificationEngineValidationError)
  })
})
