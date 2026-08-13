'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { runNewPasswordRequest } from '@/lib/auth-form-request'
import { GENERIC_AUTH_REQUEST_ERROR, resetPasswordSchema } from '@/lib/auth-validation'
import { PASSWORD_CHECK_UNAVAILABLE_MESSAGE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_REJECTED_MESSAGE } from '@/lib/password-policy'

export function ResetPasswordForm({ token }: { token?: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    const result = resetPasswordSchema.safeParse({ ...Object.fromEntries(new FormData(event.currentTarget)), token })
    if (!result.success) { setErrors(result.error.flatten().fieldErrors); return }
    setErrors({}); setLoading(true)
    const requestResult = await runNewPasswordRequest(
      () => authClient.resetPassword({ newPassword: result.data.password, token: result.data.token }),
    )
    setLoading(false)
    if (requestResult === 'password_rejected') return setMessage(PASSWORD_REJECTED_MESSAGE)
    if (requestResult === 'password_check_unavailable') return setMessage(PASSWORD_CHECK_UNAVAILABLE_MESSAGE)
    if (requestResult !== 'accepted') return setMessage(GENERIC_AUTH_REQUEST_ERROR)
    window.location.assign('/inloggen?wachtwoord=hersteld')
  }

  if (!token) return <StatusMessage error>De herstellink is ongeldig of onvolledig. Vraag een nieuwe link aan.</StatusMessage>
  return <form onSubmit={submit} noValidate className="space-y-5">
    {message && <StatusMessage error>{message}</StatusMessage>}
    <div><label htmlFor="password" className="font-semibold">Nieuw wachtwoord</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required className={fieldClassName} /><FieldError id="password-error" message={errors.password?.[0]} /></div>
    <div><label htmlFor="passwordConfirmation" className="font-semibold">Nieuw wachtwoord bevestigen</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required className={fieldClassName} /><FieldError id="confirmation-error" message={errors.passwordConfirmation?.[0]} /></div>
    <Button type="submit" loading={loading} className="w-full">Wachtwoord instellen</Button>
  </form>
}
