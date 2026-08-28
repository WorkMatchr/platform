import {
  clarificationEngine,
} from '@/lib/guidance/clarification-engine'
import type { ClarificationResult } from '@/lib/guidance/clarification-contract'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from '@/lib/guidance/guidance-contract'
import { guidanceEngine } from '@/lib/guidance/guidance-engine'
import { validateGuidanceOutcome } from '@/lib/guidance/guidance-contract-validation'
import type {
  ContextFact,
  ContextFactValueType,
  GuidanceOutcome,
  GuidanceProvenance,
  HelpRequest,
  Uncertainty,
} from '@/lib/guidance/guidance-domain'
import { buildSafeFallbackProfessionalAdvice } from '@/lib/guidance/professional-advice-rules'
import { getAIContextQuestion } from '@/lib/ai-intake-classifier/ai-context-question-catalog'
import {
  PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION,
  type PublicIntakeCompletion,
} from './public-intake-completion'
import { getEntryPointLabel } from './public-intake-prototype'
import type {
  PublicIntakeAnswerView,
  PublicIntakeDraftView,
} from './public-intake-types'
import {
  PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION,
  PUBLIC_HELP_REQUEST_INTAKE_V2_QUESTION_LIMIT,
} from './public-intake-config'
import { KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION } from './context-question-engine-types'

export type PublicIntakeGuidanceHandoff = Readonly<{
  contract: GuidanceContract
  clarification: ClarificationResult
  outcome: GuidanceOutcome | null
  completion: PublicIntakeCompletion
}>

type PublicIntakeDraftSnapshot = Omit<
  PublicIntakeDraftView,
  'guidance'
>

const RIE_REQUEST_KEYS = new Set([
  'rie_needed',
  'rie_update',
  'rie_uncertain',
])

const GUIDANCE_TOPIC_SITUATION_CODES: Readonly<Record<string, string>> =
  Object.freeze({
    HAZARDOUS_SUBSTANCES: 'HAZARDOUS_SUBSTANCES',
    INCIDENT: 'INCIDENT',
    RIE: 'RIE',
    HEALTH_WORKLOAD: 'OCCUPATIONAL_HEALTH',
    OCCUPATIONAL_HEALTH: 'OCCUPATIONAL_HEALTH',
    EMERGENCY_RESPONSE: 'EMERGENCY_RESPONSE',
    OTHER: 'UNSUPPORTED',
  })

function situationCode(draft: PublicIntakeDraftSnapshot): string {
  if (
    draft.selectedRequestKey &&
    RIE_REQUEST_KEYS.has(draft.selectedRequestKey)
  ) {
    return 'RIE'
  }

  if (draft.entryPoint !== 'FREE_TEXT') {
    return 'UNSUPPORTED'
  }

  const topicAnswer = draft.answers.find(
    (answer) =>
      answer.questionKey === 'guidance_topic' &&
      answer.disposition === 'ANSWERED' &&
      typeof answer.value === 'string',
  )

  const aiSubject = draft.aiClassification?.confidence === 'HIGH'
    ? draft.aiClassification.primarySubject
    : null
  const aiSituation = aiSubject
    ? GUIDANCE_TOPIC_SITUATION_CODES[aiSubject]
    : null

  return topicAnswer
    ? (GUIDANCE_TOPIC_SITUATION_CODES[topicAnswer.value as string] ??
        'UNSUPPORTED')
    : (aiSituation ?? 'UNCLASSIFIED')
}

function guidanceSource(
  draftId: string,
  draftVersion: number,
): GuidanceContract['source'] {
  return Object.freeze({
    kind: 'PUBLIC_INTAKE_DRAFT',
    referenceId: draftId,
    version: String(draftVersion),
  })
}

function directProvenance(
  source: GuidanceContract['source'],
): GuidanceProvenance {
  return Object.freeze({
    sources: Object.freeze([source]),
    rules: Object.freeze([]),
  })
}

