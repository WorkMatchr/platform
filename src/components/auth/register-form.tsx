'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { runNewPasswordRegistrationRequest } from '@/lib/auth-form-request'
import {
  GENERIC_AUTH_RATE_LIMIT_ERROR,
  GENERIC_AUTH_REQUEST_ERROR,
  registrationSchema,
} from '@/lib/auth-validation'
import { PASSWORD_CHECK_UNAVAILABLE_MESSAGE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_REJECTED_MESSAGE } from '@/lib/password-policy'

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
    const requestResult = await runNewPasswordRegistrationRequest(() => fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        accountType: result.data.accountType,
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
    if (requestResult === 'password_rejected') return setMessage(PASSWORD_REJECTED_MESSAGE)
    if (requestResult === 'password_check_unavailable') return setMessage(PASSWORD_CHECK_UNAVAILABLE_MESSAGE)
    if (requestResult === 'technical_error') return setMessage(GENERIC_AUTH_REQUEST_ERROR)
    window.location.assign('/registreren/controleer-email')
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {message && <StatusMessage error>{message}</StatusMessage>}
      <fieldset>
        <legend className="font-semibold">Hoe wilt u WorkMatchr gebruiken?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { value: 'CLIENT', title: 'Bedrijf', description: 'Ik wil een opdracht plaatsen en professionele ondersteuning vinden.' },
            { value: 'PROFESSIONAL', title: 'Professional', description: 'Ik wil namens mijn organisatie reageren op passende opdrachten.' },
          ].map((option) => (
            <label className="flex cursor-pointer gap-3 rounded-control border border-border bg-surface p-4 focus-within:ring-2 focus-within:ring-focus" key={option.value}>
              <input aria-describedby={`account-type-${option.value}`} name="accountType" required type="radio" value={option.value} />
              <span>
                <span className="block font-semibold text-brand-dark">{option.title}</span>
                <span className="mt-1 block text-sm text-text-secondary" id={`account-type-${option.value}`}>{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="account-type-error" message={errors.accountType?.[0]} />
      </fieldset>
      <div><label htmlFor="name" className="font-semibold">Volledige naam</label><input id="name" name="name" autoComplete="name" maxLength={100} required className={fieldClassName} aria-describedby={errors.name ? 'name-error' : undefined} /><FieldError id="name-error" message={errors.name?.[0]} /></div>
      <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} aria-describedby={errors.email ? 'email-error' : undefined} /><FieldError id="email-error" message={errors.email?.[0]} /></div>
      <div><label htmlFor="password" className="font-semibold">Wachtwoord</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required className={fieldClassName} aria-describedby="password-help password-error" /><p id="password-help" className="mt-2 text-sm text-text-secondary">Gebruik 15 tot 64 tekens. Een wachtzin met spaties mag.</p><FieldError id="password-error" message={errors.password?.[0]} /></div>
      <div><label htmlFor="passwordConfirmation" className="font-semibold">Wachtwoord bevestigen</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required className={fieldClassName} aria-describedby={errors.passwordConfirmation ? 'password-confirmation-error' : undefined} /><FieldError id="password-confirmation-error" message={errors.passwordConfirmation?.[0]} /></div>
      <div><label className="flex items-start gap-3"><input name="acceptedTerms" type="checkbox" className="mt-1 size-5" required /><span>Ik ga akkoord met de tijdelijke <Link className="underline" href="/privacy">privacy-informatie</Link> en <Link className="underline" href="/algemene-voorwaarden">algemene voorwaarden</Link>. Deze juridische pagina’s worden nog definitief opgesteld.</span></label><FieldError id="accepted-terms-error" message={errors.acceptedTerms?.[0]} /></div>
      <Button type="submit" loading={loading} className="w-full">Account registreren</Button>
      <p className="text-center text-sm text-text-secondary">Al een account? <Link className="font-semibold text-brand-primary-hover underline" href="/inloggen">Inloggen</Link></p>
    </form>
  )
}
