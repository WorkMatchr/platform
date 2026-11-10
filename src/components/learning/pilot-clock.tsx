'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { recordPilotObservation } from '@/app/e-learnings/pilot/time'

const pauseEvent = 'academy-pilot-pause'
function subscribeToPause(notify: () => void) {
  window.addEventListener(pauseEvent, notify)
  return () => window.removeEventListener(pauseEvent, notify)
}
const pauseDuringServerRender = () => true

export function PilotClock({
  enrollment,
  target,
  exam = false,
}: {
  enrollment: string
  target: string
  exam?: boolean
}) {
  const [pagePaused, setPagePaused] = useState(true)
  const pauseKey = 'academy-pilot-pauze:' + enrollment
  const paused = useSyncExternalStore(subscribeToPause, () => {
    try { return sessionStorage.getItem(pauseKey) === '1' }
    catch { return pagePaused }
  }, pauseDuringServerRender)
  function togglePaused() {
    try {
      if (paused) sessionStorage.removeItem(pauseKey)
      else sessionStorage.setItem(pauseKey, '1')
    } catch {
      /* An explicit pause still works for the current page. */
    }
    setPagePaused(!paused)
    window.dispatchEvent(new Event(pauseEvent))
  }
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (paused) return
    const clock = crypto.randomUUID()
    let last = 0,
      active = false
    // Serialize this view's observations, including its final pause.
    let queue = Promise.resolve()
    function send(pause: boolean) {
      queue = queue
        .then(() => recordPilotObservation({ enrollment, target, clock, exam, pause }))
        .catch(() => setFailed(true))
    }
    function stop() {
      if (active) {
        active = false
        last = 0
        send(true)
      }
    }
    function observe(e: Event) {
      if (!e.isTrusted || document.hidden || !document.hasFocus()) return
      const now = performance.now()
      if (active && now - last < 3000) return
      last = now
      active = true
      send(false)
    }
    function visibility() {
      if (document.hidden) stop()
    }
    // Opening the visible section is only an anchor. A second observation needs genuine input.
    if (!document.hidden && document.hasFocus()) {
      active = true
      send(false)
    }
    const events = ['pointerdown', 'click', 'keydown', 'wheel', 'touchstart']
    for (const kind of events) window.addEventListener(kind, observe, { passive: true, capture: true })
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      stop()
      for (const kind of events) window.removeEventListener(kind, observe, true)
      window.removeEventListener('blur', stop)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enrollment, target, exam, paused])
  return (
    <aside aria-label="Studietijd pilot" className="my-3 rounded border p-3">
      <p>
        Activiteitsmeting {paused ? 'gepauzeerd' : 'beschikbaar'}. Bij stil lezen kunt u met ‘Ik studeer’ uw
        activiteit aangeven. Na een minuut zonder activiteit telt de tussenliggende tijd niet mee.
      </p>
      {!paused && (
        <button type="button" className="mr-4 underline">
          Ik studeer
        </button>
      )}
      <button type="button" className="underline" onClick={togglePaused}>
        {paused ? 'Meting hervatten' : 'Meting pauzeren'}
      </button>
      {failed && (
        <p role="alert">Een tijdmeting kon niet worden opgeslagen. Meld dit bij de pilotbegeleider.</p>
      )}
    </aside>
  )
}
