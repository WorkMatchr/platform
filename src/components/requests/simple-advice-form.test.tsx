// DOM setup runs inside a bounded hook: Windows cold imports can exceed the worker startup budget.
import React from 'react'
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest'
let cleanup: typeof import('@testing-library/react/pure').cleanup
let fireEvent: typeof import('@testing-library/react/pure').fireEvent
let render: typeof import('@testing-library/react/pure').render
let screen: typeof import('@testing-library/react/pure').screen
let waitFor: typeof import('@testing-library/react/pure').waitFor
let closeDom: () => void
const originalGlobals = new Map<string, PropertyDescriptor | undefined>()
beforeAll(async () => {
  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
  for (const key of ['window','document','navigator','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','HTMLFormElement','FormData','sessionStorage','Event','MouseEvent']) { originalGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { value: key === 'window' ? dom.window : dom.window[key as keyof typeof dom.window], configurable: true, writable: true }) }
  ;({ cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react/pure'))
  closeDom = () => dom.window.close()
}, 180000)
afterAll(() => { cleanup?.(); closeDom?.(); for (const [key, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) } })
import { SimpleAdviceForm } from './simple-advice-form'
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
beforeEach(() => { cleanup(); sessionStorage.clear() })
const setup = () => render(<SimpleAdviceForm action={vi.fn().mockResolvedValue({})} viewerId="owner" locations={[{ id: '11111111-1111-4111-8111-111111111111', city: 'Utrecht' }]} />)
const choose = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const next = async () => { await waitFor(() => expect((screen.getByText('Verder') as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(screen.getByText('Verder')) }
const fill = () => {
  choose('Waar heeft u hulp bij?', 'Een veilige werkplek')
  choose('Beschrijf uw vraag of situatie', 'Wij willen onze werkplek laten beoordelen.')
  choose('Wat wilt u bereiken?', 'ADVICE')
  choose('Waar moet de opdracht worden uitgevoerd?', 'REMOTE')
  choose('Wanneer wilt u starten?', 'WITHIN_TWO_WEEKS')
}
describe('gedeelde opdrachtflow', () => {
  it('Verder bereikt controle zonder tijdens dezelfde klik een submitknop te worden', async () => {
    const action = vi.fn().mockResolvedValue({})
    render(<SimpleAdviceForm action={action} viewerId="owner" />)
    fireEvent.click(screen.getByLabelText('Nee')); choose('Waar gaat uw vraag over?', 'UNKNOWN'); await next(); fill()
    const continueButton = screen.getByText('Verder') as HTMLButtonElement
    fireEvent.click(continueButton)
    expect(screen.getByText('Controleer uw opdracht')).toBeTruthy()
    expect(continueButton.type).toBe('button')
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Wijzigen'))
    expect((screen.getByLabelText('Waar heeft u hulp bij?') as HTMLInputElement).value).toBe('Een veilige werkplek')
    await next()
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Opdracht publiceren'))
    await waitFor(() => expect(action).toHaveBeenCalledOnce())
  })
  it('publicatie verzendt de gecontroleerde invoer zonder expertise voor UNKNOWN', async () => {
    const action = vi.fn().mockResolvedValue({ message: 'Test ontvangen' })
    render(<SimpleAdviceForm action={action} viewerId="owner" />)
    fireEvent.click(screen.getByLabelText('Nee')); choose('Waar gaat uw vraag over?', 'UNKNOWN'); await next(); fill(); await next()
    fireEvent.click(screen.getByText('Opdracht publiceren'))
    await waitFor(() => expect(action).toHaveBeenCalledOnce())
    const data = action.mock.calls[0][1] as FormData
    expect(JSON.parse(String(data.get('payload')))).toMatchObject({ requestedExpertise: null, helpTopic: 'UNKNOWN', requestTitle: 'Een veilige werkplek' })
    expect(String(data.get('submissionId'))).toMatch(/^[0-9a-f-]{36}$/)
  })
  it('houdt concepten van verschillende accounts gescheiden', async () => {
    sessionStorage.setItem('workmatchr-simple-advice:v1:someone-else', JSON.stringify({ values: { requestTitle: 'Andere tenant' } }))
    setup(); fireEvent.click(screen.getByLabelText('Nee')); choose('Waar gaat uw vraag over?', 'UNKNOWN'); await next()
    expect((screen.getByLabelText('Waar heeft u hulp bij?') as HTMLInputElement).value).toBe('')
  })
  it('A: expertise verplicht, gedeelde intake, terug behoudt keuze en controle', async () => {
    setup(); fireEvent.click(screen.getByLabelText('Ja')); await next()
    expect(screen.getByText('Kies een deskundigheid.')).toBeTruthy()
    choose('Welke deskundigheid zoekt u?', 'HVK'); await next(); fill()
    fireEvent.click(screen.getByText('Terug'))
    expect((screen.getByLabelText('Welke deskundigheid zoekt u?') as HTMLSelectElement).value).toBe('HVK')
    await next(); expect((screen.getByLabelText('Waar heeft u hulp bij?') as HTMLInputElement).value).toBe('Een veilige werkplek')
    await next(); expect(screen.getByText('Controleer uw opdracht')).toBeTruthy(); expect(screen.getByText('Opdracht publiceren')).toBeTruthy()
  })
  it('B: UNKNOWN bereikt dezelfde controle zonder expertise', async () => {
    setup(); fireEvent.click(screen.getByLabelText('Nee')); await next()
    expect(screen.getByText('Kies een onderwerp.')).toBeTruthy()
    choose('Waar gaat uw vraag over?', 'UNKNOWN'); await next(); fill(); await next()
    expect(screen.getByText('Ik weet het echt niet')).toBeTruthy(); expect(screen.queryByText('Gezochte deskundigheid')).toBeNull()
    expect(screen.getByText('Opdracht publiceren')).toBeTruthy()
  })
  it('routewisseling wist expertise en behoudt gedeelde velden', async () => {
    setup(); fireEvent.click(screen.getByLabelText('Ja')); choose('Welke deskundigheid zoekt u?', 'MVK')
    fireEvent.click(screen.getByLabelText('Nee')); choose('Waar gaat uw vraag over?', 'OTHER'); choose('Toelichting (optioneel)', 'Mijn onderwerp')
    fireEvent.click(screen.getByLabelText('Ja'))
    expect((screen.getByLabelText('Welke deskundigheid zoekt u?') as HTMLSelectElement).value).toBe('')
  })
  it('combinatie toont plaats en specifieke datum vereist datum', async () => {
    setup(); fireEvent.click(screen.getByLabelText('Nee')); choose('Waar gaat uw vraag over?', 'UNKNOWN'); await next(); fill()
    choose('Waar moet de opdracht worden uitgevoerd?', 'COMBINATION'); fireEvent.click(screen.getByLabelText('Op andere locatie')); fireEvent.click(screen.getByLabelText('Remote'))
    choose('Wanneer wilt u starten?', 'SPECIFIC_DATE'); await next()
    expect(screen.getByText('Vul de plaats in.')).toBeTruthy(); expect(screen.getByText('Kies een geldige datum.')).toBeTruthy()
    choose('Plaats', 'Delft'); choose('Gewenste startdatum', '2026-12-01'); await next()
    expect(screen.getByText('Delft')).toBeTruthy()
  })
})
