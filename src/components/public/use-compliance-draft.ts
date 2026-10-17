'use client'

import { useEffect, useRef, useState } from 'react'
import {
  COMPLIANCE_CLEAR_KEY, COMPLIANCE_DRAFT_KEY, COMPLIANCE_LEGACY_KEY,
  getMemoryDraft, readDraft, removeDraftStorage, saveDraft, setMemoryDraft,
  type Draft, type SavedDraft,
} from '@/lib/compliance/free-intake-storage'

const empty = (): Draft => ({ answers: {}, stepIndex: 0 })
const expiredMessage = 'De bewaartermijn is verstreken. Uw huidige invoer blijft beschikbaar zolang deze pagina openblijft.'

export function useComplianceDraft() {
  const [draft, setDraft] = useState<Draft>(empty)
  const [ready, setReady] = useState(false)
  const [legacy, setLegacy] = useState<Draft | null>(null)
  const [saved, setSaved] = useState<SavedDraft | null>(null)
  const [message, setMessage] = useState('')
  const lease = useRef<SavedDraft | null>(null)
  const restored = useRef(false)
  const saveState = (value: SavedDraft | null) => { lease.current = value; setSaved(value) }

  useEffect(() => {
    let cancelled = false
    // Restore the external browser snapshot after mount, never during SSR/hydration.
    void Promise.resolve().then(() => {
      if (!cancelled && !restored.current) {
        restored.current = true
        const stored = readDraft()
        const active = getMemoryDraft()
        if (active) setDraft(active)
        if (stored.kind === 'saved') {
          if (!active) { setDraft(stored.draft); setMemoryDraft(stored.draft) }
          saveState(stored.draft)
        } else if (stored.kind === 'legacy') setLegacy(stored.draft)
        else if (stored.kind === 'expired') setMessage(expiredMessage)
        else if (stored.kind === 'invalid') setMessage('Het opgeslagen concept is ongeldig en verwijderd. U kunt opnieuw beginnen.')
        else if (stored.kind === 'unsupported') setMessage('Dit concept gebruikt een onbekende versie. Het is niet geopend of gewijzigd. Verwijder het alleen als u het niet meer nodig hebt.')
        else if (stored.kind === 'unavailable') setMessage('Browseropslag is niet beschikbaar. U kunt deze intake zonder bewaren invullen.')
        setReady(true)
      }
    })
    function clear() {
      setMemoryDraft(null); saveState(null); setLegacy(null); setDraft(empty())
      setMessage('Uw lokale Compliance-concept is verwijderd bij het uitloggen.')
    }
    function check() {
      if (!lease.current) return
      const current = readDraft()
      if (current.kind !== 'saved' || current.draft.savedAt !== lease.current.savedAt) {
        const expired = Date.now() >= lease.current.expiresAt
        saveState(null)
        setMessage(expired ? expiredMessage : 'Het bewaarde concept is niet meer beschikbaar. Uw huidige invoer blijft op deze pagina behouden.')
      }
    }
    function storage(event: StorageEvent) {
      if (event.key === COMPLIANCE_CLEAR_KEY && event.newValue === 'clear') clear()
      else if (event.key === COMPLIANCE_DRAFT_KEY || event.key === COMPLIANCE_LEGACY_KEY || event.key === null) {
        // Keep current input, but require a fresh explicit save after another tab changes it.
        saveState(null)
        setMessage('De conceptopslag is in een ander tabblad gewijzigd. Uw huidige invoer blijft behouden; bewaren staat nu uit.')
      }
    }
    window.addEventListener(COMPLIANCE_CLEAR_KEY, clear)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      cancelled = true
      window.removeEventListener(COMPLIANCE_CLEAR_KEY, clear)
      window.removeEventListener('storage', storage)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(() => {
      readDraft() // expired data is removed; active input is deliberately retained
      saveState(null); setMessage(expiredMessage)
    }, Math.max(0, saved.expiresAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [saved])

  function update(next: Draft) {
    if (!ready || legacy) return
    setDraft(next); setMemoryDraft(next)
    if (lease.current) {
      const result = saveDraft(next, lease.current)
      const expired = Date.now() >= lease.current.expiresAt
      saveState(result)
      if (!result) setMessage(expired ? expiredMessage : 'Bewaren is niet gelukt. Uw huidige invoer blijft op deze pagina behouden.')
    }
  }
  function remember() {
    if (!ready || legacy) return
    const result = saveDraft(draft, null)
    saveState(result)
    setMessage(result ? 'Uw concept wordt maximaal 24 uur vanaf deze bewaaractie op dit apparaat bewaard.' : 'Bewaren is niet gelukt. Uw huidige invoer blijft op deze pagina behouden.')
  }
  function forget() {
    saveState(null); setLegacy(null)
    const removed = removeDraftStorage()
    setMessage(removed ? 'De opgeslagen kopie is verwijderd. Uw huidige invoer blijft op deze pagina behouden.' : 'De browser kon de opgeslagen kopie niet verwijderen. Wis deze via uw browserinstellingen; bewaren staat uit.')
  }
  function resumeLegacy() {
    if (!legacy) return
    setDraft(legacy); setMemoryDraft(legacy); setLegacy(null)
    let removed = true
    try { window.localStorage.removeItem(COMPLIANCE_LEGACY_KEY) } catch { removed = false }
    setMessage(removed ? 'Het oude concept is hervat zonder opnieuw te bewaren. Kies zelf of u het opnieuw 24 uur wilt bewaren.' : 'Het concept is hervat. De oude kopie kon niet worden verwijderd; wis deze via uw browserinstellingen.')
  }
  function finish() { forget(); setMemoryDraft(null) }
  function restart() { finish(); setDraft(empty()) }
  return { draft, ready, legacy, saved, message, update, remember, forget, resumeLegacy, finish, restart }
}
