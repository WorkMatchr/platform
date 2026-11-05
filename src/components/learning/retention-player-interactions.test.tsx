/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ annual: vi.fn(), weekly: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('@/app/e-learnings/retention-actions', () => ({
  answerAnnualRetentionQuestionAction: mocks.annual, answerRetentionQuestionAction: mocks.weekly,
  setAnnualReminderConsentAction: vi.fn(), startRetentionParticipationAction: vi.fn(), stopRetentionParticipationAction: vi.fn(),
}))
import { AnnualRetentionPlayer } from './annual-retention-player'
import { RetentionWeeklyPlayer } from './retention-program-controls'

function presentation(multi = false) {
  return {
    type: multi ? 'MULTI_CHOICE' as const : 'SINGLE_CHOICE' as const,
    questionText: 'Welke aanpak past bij deze werksituatie?',
    multiSelectInstruction: multi ? 'Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.' : null,
    options: [{ value: 'A', text: 'Aanpak A', selected: false }, { value: 'B', text: 'Aanpak B', selected: false }],
    feedback: null,
  }
}
function annual(multi = false) {
  return { nextPosition: 1, questions: Array.from({ length: 10 }, (_, i) => ({ position: i + 1, answered: false, presentation: presentation(multi) })) }
}
function weekly() {
  return {
    id: 'week', participationId: 'participation', weekNumber: 1, currentPosition: 1, answeringAllowed: true, result: null,
    questions: Array.from({ length: 5 }, (_, i) => ({ id: `assignment-${i}`, position: i + 1, answered: false, presentation: presentation() })),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.annual.mockResolvedValue({ ok: true, result: { isCorrect: true, feedback: 'Dit principe past bij de situatie.', progress: { completed: false } } })
  mocks.weekly.mockResolvedValue({ ok: true, result: { correct: true, feedback: 'Dit principe past bij de situatie.', missedCorrectOptions: [], selectedIncorrectOptions: [] } })
})
afterEach(cleanup)

async function answerFirst() {
  fireEvent.click(screen.getByRole('radio', { name: 'Aanpak A' }))
  fireEvent.click(screen.getByRole('button', { name: 'Controleer antwoord' }))
  await screen.findByText('Dit principe past bij de situatie.')
}

