import {
  validateGuidanceContract,
  validateGuidanceOutcome,
  type GuidanceContractValidationIssue,
} from './guidance-contract-validation'
import type { GuidanceContract } from './guidance-contract'
import {
  GUIDANCE_OUTCOME_SCHEMA_VERSION,
  type ContextFact,
  type GuidanceProvenance,
  type GuidanceOutcome,
  type KnowledgeNeed,
  type ProfessionalSupportNeed,
  type SolutionDirection,
  type Uncertainty,
} from './guidance-domain'
import {
  GUIDANCE_RULE_SET_VERSION,
  selectGuidanceRules,
  toGuidanceRuleReference,
  type GuidanceRule,
} from './guidance-ruleset-v1'
import { buildProfessionalAdvice } from './professional-advice-rules'
import {
  confirmedReasonFactKeys,
  summarizeConfirmedContext,
} from './confirmed-context'

export const GUIDANCE_ENGINE_VERSION = 'guidance-engine/2.1.0' as const
export { GUIDANCE_RULE_SET_VERSION } from './guidance-ruleset-v1'

export class GuidanceEngineValidationError extends Error {
  readonly issues: readonly GuidanceContractValidationIssue[]

  constructor(
    message: string,
    issues: readonly GuidanceContractValidationIssue[],
  ) {
    super(message)
    this.name = 'GuidanceEngineValidationError'
    this.issues = issues
  }
}

type NormalizedGuidanceInput = Readonly<{
  contract: GuidanceContract
}>

type GuidancePipelineState = Readonly<{
  input: NormalizedGuidanceInput
  rules: readonly GuidanceRule[]
  facts: readonly ContextFact[]
  uncertainties: readonly Uncertainty[]
  relevantTopicCodes: readonly string[]
  knowledgeNeeds: readonly KnowledgeNeed[]
  solutionDirections: readonly SolutionDirection[]
  professionalSupportNeed: ProfessionalSupportNeed
}>

function validateInput(contract: GuidanceContract): GuidanceContract {
  const result = validateGuidanceContract(contract)

  if (!result.success) {
    throw new GuidanceEngineValidationError(
      'Het Guidance Contract is structureel ongeldig.',
      result.issues,
    )
  }

  return result.data
}

function normalizeInput(contract: GuidanceContract): NormalizedGuidanceInput {
  return Object.freeze({ contract })
}

function processFacts(
  input: NormalizedGuidanceInput,
): readonly ContextFact[] {
  return Object.freeze([...input.contract.facts])
}

function processUncertainties(
  input: NormalizedGuidanceInput,
): readonly Uncertainty[] {
  return Object.freeze([...input.contract.uncertainties])
}

function createRuleProvenance(
  contract: GuidanceContract,
  rules: readonly GuidanceRule[],
): GuidanceProvenance {
  return Object.freeze({
    sources: Object.freeze([contract.source]),
    rules: Object.freeze(rules.map(toGuidanceRuleReference)),
  })
}

function determineRelevantTopics(
  rules: readonly GuidanceRule[],
): readonly string[] {
  return Object.freeze(rules.map((rule) => rule.then.topicCode))
}

function determineKnowledgeNeeds(
  contract: GuidanceContract,
  rules: readonly GuidanceRule[],
): readonly KnowledgeNeed[] {
  const reasonFactKeys = confirmedReasonFactKeys({ facts: contract.facts })
  return Object.freeze(
    rules.map((rule) =>
      Object.freeze({
        code: rule.then.knowledgeNeedCode,
        topicCodes: Object.freeze([rule.then.topicCode]),
        reasonFactKeys,
        provenance: createRuleProvenance(contract, [rule]),
      }),
    ),
  )
}

function determineSolutionDirections(
  contract: GuidanceContract,
  rules: readonly GuidanceRule[],
): readonly SolutionDirection[] {
  return Object.freeze(
    rules.map((rule) =>
      Object.freeze({
        code: rule.then.solutionDirectionCode,
        description: rule.then.solutionDirectionDescription,
        reasonFactKeys: Object.freeze([]),
        provenance: createRuleProvenance(contract, [rule]),
      }),
    ),
  )
}

