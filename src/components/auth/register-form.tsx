'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { runRegistrationRequest } from '@/lib/auth-form-request'
import {
  GENERIC_AUTH_RATE_LIMIT_ERROR,
  GENERIC_AUTH_REQUEST_ERROR,
  registrationSchema,
} from '@/lib/auth-validation'

export function RegisterForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    const form = new FormData(event.currentTarget)
    const result = registrationSchema.safeParse(Object.fromEntries(form))
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }

    setErrors({})
    setLoading(true)
    const requestResult = await runRegistrationRequest(() => fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        passwordConfirmation: result.data.passwordConfirmation,
        acceptedTerms: true,
        callbackURL: '/verifieer-email?status=geslaagd',
      }),
    }))
    setLoading(false)

    if (requestResult === 'rate_limited') return setMessage(GENERIC_AUTH_RATE_LIMIT_ERROR)
    if (requestResult === 'technical_error') return setMessage(GENERIC_AUTH_REQUEST_ERROR)
    window.location.assign('/registreren/controleer-email')
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {message && <StatusMessage error>{message}</StatusMessage>}
      <div><label htmlFor="name" className="font-semibold">Volledige naam</label><input id="name" name="name" autoComplete="name" maxLength={100} required className={fieldClassName} aria-describedby={errors.name ? 'name-error' : undefined} /><FieldError id="name-error" message={errors.name?.[0]} /></div>
      <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} aria-describedby={errors.email ? 'email-error' : undefined} /><FieldError id="email-error" message={errors.email?.[0]} /></div>
      <div><label htmlFor="password" className="font-semibold">Wachtwoord</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={fieldClassName} aria-describedby="password-help password-error" /><p id="password-help" className="mt-2 text-sm text-text-secondary">Gebruik minimaal 12 tekens.</p><FieldError id="password-error" message={errors.password?.[0]} /></div>
      <div><label htmlFor="passwordConfirmation" className="font-semibold">Wachtwoord bevestigen</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={fieldClassName} aria-describedby={errors.passwordConfirmation ? 'password-confirmation-error' : undefined} /><FieldError id="password-confirmation-error" message={errors.passwordConfirmation?.[0]} /></div>
      <div><label className="flex items-start gap-3"><input name="acceptedTerms" type="checkbox" className="mt-1 size-5" required /><span>Ik ga akkoord met de tijdelijke <Link className="underline" href="/privacy">privacy-informatie</Link> en <Link className="underline" href="/algemene-voorwaarden">algemene voorwaarden</Link>. Deze juridische pagina’s worden nog definitief opgesteld.</span></label><FieldError id="accepted-terms-error" message={errors.acceptedTerms?.[0]} /></div>
      <Button type="submit" loading={loading} className="w-full">Account registreren</Button>
      <p className="text-center text-sm text-text-secondary">Al een account? <Link className="font-semibold text-brand-primary-hover underline" href="/inloggen">Inloggen</Link></p>
    </form>
  )
}
