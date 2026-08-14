import { describe, expect, it } from 'vitest'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from './guidance-contract'
import {
  GUIDANCE_ENGINE_VERSION,
  GUIDANCE_RULE_SET_VERSION,
  GuidanceEngineValidationError,
  guidanceEngine,
} from './guidance-engine'
import { GUIDANCE_OUTCOME_SCHEMA_VERSION } from './guidance-domain'
import { guidanceTopicCodes } from './guidance-ruleset-v1'

const timestamp = '2026-07-27T12:00:00.000Z'
const emptyProvenance = {
  sources: [],
  rules: [],
} as const

function createGuidanceContract(): GuidanceContract {
  return {
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: 'guidance-contract-engine-fixture',
    version: 3,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'public-intake-engine-fixture',
      version: '2',
    },
    questionSetVersion: 'question-set/fixture-v2',
    situation: {
      code: 'SITUATION_FIXTURE',
      description: 'Fictieve situatie voor de Guidance Engine-test.',
      provenance: emptyProvenance,
    },
    helpRequest: {
      originalInput: 'Originele fictieve hulpvraag.',
      confirmedDescription: 'Bevestigde fictieve hulpvraag.',
      confirmation: {
        status: 'CONFIRMED',
        actorType: 'VISITOR_SESSION',
        actorReference: null,
        confirmedAt: timestamp,
      },
    },
    facts: [
      {
        key: 'EXPLICIT_FACT',
        valueType: 'BOOLEAN',
        value: true,
        status: 'CONFIRMED',
        provenance: emptyProvenance,
      },
    ],
    uncertainties: [
      {
        key: 'EXPLICIT_UNCERTAINTY',
        reason: 'UNKNOWN',
        description: 'Een fictief gegeven is onbekend.',
        sourceQuestionKey: 'QUESTION_FIXTURE',
        provenance: emptyProvenance,
      },
    ],
    createdAt: timestamp,
  }
}