function answerFactKey(
  answer: PublicIntakeAnswerView,
  contextQuestions: PublicIntakeDraftSnapshot['contextQuestions'],
): string {
  const clarificationFactKeys: Readonly<Record<string, string>> =
    Object.freeze({
      guidance_topic: 'GUIDANCE_TOPIC',
      rie_has_employees: 'HAS_EMPLOYEES',
      incident_injury_occurred: 'INCIDENT_INJURY_OCCURRED',
      hazardous_substances_storage: 'HAZARDOUS_SUBSTANCES_STORAGE',
      hazardous_substances_transport: 'HAZARDOUS_SUBSTANCES_TRANSPORT',
      hazardous_substances_loading_unloading:
        'HAZARDOUS_SUBSTANCES_LOADING_UNLOADING',
    })
  const clarificationFactKey = clarificationFactKeys[answer.questionKey]

  if (clarificationFactKey) return clarificationFactKey
  const contextGoalCode = contextQuestions?.find(
    (question) => question.questionKey === answer.questionKey,
  )?.contextGoalCode
  if (contextGoalCode) return `PUBLIC_INTAKE_CONTEXT_GOAL_${contextGoalCode}`

  return `PUBLIC_INTAKE_${answer.questionKey
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')}`
}

function factValueType(
  answer: PublicIntakeAnswerView,
): ContextFactValueType {
  switch (answer.answerType) {
    case 'TEXT':
      return 'TEXT'
    case 'NUMBER':
      return 'NUMBER'
    case 'BOOLEAN':
      return 'BOOLEAN'
    case 'DATE':
      return 'DATE'
    case 'OPTION':
    case 'PERIOD':
      return 'CODE'
    case 'MULTI_OPTION':
      return 'CODE_LIST'
  }
}

function toFacts(
  answers: readonly PublicIntakeAnswerView[],
  provenance: GuidanceProvenance,
  sharedContext: PublicIntakeDraftSnapshot['sharedAssignmentContext'],
  contextQuestions: PublicIntakeDraftSnapshot['contextQuestions'],
): readonly ContextFact[] {
  const answerFacts = answers
    .filter(
      (answer) =>
        answer.disposition === 'ANSWERED' && answer.value !== null,
    )
    .flatMap((answer) => {
      const answerFact = Object.freeze({
        key: answerFactKey(answer, contextQuestions),
        valueType: factValueType(answer),
        value: answer.value as string | number | boolean | readonly string[],
        status: 'CONFIRMED',
        provenance,
      }) satisfies ContextFact

      const confirmsEmployees =
        answer.questionKey === 'context_employee_count' ||
        (answer.questionKey === 'context_affected_scope' &&
          (answer.value === 'ONE' || answer.value === 'MULTIPLE' ||
            answer.value === 'Bij één medewerker' ||
            answer.value === 'Bij meerdere medewerkers'))

      if (!confirmsEmployees) {
        return [answerFact]
      }

      return [
        answerFact,
        Object.freeze({
          key: 'HAS_EMPLOYEES',
          valueType: 'BOOLEAN',
          value: true,
          status: 'CONFIRMED',
          provenance,
        }) satisfies ContextFact,
      ]
    })
  if (!sharedContext?.sector) return answerFacts
  if (answers.some((answer) => answer.questionKey === 'context_sector')) return answerFacts
  return [
    ...answerFacts,
    Object.freeze({
      key: 'PUBLIC_INTAKE_CONTEXT_SECTOR',
      valueType: 'CODE',
      value: sharedContext.sector.code,
      status: 'CONFIRMED',
      provenance,
    }) satisfies ContextFact,
  ]
}

function uncertaintyKey(
  answer: PublicIntakeAnswerView,
  contextQuestions: PublicIntakeDraftSnapshot['contextQuestions'],
): string {
  if (answer.questionKey === 'rie_has_employees') {
    return 'HAS_EMPLOYEES_UNKNOWN'
  }

  return `${answerFactKey(answer, contextQuestions)}_${
    answer.disposition === 'SKIPPED' ? 'DEFERRED' : 'UNKNOWN'
  }`
}

