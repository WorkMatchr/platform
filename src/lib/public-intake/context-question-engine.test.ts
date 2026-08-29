import { describe, expect, it } from 'vitest'
import type { ContextGoal, ExtractedFact, KnowledgeConceptCandidate, KnowledgeEvidence } from './context-question-engine-types'
import { planNextContextQuestion } from './context-question-engine'
import { compatibilityContextGoals } from './context-goal-catalog'

const concept = (code: string): KnowledgeConceptCandidate => ({
  code, confidence: 1, source: 'KNOWLEDGE_TOPIC', supportingKnowledgeIds: ['claim-1'],
})
const evidence = (goalCode: string): readonly KnowledgeEvidence[] => [
  { knowledgeId: `claim:${goalCode}`, topicCode: 'test-topic', confidence: 1, source: 'PUBLISHED_CLAIM' },
  { knowledgeId: `rule:${goalCode}`, topicCode: 'context-goal-routing-rule', confidence: 1, source: 'PUBLISHED_ROUTING_RULE' },
]
const goal = (overrides: Partial<ContextGoal> & Pick<ContextGoal, 'code'>): ContextGoal => ({
  questionKey: `context_${overrides.code.toLocaleLowerCase('nl-NL')}`,
  purpose: 'Een professioneel relevant contextdoel onderscheiden.',
  text: 'Welke aanvullende context is van toepassing?',
  answerType: 'OPTION',
  options: [{ code: 'YES', label: 'Ja' }, { code: 'NO', label: 'Nee' }],
  category: 'WORK', relevantConceptCodes: ['TEST_CONCEPT'],
  satisfiesFactCodes: [overrides.code], equivalentGoalCodes: [], mandatory: false,
  groundingPolicy: 'DOMAIN_SPECIFIC',
  applicability: { requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] },
  universal: false, baseRelevance: 0.8, informationGain: 0.8, matchingValue: 0.8,
  userBurden: 0.2, ...overrides,
})

function plan(input: {
  goals: readonly ContextGoal[]
  facts?: readonly ExtractedFact[]
  evidenceByGoalCode?: ReadonlyMap<string, readonly KnowledgeEvidence[]>
  mode?: 'DISCOVERY' | 'DIRECT_REQUEST'
  remaining?: number
}) {
  return planNextContextQuestion({
    mode: input.mode ?? 'DIRECT_REQUEST', facts: input.facts ?? [], concepts: [concept('TEST_CONCEPT')],
    goals: input.goals,
    evidenceByGoalCode: input.evidenceByGoalCode ?? new Map(input.goals.map((item) => [item.code, evidence(item.code)])),
    answeredQuestionKeys: [], askedQuestionKeys: [], questionBudgetRemaining: input.remaining ?? 5,
  })
}

