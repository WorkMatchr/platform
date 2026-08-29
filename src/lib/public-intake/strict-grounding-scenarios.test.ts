import { describe, expect, it } from 'vitest'
import type { AIClassifierOutput } from '@/lib/ai-intake-classifier/ai-classifier-contract'
import { compatibilityContextGoals } from './context-goal-catalog'
import { extractPublicIntakeFacts, deriveKnowledgeConceptCandidates } from './context-fact-extractor'
import { planNextContextQuestion } from './context-question-engine'
import type { ExtractedFact, KnowledgeEvidence } from './context-question-engine-types'

const classification = (primarySubject: AIClassifierOutput['primarySubject']): AIClassifierOutput => ({
  summary: 'Veilige semantische testclassificatie.',
  primarySubject,
  secondarySubjects: [],
  confidence: primarySubject === 'UNKNOWN' ? 'LOW' : 'HIGH',
  alternatives: [],
})

const legacyEvidence = new Map<string, readonly KnowledgeEvidence[]>(compatibilityContextGoals.map((goal) => [goal.code, [{
  knowledgeId: `legacy:${goal.code}`,
  topicCode: 'legacy-context-catalog',
  confidence: 0.65,
  source: 'LEGACY_COMPATIBILITY' as const,
}]]))

function scenario(input: {
  text: string
  subject: AIClassifierOutput['primarySubject']
  sectorKnown?: boolean
}) {
  const facts: ExtractedFact[] = [...extractPublicIntakeFacts({ originalInput: input.text, answers: [] })]
  if (input.sectorKnown) facts.push({ code: 'SECTOR', value: 'known', status: 'USER_CONFIRMED', confidence: 1 })
  const concepts = deriveKnowledgeConceptCandidates({
    originalInput: input.text,
    classification: classification(input.subject),
    facts,
  })
  return planNextContextQuestion({
    mode: 'DIRECT_REQUEST',
    facts,
    concepts,
    goals: compatibilityContextGoals,
    evidenceByGoalCode: legacyEvidence,
    answeredQuestionKeys: [],
    askedQuestionKeys: [],
    questionBudgetRemaining: 5,
  })
}

