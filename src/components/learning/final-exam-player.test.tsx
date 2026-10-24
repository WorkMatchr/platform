import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/e-learnings/exam-actions', () => ({
  saveFinalExamAnswerAction: vi.fn(),
  submitFinalExamAction: vi.fn(),
  updateFinalExamPositionAction: vi.fn(),
}))

import { FinalExamPlayer } from './final-exam-player'

const question = {
  id: '10000000-0000-4000-8000-000000000001',
  code: 'E01',
  position: 1,
  questionText: 'Welke aanpak past het beste?',
  options: [{ value: 'A', text: 'Antwoord A' }, { value: 'B', text: 'Antwoord B' }],
}

describe('WL-001 eindtoetsspeler', () => {
  it('maakt bij multi-select expliciet duidelijk dat alle juiste antwoorden geselecteerd moeten worden', () => {
    const html = renderToStaticMarkup(<FinalExamPlayer attemptId="attempt" attemptNumber={1} currentPosition={1}
      questions={[{ ...question, type: 'MULTI_CHOICE' }]} savedAnswers={{}} />)
    expect(html).toContain('Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')
    expect(html).toContain('type="checkbox"')
    expect(html).not.toContain('Antwoord controleren')
  })

  it('toont de multi-selectinstructie niet bij single choice', () => {
    const html = renderToStaticMarkup(<FinalExamPlayer attemptId="attempt" attemptNumber={1} currentPosition={1}
      questions={[{ ...question, type: 'SINGLE_CHOICE' }]} savedAnswers={{}} />)
    expect(html).not.toContain('Meerdere antwoorden zijn mogelijk')
    expect(html).toContain('type="radio"')
  })
})
