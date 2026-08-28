import { describe, expect, it } from 'vitest'
import { parseAIContextQuestionPlannerOutput, selectSafeAIContextQuestions } from './ai-context-question-planner'
const classification = { summary: 'U wilt weten hoe rugklachten tijdens het werk kunnen worden begrepen.', primarySubject: 'OCCUPATIONAL_HEALTH', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
describe('AI context-question planner', () => {
  it('selecteert catalogusvragen en slaat een bekend feit over', () => {
    const questions = selectSafeAIContextQuestions({ originalInput: 'Bij meerdere medewerkers ontstaan rugklachten tijdens het werk.', classification, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 4 })
    expect(questions.map((q) => q.questionKey)).toEqual(['context_sector', 'context_work_activity', 'context_physical_load'])
  })
  it('weigert vrije of dubbele AI-vragen', () => {
    expect(() => parseAIContextQuestionPlannerOutput({ questionKeys: ['vrije_vraag'] })).toThrow()
    expect(() => parseAIContextQuestionPlannerOutput({ questionKeys: ['context_work_activity', 'context_work_activity'] })).toThrow()
  })
  it('blijft binnen eerste batch en budget', () => expect(selectSafeAIContextQuestions({ originalInput: 'Rugklachten bij medewerkers.', classification, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 1 })).toHaveLength(1))
  it('vraagt bij een duidelijke RI&E-hulpvraag niet opnieuw naar het bekende doel en kiest alleen ontbrekende context', () => {
    const rie = { summary: 'De organisatie heeft een nieuwe RI&E nodig.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({ originalInput: 'Wij hebben een RI&E nodig voor ons bedrijf.', classification: rie, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 5 })
    expect(questions.map((question) => question.questionKey)).toEqual(['context_sector', 'context_employee_count', 'context_location_count'])
    expect(questions).toHaveLength(3)
    expect(questions.map((question) => question.text).join(' ')).not.toContain('gewenste resultaat')
    expect(questions.map((question) => question.questionKey)).not.toContain('context_existing_investigation')
  })
  it('laat een vrij voorstel de beheerde RI&E-vraagregels niet omzeilen', () => {
    const rie = { summary: 'De organisatie heeft een nieuwe RI&E nodig.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({
      originalInput: 'Wij hebben een RI&E nodig voor ons bedrijf.',
      classification: rie,
      answeredQuestionKeys: [],
      askedQuestionKeys: [],
      remainingQuestionBudget: 5,
      proposedQuestionKeys: ['context_existing_investigation'],
    })
    expect(questions.map((question) => question.questionKey)).toEqual([
      'context_sector',
      'context_employee_count',
      'context_location_count',
    ])
  })
  it('past de risico-in-bestaande-RI&E-regel uitsluitend op de passende intentie toe', () => {
    const rie = { summary: 'U wilt weten of lawaai goed in de RI&E staat.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({ originalInput: 'Wij hebben veel lawaai in onze werkplaats en weten niet of dit goed in onze RI&E staat.', classification: rie, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 5 })
    expect(questions.map((question) => question.questionKey)).toEqual([
      'context_sector',
      'context_existing_investigation',
      'context_affected_scope',
    ])
  })
  it('slaat bekende RI&E-context over en vraagt hoogstens de ontbrekende planning', () => {
    const rie = { summary: 'De organisatie wil voor het eerst een RI&E laten uitvoeren.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({ originalInput: 'Wij zijn een metaalbedrijf met 85 medewerkers op twee locaties en willen voor het eerst een RI&E laten uitvoeren.', classification: rie, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 5 })
    expect(questions.map((question) => question.questionKey)).toEqual(['context_sector', 'context_preferred_start'])
  })
  it('vraagt bij een RI&E-update niet of een RI&E bestaat', () => {
    const rie = { summary: 'De organisatie wil een verouderde RI&E bijwerken.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({ originalInput: 'Onze RI&E is vier jaar oud en moet worden bijgewerkt.', classification: rie, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 5 })
    expect(questions.map((question) => question.questionKey)).toEqual([
      'context_sector',
      'context_employee_count',
      'context_location_count',
    ])
  })
  it('vraagt geen organisatieomvang nadat personeel al semantisch is bevestigd', () => {
    const rie = { summary: 'De organisatie heeft een nieuwe RI&E nodig.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({
      originalInput: 'Wij hebben een RI&E nodig voor ons bedrijf.',
      classification: rie,
      answeredQuestionKeys: ['guidance_topic', 'rie_has_employees'],
      askedQuestionKeys: [],
      remainingQuestionBudget: 3,
    })
    expect(questions.map((question) => question.questionKey)).toEqual([
      'context_sector',
      'context_location_count',
      'context_preferred_start',
    ])
  })
  it('slaat de sectorvraag over wanneer de gedeelde context de sector betrouwbaar kent', () => {
    const rie = { summary: 'De organisatie heeft een nieuwe RI&E nodig.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] } as const
    const questions = selectSafeAIContextQuestions({
      originalInput: 'Wij hebben een RI&E nodig voor ons metaalbewerkingsbedrijf.',
      classification: rie,
      answeredQuestionKeys: [],
      askedQuestionKeys: [],
      remainingQuestionBudget: 5,
      knownSharedContextQuestionKeys: ['context_sector'],
    })
    expect(questions.map((question) => question.questionKey)).toEqual([
      'context_employee_count',
      'context_location_count',
      'context_preferred_start',
    ])
  })
  it('behoudt de veilige fallback zonder contextvragen bij lage zekerheid', () => {
    const rie = { summary: 'RI&E genoemd.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'LOW', alternatives: [] } as const
    expect(selectSafeAIContextQuestions({ originalInput: 'Een vraag over RI&E.', classification: rie, answeredQuestionKeys: [], askedQuestionKeys: [], remainingQuestionBudget: 5 })).toEqual([])
  })
})