function toUncertainties(
  answers: readonly PublicIntakeAnswerView[],
  provenance: GuidanceProvenance,
  contextQuestions: PublicIntakeDraftSnapshot['contextQuestions'],
): readonly Uncertainty[] {
  return answers
    .filter((answer) => answer.disposition !== 'ANSWERED')
    .map((answer) => {
      const question = getAIContextQuestion(answer.questionKey)
      return Object.freeze({
        key: uncertaintyKey(answer, contextQuestions),
        reason:
          answer.disposition === 'SKIPPED' ? 'DEFERRED' : 'UNKNOWN',
        description:
          answer.disposition === 'SKIPPED'
            ? 'De bezoeker heeft deze informatie uitgesteld.'
            : question?.unknownText ??
              'De bezoeker heeft aangegeven deze informatie niet te weten.',
        sourceQuestionKey: answer.questionKey,
        provenance,
      })
    })
}

const SAFE_FALLBACK_RULE_SET_VERSION =
  'public-intake-safe-fallback/1.0.0' as const

function createSafeFallbackOutcome(
  contract: GuidanceContract,
): GuidanceOutcome {
  const baseOutcome = guidanceEngine.evaluate(contract)
  const fallbackProvenance: GuidanceProvenance = Object.freeze({
    sources: Object.freeze([contract.source]),
    rules: Object.freeze([
      Object.freeze({
        code: 'PUBLIC_INTAKE_SAFE_FALLBACK',
        version: '1.0.0',
      }),
    ]),
  })
  const outcomeWithoutAdvice: Omit<
    GuidanceOutcome,
    'professionalAdvice'
  > = {
    ...baseOutcome,
    ruleSetVersion: SAFE_FALLBACK_RULE_SET_VERSION,
    executionProvenance: Object.freeze({
      ...baseOutcome.executionProvenance,
      ruleSetVersion: SAFE_FALLBACK_RULE_SET_VERSION,
      engineVersion: 'public-intake-completion/1.0.0',
    }),
    relevantTopicCodes: Object.freeze([]),
    knowledgeNeeds: Object.freeze([
      Object.freeze({
        code: 'KNOWLEDGE_GENERAL_SITUATION_REVIEW',
        topicCodes: Object.freeze([]),
        reasonFactKeys: Object.freeze([]),
        provenance: fallbackProvenance,
      }),
    ]),
    solutionDirections: Object.freeze([
      Object.freeze({
        code: 'GENERAL_SITUATION_REVIEW',
        description:
          'Op basis van de beschikbare informatie kunnen wij nog geen specifiek advies geven. Leg de situatie voor aan een brede arbodeskundige of arbodienst voor een nadere beoordeling.',
        reasonFactKeys: Object.freeze([]),
        provenance: fallbackProvenance,
      }),
    ]),
    professionalSupportNeed: Object.freeze({
      ...baseOutcome.professionalSupportNeed,
      state: 'POSSIBLE',
      reasonUncertaintyKeys: Object.freeze(
        contract.uncertainties.map((uncertainty) => uncertainty.key),
      ),
      provenance: fallbackProvenance,
    }),
    professionalRequirements: Object.freeze([]),
  }
  const outcome: GuidanceOutcome = {
    ...outcomeWithoutAdvice,
    professionalAdvice:
      buildSafeFallbackProfessionalAdvice(outcomeWithoutAdvice),
  }
  const validation = validateGuidanceOutcome(outcome)

  if (!validation.success) {
    throw new Error('PUBLIC_INTAKE_SAFE_FALLBACK_INVALID')
  }

  return validation.data
}

function isCancelledPhase(
  phase: PublicIntakeDraftSnapshot['phase'],
): boolean {
  return [
    'ABANDONED',
    'ABANDONED_BY_USER',
    'ABANDONED_TIMEOUT',
    'EXPIRED',
  ].includes(phase)
}

