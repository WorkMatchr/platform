'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export function TwoFactorChallengeForm({ returnTo }: { returnTo?: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').replace(/\s/g, '')
    if (!code || (!useRecoveryCode && !/^\d{6,8}$/.test(code))) {
      return setMessage(useRecoveryCode ? 'Vul een herstelcode in.' : 'Vul de code uit uw authenticator-app in.')
    }

    setLoading(true)
    const result = useRecoveryCode
      ? await authClient.twoFactor.verifyBackupCode({ code, trustDevice: false })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
    setLoading(false)
    if (result.error) return setMessage('De ingevoerde code klopt niet of is verlopen. Probeer het opnieuw.')
    window.location.assign(getSafeReturnUrl(returnTo, '/dashboard'))
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="challenge-code" className="font-semibold">{useRecoveryCode ? 'Herstelcode' : 'Code'}</label>
        <input id="challenge-code" name="code" inputMode="numeric" autoComplete={useRecoveryCode ? 'off' : 'one-time-code'} maxLength={32} required autoFocus className={fieldClassName} />
      </div>
      {message ? <StatusMessage error>{message}</StatusMessage> : null}
      <Button type="submit" className="w-full" loading={loading} loadingLabel="Controleren…">Veilig inloggen</Button>
      <button type="button" className="text-sm font-semibold text-brand-primary hover:underline" onClick={() => { setUseRecoveryCode((value) => !value); setMessage(undefined) }}>
        {useRecoveryCode ? 'Gebruik authenticator-app' : 'Gebruik herstelcode'}
      </button>
    </form>
  )
}
