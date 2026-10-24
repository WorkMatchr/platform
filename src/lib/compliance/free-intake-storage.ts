import { normalizeComplianceFreeIntakeAnswers } from './free-intake-applicability'
import { normalizeFreeIntakeV2 } from './free-intake-v2'

export const COMPLIANCE_DRAFT_KEY = 'workmatchr:compliance-free-intake:v2'
export const COMPLIANCE_LEGACY_KEY = 'workmatchr:compliance-free-intake:v1'
export const COMPLIANCE_CLEAR_KEY = 'workmatchr:compliance-free-intake:clear'
export const COMPLIANCE_CHANNEL = 'workmatchr:compliance-free-intake'
export const DRAFT_TTL = 24 * 60 * 60 * 1000
export const COMPLIANCE_SCAN_PATH = '/wijzers/compliance/scan'
export type Draft = { answers: Record<string, string | string[]>; stepIndex: number; questionnaireVersion?: '1.0' | '2.0' }
export type SavedDraft = Draft & { version: 2 | 3; savedAt: number; expiresAt: number }
export type DraftRead =
  | { kind: 'saved'; draft: SavedDraft }
  | { kind: 'legacy'; draft: Draft }
  | { kind: 'empty' | 'expired' | 'invalid' | 'unavailable' | 'unsupported' }

function parseDraft(value: unknown): Draft | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!Number.isInteger(raw.stepIndex) || Number(raw.stepIndex) < 0 || Number(raw.stepIndex) > 4 ||
      !raw.answers || typeof raw.answers !== 'object' || Array.isArray(raw.answers)) return null
  // Only canonical answer codes survive; never persist unknown/free-text properties.
  if (raw.questionnaireVersion !== undefined && raw.questionnaireVersion !== '1.0' && raw.questionnaireVersion !== '2.0') return null
  const answers = raw.questionnaireVersion === '2.0'
    ? normalizeFreeIntakeV2(raw.answers as Record<string, unknown>)
    : normalizeComplianceFreeIntakeAnswers(raw.answers as Record<string, unknown>)
  return { answers: answers as Draft['answers'], stepIndex: Number(raw.stepIndex), ...(raw.questionnaireVersion ? { questionnaireVersion: raw.questionnaireVersion } : {}) }
}

export function decodeDraft(raw: string, legacy: boolean, now: number): DraftRead {
  try {
    const value = JSON.parse(raw)
    if (!legacy && value?.version !== 2 && value?.version !== 3) return { kind: 'unsupported' }
    if (!legacy && ((value.version === 3 && value.questionnaireVersion !== '2.0') || (value.version === 2 && value.questionnaireVersion !== undefined && value.questionnaireVersion !== '1.0'))) return { kind: 'unsupported' }
    if (legacy && value?.questionnaireVersion !== undefined && value.questionnaireVersion !== '1.0') return { kind: 'unsupported' }
    const draft = parseDraft(value)
    if (!draft) return { kind: 'invalid' }
    if (legacy) return { kind: 'legacy', draft }
    const { savedAt, expiresAt } = value
    if (!Number.isFinite(savedAt) || !Number.isFinite(expiresAt) || savedAt <= 0 || savedAt > now ||
        expiresAt !== savedAt + DRAFT_TTL) return { kind: 'invalid' }
    if (now >= expiresAt) return { kind: 'expired' }
    return { kind: 'saved', draft: { ...draft, version: value.version, savedAt, expiresAt } }
  } catch { return { kind: 'invalid' } }
}

export function readDraft(now = Date.now()): DraftRead {
  try {
    if (window.localStorage.getItem(COMPLIANCE_DRAFT_KEY) !== null && window.localStorage.getItem(COMPLIANCE_LEGACY_KEY) !== null) return { kind: 'unsupported' }
    for (const [key, legacy] of [[COMPLIANCE_DRAFT_KEY, false], [COMPLIANCE_LEGACY_KEY, true]] as const) {
      const raw = window.localStorage.getItem(key)
      if (raw === null) continue
      const result = decodeDraft(raw, legacy, now)
      if (result.kind === 'invalid' || result.kind === 'expired') window.localStorage.removeItem(key)
      return result
    }
    return { kind: 'empty' }
  } catch { return { kind: 'unavailable' } }
}

