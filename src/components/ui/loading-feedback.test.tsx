// DOM setup runs inside a bounded hook: Windows cold imports can exceed the worker startup budget.
import React from 'react'
import { beforeAll, beforeEach, afterEach, afterAll, expect, it, vi } from 'vitest'
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
afterAll(async () => { cleanup?.(); await new Promise(resolve => setTimeout(resolve, 50)); closeDom?.(); for (const [key, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key) } })

import { Button } from './button'
import { ActionForm, SubmitButton } from './action-form'
import { usePendingAction, ACTION_ERROR } from './use-pending-action'
import { NavigationFeedback, NavigationPending } from './navigation-feedback'
import { LoginForm } from '../auth/login-form'
const auth = vi.hoisted(() => ({ email: vi.fn() }))
vi.mock('@/lib/auth-client', () => ({ authClient: { signIn: { email: auth.email } } }))
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.ComponentProps<'a'>) => <a {...props}>{children}</a> }))
beforeEach(() => { cleanup(); vi.clearAllMocks() })
afterEach(() => vi.useRealTimers())
function deferred<T>() { let resolve!: (v: T) => void; let reject!: (e: Error) => void; const promise = new Promise<T>((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
function TestForm({ action }: { action: (s: { message?: string }, d: FormData) => Promise<{ message?: string }> }) {
 const [state, submit, pending] = usePendingAction(action, {})
 return <ActionForm aria-label="Test" action={submit}><input aria-label="Invoer" name="input" defaultValue="" />{state.message && <p role="alert">{state.message}</p>}<Button type="submit" loading={pending}>Opslaan</Button></ActionForm>
}
it('button keeps native state, contextual text and accessible busy feedback', () => {
 const view=render(<Button>Opslaan</Button>); expect(screen.getByRole('button',{name:'Opslaan'}).getAttribute('aria-busy')).toBeNull()
 view.rerender(<Button loading>Opslaan</Button>); const b=screen.getByRole('button',{name:'Opslaan…'}) as HTMLButtonElement
 expect(b.disabled).toBe(true); expect(b.getAttribute('aria-busy')).toBe('true'); expect(b.querySelector('.animate-spin')).toBeTruthy()
 view.rerender(<Button loading loadingLabel="Verzenden…">Versturen</Button>);expect(screen.getByRole('button',{name:'Verzenden…'})).toBeTruthy()
})
it('same-tick repeat submissions invoke one action; rejected action is retryable', async () => {
 const d=deferred<{message?: string}>();const action=vi.fn().mockReturnValueOnce(d.promise).mockResolvedValue({message:'Opgeslagen'})
 render(<TestForm action={action} />);fireEvent.change(screen.getByLabelText('Invoer'),{target:{value:'Bewaren'}})
 const form=screen.getByRole('form',{name:'Test'});fireEvent.submit(form);fireEvent.submit(form)
 await waitFor(()=>expect(action).toHaveBeenCalledOnce());expect((screen.getByRole('button',{name:'Opslaan…'}) as HTMLButtonElement).disabled).toBe(true)
 d.reject(new Error('network'));await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe(ACTION_ERROR))
 expect((screen.getByLabelText('Invoer') as HTMLInputElement).value).toBe('Bewaren')
 fireEvent.submit(form);await waitFor(()=>expect(action).toHaveBeenCalledTimes(2));await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Opgeslagen'))
})
it('login immediately locks repeated submit and recovers from a network rejection',async()=>{
 const d=deferred<never>();auth.email.mockReturnValue(d.promise);render(<LoginForm />)
 fireEvent.change(screen.getByLabelText('E-mailadres'),{target:{value:'loading@example.invalid'}});fireEvent.change(screen.getByLabelText('Wachtwoord'),{target:{value:'synthetic-invalid-password'}})
 const form=screen.getByRole('button',{name:'Inloggen'}).closest('form')!;fireEvent.submit(form);fireEvent.submit(form)
 expect(auth.email).toHaveBeenCalledOnce();expect((screen.getByRole('button',{name:'Inloggen…'}) as HTMLButtonElement).disabled).toBe(true)
 d.reject(new Error('network'));await waitFor(()=>expect((screen.getByRole('button',{name:'Inloggen'}) as HTMLButtonElement).disabled).toBe(false))
 expect(screen.getByRole('status')).toBeTruthy()
})
it('navigation appears only after delay and clears on completion/error unmount',async()=>{
 const view=render(<NavigationFeedback><NavigationPending /></NavigationFeedback>);expect(screen.queryByRole('status')).toBeNull()
 await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Pagina laden…'))
 view.rerender(<NavigationFeedback><NavigationPending pending={false}/></NavigationFeedback>);await waitFor(()=>expect(screen.queryByRole('status')).toBeNull())
 view.rerender(<NavigationFeedback><NavigationPending/></NavigationFeedback>);view.rerender(<NavigationFeedback>{null}</NavigationFeedback>);expect(screen.queryByRole('status')).toBeNull()
})

it('direct server action preserves submitter values and input after failure',async()=>{
 const d=deferred<void>();const action=vi.fn().mockReturnValue(d.promise)
 render(<ActionForm action={action}><input name="reason" aria-label="Reden" defaultValue=""/><SubmitButton name="operation" value="CONFIRM">Bevestigen</SubmitButton></ActionForm>)
 fireEvent.change(screen.getByLabelText('Reden'),{target:{value:'Bewaarde invoer'}})
 const button=screen.getByRole('button',{name:'Bevestigen'});fireEvent.click(button);fireEvent.click(button)
 expect(action).toHaveBeenCalledOnce();expect((action.mock.calls[0][0] as FormData).get('operation')).toBe('CONFIRM')
 expect((screen.getByRole('button',{name:'Bevestigen…'}) as HTMLButtonElement).disabled).toBe(true)
 d.reject(new Error('transport'));await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe(ACTION_ERROR))
 expect((screen.getByLabelText('Reden') as HTMLInputElement).value).toBe('Bewaarde invoer')
})
