'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { GENERIC_SIGN_IN_ERROR, signInSchema } from '@/lib/auth-validation'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export function LoginForm({ returnTo, accessDenied }: { returnTo?: string; accessDenied?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    const result = signInSchema.safeParse({ ...Object.fromEntries(new FormData(event.currentTarget)), returnTo })
    if (!result.success) return setMessage(GENERIC_SIGN_IN_ERROR)
    setLoading(true)
    const response = await authClient.signIn.email({ email: result.data.email, password: result.data.password, rememberMe: true })
    setLoading(false)
    if (response.error) return setMessage(response.error.status === 429 ? 'U hebt te veel pogingen gedaan. Probeer het later opnieuw.' : GENERIC_SIGN_IN_ERROR)
    window.location.assign(getSafeReturnUrl(result.data.returnTo))
  }

  return <form onSubmit={submit} noValidate className="space-y-5">
    {accessDenied && <StatusMessage error>Uw account heeft geen toegang. Neem contact op met WorkMatchr wanneer U denkt dat dit onjuist is.</StatusMessage>}
    {message && <StatusMessage error>{message}</StatusMessage>}
    <div><label htmlFor="email" className="font-semibold">E-mailadres</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} required className={fieldClassName} /></div>
    <div><label htmlFor="password" className="font-semibold">Wachtwoord</label><input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required className={fieldClassName} /></div>
    <div className="flex justify-end"><Link className="text-sm font-semibold text-brand-primary-hover underline" href="/wachtwoord-vergeten">Wachtwoord vergeten?</Link></div>
    <Button type="submit" loading={loading} className="w-full">Inloggen</Button>
    <p className="text-center text-sm text-text-secondary">Nog geen account? <Link className="font-semibold text-brand-primary-hover underline" href="/registreren">Registreren</Link></p>
  </form>
}
