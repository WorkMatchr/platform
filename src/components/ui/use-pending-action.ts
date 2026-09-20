'use client'

import { useActionState, useRef } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { isHTTPAccessFallbackError } from 'next/dist/client/components/http-access-fallback/http-access-fallback'

export const ACTION_ERROR = 'Deze actie is door een technische fout niet gelukt. Uw invoer blijft bewaard. Probeer het opnieuw.'

/** Guard before React queues an action: repeated Enter/click must not queue a second mutation. */
export function usePendingAction<S extends object>(action: (state: S, data: FormData) => Promise<S>, initialState: S, onError?: (previous: S, data: FormData) => S) {
  const active = useRef(false)
  const [state, dispatch, pending] = useActionState<S, FormData>(async (previous: Awaited<S>, data: FormData): Promise<Awaited<S>> => {
    try {
      return await action(previous, data)
    } catch (error) {
      // Framework control flow must retain its normal redirect/access boundary behavior.
      if (isRedirectError(error) || isHTTPAccessFallbackError(error)) throw error
      return (onError ? onError(previous, data) : { ...initialState, message: ACTION_ERROR }) as Awaited<S>
    } finally {
      active.current = false
    }
  }, initialState as Awaited<S>)
  const formAction = (data: FormData) => {
    if (active.current) return
    active.current = true
    dispatch(data)
  }
  return [state, formAction, pending] as const
}