describe('knowledge-grounded context question ranking', () => {
  it('geeft ontbrekende essentiële context voorrang', () => {
    const result = plan({ goals: [goal({ code: 'OPTIONAL' }), goal({ code: 'ESSENTIAL', mandatory: true, informationGain: 0.1 })] })
    expect(result.selected?.goal.code).toBe('ESSENTIAL')
    expect(result.readiness.status).toBe('NEEDS_ESSENTIAL_CONTEXT')
  })

  it('filtert bekende feiten en semantisch equivalente doelen', () => {
    const result = plan({
      goals: [
        goal({ code: 'ORGANIZATION_SIZE', equivalentGoalCodes: ['EMPLOYEE_PRESENCE'] }),
        goal({ code: 'EMPLOYEE_PRESENCE' }),
        goal({ code: 'WORK_ACTIVITY' }),
      ],
      facts: [{ code: 'ORGANIZATION_SIZE', value: 20, status: 'RELIABLE_EXTRACTION', confidence: 1 }],
    })
    expect(result.candidates.map((item) => item.goal.code)).toEqual(['WORK_ACTIVITY'])
    expect(result.deduplicatedGoalCount).toBe(2)
  })

  it('laat informatiewaarde en gebruikerslast afzonderlijk meewegen', () => {
    const result = plan({ goals: [
      goal({ code: 'LOW_VALUE', informationGain: 0.2, userBurden: 0.2 }),
      goal({ code: 'HIGH_VALUE', informationGain: 1, userBurden: 0.2 }),
      goal({ code: 'HIGH_BURDEN', informationGain: 1, userBurden: 0.9 }),
    ] })
    expect(result.selected?.goal.code).toBe('HIGH_VALUE')
    expect(result.selected?.score.informationGain).toBe(1)
    expect(result.selected?.score.userBurden).toBe(0.2)
  })

  it('laat een ongrondbaar vakspecifiek doel nooit winnen', () => {
    const grounded = goal({ code: 'GROUNDED' })
    const ungrounded = goal({ code: 'UNGROUNDED', informationGain: 1, baseRelevance: 1 })
    const result = plan({ goals: [ungrounded, grounded], evidenceByGoalCode: new Map([['GROUNDED', evidence('GROUNDED')]]) })
    expect(result.selected?.goal.code).toBe('GROUNDED')
    expect(result.candidates.map((item) => item.goal.code)).not.toContain('UNGROUNDED')
  })

  it('accepteert legacy alleen voor veilige shared context', () => {
    const legacyEvidence: readonly KnowledgeEvidence[] = [{
      knowledgeId: 'legacy:goal', topicCode: 'legacy-context-catalog', confidence: 0.65,
      source: 'LEGACY_COMPATIBILITY',
    }]
    const shared = goal({ code: 'SHARED', groundingPolicy: 'SHARED_CONTEXT' })
    const domain = goal({ code: 'DOMAIN', informationGain: 1 })
    const result = plan({
      goals: [domain, shared],
      evidenceByGoalCode: new Map([['DOMAIN', legacyEvidence], ['SHARED', legacyEvidence]]),
    })
    expect(result.selected?.goal.code).toBe('SHARED')
    expect(result.candidates.map((item) => item.goal.code)).not.toContain('DOMAIN')
  })

  it('vereist voor een vakspecifiek doel zowel een gevalideerde regel als claim', () => {
    const domain = goal({ code: 'DOMAIN' })
    const onlyClaim = plan({ goals: [domain], evidenceByGoalCode: new Map([['DOMAIN', [{
      knowledgeId: 'claim:DOMAIN', topicCode: 'test-topic', confidence: 1, source: 'PUBLISHED_CLAIM',
    }]]]) })
    expect(onlyClaim.selected).toBeNull()
    expect(onlyClaim.readiness).toEqual({ status: 'SAFE_FALLBACK', reasonCode: 'KNOWLEDGE_COVERAGE_INSUFFICIENT' })

    const completeEvidence: readonly KnowledgeEvidence[] = [
      ...evidence('DOMAIN'),
      { knowledgeId: 'rule:domain', topicCode: 'context-goal-routing-rule', confidence: 1, source: 'PUBLISHED_ROUTING_RULE' },
    ]
    expect(plan({ goals: [domain], evidenceByGoalCode: new Map([['DOMAIN', completeEvidence]]) }).selected?.goal.code)
      .toBe('DOMAIN')
  })

  it('stopt wanneer alleen doelen met te lage informatiewaarde overblijven', () => {
    const lowValue = goal({ code: 'LOW_VALUE', groundingPolicy: 'SHARED_CONTEXT', informationGain: 0.2 })
    const result = plan({ goals: [lowValue], evidenceByGoalCode: new Map() })
    expect(result.selected).toBeNull()
    expect(result.readiness).toEqual({ status: 'COMPLETE', reasonCode: 'NO_UNRESOLVED_HIGH_VALUE_GOAL' })
  })

  it('is deterministisch voor dezelfde facts en kandidaten', () => {
    const goals = [goal({ code: 'B' }), goal({ code: 'A' })]
    expect(plan({ goals }).candidates.map((item) => item.goal.code))
      .toEqual(plan({ goals }).candidates.map((item) => item.goal.code))
    expect(plan({ goals }).selected?.goal.code).toBe('A')
  })

  it('stopt hard bij het vijfvragenbudget', () => {
    const result = plan({ goals: [goal({ code: 'NEXT' })], remaining: 0 })
    expect(result.selected).toBeNull()
    expect(result.readiness.status).toBe('MAX_QUESTION_BUDGET_REACHED')
  })

  it('behoudt dezelfde arbologica in beide startmodi', () => {
    const goals = [goal({ code: 'WORK_ACTIVITY' }), goal({ code: 'LOCATION_PATTERN' })]
    const direct = plan({ goals, mode: 'DIRECT_REQUEST' })
    const discovery = plan({ goals, mode: 'DISCOVERY' })
    expect(direct.candidates.map((item) => item.goal.code).sort())
      .toEqual(discovery.candidates.map((item) => item.goal.code).sort())
  })

  it('vraagt bij een nieuwe RI&E niet naar de omvang van een concrete klacht of incident', () => {
    const result = planNextContextQuestion({
      mode: 'DIRECT_REQUEST',
      facts: [
        { code: 'SECTOR', value: 'industrie', status: 'USER_CONFIRMED', confidence: 1 },
        { code: 'RIE_INTENT', value: 'NEW_RIE', status: 'RELIABLE_EXTRACTION', confidence: 1 },
      ],
      concepts: [concept('RIE')],
      goals: compatibilityContextGoals,
      evidenceByGoalCode: new Map(compatibilityContextGoals.map((item) => [item.code, [{
        knowledgeId: `legacy:${item.code}`,
        topicCode: 'legacy-context-catalog',
        confidence: 0.65,
        source: 'LEGACY_COMPATIBILITY' as const,
      }]])),
      answeredQuestionKeys: ['context_sector'],
      askedQuestionKeys: ['context_sector'],
      questionBudgetRemaining: 4,
    })

    expect(result.candidates.map((item) => item.goal.code)).not.toContain('AFFECTED_SCOPE')
    expect(result.candidates.map((item) => item.goal.code)).not.toContain('EXISTING_ASSESSMENT')
    expect(result.candidates.map((item) => item.goal.code)).toContain('ORGANIZATION_SIZE')
    expect(result.selected?.goal.code).not.toBe('AFFECTED_SCOPE')
  })
})
