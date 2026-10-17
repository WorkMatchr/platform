'use client'

import Link from 'next/link'
import { useId, useRef, useState } from 'react'
import { Button, buttonBaseStyles, buttonVariantStyles, type ButtonVariant } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { clearComplianceDraft, COMPLIANCE_SCAN_PATH, hasComplianceDraft } from '@/lib/compliance/free-intake-storage'

type LogoutButtonProps = { className?: string; variant?: ButtonVariant }

export function LogoutButton({ className = '', variant = 'outline' }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const active = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  async function logout() {
    if (active.current) return
    active.current = true; setLoading(true); setError('')
    const removed = clearComplianceDraft()
    try {
      const response = await authClient.signOut()
      if (response?.error || !response?.data?.success) throw new Error('SIGN_OUT_FAILED')
      if (!removed) {
        setError('De sessie is beëindigd, maar de browser kon de lokale conceptopslag niet verwijderen. Wis deze via uw browserinstellingen op dit apparaat.')
        return
      }
      window.location.assign('/')
    } catch {
      setError('Uitloggen is niet gelukt. Probeer het opnieuw. Het wissen van uw lokale Compliance-concept is al uitgevoerd of geprobeerd.')
    } finally { active.current = false; setLoading(false) }
  }

  async function requestLogout() {
    if (active.current) return
    active.current = true; setLoading(true); setError('')
    const hasDraft = await hasComplianceDraft()
    active.current = false; setLoading(false)
    if (hasDraft) { setConfirming(true); dialog.current?.showModal() }
    else await logout()
  }

  return <>
    <Button className={className} variant={variant} loading={loading} onClick={event => { trigger.current = event.currentTarget; void requestLogout() }}>Uitloggen</Button>
    {error && !confirming && <p role="alert" className="max-w-sm text-sm text-error">{error}</p>}
    <dialog ref={dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onCancel={event => { if (loading) event.preventDefault() }} onClose={() => { setConfirming(false); trigger.current?.focus() }}
      className="w-[min(92vw,32rem)] rounded-card border border-border bg-surface p-6 text-text-primary shadow-card backdrop:bg-brand-dark/55">
      <h2 id={`${id}-title`} className="text-xl font-bold text-brand-dark">Uitloggen verwijdert uw lokale Compliance-concept</h2>
      <p id={`${id}-description`} className="mt-3 text-text-secondary">Uw onafgemaakte concept op dit apparaat wordt verwijderd, ook in andere geopende tabbladen. Opgeslagen serverdossiers en andere browsergegevens blijven behouden. Ga terug als u uw intake eerst wilt afronden.</p>
      {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={COMPLIANCE_SCAN_PATH} aria-disabled={loading || undefined}
          onClick={event => { if (loading) event.preventDefault(); else dialog.current?.close() }}
          className={`${buttonBaseStyles} ${buttonVariantStyles.outline}`}>Terug naar mijn concept</Link>
        <Button loading={loading} onClick={logout}>Uitloggen en concept verwijderen</Button>
      </div>
    </dialog>
  </>
}
