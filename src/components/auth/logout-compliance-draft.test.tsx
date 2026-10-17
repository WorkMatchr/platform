// @vitest-environment jsdom
import { JSDOM } from 'jsdom'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LogoutButton } from './logout-button'
import { COMPLIANCE_DRAFT_KEY as KEY, saveDraft, setMemoryDraft } from '@/lib/compliance/free-intake-storage'
const mocks = vi.hoisted(() => ({ logout: vi.fn() }))
vi.mock('@/lib/auth-client', () => ({ authClient: { signOut: mocks.logout } }))
const assign = vi.fn()
beforeEach(() => {
  const browser = new JSDOM('', { url: 'http://localhost' }).window
  vi.stubGlobal('localStorage', browser.localStorage); vi.stubGlobal('BroadcastChannel', undefined)
  setMemoryDraft(null); mocks.logout.mockResolvedValue({ data: { success: true }, error: null })
  const original = window
  vi.stubGlobal('window', new Proxy(original, { get(target, key) { return key === 'location' ? { assign, pathname: '/dashboard' } : Reflect.get(target, key, target) } }))
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open'); this.dispatchEvent(new Event('close')) } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); setMemoryDraft(null) })
it('behoudt concept bij teruggaan en bevestigt vóór één logout', async () => {
  saveDraft({ answers: { 'FI-01': 'YES' }, stepIndex: 0 }, null)
  localStorage.setItem('unrelated', 'keep')
  render(<LogoutButton />)
  fireEvent.click(screen.getByRole('button', { name: /^Uitloggen$/ }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  expect(mocks.logout).not.toHaveBeenCalled()
  expect(screen.getByRole('link', { name: 'Terug naar mijn concept' }).getAttribute('href')).toBe('/wijzers/compliance/scan')
  expect(localStorage.getItem(KEY)).not.toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Uitloggen en concept verwijderen' }))
  await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1))
  expect(localStorage.getItem(KEY)).toBeNull(); expect(localStorage.getItem('unrelated')).toBe('keep')
  expect(assign).toHaveBeenCalledWith('/')
})
it('waarschuwt ook voor een niet-bewaard geheugenconcept', async () => {
  setMemoryDraft({ answers: { 'FI-01': 'YES' }, stepIndex: 0 })
  render(<LogoutButton />); fireEvent.click(screen.getByRole('button', { name: /^Uitloggen$/ }))
  await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
  expect(mocks.logout).not.toHaveBeenCalled()
})
it('toont logoutfout en blijft bruikbaar zonder valse redirect', async () => {
  mocks.logout.mockResolvedValue({ error: { message: 'unavailable' } })
  render(<LogoutButton />); fireEvent.click(screen.getByRole('button', { name: /^Uitloggen$/ }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Uitloggen is niet gelukt'))
  expect(assign).not.toHaveBeenCalled()
  expect((screen.getByRole('button', { name: /^Uitloggen$/ }) as HTMLButtonElement).disabled).toBe(false)
})

it('Escape sluit de waarschuwing zonder verlies en herstelt focus', async () => {
  saveDraft({ answers: { 'FI-01': 'YES' }, stepIndex: 0 }, null)
  render(<LogoutButton />)
  const button = screen.getByRole('button', { name: /^Uitloggen$/ })
  fireEvent.click(button)
  const dialog = await screen.findByRole('dialog') as HTMLDialogElement
  // Native dialog Escape closes through the browser's close event.
  act(() => dialog.close())
  expect(localStorage.getItem(KEY)).not.toBeNull()
  expect(mocks.logout).not.toHaveBeenCalled(); expect(document.activeElement).toBe(button)
})
it('meldt opslagfalen ook wanneer serverlogout lukt', async () => {
  vi.spyOn(Object.getPrototypeOf(window.localStorage), 'removeItem').mockImplementation(() => { throw new Error('blocked') })
  render(<LogoutButton />); fireEvent.click(screen.getByRole('button', { name: /^Uitloggen$/ }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('de browser kon de lokale conceptopslag niet verwijderen'))
  expect(mocks.logout).toHaveBeenCalledTimes(1); expect(assign).not.toHaveBeenCalled()
})
it('behandelt een onvolledige API-response niet als succesvolle logout', async () => {
  mocks.logout.mockResolvedValue({ data: null, error: null })
  render(<LogoutButton />); fireEvent.click(screen.getByRole('button', { name: /^Uitloggen$/ }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Uitloggen is niet gelukt'))
  expect(assign).not.toHaveBeenCalled()
})