function completion(
  draft: PublicIntakeDraftSnapshot,
  clarification: ClarificationResult,
): PublicIntakeCompletion {
  if (isCancelledPhase(draft.phase)) {
    return Object.freeze({
      schemaVersion: PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION,
      status: 'CANCELLED',
      reason: 'USER_CANCELLED',
    })
  }

  if (!clarification.isComplete) {
    return Object.freeze({
      schemaVersion: PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION,
      status: 'IN_PROGRESS',
      reason: clarification.completionReason,
    })
  }

  return Object.freeze({
    schemaVersion: PUBLIC_INTAKE_COMPLETION_SCHEMA_VERSION,
    status:
      clarification.completionReason === 'REQUIRED_INFORMATION_AVAILABLE'
        ? 'COMPLETED_WITH_GUIDANCE'
        : 'COMPLETED_WITH_SAFE_FALLBACK',
    reason: clarification.completionReason,
  })
}

export function buildPublicIntakeGuidanceHandoff(
  draftId: string,
  draft: PublicIntakeDraftSnapshot,
): PublicIntakeGuidanceHandoff {
  const source = guidanceSource(draftId, draft.version)
  const provenance = directProvenance(source)
  const description = getEntryPointLabel(
    draft.entryPoint,
    draft.selectedRequestKey,
    draft.originalInput,
  )
  const helpRequest: HelpRequest = Object.freeze({
    originalInput: description,
    confirmedDescription: null,
    confirmation: Object.freeze({ status: 'UNCONFIRMED' }),
  })
  const contract: GuidanceContract = Object.freeze({
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: `guidance-contract:public-intake:${draftId}`,
    version: draft.version,
    source,
    questionSetVersion: draft.flowVersion,
    situation: Object.freeze({
      code: situationCode(draft),
      description,
      provenance,
    }),
    helpRequest,
    facts: Object.freeze(toFacts(
      draft.answers,
      provenance,
      draft.sharedAssignmentContext,
      draft.contextQuestions,
    )),
    uncertainties: Object.freeze(
      toUncertainties(draft.answers, provenance, draft.contextQuestions),
    ),
    createdAt: draft.startedAt.toISOString(),
  })
  const evaluatedClarification = clarificationEngine.evaluate(contract, helpRequest)
  const engineQuestions = draft.contextQuestions?.filter(
    (question) => question.catalogVersion === KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
  ) ?? []
  const unansweredEngineQuestion = engineQuestions.some(
    (question) => !draft.answers.some((answer) => answer.questionKey === question.questionKey),
  )
  const budgetExhausted = draft.answers.length >= PUBLIC_HELP_REQUEST_INTAKE_V2_QUESTION_LIMIT
  const clarification = engineQuestions.length > 0
    ? unansweredEngineQuestion
      ? Object.freeze({ ...evaluatedClarification, isComplete: false, nextQuestion: null })
      : Object.freeze({
          ...evaluatedClarification,
          isComplete: true,
          nextQuestion: null,
          completionReason: budgetExhausted
            ? 'QUESTION_BUDGET_EXHAUSTED' as const
            : 'REQUIRED_INFORMATION_AVAILABLE' as const,
          remainingQuestionBudget: Math.max(0, PUBLIC_HELP_REQUEST_INTAKE_V2_QUESTION_LIMIT - draft.answers.length),
        })
    : draft.flowVersion === PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION &&
        budgetExhausted && !evaluatedClarification.isComplete
      ? Object.freeze({
          ...evaluatedClarification,
          isComplete: true,
          nextQuestion: null,
          completionReason: 'QUESTION_BUDGET_EXHAUSTED' as const,
          remainingQuestionBudget: 0,
        })
      : evaluatedClarification
  const intakeCompletion = completion(draft, clarification)
  const outcome =
    intakeCompletion.status === 'COMPLETED_WITH_GUIDANCE'
      ? guidanceEngine.evaluate(contract)
      : intakeCompletion.status === 'COMPLETED_WITH_SAFE_FALLBACK'
        ? createSafeFallbackOutcome(contract)
        : null

  return Object.freeze({
    contract,
    clarification,
    outcome,
    completion: intakeCompletion,
  })
}
