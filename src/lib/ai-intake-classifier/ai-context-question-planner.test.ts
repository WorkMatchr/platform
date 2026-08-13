import { describe, expect, it } from 'vitest'
import { parseAIContextQuestionPlannerOutput, selectSafeAIContextQuestions } from './ai-context-question-planner'
const classification = { summary: 'U wilt weten hoe rugklachten tijdens het werk kunnen worden begrepen.', primarySubject: 'OCCUPATIONAL_HEALTH', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
describe('AI context-question planner', () => {
  it('selecteert catalogusvragen en slaat een bekend feit over', () => {
    const questions = selectSafeAIContextQuestions({ originalInput: 'Bij meerdere medewerkers ontstaan rugklachten tijdens het werk.', classification, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 4 })
    expect(questions.map((q) => q.questionKey)).toEqual(['context_work_activity', 'context_physical_load', 'context_existing_investigation'])
  })
  it('weigert vrije of dubbele AI-vragen', () => {
    expect(() => parseAIContextQuestionPlannerOutput({ questionKeys: ['vrije_vraag'] })).toThrow()
    expect(() => parseAIContextQuestionPlannerOutput({ questionKeys: ['context_work_activity', 'context_work_activity'] })).toThrow()
  })
  it('blijft binnen eerste batch en budget', () => expect(selectSafeAIContextQuestions({ originalInput: 'Rugklachten bij medewerkers.', classification, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 1 })).toHaveLength(1))
})
