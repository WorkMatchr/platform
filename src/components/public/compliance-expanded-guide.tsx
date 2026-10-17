'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ComplianceV2ReportView } from '@/components/arbo-guides/compliance-v2-report-view'
import type { ComplianceV2Definition, ComplianceV2Report } from '@/lib/compliance/compliance-v2'
import { resolveComplianceQuestions } from '@/lib/compliance/compliance-question-visibility'

export function ComplianceExpandedGuide({ definition }: { definition: ComplianceV2Definition }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0), [pending, setPending] = useState(false), [error, setError] = useState('')
  const [report, setReport] = useState<ComplianceV2Report | null>(null)
  const transaction = useRef<{ idempotencyKey: string; startedAt: string; completedAt?: string } | null>(null)
  const inFlight = useRef(false), heading = useRef<HTMLHeadingElement>(null), errorRef = useRef<HTMLParagraphElement>(null)
  const all = definition.modules.flatMap(m => m.questions)
  const resolved = resolveComplianceQuestions(all, answers)
  const currentModule = definition.modules[step]
  const questions = currentModule.questions.filter(q => resolved.visibleCodes.includes(q.code))
  useEffect(() => { heading.current?.focus() }, [step, report])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  function update(code: string, value: string) {
    setAnswers(a => ({ ...a, [code]: value })); setError('')
    transaction.current = null // A changed assessment is never an idempotency replay.
  }
  async function complete() {
    if (inFlight.current) return
    inFlight.current = true; setPending(true); setError('')
    transaction.current ??= { idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString() }
    transaction.current.completedAt ??= new Date().toISOString()
    try {
      const response = await fetch('/wijzers/compliance/v2/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...transaction.current, answers }) })
      const result = await response.json()
      if (!response.ok || !result.saved) throw new Error('Opslag mislukt.')
      setReport(result.report)
    } catch { setError('Opslaan is niet gelukt. Uw antwoorden blijven behouden. Probeer het opnieuw.') }
    finally { inFlight.current = false; setPending(false) }
  }
  if (report) return <section><h2 ref={heading} tabIndex={-1} className="mb-6 text-2xl font-bold text-brand-dark">Uw resultaat</h2><ComplianceV2ReportView report={report} /></section>
  return <section className="mx-auto max-w-3xl space-y-6">
    <p className="text-text-secondary">Uw antwoorden zijn zelfverklaringen. Dit is geen certificaat of volledige juridische toets. Antwoorden blijven tijdens deze sessie op deze pagina; er wordt geen lokaal concept opgeslagen.</p>
    <p aria-live="polite" className="font-semibold text-brand-dark">Onderwerp {step + 1} van {definition.modules.length} · {resolved.answered} van {resolved.total} zichtbare vragen beantwoord</p>
    <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold text-brand-dark">{currentModule.title}</h2>
    {questions.length === 0 && <p>Op basis van uw eerdere antwoord zijn hier geen vervolgvragen. Dit is geen vrijstelling; de toepasselijkheid blijft in het resultaat open.</p>}
    {questions.map(q => <fieldset key={q.code} className="min-w-0 space-y-3 rounded-card border border-border bg-surface p-5" aria-describedby={`${q.code}-help`} disabled={pending}>
      <legend className="max-w-full px-1 font-semibold text-brand-dark">{q.prompt}</legend>
      <p id={`${q.code}-help`} className="text-sm text-text-secondary">{q.helpText}</p>
      <div className="grid gap-2">{q.options.map(o => <label key={o.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border p-3 focus-within:ring-2 focus-within:ring-brand-primary">
        <input className="mt-1 accent-brand-primary" type="radio" name={q.code} value={o.value} checked={answers[q.code] === o.value} onChange={() => update(q.code, o.value)} />
        <span>{o.label}</span>
      </label>)}</div>
    </fieldset>)}
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="text-error">{error}</p>}
    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="outline" disabled={step === 0 || pending} onClick={() => setStep(s => s - 1)}>Vorige</Button>
      {step < definition.modules.length - 1 ? <Button onClick={() => setStep(s => s + 1)}>Volgende</Button> : <Button loading={pending} loadingLabel="Resultaat opslaan…" disabled={pending} onClick={complete}>Beoordeling afronden en opslaan</Button>}
    </div>
  </section>
}
