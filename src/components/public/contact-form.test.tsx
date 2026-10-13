// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ContactForm } from './contact-form'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('weigert verzending wanneer uitgeschakeld en koppelt fouten aan velden', () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  const view = render(<ContactForm enabled={false} />)
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  view.rerender(<ContactForm enabled />)
  fireEvent.submit(screen.getByRole('button').closest('form')!)
  expect(fetcher).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(screen.getByLabelText('Naam'))
  expect(screen.getByLabelText('E-mailadres').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByLabelText('Onderwerp').getAttribute('aria-invalid')).toBe('true')
  expect(screen.getAllByRole('option')).toHaveLength(5)
  expect(screen.getByRole('link', { name: 'privacyverklaring' }).getAttribute('href')).toBe('/privacy')
})
it('blokkeert dubbel submit, bewaart invoer na failure en houdt retry idempotent', async () => {
  let resolve!: (value: unknown) => void
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r }))
  vi.stubGlobal('fetch', fetcher)
  render(<ContactForm enabled />)
  fireEvent.change(screen.getByLabelText('Naam'), { target: { value: 'Test' } })
  fireEvent.change(screen.getByLabelText('E-mailadres'), { target: { value: 'a06@example.invalid' } })
  fireEvent.change(screen.getByLabelText('Bericht'), { target: { value: 'Een synthetische vraag voor de test.' } })
  fireEvent.change(screen.getByLabelText('Onderwerp'), { target: { value: 'TECHNICAL' } })
  const form = screen.getByRole('button').closest('form')!
  fireEvent.submit(form); fireEvent.submit(form)
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true')
  resolve({ ok: false, json: async () => ({ ok: false, message: 'Tijdelijk niet beschikbaar.' }) })
  await waitFor(() => expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false))
  expect(screen.getByRole('alert').textContent).toBe('Tijdelijk niet beschikbaar.')
  expect((screen.getByLabelText('Bericht') as HTMLTextAreaElement).value).toContain('synthetische')
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ ok: true, message: 'Aangeboden aan de maildienst.' }) })
  fireEvent.submit(form)
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Aangeboden aan de maildienst.'))
  expect(JSON.parse(fetcher.mock.calls[0][1].body).requestId).toBe(JSON.parse(fetcher.mock.calls[1][1].body).requestId)
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
})