describe('ADR-021 Guidance Engine v2', () => {
  it('zet een geldig contract via placeholderregels om naar een uitkomst', () => {
    const contract = createGuidanceContract()
    const outcome = guidanceEngine.evaluate(contract)

    expect(outcome).toMatchObject({
      schemaVersion: GUIDANCE_OUTCOME_SCHEMA_VERSION,
      id: 'guidance-outcome:guidance-contract-engine-fixture:v3',
      version: 1,
      status: 'DRAFT',
      summary: 'Bevestigde fictieve hulpvraag.',
      ruleSetVersion: GUIDANCE_RULE_SET_VERSION,
      createdAt: timestamp,
    })
    expect(outcome.facts).toEqual(contract.facts)
    expect(outcome.uncertainties).toEqual(contract.uncertainties)
    expect(outcome.relevantTopicCodes).toEqual([])
    expect(outcome.knowledgeNeeds).toEqual([])
    expect(outcome.solutionDirections).toEqual([])
    expect(outcome.professionalSupportNeed.state).toBe('NOT_DETERMINED')
    expect(outcome.professionalRequirements).toEqual([])
    expect(outcome.professionalAdvice).toMatchObject({
      outcomeSpecificity: 'SAFE_FALLBACK',
      primaryProfessionalRequirement: null,
    })
  })

  it('levert voor gelijke invoer exact dezelfde uitvoer', () => {
    const contract = createGuidanceContract()

    expect(guidanceEngine.evaluate(contract)).toEqual(
      guidanceEngine.evaluate(contract),
    )
  })

  it('registreert contract-, regelset- en engineversie als provenance', () => {
    const contract = createGuidanceContract()
    const outcome = guidanceEngine.evaluate(contract)

    expect(outcome.executionProvenance).toEqual({
      contract: {
        schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
        id: contract.id,
        version: contract.version,
      },
      ruleSetVersion: GUIDANCE_RULE_SET_VERSION,
      engineVersion: GUIDANCE_ENGINE_VERSION,
    })
  })

  it('gebruikt originele invoer wanneer geen bevestigde omschrijving bestaat', () => {
    const contract = createGuidanceContract()
    const outcome = guidanceEngine.evaluate({
      ...contract,
      helpRequest: {
        ...contract.helpRequest,
        confirmedDescription: null,
        confirmation: { status: 'UNCONFIRMED' },
      },
    })

    expect(outcome.summary).toBe(contract.helpRequest.originalInput)
  })

  it('retourneert een recursief immutable resultaat', () => {
    const outcome = guidanceEngine.evaluate(createGuidanceContract())

    expect(Object.isFrozen(outcome)).toBe(true)
    expect(Object.isFrozen(outcome.executionProvenance)).toBe(true)
    expect(Object.isFrozen(outcome.executionProvenance.contract)).toBe(true)
    expect(Object.isFrozen(outcome.facts)).toBe(true)
    expect(Object.isFrozen(outcome.facts[0])).toBe(true)
    expect(Object.isFrozen(outcome.professionalSupportNeed)).toBe(true)
    expect(Object.isFrozen(outcome.professionalAdvice)).toBe(true)
  })

  it('weigert een structureel ongeldig invoercontract', () => {
    const contract = {
      ...createGuidanceContract(),
      schemaVersion: 'guidance-contract/onbekend',
    } as unknown as GuidanceContract

    expect(() => guidanceEngine.evaluate(contract)).toThrow(
      GuidanceEngineValidationError,
    )
  })

  it.each([
    {
      situationCode: guidanceTopicCodes.rie,
      topicCode: 'RIE',
      knowledgeNeedCode: 'KNOWLEDGE_RIE_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_RIE_CONTEXT',
      ruleCode: 'GUIDANCE_RIE',
    },
    {
      situationCode: guidanceTopicCodes.incident,
      topicCode: 'INCIDENT',
      knowledgeNeedCode: 'KNOWLEDGE_INCIDENT_RESPONSE',
      solutionDirectionCode: 'UNDERSTAND_INCIDENT_CONTEXT',
      ruleCode: 'GUIDANCE_INCIDENT',
    },
    {
      situationCode: guidanceTopicCodes.hazardousSubstances,
      topicCode: 'HAZARDOUS_SUBSTANCES',
      knowledgeNeedCode: 'KNOWLEDGE_HAZARDOUS_SUBSTANCES_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_HAZARDOUS_SUBSTANCES_CONTEXT',
      ruleCode: 'GUIDANCE_HAZARDOUS_SUBSTANCES',
    },
    {
      situationCode: guidanceTopicCodes.occupationalHealth,
      topicCode: 'OCCUPATIONAL_HEALTH',
      knowledgeNeedCode: 'KNOWLEDGE_OCCUPATIONAL_HEALTH_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_OCCUPATIONAL_HEALTH_CONTEXT',
      ruleCode: 'GUIDANCE_OCCUPATIONAL_HEALTH',
    },
    {
      situationCode: guidanceTopicCodes.emergencyResponse,
      topicCode: 'EMERGENCY_RESPONSE',
      knowledgeNeedCode: 'KNOWLEDGE_EMERGENCY_RESPONSE_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_EMERGENCY_RESPONSE_CONTEXT',
      ruleCode: 'GUIDANCE_EMERGENCY_RESPONSE',
    },
  ])(
    'bouwt voor $topicCode een kennisgerichte uitkomst',
    ({
      situationCode,
      topicCode,
      knowledgeNeedCode,
      solutionDirectionCode,
      ruleCode,
    }) => {
      const contract = createGuidanceContract()
      const outcome = guidanceEngine.evaluate({
        ...contract,
        situation: {
          ...contract.situation,
          code: situationCode,
        },
      })

      expect(outcome.relevantTopicCodes).toEqual([topicCode])
      expect(outcome.knowledgeNeeds).toEqual([
        expect.objectContaining({
          code: knowledgeNeedCode,
          topicCodes: [topicCode],
          reasonFactKeys: ['EXPLICIT_FACT'],
        }),
      ])
      expect(outcome.solutionDirections).toEqual([
        expect.objectContaining({
          code: solutionDirectionCode,
          reasonFactKeys: [],
        }),
      ])
      expect(outcome.professionalSupportNeed).toMatchObject({
        state: 'POSSIBLE',
        reasonFactKeys: [],
        reasonUncertaintyKeys: [],
        confirmation: { status: 'UNCONFIRMED' },
      })
      expect(outcome.professionalSupportNeed.provenance.rules).toEqual([
        {
          code: ruleCode,
          version: '1.0.0',
        },
      ])
      expect(outcome.professionalRequirements).toHaveLength(1)
      expect(outcome.professionalRequirements[0]).toMatchObject({
        priority: 'PRIMARY',
        status: 'DRAFT',
        confirmation: { status: 'UNCONFIRMED' },
      })
      expect(outcome.professionalAdvice).toMatchObject({
        outcomeSpecificity: 'SPECIFIC',
      })
    },
  )

  it('classificeert een niet-expliciete situatiecode niet', () => {
    const contract = createGuidanceContract()
    const outcome = guidanceEngine.evaluate({
      ...contract,
      situation: {
        ...contract.situation,
        code: 'rie',
      },
    })

    expect(outcome.relevantTopicCodes).toEqual([])
    expect(outcome.knowledgeNeeds).toEqual([])
    expect(outcome.solutionDirections).toEqual([])
    expect(outcome.professionalSupportNeed.state).toBe('NOT_DETERMINED')
  })
})
