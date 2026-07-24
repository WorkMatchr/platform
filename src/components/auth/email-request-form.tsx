'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { runAuthClientRequest } from '@/lib/auth-form-request'
import {
  emailSchema,
  GENERIC_AUTH_RATE_LIMIT_ERROR,
  GENERIC_AUTH_REQUEST_ERROR,
  GENERIC_RESET_CONFIRMATION,
  GENERIC_VERIFICATION_CONFIRMATION,
} from '@/lib/auth-validation'

export function EmailRequestForm({ mode }: { mode: 'reset' | 'verification' }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [hasError, setHasError] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    const result = emailSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!result.success) {
      setHasError(true)
      return setMessage('Vul een geldig e-mailadres in.')
    }
    setHasError(false)
    setLoading(true)
    const requestResult = await runAuthClientRequest(() => mode === 'reset'
      ? authClient.requestPasswordReset({ email: result.data.email, redirectTo: '/wachtwoord-herstellen' })
      : authClient.sendVerificationEmail({ email: result.data.email, callbackURL: '/verifieer-email?status=geslaagd' }))
    setLoading(false)

    if (requestResult === 'rate_limited') {
      setHasError(true)
      return setMessage(GENERIC_AUTH_RATE_LIMIT_ERROR)
    }
    if (requestResult === 'technical_error') {
      setHasError(true)
      return setMessage(GENERIC_AUTH_REQUEST_ERROR)
    }
    setMessage(mode === 'reset' ? GENERIC_RESET_CONFIRMATION : GENERIC_VERIFICATION_CONFIRMATION)
  }

  return <form onSubmit={submit} noValidate className="space-y-5">
    {message && <StatusMessage error={hasError}>{message}</StatusMessage>}
    <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} /></div>
    <Button type="submit" loading={loading} className="w-full">{mode === 'reset' ? 'Herstellink aanvragen' : 'Verificatiebericht aanvragen'}</Button>
  </form>
}
