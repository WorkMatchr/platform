import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { learningRetentionQuestions } from '@/lib/learning/learning-retention-content'
import { presentRetentionQuestion } from '@/lib/learning/learning-retention-policy'
import { AnnualRetentionPlayer } from './annual-retention-player'
import { AnnualReminderConsent, RetentionOptIn, RetentionWeeklyPlayer } from './retention-program-controls'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('@/app/e-learnings/retention-actions', () => ({
  answerRetentionQuestionAction: vi.fn(), setAnnualReminderConsentAction: vi.fn(),
  startRetentionParticipationAction: vi.fn(), stopRetentionParticipationAction: vi.fn(),
}))

describe('retention UI semantic baseline', () => {
  it('shows explicit, unchecked weekly and independent annual consent', () => {
    const weekly = renderToStaticMarkup(<RetentionOptIn />)
    const annual = renderToStaticMarkup(<AnnualReminderConsent enabled={false} scheduledFor={null} sent={false} />)
    expect(weekly).toContain('Ja, ik wil deelnemen aan 12 weken kennisbehoud.')
    expect(weekly).toMatch(/type="checkbox"[^>]*required/)
    expect(weekly).not.toMatch(/type="checkbox"[^>]*checked/)
    expect(annual).toContain('Ja, stuur mij één herinnering over ongeveer één jaar.')
    expect(annual).not.toMatch(/type="checkbox"[^>]*checked/)
    expect(weekly).not.toContain('over ongeveer één jaar')
    expect(annual).not.toContain('12 weken kennisbehoud.')
  })

  it('provides native grouped controls and the exact multi-select instruction without answer-key data', () => {
    const multi = learningRetentionQuestions.find((question) => question.type === 'MULTI_CHOICE')!
    const presented = presentRetentionQuestion(multi)
    const check = {
      id: 'check-id', participationId: 'participation-id', weekNumber: 1,
      currentPosition: 1, answeringAllowed: true, result: null,
      questions: Array.from({ length: 5 }, (_, index) => ({
        id: `assignment-${index + 1}`, position: index + 1, answered: false,
        presentation: presented,
      })),
    }
    const html = renderToStaticMarkup(<RetentionWeeklyPlayer check={check} />)
    expect(html).toContain('Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('Vraag 1 van 5')
    expect(html).not.toMatch(/correctAnswer|isCorrectOption/)
  })

  it('presents the annual check as ten numbered learning questions, not an exam', () => {
    const question = learningRetentionQuestions.find((item) => item.type === 'MULTI_CHOICE')!
    const presentation = presentRetentionQuestion(question)
    const check = {
      nextPosition: 1,
      questions: Array.from({ length: 10 }, (_, index) => ({ position: index + 1, answered: false, presentation })),
    }
    const html = renderToStaticMarkup(<AnnualRetentionPlayer check={check} />)
    expect(html).toContain('Vraag 1 van 10')
    expect(html).toContain('Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')
    expect(html).toContain('Controleer antwoord')
    expect(html).not.toMatch(/geslaagd|gezakt|voldoende|onvoldoende/)
    expect(html).not.toMatch(/correctAnswer|isCorrectOption/)
  })
})
