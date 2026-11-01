'use client'

import Link from 'next/link'
import { useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
import { contactSchema, contactSubjects, type ContactResult } from '@/lib/contact/contact-contract'

export function ContactForm({ enabled }: { enabled: boolean }) {
  const active = useRef(false)
  const requestId = useRef<string | null>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ContactResult | null>(null)
  const status = useRef<HTMLParagraphElement>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!enabled || active.current || result?.ok) return
    const form = event.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), requestId: requestId.current ?? crypto.randomUUID() }
    const parsed = contactSchema.safeParse(payload)
    if (!parsed.success) {
      const errors: ContactResult['errors'] = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if (key === 'name' || key === 'email' || key === 'subject' || key === 'message') errors[key] ??= issue.message
      }
      setResult({ ok: false, message: 'Controleer de gemarkeerde velden. Uw invoer blijft staan.', errors })
      const first = Object.keys(errors)[0]
      if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus()
      return
    }
    active.current = true
    setPending(true)
    setResult(null)
    try {
      if (!requestId.current) {
        const admission = await fetch('/api/contact/request', { method: 'POST' })
        const body = await admission.json() as { requestId?: unknown }
        if (!admission.ok || typeof body.requestId !== 'string' || !contactSchema.shape.requestId.safeParse(body.requestId).success) throw new Error('CONTACT_REQUEST_UNAVAILABLE')
        requestId.current = body.requestId
      }
      // Never replace this identity after POST, even on expiry or lost response.
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...parsed.data, requestId: requestId.current }) })
      const body = await response.json() as ContactResult
      const safeResult = body && typeof body.message === 'string' ? { ...body, ok: response.ok && body.ok === true } : { ok: false, message: 'Versturen is niet gelukt. Uw invoer blijft staan. Probeer het later opnieuw.' }
      setResult(safeResult)
    } catch { setResult({ ok: false, message: 'Er is geen bevestiging ontvangen. Uw invoer blijft staan. Controleer uw verbinding en probeer opnieuw.' }) }
    finally { active.current = false; setPending(false); requestAnimationFrame(() => status.current?.focus()) }
  }
  return <section aria-labelledby="contact-form-title" className="rounded-card border border-border bg-surface p-5 sm:p-6">
    <h2 id="contact-form-title" className="text-2xl font-bold text-brand-dark">Stel een algemene vraag</h2>
    <p id="contact-privacy" className="mt-3 text-text-secondary">We gebruiken uw naam, e-mailadres en bericht om uw vraag te beantwoorden. Noem geen namen van anderen, medische gegevens of andere gevoelige persoonsgegevens. Uw bericht wordt tijdelijk versleuteld bewaard om het aan onze mailbox door te geven. Lees onze <Link href="/privacy" className="font-semibold text-brand-primary-hover underline">privacy-informatie</Link>.</p>
    {!enabled && <p className="mt-3" role="status">Het formulier is nog niet beschikbaar. Mail uw vraag naar contact@workmatchr.nl.</p>}
    <form onSubmit={submit} noValidate aria-describedby="contact-privacy" className="mt-5 max-w-2xl space-y-5">
      {result && <p ref={status} tabIndex={-1} role={result.ok ? 'status' : 'alert'} className="rounded-control border border-border p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary">{result.message}</p>}
      <div><label htmlFor="contact-name" className="font-semibold">Naam</label><input id="contact-name" name="name" autoComplete="name" required maxLength={100} className={fieldClassName} aria-invalid={Boolean(result?.errors?.name)} aria-describedby={result?.errors?.name ? 'contact-name-error' : undefined} />{result?.errors?.name && <p id="contact-name-error">{result.errors.name}</p>}</div>
      <div><label htmlFor="contact-email" className="font-semibold">E-mailadres</label><input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={254} className={fieldClassName} aria-invalid={Boolean(result?.errors?.email)} aria-describedby={result?.errors?.email ? 'contact-email-error' : undefined} />{result?.errors?.email && <p id="contact-email-error">{result.errors.email}</p>}</div>
      <div><label htmlFor="contact-subject" className="font-semibold">Onderwerp</label><select id="contact-subject" name="subject" required defaultValue="" className={fieldClassName} aria-invalid={Boolean(result?.errors?.subject)} aria-describedby={result?.errors?.subject ? 'contact-subject-error' : undefined}><option value="" disabled>Kies een onderwerp</option>{Object.entries(contactSubjects).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{result?.errors?.subject && <p id="contact-subject-error">{result.errors.subject}</p>}</div>
      <div><label htmlFor="contact-message" className="font-semibold">Bericht</label><textarea id="contact-message" name="message" required minLength={10} maxLength={4000} rows={6} className={fieldClassName} aria-invalid={Boolean(result?.errors?.message)} aria-describedby={result?.errors?.message ? 'contact-message-error contact-privacy' : 'contact-privacy'} />{result?.errors?.message && <p id="contact-message-error">{result.errors.message}</p>}</div>
      <div hidden aria-hidden="true"><label htmlFor="contact-website">Website</label><input id="contact-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <p className="text-sm text-text-secondary">We gebruiken uw gegevens om uw bericht te behandelen. Deel geen gevoelige persoonsgegevens. Lees de <Link href="/privacy" className="font-semibold text-brand-primary-hover underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">privacyverklaring</Link>.</p>
      <Button type="submit" loading={pending} loadingLabel="Bericht versturen…" disabled={!enabled || result?.ok} className="w-full sm:w-auto">Verstuur bericht</Button>
    </form>
  </section>
}
