import { describe, expect, it } from 'vitest'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from './guidance-contract'
import {
  validateGuidanceContract,
  validateGuidanceOutcome,
  validateHelpRequest,
} from './guidance-contract-validation'
import {
  GUIDANCE_OUTCOME_SCHEMA_VERSION,
  PROFESSIONAL_ADVICE_SCHEMA_VERSION,
  PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
  type GuidanceOutcome,
} from './guidance-domain'

const timestamp = '2026-07-27T12:00:00.000Z'
const emptyProvenance = {
  sources: [],
  rules: [],
} as const

function createGuidanceContract(): GuidanceContract {
  return {
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: 'guidance-contract-fixture',
    version: 1,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'public-intake-fixture',
      version: '1',
    },
    questionSetVersion: 'question-set/fixture',
    situation: {
      code: 'SITUATION_FIXTURE',
      description: 'Fictieve situatie voor een contracttest.',
      provenance: emptyProvenance,
    },
    helpRequest: {
      originalInput: 'Fictieve hulpvraag voor een contracttest.',
      confirmedDescription: null,
      confirmation: { status: 'UNCONFIRMED' },
    },
    facts: [
      {
        key: 'ORGANIZATION_HAS_EMPLOYEES',
        valueType: 'BOOLEAN',
        value: true,
        status: 'CONFIRMED',
        provenance: emptyProvenance,
      },
    ],
    uncertainties: [
      {
        key: 'CURRENT_MEASURE_UNKNOWN',
        reason: 'UNKNOWN',
        description: 'Een fictief gegeven is nog onbekend.',
        sourceQuestionKey: 'QUESTION_FIXTURE',
        provenance: emptyProvenance,
      },
    ],
    createdAt: timestamp,
  }
}

function createGuidanceOutcome(): GuidanceOutcome {
  const professionalRequirement = {
    schemaVersion: PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
    id: 'professional-requirement-fixture',
    version: 1,
    guidanceOutcomeId: 'guidance-outcome-fixture',
    professionalSupportNeedId: 'support-need-fixture',
    status: 'DRAFT' as const,
    professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE' as const,
    priority: 'PRIMARY' as const,
    reason: 'Fictieve reden voor passende deskundigheid.',
    expertise: ['RI&E'],
    matchingTags: ['RISK_ASSESSMENT'],
    criteria: [
      {
        code: 'CAPABILITY_FIXTURE',
        kind: 'CAPABILITY' as const,
        priority: 'REQUIRED' as const,
        valueCodes: ['SERVICE_FIXTURE'],
        provenance: emptyProvenance,
      },
    ],
    createdAt: timestamp,
    confirmation: { status: 'UNCONFIRMED' as const },
    checksum: null,
  }

  return {
    schemaVersion: GUIDANCE_OUTCOME_SCHEMA_VERSION,
    id: 'guidance-outcome-fixture',
    version: 1,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'public-intake-fixture',
      version: '1',
    },
    questionSetVersion: 'question-set/fixture',
    ruleSetVersion: 'guidance-rules/fixture',
    executionProvenance: {
      contract: {
        schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
        id: 'guidance-contract-fixture',
        version: 1,
      },
      ruleSetVersion: 'guidance-rules/fixture',
      engineVersion: 'guidance-engine/fixture',
    },
    status: 'DRAFT',
    summary: 'Fictieve samenvatting van de verduidelijkte hulpvraag.',
    situation: {
      code: 'SITUATION_FIXTURE',
      description: 'Fictieve situatie voor een contracttest.',
      provenance: emptyProvenance,
    },
    helpRequest: {
      originalInput: 'Fictieve hulpvraag voor een contracttest.',
      confirmedDescription:
        'Bevestigde fictieve hulpvraag voor een contracttest.',
      confirmation: {
        status: 'CONFIRMED',
        actorType: 'VISITOR_SESSION',
        actorReference: null,
        confirmedAt: timestamp,
      },
    },
    facts: [],
    uncertainties: [],
    relevantTopicCodes: ['TOPIC_FIXTURE'],
    knowledgeNeeds: [
      {
        code: 'KNOWLEDGE_FIXTURE',
        topicCodes: ['TOPIC_FIXTURE'],
        reasonFactKeys: [],
        provenance: emptyProvenance,
      },
    ],
    solutionDirections: [
      {
        code: 'SOLUTION_FIXTURE',
        description: 'Fictieve oplossingsrichting.',
        reasonFactKeys: [],
        provenance: emptyProvenance,
      },
    ],
    professionalSupportNeed: {
      id: 'support-need-fixture',
      state: 'POSSIBLE',
      reasonFactKeys: [],
      reasonUncertaintyKeys: [],
      confirmation: { status: 'UNCONFIRMED' },
      provenance: emptyProvenance,
    },
    professionalRequirements: [professionalRequirement],
    professionalAdvice: {
      schemaVersion: PROFESSIONAL_ADVICE_SCHEMA_VERSION,
      ruleSetVersion: 'professional-advice-rules/fixture',
      appliedRuleCode: 'PROFESSIONAL_ADVICE_FIXTURE',
      situationSummary:
        'Bevestigde fictieve hulpvraag voor een contracttest.',
      adviceTitle: 'Fictief advies',
      adviceBody: 'Fictieve adviesinhoud.',
      adviceReasons: ['Fictieve reden.'],
      selfActions: ['Fictieve actie.'],
      dominantContext: 'GENERAL_RISK_ASSESSMENT',
      relevantRiskDomains: ['RISK_ASSESSMENT'],
      primaryProfessionalRequirement: professionalRequirement,
      additionalProfessionalRequirements: [],
      possibleProfessionalRequirements: [],
      knowledgeReferences: [],
      sourceReferences: [],
      disclaimer: 'Fictieve disclaimer.',
      outcomeSpecificity: 'SPECIFIC',
    },
    confirmation: { status: 'UNCONFIRMED' },
    createdAt: timestamp,
    checksum: null,
  }
}

