'use client'

import { createContext, startTransition, useContext, useRef, useState, type ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { isHTTPAccessFallbackError } from 'next/dist/client/components/http-access-fallback/http-access-fallback'
import { Button } from './button'
import { ACTION_ERROR } from './use-pending-action'

const PendingContext = createContext(false)
type Props = Omit<ComponentProps<'form'>, 'action'> & { action: (data: FormData) => void | Promise<unknown> }

/** Explicit submission keeps uncontrolled input intact after a rejected request. */
export function ActionForm({ action, onSubmit, children, ...props }: Props) {
  const lock = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  return <form {...props} aria-busy={pending || undefined} onSubmit={event => {
    if (lock.current) { event.preventDefault(); return }
    onSubmit?.(event)
    if (event.defaultPrevented) return
    event.preventDefault()
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter)
    lock.current = true
    setPending(true)
    setError('')
    startTransition(async () => {
      try { await action(data) }
      catch (cause) {
        if (isRedirectError(cause) || isHTTPAccessFallbackError(cause)) throw cause
        setError(ACTION_ERROR)
      } finally { lock.current = false; setPending(false) }
    })
  }}>
    <PendingContext value={pending}>{children}</PendingContext>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </form>
}

export function SubmitButton(props: ComponentProps<typeof Button>) {
  const pending = useContext(PendingContext)
  const status = useFormStatus()
  return <Button {...props} type={props.type ?? 'submit'} loading={props.loading || pending || status.pending} />
}
