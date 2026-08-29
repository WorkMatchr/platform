import { describe, expect, it } from 'vitest'
import reviewPackage from '../../../data/knowledge/review/case-understanding-10-scenario-review-v1.json'
import { emptyCaseUnderstanding, type CaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { parseCaseUnderstandingKnowledgeReview } from '@/lib/knowledge/case-understanding-review-schema'
import { caseUnderstandingFacts } from './case-understanding'
import { deriveKnowledgeConceptCandidates } from './context-fact-extractor'
import { buildKnowledgeGroundedMatchingProfile } from './knowledge-expert-routing-provider'
import { planNextContextQuestion } from './context-question-engine'
import type { ContextGoal, ExtractedFact, KnowledgeEvidence } from './context-question-engine-types'

const review = parseCaseUnderstandingKnowledgeReview(reviewPackage)

const managedDomainByScenario: Readonly<Record<number, readonly string[]>> = {
  1: ['INDOOR_ENVIRONMENT'],
  2: ['PHYSICAL_WORKLOAD'],
  3: ['WELDING_FUMES'],
  4: ['MACHINE_SAFETY'],
  5: ['PSYCHOSOCIAL_WORKLOAD'],
  6: ['OCCUPATIONAL_HEALTH_PRIVACY'],
  7: ['WORK_ABILITY_REINTEGRATION'],
  8: ['EMERGENCY_RESPONSE_ORGANIZATION'],
  9: ['PROCESS_SAFETY_MAJOR_HAZARDS'],
  10: ['PROCESS_SAFETY_MAJOR_HAZARDS', 'EXPOSURE_ASSESSMENT'],
}

function understanding(number: number): CaseUnderstanding {
  const scenario = review.scenarios[number - 1]
  const base = emptyCaseUnderstanding()
  return {
    ...base,
    userGoal: { value: [scenario.title], evidence: [scenario.originalInput], confidence: 1, status: 'EXPLICIT_INPUT' },
    knownFacts: { value: scenario.explicitFacts, evidence: [scenario.originalInput], confidence: 1, status: 'EXPLICIT_INPUT' },
    unknownRelevantFacts: { value: scenario.contextGoals, evidence: [scenario.originalInput], confidence: 0.8, status: 'RELIABLE_EXTRACTION' },
    candidateExpertiseDomains: { value: [...managedDomainByScenario[number]], evidence: [scenario.originalInput], confidence: 0.95, status: 'RELIABLE_EXTRACTION' },
    locationContext: scenario.explicitFacts.some((fact) => /locatie|kantoor|werkplaats|magazijn|fabriek|afdeling/i.test(fact))
      ? { value: scenario.explicitFacts.filter((fact) => /locatie|kantoor|werkplaats|magazijn|fabriek|afdeling/i.test(fact)), evidence: [scenario.originalInput], confidence: 1, status: 'EXPLICIT_INPUT' }
      : base.locationContext,
    hazards: scenario.explicitFacts.some((fact) => /brandbare|toxische|heetwerk|rook|machine|lekkage/i.test(fact))
      ? { value: scenario.explicitFacts.filter((fact) => /brandbare|toxische|heetwerk|rook|machine|lekkage/i.test(fact)), evidence: [scenario.originalInput], confidence: 1, status: 'EXPLICIT_INPUT' }
      : base.hazards,
  }
}

function goalFor(code: string, question: string, concepts: readonly string[], satisfies: readonly string[]): ContextGoal {
  return Object.freeze({
    code, questionKey: `context_${code.toLowerCase()}`, purpose: `Ontbrekende relevante context voor ${code}.`,
    text: question, answerType: 'TEXT', options: Object.freeze([]), category: 'WORK',
    relevantConceptCodes: concepts, satisfiesFactCodes: satisfies, equivalentGoalCodes: Object.freeze([]),
    groundingPolicy: 'DOMAIN_SPECIFIC', applicability: Object.freeze({ requiredFactCodes: Object.freeze([]), requiredAnyFactCodes: Object.freeze([]), excludedFactValues: Object.freeze([]) }),
    mandatory: false, universal: false, baseRelevance: 0.9, informationGain: 0.85, matchingValue: 0.9, userBurden: 0.35,
  })
}

describe('Case Understanding en expert-routing — tien exacte reviewsituaties', () => {
  for (const scenario of review.scenarios) {
    it(`scenario ${scenario.number}: ${scenario.title}`, async () => {
      const caseUnderstanding = understanding(scenario.number)
      const facts: ExtractedFact[] = [...caseUnderstandingFacts(caseUnderstanding)]
      const concepts = deriveKnowledgeConceptCandidates({ originalInput: scenario.originalInput, classification: {
        summary: scenario.title, primarySubject: 'UNKNOWN', secondarySubjects: [], confidence: 'HIGH', alternatives: [], caseUnderstanding,
      }, facts })
      expect(concepts.map((item) => item.code)).toEqual(expect.arrayContaining([...managedDomainByScenario[scenario.number]]))

      const questions = scenario.questionExamples
      expect(questions.map((item) => item.question)).not.toContain('Waar gaat uw vraag vooral over?')
      const goals = questions.map((example) => {
        const definition = review.contextGoals.find((item) => item.code === example.contextGoal)!
        return goalFor(example.contextGoal, example.question, managedDomainByScenario[scenario.number], definition.resolvesWithFactCodes)
      })
      const evidence = new Map<string, readonly KnowledgeEvidence[]>(goals.map((goal, index) => [goal.code, [
        { knowledgeId: `00000000-0000-4000-8000-${String(scenario.number).padStart(4, '0')}${String(index).padStart(8, '0')}`, topicCode: goal.code, confidence: 1, source: 'PUBLISHED_CLAIM' as const },
        { knowledgeId: `10000000-0000-4000-8000-${String(scenario.number).padStart(4, '0')}${String(index).padStart(8, '0')}`, topicCode: goal.code, confidence: 1, source: 'PUBLISHED_ROUTING_RULE' as const },
      ]]))
      const unresolvedGoals = goals.filter((goal) =>
        !goal.satisfiesFactCodes.some((code) => facts.some((fact) => fact.code === code)),
      )
      const asked: string[] = []
      for (let questionIndex = 0; questionIndex < unresolvedGoals.length; questionIndex += 1) {
        const plan = planNextContextQuestion({ mode: 'DIRECT_REQUEST', facts, concepts, goals: unresolvedGoals, evidenceByGoalCode: evidence, answeredQuestionKeys: asked, askedQuestionKeys: asked, questionBudgetRemaining: 5 - asked.length })
        expect(plan.selected).not.toBeNull()
        const selected = plan.selected!.goal
        asked.push(selected.questionKey)
        facts.push({ code: selected.satisfiesFactCodes[0], value: 'USER_ANSWER', status: 'USER_CONFIRMED', confidence: 1, sourceQuestionKey: selected.questionKey })
      }
      expect(asked).toHaveLength(Math.min(5, unresolvedGoals.length))
      expect(new Set(asked).size).toBe(asked.length)

      const claimIds = scenario.candidateClaimIds.map((_, index) => `20000000-0000-4000-8000-${String(scenario.number).padStart(4, '0')}${String(index).padStart(8, '0')}`)
      const route = review.routingRules.find((item) => scenario.routingRuleIds.includes(item.candidateId))!
      const profile = await buildKnowledgeGroundedMatchingProfile({
        database: {
          knowledgeRule: { findMany: async () => [{ outputSchema: {
            kind: 'EXPERT_ROUTING', scope: 'INTAKE_ROUTING_KNOWLEDGE', requiredConceptCodes: [...managedDomainByScenario[scenario.number]],
            requiredFactCodes: [], excludedFactCodes: [], primaryExpertise: route.primaryExpertise,
            conditionalExpertise: route.conditionalExpertise.map((item) => ({ code: item.discipline, when: item.when })),
            requiredSpecialisms: route.requiredSpecialisms, assignmentType: 'INVESTIGATION_AND_ADVICE',
            relevantSectorExperience: scenario.number >= 9 ? ['Aantoonbare relevante procesveiligheidservaring.'] : [],
            multidisciplinary: route.multidisciplinary !== 'NO', matchingCodes: [route.primaryExpertise, ...route.requiredSpecialisms],
            supportingKnowledgeIds: claimIds, priority: 100,
          } }] },
          knowledgeClaim: { findMany: async () => claimIds.map((id) => ({ id })) },
        } as never,
        understanding: caseUnderstanding,
        facts,
        concepts,
      })
      expect(profile).toMatchObject({ primaryExpertise: scenario.primaryExpertise, requiredSpecialisms: scenario.requiredSpecialisms })
      if (asked.length > 0) expect(profile?.assignmentSummary).toContain('USER_ANSWER')
      expect(profile?.matchingCodes).toEqual(expect.arrayContaining([scenario.primaryExpertise]))
      if (scenario.number >= 9) {
        expect(profile?.requiredSpecialisms).toContain('PROCESS_SAFETY_MAJOR_HAZARDS')
        expect(profile?.relevantSectorExperience.length).toBeGreaterThan(0)
      }
      expect(profile?.supportingKnowledgeIds).toEqual(claimIds)
    })
  }

  it('behandelt een hypothese nooit als bekend feit', () => {
    const value = understanding(10)
    const withHypothesis: CaseUnderstanding = {
      ...value,
      recentChanges: { value: ['veroudering veroorzaakt de lekkages'], evidence: ['technische dienst vermoedt'], confidence: 0.6, status: 'HYPOTHESIS' },
    }
    expect(caseUnderstandingFacts(withHypothesis).find((fact) => fact.code === 'RECENT_CHANGES')).toMatchObject({ status: 'HYPOTHESIS' })
  })
})
