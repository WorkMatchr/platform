import {
  CLARIFICATION_RESULT_SCHEMA_VERSION,
  type ClarificationQuestion,
  type ClarificationResult,
} from './clarification-contract'
import {
  CLARIFICATION_RULE_SET_VERSION,
  clarificationRulesV1,
  selectClarificationRules,
  type ClarificationRule,
} from './clarification-ruleset-v1'
import type { GuidanceContract } from './guidance-contract'
import {
  validateGuidanceContract,
  validateHelpRequest,
  type GuidanceContractValidationIssue,
} from './guidance-contract-validation'
import type { HelpRequest } from './guidance-domain'
import { selectGuidanceRules } from './guidance-ruleset-v1'

export const CLARIFICATION_ENGINE_VERSION =
  'clarification-engine/1.1.0' as const
export const CLARIFICATION_QUESTION_LIMIT = 5 as const

export class ClarificationEngineValidationError extends Error {
  readonly issues: readonly GuidanceContractValidationIssue[]

  constructor(
    message: string,
    issues: readonly GuidanceContractValidationIssue[],
  ) {
    super(message)
    this.name = 'ClarificationEngineValidationError'
    this.issues = issues
  }
}

function validateInput(
  contract: GuidanceContract,
  helpRequest: HelpRequest,
): Readonly<{
  contract: GuidanceContract
  helpRequest: HelpRequest
}> {
  const contractValidation = validateGuidanceContract(contract)
  if (!contractValidation.success) {
    throw new ClarificationEngineValidationError(
      'Het Guidance Contract is structureel ongeldig.',
      contractValidation.issues,
    )
  }

  const helpRequestValidation = validateHelpRequest(helpRequest)
  if (!helpRequestValidation.success) {
    throw new ClarificationEngineValidationError(
      'De huidige HelpRequest is structureel ongeldig.',
      helpRequestValidation.issues,
    )
  }

  return Object.freeze({
    contract: contractValidation.data,
    helpRequest: helpRequestValidation.data,
  })
}

function isFactAvailable(
  contract: GuidanceContract,
  rule: ClarificationRule,
): boolean {
  return contract.facts.some(
    (fact) =>
      fact.key === rule.requiredFactKey && fact.status === 'CONFIRMED',
  )
}

function toQuestion(rule: ClarificationRule): ClarificationQuestion {
  return Object.freeze({
    key: rule.question.key,
    text: rule.question.text,
    answerType: rule.question.answerType,
    resultingFactKey: rule.requiredFactKey,
  })
}

function freezeResult(result: ClarificationResult): ClarificationResult {
  Object.freeze(result.askedQuestionKeys)
  Object.freeze(result.missingFacts)
  Object.freeze(result.missingUncertainties)
  Object.freeze(result.provenance.contract)
  Object.freeze(result.provenance.appliedRuleCodes)
  Object.freeze(result.provenance)

  return Object.freeze(result)
}

function askedQuestionKeys(
  contract: GuidanceContract,
): readonly string[] {
  const factKeys = new Set(contract.facts.map((fact) => fact.key))
  const uncertaintyQuestionKeys = new Set(
    contract.uncertainties
      .map((uncertainty) => uncertainty.sourceQuestionKey)
      .filter((key): key is string => key !== null),
  )

  return Object.freeze(
    clarificationRulesV1
      .filter(
        (rule) =>
          factKeys.has(rule.requiredFactKey) ||
          uncertaintyQuestionKeys.has(rule.question.key),
      )
      .map((rule) => rule.question.key),
  )
}

function createResult(
  contract: GuidanceContract,
  helpRequest: HelpRequest,
): ClarificationResult {
  const rules = selectClarificationRules(contract.situation.code)
  const askedKeys = askedQuestionKeys(contract)
  const askedKeySet = new Set(askedKeys)
  const remainingQuestionBudget = Math.max(
    0,
    CLARIFICATION_QUESTION_LIMIT - askedKeys.length,
  )
  const provenance = {
    contract: {
      schemaVersion: contract.schemaVersion,
      id: contract.id,
      version: contract.version,
    },
    helpRequestConfirmationStatus: helpRequest.confirmation.status,
    ruleSetVersion: CLARIFICATION_RULE_SET_VERSION,
    engineVersion: CLARIFICATION_ENGINE_VERSION,
    appliedRuleCodes: rules.map((rule) => rule.code),
  } as const

  if (rules.length === 0) {
    const isSupportedWithoutQuestions =
      selectGuidanceRules(contract.situation.code).length > 0

    return freezeResult({
      schemaVersion: CLARIFICATION_RESULT_SCHEMA_VERSION,
      isComplete: true,
      nextQuestion: null,
      missingFacts: [],
      missingUncertainties: [],
      completionReason: isSupportedWithoutQuestions
        ? 'REQUIRED_INFORMATION_AVAILABLE'
        : 'UNSUPPORTED_SITUATION',
      askedQuestionKeys: askedKeys,
      questionLimit: CLARIFICATION_QUESTION_LIMIT,
      remainingQuestionBudget,
      provenance,
    })
  }

  const missingRules = rules.filter(
    (rule) => !isFactAvailable(contract, rule),
  )
  const uncertaintyKeys = new Set(
    contract.uncertainties.map((uncertainty) => uncertainty.key),
  )
  const missingUncertainties = missingRules.flatMap((rule) =>
    rule.relatedUncertaintyKeys.filter((key) => uncertaintyKeys.has(key)),
  )
  const nextRule =
    remainingQuestionBudget > 0
      ? (missingRules.find(
          (rule) => !askedKeySet.has(rule.question.key),
        ) ?? null)
      : null
  const completionReason = nextRule
    ? 'NEXT_QUESTION_AVAILABLE'
    : missingRules.length === 0
      ? 'REQUIRED_INFORMATION_AVAILABLE'
      : remainingQuestionBudget === 0
        ? 'QUESTION_BUDGET_EXHAUSTED'
        : 'NO_FURTHER_QUESTION_AVAILABLE'

  return freezeResult({
    schemaVersion: CLARIFICATION_RESULT_SCHEMA_VERSION,
    isComplete: nextRule === null,
    nextQuestion: nextRule ? toQuestion(nextRule) : null,
    missingFacts: missingRules.map((rule) => rule.requiredFactKey),
    missingUncertainties,
    completionReason,
    askedQuestionKeys: askedKeys,
    questionLimit: CLARIFICATION_QUESTION_LIMIT,
    remainingQuestionBudget,
    provenance,
  })
}

export type ClarificationEngine = Readonly<{
  evaluate(
    contract: GuidanceContract,
    helpRequest: HelpRequest,
  ): ClarificationResult
}>

export const clarificationEngine: ClarificationEngine = Object.freeze({
  evaluate(contract, helpRequest) {
    const input = validateInput(contract, helpRequest)

    return createResult(input.contract, input.helpRequest)
  },
})
