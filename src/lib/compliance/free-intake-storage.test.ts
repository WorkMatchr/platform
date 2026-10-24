// @vitest-environment jsdom
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPLIANCE_DRAFT_KEY as KEY, COMPLIANCE_LEGACY_KEY as LEGACY, DRAFT_TTL, decodeDraft, readDraft, saveDraft, clearComplianceDraft, setMemoryDraft } from './free-intake-storage'
const now = 1_800_000_000_000
const draft = { answers: { 'FI-01': 'YES' }, stepIndex: 1 }
beforeEach(() => { vi.stubGlobal('BroadcastChannel', undefined); const browser = new JSDOM('', { url: 'http://localhost' }).window; vi.stubGlobal('localStorage', browser.localStorage); vi.stubGlobal('sessionStorage', browser.sessionStorage); setMemoryDraft(null) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('expliciete Compliance-opslag', () => {
  it('bewaart FI2 uitsluitend in envelop 3 met vaste lease en zonder FI1-antwoorden', () => {
    const next = { answers: { 'FI2-01': 'EMPLOYEES', 'FI-01': 'YES' }, stepIndex: 1, questionnaireVersion: '2.0' as const }
    const first = saveDraft(next, null, now)!
    expect(first).toMatchObject({ version: 3, questionnaireVersion: '2.0', answers: { 'FI2-01': 'EMPLOYEES' }, savedAt: now, expiresAt: now + DRAFT_TTL })
    expect(first.answers).not.toHaveProperty('FI-01')
    expect(saveDraft({ ...next, stepIndex: 2 }, first, now + 1000)?.expiresAt).toBe(first.expiresAt)
    expect(readDraft(now + DRAFT_TTL)).toEqual({ kind: 'expired' })
  })
  it('overschrijft geen bestaand A07-concept met FI2 en verandert de vraagset niet binnen een lease', () => {
    const first = saveDraft(draft, null, now)!
    const before = localStorage.getItem(KEY)
    const next = { answers: { 'FI2-01': 'EMPLOYEES' }, stepIndex: 0, questionnaireVersion: '2.0' as const }
    expect(saveDraft(next, null, now + 1)).toBeNull()
    expect(saveDraft(next, first, now + 1)).toBeNull()
    expect(localStorage.getItem(KEY)).toBe(before)
  })
  it('behoudt twee verschillende opgeslagen concepten zonder automatisch te kiezen', () => {
    saveDraft(draft, null, now)
    localStorage.setItem(LEGACY, JSON.stringify(draft))
    expect(readDraft(now).kind).toBe('unsupported')
    expect(saveDraft(draft, null, now + 1)).toBeNull()
    expect(localStorage.getItem(KEY)).not.toBeNull()
    expect(localStorage.getItem(LEGACY)).not.toBeNull()
  })
  it('leest zonder automatisch te schrijven', () => { expect(readDraft(now)).toEqual({ kind: 'empty' }); expect(localStorage.length).toBe(0) })
  it('bewaart 24 uur en verlengt niet bij wijzigen of openen', () => {
    const first = saveDraft(draft, null, now)!
    expect(first.expiresAt).toBe(now + DRAFT_TTL)
    const updated = saveDraft({ ...draft, stepIndex: 2 }, first, now + 1000)!
    expect(updated.expiresAt).toBe(first.expiresAt)
    expect(readDraft(now + DRAFT_TTL - 1).kind).toBe('saved')
    expect(readDraft(now + DRAFT_TTL)).toEqual({ kind: 'expired' })
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('laat een stale tab geen verwijderd concept terugschrijven', () => {
    const saved = saveDraft(draft, null, now)!
    clearComplianceDraft()
    expect(saveDraft(draft, saved, now + 1)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('herkent legacy zonder stilzwijgende omzetting', () => {
    localStorage.setItem(LEGACY, JSON.stringify(draft))
    expect(readDraft(now)).toEqual({ kind: 'legacy', draft })
    expect(saveDraft(draft, null, now)).toBeNull()
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(localStorage.getItem(LEGACY)).not.toBeNull()
  })
  it.each(['{', '{}', JSON.stringify({ ...draft, stepIndex: 1.5, version: 2 }), JSON.stringify({ ...draft, version: 2, savedAt: now + 1, expiresAt: now + 1 + DRAFT_TTL }), JSON.stringify({ ...draft, version: 2, savedAt: now, expiresAt: now + DRAFT_TTL + 1 })])('herstelt geen ongeldige opslag: %s', raw => {
    const result = decodeDraft(raw, false, now)
    expect(['invalid', 'unsupported']).toContain(result.kind)
  })
  it('behoudt onbekende versie totdat gebruiker kiest', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 3 }))
    expect(readDraft(now).kind).toBe('unsupported')
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })
  it('bewaart alleen bekende antwoordcodes', () => {
    const result = saveDraft({ answers: { ...draft.answers, email: 'synthetic@example.invalid' }, stepIndex: 0 }, null, now)
    expect(result?.answers).toEqual(draft.answers)
  })
  it('wist geen andere browsergegevens', () => {
    localStorage.setItem('unrelated', 'keep'); sessionStorage.setItem('unrelated', 'keep')
    saveDraft(draft, null, now); clearComplianceDraft()
    expect(localStorage.getItem('unrelated')).toBe('keep'); expect(sessionStorage.getItem('unrelated')).toBe('keep')
    expect(localStorage.getItem(KEY)).toBeNull()
  })
  it('vangt geblokkeerde opslag zonder gegevens te loggen', () => {
    vi.spyOn(Object.getPrototypeOf(window.localStorage), 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    expect(readDraft(now).kind).toBe('unavailable'); expect(saveDraft(draft, null, now)).toBeNull()
    vi.spyOn(Object.getPrototypeOf(window.localStorage), 'removeItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    expect(clearComplianceDraft()).toBe(false)
  })
})

it('vraagt alleen aanwezigheid op bij andere tabbladen zonder antwoorden te delen', async () => {
  vi.resetModules()
  const messages: unknown[] = []
  class Channel {
    onmessage: ((event: { data: unknown }) => void) | null = null
    close = vi.fn()
    postMessage(message: unknown) {
      messages.push(message)
      if (message === 'query') queueMicrotask(() => this.onmessage?.({ data: 'present' }))
    }
  }
  vi.stubGlobal('BroadcastChannel', Channel)
  const storage = await import('./free-intake-storage')
  expect(await storage.hasComplianceDraft()).toBe(true)
  expect(messages).toEqual(['query'])
})
