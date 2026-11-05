 'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { submitWithdrawal } from '@/app/academy/herroepen/actions'
import { WITHDRAWAL_DECLARATION_VERSION, withdrawalDeclaration } from '@/lib/learning/academy-withdrawal-policy'
export function AcademyWithdrawalForm({ requestKey }: { requestKey: string }) {
  const [step, setStep] = useState(1), [email, setEmail] = useState(''), [reference, setReference] = useState('')
  const [state, action, pending] = useActionState(submitWithdrawal, {})
  const heading = useRef<HTMLHeadingElement>(null), result = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus()
    previousStep.current = step
  }, [step])
  useEffect(() => { if (state.reference || state.error) result.current?.focus() }, [state])
  if (state.reference) return <div ref={result} tabIndex={-1} role="status" className="space-y-3 break-words"><h2 className="text-xl font-bold">Verklaring ontvangen</h2><p>Referentie: {state.reference}</p><p>Ontvangen op: {state.receivedAt}</p><p>Bewaar deze ontvangstgegevens. De ontvangstbevestiging wordt aangeboden aan het door u opgegeven e-mailadres. De aankoop en uw verzoek worden afzonderlijk beoordeeld.</p><Button onClick={() => window.print()}>Ontvangstgegevens afdrukken of bewaren</Button></div>
  return <form action={step === 2 ? action : undefined} onSubmit={step === 1 ? e => { e.preventDefault(); setStep(2) } : undefined} className="space-y-5">
    <h2 ref={heading} tabIndex={-1} className="text-xl font-bold">Stap {step} van 2 — {step === 1 ? 'Uw aankoop identificeren' : 'Uw verklaring bevestigen'}</h2>
    <input type="hidden" name="requestKey" value={requestKey}/><input type="hidden" name="declarationVersion" value={WITHDRAWAL_DECLARATION_VERSION}/>
    <label className="block">Aankoopreferentie<input className="mt-1 min-h-11 w-full rounded border p-3" name="orderReference" required minLength={6} maxLength={120} value={reference} onChange={e => setReference(e.target.value)} readOnly={step === 2}/></label>
    <label className="block">E-mailadres voor ontvangstbevestiging<input className="mt-1 min-h-11 w-full rounded border p-3" name="email" type="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} readOnly={step === 2}/></label>
    {step === 2 && <><label className="flex min-h-11 items-start gap-3"><input type="checkbox" name="confirmed" value="yes" required className="mt-1 size-5"/><span>{withdrawalDeclaration}</span></label><Button type="button" onClick={() => setStep(1)} variant="secondary">Gegevens wijzigen</Button></>}
    <Button type="submit" loading={pending}>{step === 1 ? 'Verklaring controleren' : 'Herroeping bevestigen'}</Button>
    {state.error && <div ref={result} tabIndex={-1} role="alert">{state.error}</div>}
  </form>
}
