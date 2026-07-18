'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'

type ProviderAction = (state: ProviderActionState, formData: FormData) => Promise<ProviderActionState>

export function useProviderForm(action: ProviderAction) {
  const [state, formAction, pending] = useActionState(action, {})
  const [userDirty, setDirty] = useState(false)
  const formId = useId()
  const dirty = state.success ? false : userDirty

  useEffect(() => {
    if (state.errors) document.querySelector<HTMLElement>(`[data-provider-form="${CSS.escape(formId)}"] [aria-invalid="true"]`)?.focus()
  }, [formId, state.errors, state.values])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const error = (field: string) => state.errors?.[field]?.[0]
  const invalid = (field: string) => Boolean(error(field))
  const value = (field: string, fallback = '') => typeof state.values?.[field] === 'string' ? state.values[field] : fallback
  const values = (field: string, fallback: string[] = []) => Array.isArray(state.values?.[field]) ? state.values[field] : fallback

  return { state, formAction, pending, formId, dirty, setDirty, error, invalid, value, values }
}
