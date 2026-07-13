'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { emailSchema, GENERIC_RESET_CONFIRMATION } from '@/lib/auth-validation'

export function EmailRequestForm({ mode }: { mode: 'reset' | 'verification' }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = emailSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)))
    if (!result.success) return setMessage('Vul een geldig e-mailadres in.')
    setLoading(true)
    if (mode === 'reset') {
      await authClient.requestPasswordReset({ email: result.data.email, redirectTo: '/wachtwoord-herstellen' })
      setMessage(GENERIC_RESET_CONFIRMATION)
    } else {
      await authClient.sendVerificationEmail({ email: result.data.email, callbackURL: '/verifieer-email?status=geslaagd' })
      setMessage('Als dit e-mailadres bij ons bekend is en nog verificatie nodig heeft, ontvangt U een nieuw bericht.')
    }
    setLoading(false)
  }

  return <form onSubmit={submit} noValidate className="space-y-5">
    {message && <StatusMessage>{message}</StatusMessage>}
    <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} /></div>
    <Button type="submit" loading={loading} className="w-full">{mode === 'reset' ? 'Herstellink aanvragen' : 'Verificatiebericht aanvragen'}</Button>
  </form>
}