describe('strict-grounding cross-domain scenarios', () => {
  it('vraagt voor een nieuwe RI&E alleen nog ontbrekende shared opdrachtcontext', () => {
    const result = scenario({ text: 'Wij hebben een RI&E nodig voor ons bedrijf.', subject: 'RIE', sectorKnown: true })
    expect(result.candidates.map((candidate) => candidate.goal.code)).toEqual(expect.arrayContaining([
      'ORGANIZATION_SIZE', 'WORKSITE_COUNT', 'START_WINDOW',
    ]))
    expect(result.candidates.map((candidate) => candidate.goal.code)).not.toContain('EXISTING_ASSESSMENT')
  })

  it('stopt bij nieuwe RI&E wanneer sector, omvang, locaties en start al bekend zijn', () => {
    const result = scenario({
      text: 'Ons metaalbedrijf met 85 medewerkers op twee locaties heeft volgende maand een nieuwe RI&E nodig.',
      subject: 'RIE', sectorKnown: true,
    })
    expect(result.selected).toBeNull()
    expect(result.candidates).toHaveLength(0)
    expect(result.readiness.reasonCode).toBe('NO_UNRESOLVED_HIGH_VALUE_GOAL')
  })

  it('grondt hoofdpijn na een werkdag niet als lichamelijke belasting en herhaalt bekende scope/tijd niet', () => {
    const result = scenario({
      text: 'Er zijn enkele collega’s die last hebben van hoofdpijn na een dag werken. Kan er een onderzoek worden uitgevoerd door iemand?',
      subject: 'OCCUPATIONAL_HEALTH', sectorKnown: true,
    })
    const goals = result.candidates.map((candidate) => candidate.goal.code)
    expect(goals).not.toContain('PHYSICAL_LOAD')
    expect(goals).not.toContain('AFFECTED_SCOPE')
    expect(goals).not.toContain('DURATION_FREQUENCY')
    expect(result.selected?.goal.code).toBe('WORK_ACTIVITY')
  })

  it('vraagt een verhuizing niet opnieuw en houdt de vervolgvraag neutraal', () => {
    const result = scenario({
      text: 'Sinds onze verhuizing hebben enkele collega’s hoofdpijn na een werkdag.',
      subject: 'OCCUPATIONAL_HEALTH', sectorKnown: true,
    })
    const goals = result.candidates.map((candidate) => candidate.goal.code)
    expect(goals).not.toContain('WORK_ENVIRONMENT_CHANGE')
    expect(goals).not.toContain('PHYSICAL_LOAD')
    expect(result.selected?.goal.code).toBe('WORK_ACTIVITY')
  })

  it('vraagt bij rugklachten eerst veilige sectorcontext en geen oorzaak', () => {
    const result = scenario({ text: 'Enkele medewerkers hebben rugklachten.', subject: 'OCCUPATIONAL_HEALTH' })
    expect(result.selected?.goal.code).toBe('SECTOR')
    expect(result.candidates.map((candidate) => candidate.goal.code)).not.toContain('PHYSICAL_LOAD')
  })

  it('vraagt bekende werkzaamheden van chauffeurs niet opnieuw en veronderstelt geen fysieke oorzaak', () => {
    const result = scenario({ text: 'Zes chauffeurs hebben rugklachten.', subject: 'OCCUPATIONAL_HEALTH', sectorKnown: true })
    const goals = result.candidates.map((candidate) => candidate.goal.code)
    expect(goals).not.toContain('WORK_ACTIVITY')
    expect(goals).not.toContain('AFFECTED_SCOPE')
    expect(goals).not.toContain('PHYSICAL_LOAD')
  })

  it('herhaalt bij BHV twee locaties en ploegendienst geen bekende locaties', () => {
    const result = scenario({
      text: 'Wij willen weten of onze BHV-organisatie past bij onze twee locaties en ploegendienst.',
      subject: 'EMERGENCY_RESPONSE', sectorKnown: true,
    })
    expect(result.candidates.map((candidate) => candidate.goal.code)).not.toContain('WORKSITE_COUNT')
    expect(result.selected?.goal.code).toBe('URGENCY')
  })

  it('improviseert geen blootstellingsvraag zonder gevalideerde routingregel', () => {
    const result = scenario({
      text: 'Bij dampen en een sterke geur krijgen enkele collega’s hoofdpijn.',
      subject: 'HAZARDOUS_SUBSTANCES', sectorKnown: true,
    })
    expect(result.candidates.map((candidate) => candidate.goal.code)).not.toContain('EXPOSURE_SOURCE')
    expect(result.selected?.goal.groundingPolicy).toBe('SHARED_CONTEXT')
  })

  it.each([
    ['lawaaiige werkomgeving', 'In onze werkplaats is het erg lawaaiig.', 'OCCUPATIONAL_HEALTH' as const, 'NOISE'],
    ['werkdruk/PSA', 'De werkdruk en sociale veiligheid vragen aandacht.', 'OCCUPATIONAL_HEALTH' as const, 'PSA'],
    ['machineveiligheid', 'Wij hebben een vraag over de veiligheid van een machine.', 'INCIDENT' as const, 'MACHINE_SAFETY'],
  ])('stopt voor %s zonder gevalideerde vakspecifieke Context Goal', (_name, text, subject, concept) => {
    const facts = extractPublicIntakeFacts({ originalInput: text, answers: [] })
    const concepts = deriveKnowledgeConceptCandidates({ originalInput: text, classification: classification(subject), facts })
    expect(concepts.map((candidate) => candidate.code)).toContain(concept)
    const result = planNextContextQuestion({
      mode: 'DIRECT_REQUEST', facts: [...facts, { code: 'SECTOR', value: 'known', status: 'USER_CONFIRMED', confidence: 1 }],
      concepts, goals: compatibilityContextGoals, evidenceByGoalCode: legacyEvidence,
      answeredQuestionKeys: [], askedQuestionKeys: [], questionBudgetRemaining: 5,
    })
    expect(result.candidates.every((candidate) => candidate.goal.groundingPolicy === 'SHARED_CONTEXT')).toBe(true)
  })

  it('stopt veilig bij een volledig onduidelijke arbovraag', () => {
    const result = scenario({ text: 'Wij hebben ergens hulp bij nodig.', subject: 'UNKNOWN', sectorKnown: true })
    expect(result.selected).toBeNull()
    expect(result.candidates).toHaveLength(0)
  })
})
