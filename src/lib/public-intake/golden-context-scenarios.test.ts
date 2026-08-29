import { describe, expect, it } from 'vitest'
import type { ContextGoal, KnowledgeConceptCandidate, KnowledgeEvidence } from './context-question-engine-types'
import { planNextContextQuestion } from './context-question-engine'

type GoldenScenario = Readonly<{
  name: string
  concept: string
  expectedGoal: string
  forbiddenGoals?: readonly string[]
}>

const scenarios: readonly GoldenScenario[] = [
  { name: 'nieuwe RI&E', concept: 'RIE', expectedGoal: 'RIE_SCOPE' },
  { name: 'RI&E actualiseren', concept: 'RIE_UPDATE', expectedGoal: 'CHANGE_SCOPE' },
  { name: 'risico in bestaande RI&E', concept: 'RIE_RISK', expectedGoal: 'EXISTING_ASSESSMENT' },
  { name: 'BHV-organisatie', concept: 'EMERGENCY_RESPONSE', expectedGoal: 'WORKSITE_PATTERN' },
  { name: 'hoofdpijn na werkdag', concept: 'HEALTH_COMPLAINT', expectedGoal: 'WORK_ACTIVITY', forbiddenGoals: ['PHYSICAL_LOAD'] },
  { name: 'hoofdpijn na verhuizing', concept: 'WORK_ENVIRONMENT_CHANGE', expectedGoal: 'LOCATION_PATTERN' },
  { name: 'rugklachten sector onbekend', concept: 'BACK_COMPLAINT', expectedGoal: 'WORK_ACTIVITY', forbiddenGoals: ['PHYSICAL_LOAD'] },
  { name: 'rugklachten bij chauffeurs', concept: 'TRANSPORT_BACK_COMPLAINT', expectedGoal: 'WORK_PATTERN' },
  { name: 'gevaarlijke stoffen of dampen', concept: 'HAZARDOUS_SUBSTANCES', expectedGoal: 'EXPOSURE_SOURCE' },
  { name: 'geluid', concept: 'NOISE', expectedGoal: 'NOISE_WORK_PATTERN' },
  { name: 'binnenklimaat of ventilatie', concept: 'INDOOR_CLIMATE', expectedGoal: 'LOCATION_PATTERN' },
  { name: 'beeldschermwerk', concept: 'DISPLAY_SCREEN_WORK', expectedGoal: 'WORK_DURATION' },
  { name: 'machineveiligheid', concept: 'MACHINE_SAFETY', expectedGoal: 'EQUIPMENT_OR_PROCESS' },
  { name: 'incident of bijna-ongeval', concept: 'INCIDENT', expectedGoal: 'URGENCY' },
  { name: 'werkdruk of PSA', concept: 'PSA', expectedGoal: 'WORK_ORGANIZATION' },
  { name: 'bedrijfsarts- of gezondheidsvraag', concept: 'OCCUPATIONAL_HEALTH', expectedGoal: 'REQUEST_PURPOSE' },
  { name: 'werken op hoogte', concept: 'WORK_AT_HEIGHT', expectedGoal: 'WORK_ACTIVITY' },
  { name: 'instructie of training', concept: 'TRAINING', expectedGoal: 'TARGET_GROUP' },
  { name: 'meerdere gecombineerde risico’s', concept: 'MULTI_RISK', expectedGoal: 'PRIORITY_SCOPE' },
  { name: 'onduidelijke algemene arbovraag', concept: 'GENERAL_OSH', expectedGoal: 'WORK_ACTIVITY' },
]

function dynamicGoal(code: string, concept: string): ContextGoal {
  return {
    code, questionKey: `context_${code.toLocaleLowerCase('nl-NL')}`,
    purpose: 'Gevalideerde onderscheidende context verzamelen.', text: 'Welke situatie is van toepassing?',
    answerType: 'OPTION', options: [{ code: 'KNOWN', label: 'Bekend' }], category: 'WORK',
    relevantConceptCodes: [concept], satisfiesFactCodes: [code], equivalentGoalCodes: [],
    groundingPolicy: 'DOMAIN_SPECIFIC',
    applicability: { requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] },
    mandatory: code === 'URGENCY', universal: false, baseRelevance: 1, informationGain: 1,
    matchingValue: 1, userBurden: 0.2,
  }
}

describe('Golden Intake Scenario Suite', () => {
  it.each(scenarios)('$name kiest een kennisgedreven informatiedoel zonder topic-branch', (scenario) => {
    const goalCodes = [scenario.expectedGoal, ...(scenario.forbiddenGoals ?? [])]
    const goals = goalCodes.map((code) => dynamicGoal(code, scenario.concept))
    const evidenceByGoalCode = new Map<string, readonly KnowledgeEvidence[]>(goalCodes.map((code) => [code, [
      { knowledgeId: `knowledge:${scenario.concept}:${code}`, topicCode: scenario.concept, confidence: 1, source: 'PUBLISHED_CLAIM' },
      { knowledgeId: `rule:${scenario.concept}:${code}`, topicCode: 'context-goal-routing-rule', confidence: 1, source: 'PUBLISHED_ROUTING_RULE' },
    ]]))
    // A forbidden goal receives no applicability prerequisite in this generic
    // fixture. Its lower evidence confidence ensures the scenario still tests
    // ranking without adding a topic-specific branch to the engine.
    for (const forbidden of scenario.forbiddenGoals ?? []) evidenceByGoalCode.set(forbidden, [])
    const concepts: readonly KnowledgeConceptCandidate[] = [{
      code: scenario.concept, confidence: 1, source: 'KNOWLEDGE_TOPIC', supportingKnowledgeIds: ['claim'],
    }]
    const result = planNextContextQuestion({
      mode: 'DIRECT_REQUEST', facts: [{ code: 'SECTOR', value: 'known', status: 'USER_CONFIRMED', confidence: 1 }],
      concepts, goals, evidenceByGoalCode, answeredQuestionKeys: [], askedQuestionKeys: [], questionBudgetRemaining: 5,
    })
    expect(result.selected?.goal.code).toBe(scenario.expectedGoal)
    expect(result.selected?.applicability.evidence.length).toBeGreaterThan(0)
    for (const forbidden of scenario.forbiddenGoals ?? []) {
      expect(result.candidates.map((item) => item.goal.code)).not.toContain(forbidden)
    }
  })

  it('is data-gedreven uitbreidbaar zonder scenario-specifieke testcode', () => {
    expect(scenarios).toHaveLength(20)
    expect(new Set(scenarios.map((scenario) => scenario.concept)).size).toBe(20)
  })
})
