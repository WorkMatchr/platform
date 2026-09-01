import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { Prisma, type PublicIntakeAnswerType } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import type { PublicIntakeAnswerView, PublicIntakeContextQuestionView } from './public-intake-types'
import {
  getSharedSectorOptions,
  inferSharedSectorCode,
  SHARED_CONTEXT_SECTOR_QUESTION_KEY,
  type SharedSectorOption,
} from './shared-assignment-context'
import { deriveKnowledgeConceptCandidates, extractPublicIntakeFacts } from './context-fact-extractor'
import { loadKnowledgeGroundedContextGoals } from './knowledge-context-goal-provider'
import { planNextContextQuestion } from './context-question-engine'
import { buildKnowledgeGroundedMatchingProfile } from './knowledge-expert-routing-provider'
import { CASE_UNDERSTANDING_VERSION } from './case-understanding'
import { assessContextQuestionGrounding } from './context-question-grounding'
import { isReliableConcept } from './context-goal-applicability'
import { contextQuestionInputDigest, formulateContextQuestion, type ContextQuestionFormulationInput } from './context-question-formulator'
import { createContextQuestionOpenAITransport } from './context-question-openai-transport'
import { tracePreviewQuestionAuthorization } from './context-question-preview-diagnostics'
import { isKnownAnswerValue } from './negative-answer-resolution'
import { allowPublicIntakeAIClassification, type PublicIntakeAbuseContext } from './public-intake-abuse-protection'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import {
  KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
  parsePersistedContextQuestionPlan,
  type IntakeMode,
  type PersistedContextQuestionPlan,
} from './context-question-engine-types'
import { hasReliableDeterministicContinuityEvidence } from './classifier-fallback-continuity'

export const PUBLIC_INTAKE_CONTEXT_QUESTION_TOTAL_LIMIT = 5 as const

export function selectQuestionPlanningConcepts(input: {
  initialConcepts: readonly import('./context-question-engine-types').KnowledgeConceptCandidate[]
  knowledgeConcepts: readonly import('./context-question-engine-types').KnowledgeConceptCandidate[]
}) {
  // Published rules may advertise the domains in which they can be used, but
  // that metadata is not evidence that those domains apply to this case.
  return Object.freeze([...input.initialConcepts])
}

export function toPublicIntakeContextQuestionView(question: {
  questionKey: string
  catalogVersion: string
  textSnapshot: string
  answerType: PublicIntakeAnswerType
  category: string
  sequence: number
  source: string
  createdAt: Date
  contextGoalCode?: string | null
  planningSnapshot?: unknown
}, sectorOptions: readonly SharedSectorOption[] = []): PublicIntakeContextQuestionView {
  if (question.source !== 'AI_CONTEXT_PLANNER') {
    throw new Error('PUBLIC_INTAKE_CONTEXT_QUESTION_SOURCE_INVARIANT')
  }
  const planning = parsePersistedContextQuestionPlan(question.planningSnapshot)
  return {
    ...question,
    source: 'AI_CONTEXT_PLANNER',
    ...(question.questionKey === SHARED_CONTEXT_SECTOR_QUESTION_KEY
      ? { options: sectorOptions.map((option) => ({ label: option.label, value: option.code })) }
      : planning
        ? { options: planning.options.map((option) => ({ label: option.label, value: option.code })) }
        : {}),
    contextGoalCode: question.contextGoalCode ?? null,
    planning,
  }
}

/**
 * Persists catalog-backed question snapshots plus the strictly validated
 * semantic understanding and managed matching profile. It never stores a
 * prompt or unvalidated free model response and is safe to repeat.
 */
