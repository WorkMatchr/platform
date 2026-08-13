'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { runAuthClientRequest, runNewPasswordRequest } from '@/lib/auth-form-request'
import { resetPasswordSchema } from '@/lib/auth-validation'
import { PASSWORD_CHECK_UNAVAILABLE_MESSAGE, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_REJECTED_MESSAGE } from '@/lib/password-policy'

const ACTIVATION_ERROR =
  'Uw account kon niet worden geactiveerd. De link is mogelijk verlopen. Vraag uw organisatie om de uitnodiging opnieuw te verzenden.'

export function ActivateAccountForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(undefined)
    const result = resetPasswordSchema.safeParse({
      ...Object.fromEntries(new FormData(event.currentTarget)),
      token,
    })
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors)
      return
    }

    setErrors({})
    setLoading(true)
    const activationResult = await runNewPasswordRequest(() => authClient.resetPassword({
      newPassword: result.data.password,
      token: result.data.token,
    }))
    if (activationResult === 'password_rejected') {
      setLoading(false)
      setMessage(PASSWORD_REJECTED_MESSAGE)
      return
    }
    if (activationResult === 'password_check_unavailable') {
      setLoading(false)
      setMessage(PASSWORD_CHECK_UNAVAILABLE_MESSAGE)
      return
    }
    if (activationResult !== 'accepted') {
      setLoading(false)
      setMessage(ACTIVATION_ERROR)
      return
    }

    const signInResult = await runAuthClientRequest(() => authClient.signIn.email({
      email,
      password: result.data.password,
      rememberMe: true,
    }))
    setLoading(false)
    if (signInResult !== 'accepted') {
      setMessage('Uw account is geactiveerd. Log in om verder te gaan.')
      return
    }
    window.location.assign('/dashboard')
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {message && <StatusMessage error>{message}</StatusMessage>}
      <div>
        <label htmlFor="password" className="font-semibold">Wachtwoord</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          autoFocus
          className={fieldClassName}
          aria-invalid={Boolean(errors.password?.[0])}
          aria-describedby={errors.password?.[0] ? 'password-error' : undefined}
        />
        <FieldError id="password-error" message={errors.password?.[0]} />
      </div>
      <div>
        <label htmlFor="passwordConfirmation" className="font-semibold">Wachtwoord bevestigen</label>
        <input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          required
          className={fieldClassName}
          aria-invalid={Boolean(errors.passwordConfirmation?.[0])}
          aria-describedby={errors.passwordConfirmation?.[0] ? 'password-confirmation-error' : undefined}
        />
        <FieldError id="password-confirmation-error" message={errors.passwordConfirmation?.[0]} />
      </div>
      <Button type="submit" loading={loading} className="w-full">Account activeren</Button>
    </form>
  )
}
