// @vitest-environment jsdom
import { JSDOM } from 'jsdom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComplianceFreeIntake } from './compliance-free-intake'
import { COMPLIANCE_DRAFT_KEY as KEY, COMPLIANCE_LEGACY_KEY as LEGACY, COMPLIANCE_CLEAR_KEY, DRAFT_TTL, setMemoryDraft, getMemoryDraft } from '@/lib/compliance/free-intake-storage'
const draft = { answers: { 'FI2-01': 'EMPLOYEES' }, stepIndex: 1, questionnaireVersion: '2.0' }
const legacyDraft = { answers: { 'FI-01': 'YES' }, stepIndex: 1 }
const saved = () => { const now = Date.now(); return { ...draft, version: 3, savedAt: now, expiresAt: now + DRAFT_TTL } }
beforeEach(() => { vi.stubGlobal('BroadcastChannel', undefined); const browser = new JSDOM('', { url: 'http://localhost' }).window; vi.stubGlobal('localStorage', browser.localStorage); vi.stubGlobal('sessionStorage', browser.sessionStorage); setMemoryDraft(null); vi.stubGlobal('matchMedia', () => ({ matches: true })); Element.prototype.scrollIntoView = vi.fn() })
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('Compliance herstel en gebruikersregie', async () => {
  it('schrijft alleen na expliciet bewaren en niet opnieuw na wissen', async () => {
    await act(async () => { render(<StrictMode><ComplianceFreeIntake /></StrictMode>) })
    fireEvent.click(screen.getAllByRole('radio', { name: 'Ja, werknemers in dienst' })[0])
    expect(localStorage.getItem(KEY)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Concept 24 uur op dit apparaat bewaren' }))
    const stored = JSON.parse(localStorage.getItem(KEY)!)
    expect(stored.answers['FI2-01']).toBe('EMPLOYEES')
    fireEvent.click(screen.getByRole('button', { name: 'Concept van dit apparaat verwijderen' }))
    fireEvent.click(screen.getAllByRole('radio', { name: 'Nee, ook geen andere mensen onder onze leiding' })[0])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('vraagt een legacykeuze en hervat zonder nieuwe termijn', async () => {
    localStorage.setItem(LEGACY, JSON.stringify(legacyDraft))
    await act(async () => { render(<ComplianceFreeIntake />) })
    expect(screen.getByRole('heading', { name: 'Oud Compliance-concept gevonden' })).toBeTruthy()
    expect(screen.queryByText('Stap 2 van 5')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Hervat oud concept' }))
    expect(screen.getByText('Stap 2 van 5')).toBeTruthy()
    expect(localStorage.getItem(LEGACY)).toBeNull(); expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('verwijdert legacy uitsluitend na keuze', async () => {
    localStorage.setItem(LEGACY, JSON.stringify(legacyDraft)); await act(async () => { render(<ComplianceFreeIntake />) })
    fireEvent.click(screen.getByRole('button', { name: 'Verwijder oud concept en start opnieuw' }))
    expect(screen.getByText(/^Hoofdvraag 1 van 5/)).toBeTruthy(); expect(localStorage.getItem(LEGACY)).toBeNull()
  })
  it('houdt actieve invoer in geheugen bij expiry zonder verlengen', async () => {
    vi.useFakeTimers(); localStorage.setItem(KEY, JSON.stringify(saved()))
    await act(async () => { render(<ComplianceFreeIntake />) })
    act(() => { vi.advanceTimersByTime(DRAFT_TTL) })
    expect(screen.getByText(/^Hoofdvraag 2 van 5/)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('bewaartermijn is verstreken')
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('wist actieve invoer na logout in een ander tabblad', async () => {
    localStorage.setItem(KEY, JSON.stringify(saved())); await act(async () => { render(<ComplianceFreeIntake />) })
    act(() => { localStorage.removeItem(KEY); window.dispatchEvent(new StorageEvent('storage', { key: COMPLIANCE_CLEAR_KEY, newValue: 'clear' })) })
    expect(screen.getByText(/^Hoofdvraag 1 van 5/)).toBeTruthy()
    fireEvent.click(screen.getAllByRole('radio', { name: 'Ja, werknemers in dienst' })[0])
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('blijft bruikbaar met geblokkeerde browseropslag', async () => {
    vi.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem').mockImplementation(() => { throw new Error('blocked') })
    await act(async () => { render(<ComplianceFreeIntake />) })
    fireEvent.click(screen.getAllByRole('radio', { name: 'Ja, werknemers in dienst' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Concept 24 uur op dit apparaat bewaren' }))
    expect(screen.getByRole('status').textContent).toContain('Bewaren is niet gelukt')
  })
  it.each(['empty', 'saved', 'expired', 'invalid', 'legacy'])('hydrateert %s zonder mismatch of voortijdige write', async kind => {
    // renderToString renders the deterministic initial state even with browser globals present.
    const html = renderToString(<ComplianceFreeIntake />)
    if (kind === 'saved') localStorage.setItem(KEY, JSON.stringify(saved()))
    if (kind === 'expired') localStorage.setItem(KEY, JSON.stringify({ ...saved(), savedAt: Date.now() - DRAFT_TTL, expiresAt: Date.now() }))
    if (kind === 'invalid') localStorage.setItem(KEY, '{broken')
    if (kind === 'legacy') localStorage.setItem(LEGACY, JSON.stringify(legacyDraft))
    const writes = vi.spyOn(Object.getPrototypeOf(window.localStorage), 'setItem')
    const errors: unknown[] = []
    const container = document.createElement('div'); container.innerHTML = html; document.body.append(container)
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => { root = hydrateRoot(container, <StrictMode><ComplianceFreeIntake /></StrictMode>, { onRecoverableError: error => errors.push(error) }) })
    await waitFor(() => expect(container.textContent).not.toContain('wordt klaargezet'))
    expect(errors).toEqual([]); expect(writes).not.toHaveBeenCalled()
    if (kind === 'saved') expect(container.textContent).toContain('Hoofdvraag 2 van 5')
    act(() => root.unmount()); container.remove()
  })
})

it('wist ook geheugen na wegnavigeren als een ander tabblad uitlogt', async () => {
  await act(async () => { render(<ComplianceFreeIntake />) })
  fireEvent.click(screen.getAllByRole('radio', { name: 'Ja, werknemers in dienst' })[0])
  cleanup()
  expect(getMemoryDraft()?.answers['FI2-01']).toBe('EMPLOYEES')
  window.dispatchEvent(new StorageEvent('storage', { key: COMPLIANCE_CLEAR_KEY, newValue: 'clear' }))
  expect(getMemoryDraft()).toBeNull()
  await act(async () => { render(<ComplianceFreeIntake />) })
  expect((screen.getAllByRole('radio', { name: 'Ja, werknemers in dienst' })[0] as HTMLInputElement).checked).toBe(false)
})
