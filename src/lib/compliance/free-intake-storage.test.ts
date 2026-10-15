// @vitest-environment jsdom
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPLIANCE_DRAFT_KEY as KEY, COMPLIANCE_LEGACY_KEY as LEGACY, DRAFT_TTL, decodeDraft, readDraft, saveDraft, clearComplianceDraft, setMemoryDraft } from './free-intake-storage'
const now = 1_800_000_000_000
const draft = { answers: { 'FI-01': 'YES' }, stepIndex: 1 }
beforeEach(() => { vi.stubGlobal('BroadcastChannel', undefined); const browser = new JSDOM('', { url: 'http://localhost' }).window; vi.stubGlobal('localStorage', browser.localStorage); vi.stubGlobal('sessionStorage', browser.sessionStorage); setMemoryDraft(null) })
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('expliciete Compliance-opslag', () => {
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
