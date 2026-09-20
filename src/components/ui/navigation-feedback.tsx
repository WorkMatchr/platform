'use client'

import { createContext, useCallback, useContext, useEffect, useId, useState, type ReactNode } from 'react'

const NavigationContext = createContext<(id: string, pending: boolean) => void>(() => {})

export function NavigationFeedback({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<Set<string>>(() => new Set())
  const [visible, setVisible] = useState(false)
  const notify = useCallback((id: string, pending: boolean) => {
    setSources(current => {
      if (current.has(id) === pending) return current
      const next = new Set(current)
      if (pending) next.add(id); else next.delete(id)
      return next
    })
  }, [])
  const busy = sources.size > 0
  useEffect(() => {
    const timer = setTimeout(() => setVisible(busy), busy ? 200 : 0)
    return () => clearTimeout(timer)
  }, [busy])
  return <NavigationContext value={notify}>
    {children}
    {busy && visible && <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[100] border-t-2 border-brand-primary">
      <span className="float-right m-2 rounded-control bg-surface px-3 py-2 text-sm text-brand-dark shadow-sm">Pagina laden…</span>
    </div>}
  </NavigationContext>
}

/** Link transition and Suspense fallback share one indicator and release their own source. */
export function NavigationPending({ pending = true }: { pending?: boolean }) {
  const notify = useContext(NavigationContext)
  const id = useId()
  useEffect(() => {
    if (!pending) return
    notify(id, true)
    return () => notify(id, false)
  }, [id, notify, pending])
  return null
}
