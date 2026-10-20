// @vitest-environment jsdom
import { JSDOM } from 'jsdom'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ComplianceFreeIntake } from './compliance-free-intake'
import { COMPLIANCE_DRAFT_KEY as KEY, COMPLIANCE_LEGACY_KEY as LEGACY, COMPLIANCE_CLEAR_KEY, DRAFT_TTL, setMemoryDraft } from '@/lib/compliance/free-intake-storage'

const employee = 'Ja, werknemers in dienst'
const draft = { answers: { 'FI2-01': 'EMPLOYEES' }, stepIndex: 1, questionnaireVersion: '2.0' }
const old = { answers: { 'FI-01': 'YES' }, stepIndex: 1 }
const saved = () => ({ ...draft, version: 3, savedAt: Date.now(), expiresAt: Date.now() + DRAFT_TTL })
beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined)
  const browser = new JSDOM('', { url: 'http://localhost' }).window
  vi.stubGlobal('localStorage', browser.localStorage); vi.stubGlobal('sessionStorage', browser.sessionStorage)
  setMemoryDraft(null)
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => { cleanup(); setMemoryDraft(null); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
const mount = async () => { await act(async () => { render(<StrictMode><ComplianceFreeIntake /></StrictMode>) }) }
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

describe('F3 browsercontract', () => {
  it('scheidt aanvullende situaties van exclusieve alternatieven en behoudt labels/focus', async () => {
    setMemoryDraft({ answers: {}, stepIndex: 3, questionnaireVersion: '2.0' })
    await mount()
    const machine = screen.getByLabelText('Machines') as HTMLInputElement
    const other = screen.getByLabelText('Mogelijk andere werkzaamheden of situaties die niet in de lijst staan') as HTMLInputElement
    const none = screen.getByLabelText('Ik herken geen van de genoemde situaties') as HTMLInputElement
    const unknown = screen.getByLabelText('Ik kan nog niet inschatten welke situaties voorkomen') as HTMLInputElement
    expect(screen.getByRole('heading', { name: 'Aanvullende situaties' })).toBeTruthy()
    fireEvent.click(machine); fireEvent.click(other)
    expect([machine.checked, other.checked]).toEqual([true, true])
    none.focus(); fireEvent.click(none)
    expect([machine.checked, other.checked, none.checked, unknown.checked]).toEqual([false, false, true, false])
    expect(document.activeElement).toBe(none)
    fireEvent.click(unknown)
    expect([none.checked, unknown.checked]).toEqual([false, true])
    fireEvent.click(other)
    expect([other.checked, unknown.checked]).toEqual([true, false])
  })
  it.each(['NONE_RECOGNIZED', 'UNKNOWN', 'OTHER'])('herstelt bestaand 2.0-concept %s zonder omcodering of nieuwe TTL', async choice => {
    const now = Date.now()
    const value = { ...draft, answers: { 'FI2-04': [choice] }, stepIndex: 3, version: 3, savedAt: now - 1000, expiresAt: now - 1000 + DRAFT_TTL }
    const original = JSON.stringify(value)
    localStorage.setItem(KEY, original); await mount()
    const selected = (screen.getAllByRole('checkbox') as HTMLInputElement[]).filter(input => input.checked)
    expect(selected.map(input => input.value)).toEqual([choice])
    expect(localStorage.getItem(KEY)).toBe(original)
    fireEvent.click(screen.getByLabelText('Machines'))
    const updated = JSON.parse(localStorage.getItem(KEY)!)
    expect(updated.expiresAt).toBe(value.expiresAt)
    expect(updated.answers['FI2-04']).toEqual(choice === 'OTHER' ? ['MACHINES', 'OTHER'] : ['MACHINES'])
  })
  it('herstelt tegenstrijdige opgeslagen keuzes zonder willekeurig één te kiezen', async () => {
    localStorage.setItem(KEY, JSON.stringify({ ...saved(), stepIndex: 3, answers: { 'FI2-04': ['UNKNOWN', 'MACHINES'] } }))
    await mount()
    expect((screen.getAllByRole('checkbox') as HTMLInputElement[]).some(input => input.checked)).toBe(false)
    expect(JSON.parse(localStorage.getItem(KEY)!).answers['FI2-04']).toEqual(['UNKNOWN', 'MACHINES'])
  })
  it('toont maximaal zes onderwerpen en een correct getelde, standaard gesloten restlijst', async () => {
    setMemoryDraft({ questionnaireVersion: '2.0', stepIndex: 4, answers: {
      'FI2-01': 'EMPLOYEES', 'FI2-02': ['sector:industrie'], 'FI2-03': 'ONE_TO_25', 'FI2-04': ['MACHINES'], 'FI2-05': ['BHV'],
    } })
    await mount(); click('Bekijk relevante onderwerpen')
    const section = screen.getByRole('region', { name: 'Dit sluit aan op uw antwoorden' })
    expect(within(section).getAllByRole('listitem')).toHaveLength(6)
    expect(within(section).getAllByRole('heading', { level: 3 })[0].textContent).toBe('BHV & noodorganisatie')
    const summary = screen.getByText('Overige mogelijk relevante onderwerpen (27)')
    const details = summary.closest('details')!
    expect(details.open).toBe(false)
    expect(details.querySelectorAll('li')).toHaveLength(27)
    expect(screen.getByText(/Uw antwoorden uit deze intake worden nog niet meegenomen/)).toBeTruthy()
  })
  it('houdt alle onbekende onderwerpen ingeklapt en de vervolgstap beschikbaar', async () => {
    setMemoryDraft({ questionnaireVersion: '2.0', stepIndex: 4, answers: {
      'FI2-01': 'UNKNOWN', 'FI2-02': ['UNKNOWN'], 'FI2-03': 'UNKNOWN', 'FI2-04': ['UNKNOWN'], 'FI2-05': ['UNKNOWN'],
    } })
    await mount(); click('Bekijk relevante onderwerpen')
    expect(screen.getByText(/onvoldoende richting voor een persoonlijke selectie/)).toBeTruthy()
    expect(screen.getByText('Overige mogelijk relevante onderwerpen (33)').closest('details')!.open).toBe(false)
    expect(screen.getByRole('link', { name: 'Naar de Compliance-wijzer' }).getAttribute('href')).toBe('/wijzers/compliance')
  })
  it('toont bij FI2-01 alleen de relevante toelichting en behoudt vijf keuzes', async () => {
    await mount()
    expect(screen.getByText('Denk ook aan uitzendkrachten en stagiairs.', { exact: true })).toBeTruthy()
    expect(screen.queryByText(/Vul geen namen in\./)).toBeNull()
    const choices = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(choices.map(choice => [choice.name, choice.value])).toEqual([
      ['FI2-01', 'EMPLOYEES'], ['FI2-01', 'OTHERS_UNDER_AUTHORITY'],
      ['FI2-01', 'VOLUNTEERS_ONLY'], ['FI2-01', 'NONE'], ['FI2-01', 'UNKNOWN'],
    ])
    expect(screen.queryByRole('textbox')).toBeNull()
  })
  it('werkt anoniem van vijf vragen tot oriëntatie, zonder netwerk of automatische opslag', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch)
    await mount(); click('Volgende')
    expect(screen.getByRole('alert').textContent).toContain('Kies een antwoord')
    fireEvent.click(screen.getByLabelText(employee)); click('Volgende')
    fireEvent.click(screen.getByLabelText('Industrie')); click('Volgende')
    fireEvent.click(screen.getByLabelText('1–25')); click('Volgende')
    fireEvent.click(screen.getByLabelText('Machines')); fireEvent.click(screen.getByLabelText('Werkzaamheden met brandgevaar')); click('Volgende')
    fireEvent.click(screen.getByLabelText('BHV')); click('Bekijk relevante onderwerpen')
    expect(screen.getByRole('heading', { name: 'Uw onderwerpen om verder te verkennen' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Naar de Compliance-wijzer' }).getAttribute('href')).toBe('/wijzers/compliance')
    expect(screen.queryByText('Op orde')).toBeNull(); expect(screen.queryByText('Actie vereist')).toBeNull()
    expect(localStorage.length).toBe(0); expect(fetch).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Concept 24 uur op dit apparaat bewaren' })).toBeNull()
  })
  it('bewaart uitsluitend expliciet, zonder leaseverlenging en zonder stille hervatting van bewaren na verwijderen', async () => {
    await mount(); fireEvent.click(screen.getByLabelText(employee))
    expect(localStorage.getItem(KEY)).toBeNull()
    click('Concept 24 uur op dit apparaat bewaren'); const first = JSON.parse(localStorage.getItem(KEY)!)
    click('Volgende'); fireEvent.click(screen.getByLabelText('Bouw'))
    expect(JSON.parse(localStorage.getItem(KEY)!).expiresAt).toBe(first.expiresAt)
    expect(first.questionnaireVersion).toBe('2.0'); expect(first.version).toBe(3)
    click('Concept van dit apparaat verwijderen'); fireEvent.click(screen.getByLabelText('Industrie'))
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('behoudt oude vijftien vragen pas na keuze, zonder mapping of nieuwe termijn', async () => {
    localStorage.setItem(LEGACY, JSON.stringify(old)); await mount()
    expect(screen.queryByLabelText(employee)).toBeNull(); expect(localStorage.getItem(LEGACY)).not.toBeNull()
    click('Hervat oud concept')
    expect(screen.getByText('Stap 2 van 5')).toBeTruthy(); expect(screen.getByText(/U hervat de oorspronkelijke intake/)).toBeTruthy()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('herkent ook A07-opslagenvelop 2 als oude vraagset en behoudt diens termijn', async () => {
    const value = { ...old, version: 2, savedAt: Date.now() - 1000, expiresAt: Date.now() - 1000 + DRAFT_TTL }
    localStorage.setItem(KEY, JSON.stringify(value)); await mount(); click('Hervat oud concept')
    fireEvent.click(screen.getByLabelText('Machines'))
    expect(JSON.parse(localStorage.getItem(KEY)!).expiresAt).toBe(value.expiresAt)
    expect(JSON.parse(localStorage.getItem(KEY)!).answers['FI-04']).toEqual(['MACHINES'])
  })
  it('houdt actieve invoer bij verlopen termijn; een ander tabblad mag de lease niet stil herstellen', async () => {
    vi.useFakeTimers(); localStorage.setItem(KEY, JSON.stringify(saved())); await mount()
    act(() => { vi.advanceTimersByTime(DRAFT_TTL) })
    expect(screen.getByText(/Hoofdvraag 2 van 5/)).toBeTruthy(); expect(localStorage.getItem(KEY)).toBeNull()
    expect(screen.getByRole('status').textContent).toContain('bewaartermijn is verstreken')
    fireEvent.click(screen.getByLabelText('Bouw')); expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('behoudt invoer bij wijziging andere tab, wist bij logout alleen Compliance', async () => {
    await mount(); fireEvent.click(screen.getByLabelText(employee)); click('Concept 24 uur op dit apparaat bewaren')
    localStorage.setItem('other', 'keep')
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: null })))
    expect((screen.getByLabelText(employee) as HTMLInputElement).checked).toBe(true)
    act(() => window.dispatchEvent(new Event(COMPLIANCE_CLEAR_KEY)))
    expect((screen.getByLabelText(employee) as HTMLInputElement).checked).toBe(false)
    expect(localStorage.getItem('other')).toBe('keep')
  })
  it('vraagt expliciete bevestiging van 0 en laat tegenstrijdigheden herstellen', async () => {
    await mount(); fireEvent.click(screen.getByLabelText('Alleen vrijwilligers')); click('Volgende')
    fireEvent.click(screen.getByLabelText('Zorg')); click('Volgende')
    expect((screen.getByLabelText('0') as HTMLInputElement).checked).toBe(false)
    click('Bevestig 0 werknemers'); expect((screen.getByLabelText('0') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText('26 of meer')); click('Volgende')
    expect(screen.getByRole('alert').textContent).toContain('spreken elkaar tegen')
    click('Aantal werknemers controleren'); fireEvent.click(screen.getByLabelText('0')); click('Volgende')
    expect(screen.getByText(/Hoofdvraag 4 van 5/)).toBeTruthy()
  })
  it('werkt zonder browseropslag en houdt invoer vast', async () => {
    vi.spyOn(Object.getPrototypeOf(localStorage), 'getItem').mockImplementation(() => { throw new Error('blocked') })
    await mount(); fireEvent.click(screen.getByLabelText(employee)); click('Concept 24 uur op dit apparaat bewaren')
    expect(screen.getByRole('status').textContent).toContain('Bewaren is niet gelukt')
    expect((screen.getByLabelText(employee) as HTMLInputElement).checked).toBe(true)
  })
  it.each(['empty', 'saved', 'expired', 'invalid', 'legacy', 'a07'])('hydrateert %s zonder 418 of writes', async kind => {
    const html = renderToString(<ComplianceFreeIntake />)
    if (kind === 'saved') localStorage.setItem(KEY, JSON.stringify(saved()))
    if (kind === 'expired') localStorage.setItem(KEY, JSON.stringify({ ...saved(), savedAt: Date.now() - DRAFT_TTL, expiresAt: Date.now() }))
    if (kind === 'invalid') localStorage.setItem(KEY, '{broken')
    if (kind === 'legacy') localStorage.setItem(LEGACY, JSON.stringify(old))
    if (kind === 'a07') localStorage.setItem(KEY, JSON.stringify({ ...saved(), ...old, version: 2, questionnaireVersion: '1.0' }))
    const writes = vi.spyOn(Object.getPrototypeOf(localStorage), 'setItem'), errors: unknown[] = []
    const container = document.createElement('div'); container.innerHTML = html; document.body.append(container)
    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => { root = hydrateRoot(container, <StrictMode><ComplianceFreeIntake /></StrictMode>, { onRecoverableError: e => errors.push(e) }) })
    expect(errors).toEqual([]); expect(writes).not.toHaveBeenCalled()
    act(() => root.unmount()); container.remove()
  })
})