export async function ensurePublicIntakeAIContextQuestions(input: {
  draftId: string
  originalInput: string
  classification: AIClassifierOutput | null
  classifierAvailability?: 'AVAILABLE' | 'TECHNICALLY_UNAVAILABLE'
  answers: readonly PublicIntakeAnswerView[]
  fallbackQuestionWasAsked: boolean
  mode: IntakeMode
  abuseContext?: PublicIntakeAbuseContext
}): Promise<readonly PublicIntakeContextQuestionView[]> {
  const technicalContinuity = input.classifierAvailability === 'TECHNICALLY_UNAVAILABLE'
  if ((!input.classification && !technicalContinuity) || input.classification?.confidence === 'LOW') return []
  const classification = input.classification
  const understanding = classification?.caseUnderstanding ?? emptyCaseUnderstanding()
  if (technicalContinuity) {
    const deterministicFacts = extractPublicIntakeFacts({
      originalInput: input.originalInput,
      answers: input.answers,
      caseUnderstanding: understanding,
    })
    const deterministicConcepts = deriveKnowledgeConceptCandidates({
      originalInput: input.originalInput,
      classification: null,
      facts: deterministicFacts,
    })
    if (!hasReliableDeterministicContinuityEvidence(deterministicConcepts)) return []
  }

  type Formulation = Awaited<ReturnType<typeof formulateContextQuestion>>
  async function planAndPersist(prepared?: { digest: string; formulation: Formulation }): Promise<
    readonly PublicIntakeContextQuestionView[] | { formulationInput: ContextQuestionFormulationInput }
  > {
  return getPrisma().$transaction(async (transaction) => {
    const sectorOptions = await getSharedSectorOptions(transaction)
    if (sectorOptions.length === 0) throw new Error('SHARED_ASSIGNMENT_CONTEXT_TAXONOMY_UNAVAILABLE')
    const existing = await transaction.publicIntakeContextQuestion.findMany({
      where: { draftId: input.draftId },
      orderBy: { sequence: 'asc' },
      select: {
        questionKey: true,
        catalogVersion: true,
        textSnapshot: true,
        answerType: true,
        category: true,
        sequence: true,
        source: true,
        createdAt: true,
        contextGoalCode: true,
        planningSnapshot: true,
      },
    })
    const usedBudget = existing.length + (input.fallbackQuestionWasAsked ? 1 : 0)
    const remaining = PUBLIC_INTAKE_CONTEXT_QUESTION_TOTAL_LIMIT - usedBudget
    if (remaining <= 0) return existing.map((question) => toPublicIntakeContextQuestionView(question, sectorOptions))

    const answeredQuestionKeys = input.answers.map((answer) => answer.questionKey)
    const unansweredExisting = existing.some((question) => !answeredQuestionKeys.includes(question.questionKey))
    if (unansweredExisting) return existing.map((question) => toPublicIntakeContextQuestionView(question, sectorOptions))
    const facts = [...extractPublicIntakeFacts({
      originalInput: input.originalInput,
      answers: input.answers,
      caseUnderstanding: understanding,
    })]
    const inferredSector = inferSharedSectorCode(input.originalInput, sectorOptions)
    if (inferredSector && !facts.some((fact) => fact.code === 'SECTOR')) {
      facts.push(Object.freeze({ code: 'SECTOR', value: inferredSector, status: 'RELIABLE_EXTRACTION' as const, confidence: 0.95 }))
    }
    const initialConcepts = deriveKnowledgeConceptCandidates({ originalInput: input.originalInput, classification, facts })
    const grounded = await loadKnowledgeGroundedContextGoals({
      database: transaction,
      concepts: initialConcepts,
      originalInput: input.originalInput,
    })
    const concepts = selectQuestionPlanningConcepts({
      initialConcepts,
      knowledgeConcepts: grounded.knowledgeConcepts,
    })
    const goalByQuestionKey = new Map(grounded.goals.map((goal) => [goal.questionKey, goal]))
    for (const answer of input.answers) {
      if (answer.disposition !== 'ANSWERED' || answer.value === null || !isKnownAnswerValue(answer.value)) continue
      const goal = goalByQuestionKey.get(answer.questionKey)
      if (!goal) continue
      for (const factCode of goal.satisfiesFactCodes) {
        if (!facts.some((fact) => fact.code === factCode)) {
          facts.push(Object.freeze({
            code: factCode,
            value: answer.value,
            status: 'USER_CONFIRMED' as const,
            confidence: 1,
            sourceQuestionKey: answer.questionKey,
          }))
        }
      }
    }
    if (classification?.caseUnderstanding || technicalContinuity) {
      const matchingProfile = await buildKnowledgeGroundedMatchingProfile({
        database: transaction,
        understanding,
        facts,
        // Context-goal rules may contribute concepts for question selection,
        // but they are not evidence that their domain applies to this case.
        // Expert routing therefore uses only semantic/deterministic concepts
        // derived from the user's own input.
        concepts: initialConcepts,
      })
      await transaction.publicIntakeDraft.update({
        where: { id: input.draftId },
        data: {
          caseUnderstandingVersion: CASE_UNDERSTANDING_VERSION,
          caseUnderstandingJson: JSON.parse(JSON.stringify(understanding)) as Prisma.InputJsonValue,
          matchingProfileJson: matchingProfile
            ? JSON.parse(JSON.stringify(matchingProfile)) as Prisma.InputJsonValue
            : Prisma.DbNull,
          caseUnderstandingUpdatedAt: new Date(),
        },
      })
    }
    const plan = planNextContextQuestion({
      mode: input.mode,
      facts,
      concepts,
      goals: grounded.goals,
      evidenceByGoalCode: grounded.evidenceByGoalCode,
      answeredQuestionKeys,
      askedQuestionKeys: existing.map((question) => question.questionKey),
      questionBudgetRemaining: remaining,
    })
    const selected = plan.selected
    const formulationInput = selected?.goal.questionGeneration ? {
      goal: selected.goal, originalInput: input.originalInput, facts,
      evidence: selected.applicability.evidence,
    } : null
    if (formulationInput && !prepared) return { formulationInput }
    if (prepared && (!formulationInput || prepared.digest !== contextQuestionInputDigest(formulationInput))) {
      // Governance or case context changed during generation. Never attach
      // an earlier variant's wording to the newly selected rule.
      return existing.map((question) => toPublicIntakeContextQuestionView(question, sectorOptions))
    }
    const grounding = selected ? assessContextQuestionGrounding({
      goal: selected.goal, facts, concepts, evidence: selected.applicability.evidence,
      formulation: prepared?.formulation,
    }) : null
    console.info('[public-intake-context-engine]', {
      engineVersion: plan.engineVersion,
      intakeMode: plan.mode,
      candidateGoalCount: plan.candidates.length,
      selectedGoal: selected?.goal.code ?? null,
      selectedContextRuleId: selected?.goal.selectedContextRuleId ?? null,
      ruleVersion: selected?.goal.ruleVersion ?? null,
      variantKey: selected?.goal.variantKey ?? null,
      selectionReason: selected?.applicability.reasonCode ?? plan.readiness.reasonCode,
      knowledgeGroundingPresent: grounding?.knowledgeGroundingPresent ?? false,
      knowledgeGroundingApplicableToCase: grounding?.knowledgeGroundingApplicableToCase ?? false,
      applicabilityResult: grounding?.applicabilityResult ?? false,
      deduplicatedGoalCount: plan.deduplicatedGoalCount,
      questionBudgetRemaining: plan.questionBudgetRemaining,
      readinessResult: plan.readiness.status,
    })
    if (!selected) return existing.map((question) => toPublicIntakeContextQuestionView(question, sectorOptions))
    const planningSnapshot: PersistedContextQuestionPlan = Object.freeze({
      ...(selected.goal.selectedContextRuleId ? {
        selectedContextRuleId: selected.goal.selectedContextRuleId,
        ruleVersion: selected.goal.ruleVersion,
        variantKey: selected.goal.variantKey,
      } : {}),
      applicableConcepts: Object.freeze(concepts.filter((concept) => isReliableConcept(concept)
        && selected.goal.relevantConceptCodes.includes(concept.code)).map((concept) => concept.code)),
      knowledgeGroundingPresent: grounding!.knowledgeGroundingPresent,
      knowledgeGroundingApplicableToCase: grounding!.knowledgeGroundingApplicableToCase,
      applicabilityResult: grounding!.applicabilityResult,
      questionGenerationProvenance: grounding!.questionGenerationProvenance,
      engineVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
      mode: input.mode,
      contextGoalCode: selected.goal.code,
      reasonCode: selected.applicability.reasonCode,
      mandatory: selected.goal.mandatory,
      score: selected.score,
      relevantConceptCodes: Object.freeze([...selected.goal.relevantConceptCodes]),
      supportingKnowledgeIds: grounding!.supportingKnowledgeIds,
      skippedByFactCodes: Object.freeze([...selected.applicability.skippedByFactCodes]),
      options: Object.freeze([...selected.goal.options]),
    })

    await transaction.publicIntakeContextQuestion.createMany({
      data: [{
        draftId: input.draftId,
        questionKey: selected.goal.questionKey,
        catalogVersion: KNOWLEDGE_GROUNDED_CONTEXT_ENGINE_VERSION,
        textSnapshot: prepared?.formulation.text ?? selected.goal.text,
        answerType: selected.goal.answerType,
        category: selected.goal.category,
        sequence: existing.length + 1,
        source: 'AI_CONTEXT_PLANNER',
        contextGoalCode: selected.goal.code,
        planningSnapshot: planningSnapshot as Prisma.InputJsonValue,
      }],
      skipDuplicates: true,
    })

    const stored = await transaction.publicIntakeContextQuestion.findMany({
      where: { draftId: input.draftId },
      orderBy: { sequence: 'asc' },
      select: {
        questionKey: true,
        catalogVersion: true,
        textSnapshot: true,
        answerType: true,
        category: true,
        sequence: true,
        source: true,
        createdAt: true,
        contextGoalCode: true,
        planningSnapshot: true,
      },
    })
    return stored.map((question) => toPublicIntakeContextQuestionView(question, sectorOptions))
  }, { isolationLevel: 'Serializable' })
  }

  const planned = await planAndPersist()
  if (!('formulationInput' in planned)) return planned
  const formulation = await formulateContextQuestion(planned.formulationInput, {
    transport: input.abuseContext ? createContextQuestionOpenAITransport() : null,
    authorizeExternalCall: async () => {
      if (!input.abuseContext) {
        tracePreviewQuestionAuthorization(planned.formulationInput, 'ABUSE_CONTEXT_MISSING')
        return false
      }
      const allowance = await allowPublicIntakeAIClassification(input.abuseContext)
      tracePreviewQuestionAuthorization(planned.formulationInput, allowance.allowed ? null : allowance.reason)
      return allowance.allowed
    },
  })
  const persisted = await planAndPersist({
    digest: contextQuestionInputDigest(planned.formulationInput), formulation,
  })
  if ('formulationInput' in persisted) throw new Error('CONTEXT_QUESTION_PERSISTENCE_INVARIANT')
  return persisted
}