describe('kennisbehoud en jaarcheck: definitieve feedback en focus', () => {
  it('vergrendelt een jaarantwoord direct na serverbevestiging zonder op refresh te wachten', async () => {
    render(<AnnualRetentionPlayer check={annual()} courseSlug="preventiemedewerker-in-de-praktijk" />)
    expect(screen.queryByText('Dit principe past bij de situatie.')).toBeNull()
    await answerFirst()
    expect((screen.getByRole('radio', { name: 'Aanpak B' }) as HTMLInputElement).disabled || screen.getByRole('radio', { name: 'Aanpak B' }).closest('fieldset')?.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Controleer antwoord' })).toBeNull()
    expect(mocks.annual).toHaveBeenCalledExactlyOnceWith(1, 'A', 'preventiemedewerker-in-de-praktijk')
    await waitFor(() => expect(document.activeElement?.textContent).toContain('Dit principe past bij de situatie.'))
  })

  it('behoudt definitieve selectie en feedback bij vooruit- en terugbladeren zonder nieuwe serverprops', async () => {
    render(<AnnualRetentionPlayer check={annual()} />)
    await answerFirst()
    // Feedback can commit before the action transition enables navigation.
    await waitFor(() => expect((screen.getByRole('button', { name: 'Volgende' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))
    expect(screen.queryByText('Dit principe past bij de situatie.')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    fireEvent.click(screen.getByRole('button', { name: 'Vorige' }))
    expect((screen.getByRole('radio', { name: 'Aanpak A' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByText('Dit principe past bij de situatie.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Controleer antwoord' })).toBeNull()
    expect(mocks.annual).toHaveBeenCalledTimes(1)
  })

  it('houdt multi-select exact zoals bevestigd en toont de expliciete instructie', async () => {
    render(<AnnualRetentionPlayer check={annual(true)} />)
    expect(screen.getByText('Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aanpak A' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aanpak B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Controleer antwoord' }))
    await screen.findByText('Dit principe past bij de situatie.')
    expect(mocks.annual).toHaveBeenCalledExactlyOnceWith(1, ['A', 'B'], 'rie-in-de-praktijk')
    expect(screen.getAllByRole('checkbox').every(input => (input as HTMLInputElement).checked)).toBe(true)
    expect(screen.queryByRole('button', { name: 'Controleer antwoord' })).toBeNull()
  })

  it('behoudt selectie bij een jaarcheck-savefout en laat veilig opnieuw proberen', async () => {
    mocks.annual.mockResolvedValueOnce({ ok: false, message: 'Opslaan mislukt. Probeer opnieuw.' })
    render(<AnnualRetentionPlayer check={annual()} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Aanpak A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Controleer antwoord' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Opslaan mislukt')
    expect((screen.getByRole('radio', { name: 'Aanpak A' }) as HTMLInputElement).checked).toBe(true)
    const retry = await screen.findByRole('button', { name: 'Controleer antwoord' })
    await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(retry)
    await screen.findByText('Dit principe past bij de situatie.')
    expect(mocks.annual).toHaveBeenCalledTimes(2)
  })

  it('hervat een opgeslagen jaarantwoord als read-only met feedback', () => {
    const check = annual()
    const restored = { ...check, questions: check.questions.map((q, i) => i ? q : {
      ...q, answered: true, presentation: { ...q.presentation, options: q.presentation.options.map(o => ({ ...o, selected: o.value === 'A' })), feedback: { isCorrect: false, label: 'Niet helemaal' as const, explanation: 'Bewaar deze serverfeedback.' } },
    }) }
    render(<AnnualRetentionPlayer check={restored} />)
    expect(screen.getByText('Bewaar deze serverfeedback.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Controleer antwoord' })).toBeNull()
    expect((screen.getByRole('radio', { name: 'Aanpak A' }) as HTMLInputElement).checked).toBe(true)
    expect(mocks.annual).not.toHaveBeenCalled()
  })

  it('richt weekfeedback en daarna de volgende vraag logisch', async () => {
    render(<RetentionWeeklyPlayer check={weekly()} />)
    await answerFirst()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByText('Dit principe past bij de situatie.').parentElement))
    fireEvent.click(screen.getByRole('button', { name: 'Volgende vraag' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
    expect(screen.getByText(/Vraag 2 van 5/)).toBeTruthy()
  })

  it('verplaatst focus naar het weekresultaat zodra de server afronding teruggeeft', () => {
    const check = weekly()
    const { rerender } = render(<RetentionWeeklyPlayer check={check} />)
    rerender(<RetentionWeeklyPlayer check={{ ...check, result: { title: 'Kennischeck afgerond', score: '4 van 5 goed', correct: 4, maxScore: 5, attentionAreas: [], strongAreas: [], chapterLinks: [] } }} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Kennischeck afgerond' }))
  })

  it('maakt een gesloten weekcheck ook in de controls read-only', () => {
    render(<RetentionWeeklyPlayer check={{ ...weekly(), answeringAllowed: false }} />)
    expect(screen.getByRole('group').hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Controleer antwoord' })).toBeNull()
    expect(screen.getByText(/kan niet meer worden ingevuld/)).toBeTruthy()
  })

  it('behoudt weekselectie en toont een tekstuele savefout met retry', async () => {
    mocks.weekly.mockResolvedValueOnce({ ok: false, message: 'Opslaan mislukt. Probeer opnieuw.' })
    render(<RetentionWeeklyPlayer check={weekly()} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Aanpak A' }))
    fireEvent.click(screen.getByRole('button', { name: 'Controleer antwoord' }))
    await screen.findByRole('alert')
    expect((screen.getByRole('radio', { name: 'Aanpak A' }) as HTMLInputElement).checked).toBe(true)
    const retry = await screen.findByRole('button', { name: 'Controleer antwoord' })
    await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(retry)
    await screen.findByText('Dit principe past bij de situatie.')
    expect(mocks.weekly).toHaveBeenCalledTimes(2)
  })
})
