// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import { act } from 'react'
import { ComplianceExpandedGuide } from './compliance-expanded-guide'
import { f4TestDefinition } from '@/test-fixtures/compliance-f4'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const d = f4TestDefinition()
describe('Uitgebreide wijzer', () => {
  it('gebruikt labels en behoudt antwoorden bij teruggaan, zonder opslag', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    render(<ComplianceExpandedGuide definition={d} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Ja, werknemers in dienst' }))
    fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Plan van aanpak' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vorige' }))
    expect((screen.getByRole('radio', { name: 'Ja, werknemers in dienst' }) as HTMLInputElement).checked).toBe(true)
    expect(storage).not.toHaveBeenCalled()
    expect(screen.queryByText('CW2-RIE-01')).toBeNull()
  })
  it('beschermt tegen dubbel versturen en herstelt fouten met dezelfde idempotency key', async () => {
    let resolve!: (value: unknown) => void
    const fetch = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r })).mockResolvedValue({ ok: false, json: async () => ({ saved: false }) })
    vi.stubGlobal('fetch', fetch)
    render(<ComplianceExpandedGuide definition={d} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Ja, werknemers in dienst' }))
    for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))
    const button = screen.getByRole('button', { name: 'Beoordeling afronden en opslaan' })
    fireEvent.click(button); fireEvent.click(button)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect((button as HTMLButtonElement).disabled).toBe(true)
    await act(async () => resolve({ ok: false, json: async () => ({ saved: false }) }))
    expect(screen.getByRole('alert').textContent).toContain('antwoorden blijven behouden')
    expect(document.activeElement).toBe(screen.getByRole('alert'))
    fireEvent.click(screen.getByRole('button', { name: 'Beoordeling afronden en opslaan' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body)
    expect(JSON.parse(fetch.mock.calls[1][1].body).answers.HASEMPLOYEES).toBe('YES')
  })
  it('hydrateert zonder browserafhankelijke eerste render', async () => {
    const errors: unknown[] = [], container = document.createElement('div')
    container.innerHTML = renderToString(<ComplianceExpandedGuide definition={d} />)
    document.body.append(container)
    let root: ReturnType<typeof hydrateRoot>
    await act(async () => { root = hydrateRoot(container, <ComplianceExpandedGuide definition={d} />, { onRecoverableError: e => errors.push(e) }) })
    expect(errors).toEqual([])
    await act(async () => root.unmount()); container.remove()
  })
})
