'use client'

import QRCode from 'qrcode'
import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { authClient } from '@/lib/auth-client'

type Enrollment = { uri: string; recoveryCodes: string[] }

export function TwoFactorSecurityPanel({
  enabled,
  platformRequired,
}: {
  enabled: boolean
  platformRequired: boolean
}) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>()
  const [error, setError] = useState<string>()

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    if (!password) return setError('Vul uw wachtwoord in om tweestapsverificatie in te stellen.')
    setLoading(true)
    const result = await authClient.twoFactor.enable({ password, issuer: 'WorkMatchr' })
    setLoading(false)
    if (result.error || !result.data) return setError('Tweestapsverificatie kon niet worden voorbereid. Controleer uw wachtwoord en probeer het opnieuw.')
    const uri = result.data.totpURI
    setEnrollment({ uri, recoveryCodes: result.data.backupCodes })
    setQrDataUrl(await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', margin: 1, width: 240 }))
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    const code = String(new FormData(event.currentTarget).get('code') ?? '').replace(/\s/g, '')
    if (!/^\d{6,8}$/.test(code)) return setError('Vul de code uit uw authenticator-app in.')
    setLoading(true)
    const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false })
    if (result.error) {
      setLoading(false)
      return setError('De code klopt niet of is verlopen. Controleer de tijd in uw authenticator-app en probeer opnieuw.')
    }
    setLoading(false)
    setMessage('Tweestapsverificatie is ingeschakeld. Bewaar uw herstelcodes veilig; ze worden hierna niet opnieuw getoond.')
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    if (!password) return setError('Vul uw wachtwoord in om tweestapsverificatie uit te schakelen.')
    setLoading(true)
    const result = await authClient.twoFactor.disable({ password })
    setLoading(false)
    if (result.error) return setError('Tweestapsverificatie kon niet worden uitgeschakeld. Controleer uw wachtwoord en probeer het opnieuw.')
    window.location.reload()
  }

  if (enabled) {
    return (
      <section aria-labelledby="two-factor-status" className="space-y-5">
        <StatusMessage>Tweestapsverificatie is ingeschakeld.</StatusMessage>
        {platformRequired ? (
          <p className="text-sm leading-6 text-text-secondary">Tweestapsverificatie is vereist zolang dit account toegang heeft tot platformbeheer.</p>
        ) : (
          <form onSubmit={disable} className="space-y-4">
            <div>
              <label htmlFor="disable-password" className="font-semibold">Wachtwoord ter bevestiging</label>
              <input id="disable-password" name="password" type="password" autoComplete="current-password" className={fieldClassName} required />
            </div>
            <Button type="submit" variant="outline" loading={loading} loadingLabel="Uitschakelen…">Tweestapsverificatie uitschakelen</Button>
          </form>
        )}
        {error ? <StatusMessage error>{error}</StatusMessage> : null}
      </section>
    )
  }

  if (message) return <StatusMessage>{message}</StatusMessage>

  if (enrollment) {
    return (
      <section aria-labelledby="two-factor-verify" className="space-y-5">
        <p className="text-sm leading-6 text-text-secondary">Scan deze QR-code met uw authenticator-app. De instellingscode wordt alleen in deze browser gebruikt.</p>
        {qrDataUrl ? <Image src={qrDataUrl} width={240} height={240} unoptimized alt="QR-code voor tweestapsverificatie in uw authenticator-app" className="rounded-control border border-border bg-white p-2" /> : null}
        <div className="rounded-control border border-warning/40 bg-warning/10 p-4 text-sm text-text-primary">
          <p className="font-semibold">Bewaar deze herstelcodes nu veilig.</p>
          <p className="mt-1">Ze worden na bevestiging niet opnieuw getoond. Deel ze met niemand.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm" aria-label="Eenmalige herstelcodes">
            {enrollment.recoveryCodes.map((code) => <li key={code}>{code}</li>)}
          </ul>
        </div>
        <form onSubmit={verify} className="space-y-4">
          <div>
            <label htmlFor="totp-code" className="font-semibold">Code uit uw authenticator-app</label>
            <input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className={fieldClassName} required autoFocus />
          </div>
          <Button type="submit" loading={loading} loadingLabel="Controleren…">Code bevestigen</Button>
        </form>
        {error ? <FieldError id="two-factor-error" message={error} /> : null}
      </section>
    )
  }

  return (
    <form onSubmit={enable} className="space-y-4">
      <p className="text-sm leading-6 text-text-secondary">Gebruik een authenticator-app om uw account extra te beveiligen.</p>
      <div>
        <label htmlFor="enable-password" className="font-semibold">Wachtwoord ter bevestiging</label>
        <input id="enable-password" name="password" type="password" autoComplete="current-password" className={fieldClassName} required />
      </div>
      <Button type="submit" loading={loading} loadingLabel="Voorbereiden…">Tweestapsverificatie instellen</Button>
      {error ? <StatusMessage error>{error}</StatusMessage> : null}
    </form>
  )
}
