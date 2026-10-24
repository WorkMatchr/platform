/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  saveAnswer: vi.fn(),
  submit: vi.fn(),
  updatePosition: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/app/e-learnings/exam-actions', () => ({
  saveFinalExamAnswerAction: mocks.saveAnswer,
  submitFinalExamAction: mocks.submit,
  updateFinalExamPositionAction: mocks.updatePosition,
}))

import { FinalExamPlayer } from './final-exam-player'

const question = {
  id: '10000000-0000-4000-8000-000000000001',
  code: 'E01',
  position: 1,
  type: 'SINGLE_CHOICE' as const,
  questionText: 'Welke aanpak past het beste?',
  options: [{ value: 'A', text: 'Antwoord A' }, { value: 'B', text: 'Antwoord B' }],
}

function pressTab(target: HTMLElement, shiftKey = false) {
  const browserWillMoveFocus = fireEvent.keyDown(target, { key: 'Tab', shiftKey })
  if (browserWillMoveFocus) {
    const dialog = screen.getByRole('dialog')
    const controls = within(dialog).getAllByRole('button')
    const currentIndex = controls.indexOf(document.activeElement as HTMLButtonElement)
    const nextIndex = (currentIndex + (shiftKey ? -1 : 1) + controls.length) % controls.length
    controls[nextIndex].focus()
  }
}

function renderPlayer() {
  return render(<FinalExamPlayer attemptId="10000000-0000-4000-8000-000000000009" attemptNumber={1}
    currentPosition={1} questions={[question]} savedAnswers={{}} />)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.saveAnswer.mockResolvedValue({ ok: true })
  mocks.updatePosition.mockResolvedValue({ ok: true })
})
afterEach(cleanup)

describe('exam-inleverdialoog toegankelijkheid en regressies', () => {
  it('opent met benoemde dialogsemantiek, logische focus en inerte achtergrond', async () => {
    renderPlayer()
    const trigger = screen.getByRole('button', { name: 'Toets inleveren' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Toets inleveren?' })
    expect(dialog.getAttribute('aria-describedby')).toBe('exam-submit-instructions')
    expect(trigger.closest('[inert]')).not.toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Terug naar de toets' })))
  })

  it('houdt toetsenbordfocus in de dialoog en herstelt focus na Escape', async () => {
    renderPlayer()
    const trigger = screen.getByRole('button', { name: 'Toets inleveren' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    const cancel = within(dialog).getByRole('button', { name: 'Terug naar de toets' })
    const submit = within(dialog).getByRole('button', { name: 'Toch inleveren' })
    await waitFor(() => expect(document.activeElement).toBe(cancel))

    pressTab(cancel)
    expect(document.activeElement).toBe(submit)
    pressTab(submit)
    expect(document.activeElement).toBe(cancel)
    pressTab(cancel, true)
    expect(document.activeElement).toBe(submit)

    fireEvent.keyDown(submit, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it('annuleert zonder submission en herstelt focus', async () => {
    renderPlayer()
    const trigger = screen.getByRole('button', { name: 'Toets inleveren' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar de toets' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(mocks.submit).not.toHaveBeenCalled()
  })

  it('behoudt answer-save en voert submission uit zonder feedback of antwoordsleutel in de dialoog', async () => {
    mocks.submit.mockResolvedValue({ ok: true, href: '/e-learnings/rie-in-de-praktijk/eindtoets/resultaat/attempt' })
    renderPlayer()
    fireEvent.click(screen.getByRole('radio', { name: 'Antwoord A' }))
    await waitFor(() => expect(mocks.saveAnswer).toHaveBeenCalledWith(
      '10000000-0000-4000-8000-000000000009', question.id, 'A',
    ))

    fireEvent.click(screen.getByRole('button', { name: 'Toets inleveren' }))
    const dialog = screen.getByRole('dialog', { name: 'Toets inleveren?' })
    expect(within(dialog).queryByRole('alert')).toBeNull()
    expect(dialog.textContent).not.toMatch(/correct answer|juiste optie|goed antwoord/i)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Toch inleveren' }))

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledWith('10000000-0000-4000-8000-000000000009'))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/e-learnings/rie-in-de-praktijk/eindtoets/resultaat/attempt'))
  })
})
