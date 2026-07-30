import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  contextFactValueTypes,
  GUIDANCE_OUTCOME_SCHEMA_VERSION,
  guidanceOutcomeStatuses,
  guidanceSourceKinds,
  professionalRequirementKinds,
  professionalRequirementPriorities,
  PROFESSIONAL_ADVICE_SCHEMA_VERSION,
  PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
  professionalRequirementStatuses,
  professionalSupportNeedStates,
  uncertaintyReasons,
  type GuidanceOutcome,
  type ProfessionalRequirement,
} from './guidance-domain'

const emptyProvenance = {
  sources: [],
  rules: [],
} as const

const guidanceOutcomeFixture = {
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
      schemaVersion: 'guidance-contract/1.0.0',
      id: 'guidance-contract-fixture',
      version: 1,
    },
    ruleSetVersion: 'guidance-rules/fixture',
    engineVersion: 'guidance-engine/fixture',
  },
  status: 'DRAFT',
  summary: 'Fictieve samenvatting voor een contracttest.',
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
  facts: [],
  uncertainties: [],
  relevantTopicCodes: [],
  knowledgeNeeds: [],
  solutionDirections: [],
  professionalSupportNeed: {
    id: 'support-need-fixture',
    state: 'NOT_DETERMINED',
    reasonFactKeys: [],
    reasonUncertaintyKeys: [],
    confirmation: { status: 'UNCONFIRMED' },
    provenance: emptyProvenance,
  },
  professionalRequirements: [],
  professionalAdvice: {
    schemaVersion: PROFESSIONAL_ADVICE_SCHEMA_VERSION,
    ruleSetVersion: 'professional-advice-rules/fixture',
    appliedRuleCode: 'PROFESSIONAL_ADVICE_FIXTURE',
    situationSummary: 'Fictieve samenvatting voor een contracttest.',
    adviceTitle: 'Breng de situatie verder in kaart',
    adviceBody: 'Fictieve adviesinhoud voor een contracttest.',
    adviceReasons: ['Fictieve reden.'],
    selfActions: ['Fictieve actie.'],
    dominantContext: 'UNKNOWN',
    relevantRiskDomains: [],
    primaryProfessionalRequirement: null,
    additionalProfessionalRequirements: [],
    possibleProfessionalRequirements: [],
    knowledgeReferences: [],
    sourceReferences: [],
    disclaimer: 'Fictieve disclaimer.',
    outcomeSpecificity: 'SAFE_FALLBACK',
  },
  confirmation: { status: 'UNCONFIRMED' },
  createdAt: '2026-07-27T00:00:00.000Z',
  checksum: null,
} as const satisfies GuidanceOutcome

const professionalRequirementFixture = {
  schemaVersion: PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
  id: 'professional-requirement-fixture',
  version: 1,
  guidanceOutcomeId: guidanceOutcomeFixture.id,
  professionalSupportNeedId:
    guidanceOutcomeFixture.professionalSupportNeed.id,
  status: 'DRAFT',
  professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
  priority: 'PRIMARY',
  reason: 'Fictieve reden voor passende deskundigheid.',
  expertise: ['RI&E'],
  matchingTags: ['RISK_ASSESSMENT'],
  criteria: [
    {
      code: 'CAPABILITY_FIXTURE',
      kind: 'CAPABILITY',
      priority: 'REQUIRED',
      valueCodes: ['SERVICE_FIXTURE'],
      provenance: emptyProvenance,
    },
  ],
  createdAt: '2026-07-27T00:00:00.000Z',
  confirmation: { status: 'UNCONFIRMED' },
  checksum: null,
} as const satisfies ProfessionalRequirement

describe('ADR-021 guidance-domeincontract', () => {
  it('houdt de contractversies expliciet en onafhankelijk', () => {
    expect(GUIDANCE_OUTCOME_SCHEMA_VERSION).toBe(
      'guidance-outcome/1.2.0',
    )
    expect(PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION).toBe(
      'professional-requirement/1.2.0',
    )
    expect(guidanceOutcomeFixture.schemaVersion).not.toBe(
      professionalRequirementFixture.schemaVersion,
    )
  })

  it('heeft unieke, stabiele vocabularia', () => {
    const vocabularies = [
      guidanceSourceKinds,
      guidanceOutcomeStatuses,
      contextFactValueTypes,
      uncertaintyReasons,
      professionalSupportNeedStates,
      professionalRequirementStatuses,
      professionalRequirementKinds,
      professionalRequirementPriorities,
    ]

    for (const vocabulary of vocabularies) {
      expect(new Set(vocabulary).size).toBe(vocabulary.length)
    }
  })

  it('scheidt guidance, ondersteuningsbehoefte en professionele vereisten', () => {
    expect(guidanceOutcomeFixture.professionalSupportNeed.state).toBe(
      'NOT_DETERMINED',
    )
    expect(professionalRequirementFixture.guidanceOutcomeId).toBe(
      guidanceOutcomeFixture.id,
    )
    expect(professionalRequirementFixture.criteria[0]).toMatchObject({
      kind: 'CAPABILITY',
      priority: 'REQUIRED',
    })

    expectTypeOf(guidanceOutcomeFixture).toMatchTypeOf<GuidanceOutcome>()
    expectTypeOf(
      professionalRequirementFixture,
    ).toMatchTypeOf<ProfessionalRequirement>()
  })
})