function determineProfessionalSupportNeed(
  contract: GuidanceContract,
  rules: readonly GuidanceRule[],
): ProfessionalSupportNeed {
  return Object.freeze({
    id: `professional-support-need:${contract.id}:v${contract.version}`,
    state:
      rules.length === 0
        ? 'NOT_DETERMINED'
        : rules[0].then.professionalSupportState,
    reasonFactKeys: Object.freeze([]),
    reasonUncertaintyKeys: Object.freeze([]),
    confirmation: Object.freeze({ status: 'UNCONFIRMED' }),
    provenance: createRuleProvenance(contract, rules),
  })
}

function runPipeline(input: NormalizedGuidanceInput): GuidancePipelineState {
  const rules = selectGuidanceRules(input.contract.situation.code)

  return Object.freeze({
    input,
    rules,
    facts: processFacts(input),
    uncertainties: processUncertainties(input),
    relevantTopicCodes: determineRelevantTopics(rules),
    knowledgeNeeds: determineKnowledgeNeeds(input.contract, rules),
    solutionDirections: determineSolutionDirections(input.contract, rules),
    professionalSupportNeed: determineProfessionalSupportNeed(
      input.contract,
      rules,
    ),
  })
}

function createOutcome(state: GuidancePipelineState): GuidanceOutcome {
  const { contract } = state.input
  const outcomeWithoutAdvice: Omit<GuidanceOutcome, 'professionalAdvice'> = {
    schemaVersion: GUIDANCE_OUTCOME_SCHEMA_VERSION,
    id: `guidance-outcome:${contract.id}:v${contract.version}`,
    version: 1,
    source: contract.source,
    questionSetVersion: contract.questionSetVersion,
    ruleSetVersion: GUIDANCE_RULE_SET_VERSION,
    executionProvenance: {
      contract: {
        schemaVersion: contract.schemaVersion,
        id: contract.id,
        version: contract.version,
      },
      ruleSetVersion: GUIDANCE_RULE_SET_VERSION,
      engineVersion: GUIDANCE_ENGINE_VERSION,
    },
    status: 'DRAFT',
    summary: summarizeConfirmedContext(
      contract.helpRequest.confirmedDescription ??
        contract.helpRequest.originalInput,
      contract.facts,
    ),
    situation: contract.situation,
    helpRequest: contract.helpRequest,
    facts: state.facts,
    uncertainties: state.uncertainties,
    relevantTopicCodes: state.relevantTopicCodes,
    knowledgeNeeds: state.knowledgeNeeds,
    solutionDirections: state.solutionDirections,
    professionalSupportNeed: state.professionalSupportNeed,
    professionalRequirements: [],
    confirmation: { status: 'UNCONFIRMED' },
    createdAt: contract.createdAt,
    checksum: null,
  }
  const professionalAdvice = buildProfessionalAdvice(outcomeWithoutAdvice)
  const professionalRequirements = [
    ...(professionalAdvice.primaryProfessionalRequirement
      ? [professionalAdvice.primaryProfessionalRequirement]
      : []),
    ...professionalAdvice.additionalProfessionalRequirements,
    ...professionalAdvice.possibleProfessionalRequirements,
  ]
  const outcome: GuidanceOutcome = {
    ...outcomeWithoutAdvice,
    professionalRequirements: Object.freeze(professionalRequirements),
    professionalAdvice,
  }
  const validation = validateGuidanceOutcome(outcome)

  if (!validation.success) {
    throw new GuidanceEngineValidationError(
      'De Guidance Engine heeft een structureel ongeldige uitkomst gemaakt.',
      validation.issues,
    )
  }

  return validation.data
}

export type GuidanceEngine = Readonly<{
  evaluate(contract: GuidanceContract): GuidanceOutcome
}>

export const guidanceEngine: GuidanceEngine = Object.freeze({
  evaluate(contract) {
    const validContract = validateInput(contract)
    const normalizedInput = normalizeInput(validContract)
    const pipelineState = runPipeline(normalizedInput)

    return createOutcome(pipelineState)
  },
})