describe('ADR-021 Guidance Contract-validatie', () => {
  it('accepteert en bevriest een geldig Guidance Contract', () => {
    const result = validateGuidanceContract(createGuidanceContract())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(Object.isFrozen(result.data)).toBe(true)
    expect(Object.isFrozen(result.data.situation)).toBe(true)
    expect(Object.isFrozen(result.data.facts)).toBe(true)
    expect(Object.isFrozen(result.data.facts[0])).toBe(true)
  })

  it('valideert de verplichte HelpRequest-structuur zonder inhoud af te leiden', () => {
    expect(
      validateHelpRequest({
        originalInput: 'Een fictieve hulpvraag.',
        confirmedDescription: null,
        confirmation: { status: 'UNCONFIRMED' },
      }).success,
    ).toBe(true)

    const invalid = validateHelpRequest({
      originalInput: '',
      confirmedDescription: null,
      confirmation: { status: 'UNCONFIRMED' },
    })

    expect(invalid.success).toBe(false)
  })

  it('weigert onbekende velden en niet-ondersteunde contractversies', () => {
    const contract = {
      ...createGuidanceContract(),
      schemaVersion: 'guidance-contract/2.0.0',
      unexpected: true,
    }
    const result = validateGuidanceContract(contract)

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues.some((issue) => issue.path[0] === 'schemaVersion')).toBe(
      true,
    )
    expect(result.issues.some((issue) => issue.code === 'unrecognized_keys')).toBe(
      true,
    )
  })

  it('weigert structureel inconsistente feitwaarden en dubbele sleutels', () => {
    const contract = createGuidanceContract()
    const duplicateFact = {
      ...contract.facts[0],
      valueType: 'NUMBER',
    } as const
    const result = validateGuidanceContract({
      ...contract,
      facts: [contract.facts[0], duplicateFact],
    })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(
      result.issues.some(
        (issue) =>
          issue.path[0] === 'facts' &&
          issue.message.includes('uniek'),
      ),
    ).toBe(true)
    expect(
      result.issues.some(
        (issue) =>
          issue.path[0] === 'facts' &&
          issue.message.includes('valueType'),
      ),
    ).toBe(true)
  })

  it('accepteert alle afgesproken onderdelen van GuidanceOutcome', () => {
    const result = validateGuidanceOutcome(createGuidanceOutcome())

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.data.summary).toContain('verduidelijkte hulpvraag')
    expect(result.data.relevantTopicCodes).toEqual(['TOPIC_FIXTURE'])
    expect(result.data.professionalRequirements).toHaveLength(1)
    expect(Object.isFrozen(result.data.professionalRequirements[0])).toBe(true)
  })

  it('weigert een niet-ondersteunde GuidanceOutcome-versie', () => {
    const result = validateGuidanceOutcome({
      ...createGuidanceOutcome(),
      schemaVersion: 'guidance-outcome/2.0.0',
    })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.issues.some((issue) => issue.path[0] === 'schemaVersion')).toBe(
      true,
    )
  })

  it('bewaakt de structurele binding van professionele vereisten', () => {
    const outcome = createGuidanceOutcome()
    const result = validateGuidanceOutcome({
      ...outcome,
      professionalRequirements: [
        {
          ...outcome.professionalRequirements[0],
          guidanceOutcomeId: 'ander-outcome',
          professionalSupportNeedId: 'andere-behoefte',
        },
      ],
    })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(
      result.issues.filter(
        (issue) => issue.path[0] === 'professionalRequirements',
      ),
    ).toHaveLength(2)
  })

  it('bewaakt de regelsetversie in de uitvoeringsprovenance', () => {
    const outcome = createGuidanceOutcome()
    const result = validateGuidanceOutcome({
      ...outcome,
      executionProvenance: {
        ...outcome.executionProvenance,
        ruleSetVersion: 'andere-regelset',
      },
    })

    expect(result.success).toBe(false)
    if (result.success) return

    expect(
      result.issues.some(
        (issue) => issue.path[0] === 'executionProvenance',
      ),
    ).toBe(true)
  })
})
