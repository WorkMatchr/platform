'use client'

import Link from 'next/link'
import { useState, useRef, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { GENERIC_SIGN_IN_ERROR, signInSchema } from '@/lib/auth-validation'
import { runAuthClientRequest } from '@/lib/auth-form-request'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export function LoginForm({ returnTo, accessDenied }: { returnTo?: string; accessDenied?: boolean }) {
  const [loading, updateLoading] = useState(false)
  const active = useRef(false)
  const setLoading = (value: boolean) => { active.current = value; updateLoading(value) }
  const [message, setMessage] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (active.current) return
    setMessage(undefined)
    const result = signInSchema.safeParse({ ...Object.fromEntries(new FormData(event.currentTarget)), returnTo })
    if (!result.success) return setMessage(GENERIC_SIGN_IN_ERROR)
    setLoading(true)
    const response = await runAuthClientRequest(() => authClient.signIn.email({ email: result.data.email, password: result.data.password, rememberMe: result.data.rememberMe }))
    setLoading(false)
    if (response !== 'accepted') return setMessage(response === 'rate_limited' ? 'U hebt te veel pogingen gedaan. Probeer het later opnieuw.' : GENERIC_SIGN_IN_ERROR)
    const destination = getSafeReturnUrl(result.data.returnTo, '/dashboard')
    window.location.assign(destination)
  }

  return <form onSubmit={submit} noValidate className="space-y-5">
    {accessDenied && <StatusMessage error>Uw account heeft geen toegang. Neem contact op met WorkMatchr wanneer u denkt dat dit onjuist is.</StatusMessage>}
    {message && <StatusMessage error>{message}</StatusMessage>}
    <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} /></div>
    <div><label htmlFor="password" className="font-semibold">Wachtwoord</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required className={fieldClassName} /></div>
    <div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control focus-within:ring-2 focus-within:ring-brand-primary">
        <input type="checkbox" name="rememberMe" aria-describedby="remember-me-help" />
        <span className="font-semibold">Ingelogd blijven</span>
      </label>
      <p id="remember-me-help" className="mt-1 text-sm text-text-secondary">Gebruik dit alleen op uw eigen apparaat. Uw sessie blijft 7 dagen geldig en kan bij gebruik worden verlengd. Zonder vinkje is uw sessie maximaal 24 uur geldig. Log uit op een gedeeld apparaat.</p>
    </div>
    <div className="flex justify-end"><Link className="text-sm font-semibold text-brand-primary-hover underline" href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link></div>
    <Button type="submit" loading={loading} className="w-full">Inloggen</Button>
    <p className="text-center text-sm text-text-secondary">Nog geen account? <Link className="font-semibold text-brand-primary-hover underline" href="/registreren">Registreren</Link></p>
  </form>
}