export function saveDraft(draft: Draft, previous: SavedDraft | null, now = Date.now()): SavedDraft | null {
  try {
    // An existing lease must still exist unchanged. A stale tab must not resurrect it.
    if (previous) {
      const current = readDraft(now)
      if (current.kind !== 'saved' || current.draft.savedAt !== previous.savedAt || now >= previous.expiresAt) return null
    } else {
      const current = readDraft(now)
      if (current.kind === 'saved' || current.kind === 'legacy' || current.kind === 'unsupported' || current.kind === 'unavailable') return null
    }
    const normalized = parseDraft(draft)
    if (!normalized) return null
    if (previous && (previous.questionnaireVersion ?? '1.0') !== (normalized.questionnaireVersion ?? '1.0')) return null
    const saved: SavedDraft = { ...normalized, version: normalized.questionnaireVersion === '2.0' ? 3 : 2, savedAt: previous?.savedAt ?? now, expiresAt: previous?.expiresAt ?? now + DRAFT_TTL }
    window.localStorage.setItem(COMPLIANCE_DRAFT_KEY, JSON.stringify(saved))
    return saved
  } catch { return null }
}

// Memory is tab-local, never read during SSR and never sent to the server.
let memory: Draft | null = null
let listening = false
function listenForLogout() {
  if (typeof window === 'undefined' || listening) return
  listening = true
  // Page-lifetime listener: a concept can remain in memory after navigating away.
  window.addEventListener(COMPLIANCE_CLEAR_KEY, () => { memory = null })
  window.addEventListener('storage', event => {
    if (event.key === COMPLIANCE_CLEAR_KEY && event.newValue === 'clear') {
      memory = null
      window.dispatchEvent(new Event(COMPLIANCE_CLEAR_KEY))
    }
  })
  try {
    const channel = new BroadcastChannel(COMPLIANCE_CHANNEL)
    channel.onmessage = event => {
      if (event.data === 'clear') { memory = null; window.dispatchEvent(new Event(COMPLIANCE_CLEAR_KEY)) }
      if (event.data === 'query' && hasMemoryDraft()) channel.postMessage('present')
    }
  } catch { /* The scoped storage signal remains available. */ }
}
export function getMemoryDraft() { listenForLogout(); return memory }
export function setMemoryDraft(draft: Draft | null) { listenForLogout(); memory = draft }
export function hasMemoryDraft() { return !!memory && Object.keys(memory.answers).length > 0 }

export function removeDraftStorage(): boolean {
  let removed = true
  for (const key of [COMPLIANCE_DRAFT_KEY, COMPLIANCE_LEGACY_KEY]) {
    try { window.localStorage.removeItem(key) } catch { removed = false }
  }
  return removed
}

export function clearComplianceDraft(): boolean {
  memory = null
  const removed = removeDraftStorage()
  window.dispatchEvent(new Event(COMPLIANCE_CLEAR_KEY))
  // No answers/identifiers are broadcast. Storage signal also covers browsers without BroadcastChannel.
  try {
    window.localStorage.setItem(COMPLIANCE_CLEAR_KEY, 'clear')
    window.localStorage.removeItem(COMPLIANCE_CLEAR_KEY)
  } catch { /* Still notify other active tabs when storage is blocked. */ }
  try {
    const channel = new BroadcastChannel(COMPLIANCE_CHANNEL)
    channel.postMessage('clear')
    channel.close()
  } catch { /* Storage event is the fallback. */ }
  return removed
}

export async function hasComplianceDraft(): Promise<boolean> {
  const stored = readDraft()
  if (hasMemoryDraft() || stored.kind === 'saved' || stored.kind === 'legacy' || stored.kind === 'unsupported' || stored.kind === 'unavailable') return true
  // An unfinished memory-only draft may be open in another tab.
  return new Promise<boolean>((resolve) => {
    let channel: BroadcastChannel
    try { channel = new BroadcastChannel(COMPLIANCE_CHANNEL) } catch { resolve(false); return }
    const timer = window.setTimeout(() => { channel.close(); resolve(false) }, 150)
    channel.onmessage = (event) => {
      if (event.data !== 'present') return
      window.clearTimeout(timer); channel.close(); resolve(true)
    }
    channel.postMessage('query')
  })
}
