'use client'

import { useEffect, useRef, useState } from 'react'
import { f4Price, formatF4Cents } from '@/lib/compliance/compliance-f4-pricing'
import { Button } from '@/components/ui/button'
import { ComplianceV2ReportView } from '@/components/arbo-guides/compliance-v2-report-view'
import type { ComplianceV2Definition, ComplianceV2Report } from '@/lib/compliance/compliance-v2'
import { resolveComplianceQuestions } from '@/lib/compliance/compliance-question-visibility'

type Draft = { id: string; idempotencyKey: string; revision: number; startedAt: string; answers: Record<string, string>; updatedAt: string }

export function ComplianceExpandedGuide({ definition }: { definition: ComplianceV2Definition }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0), [pending, setPending] = useState(false), [error, setError] = useState('')
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [notice, setNotice] = useState('')
  const [savedRunId, setSavedRunId] = useState<string | null>(null)
  const draft = useRef<{ revision: number; startedAt: string } | null>(null)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)
  const [report, setReport] = useState<ComplianceV2Report | null>(null)
  const transaction = useRef<{ idempotencyKey: string; startedAt: string; completedAt?: string } | null>(null)
  const inFlight = useRef(false), heading = useRef<HTMLHeadingElement>(null), errorRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let active = true
    fetch('/wijzers/compliance/v2/drafts', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(); return r.json() }).then(data => { if (active) setDrafts(data.drafts) }).catch(() => { if (active) setError('Eerder opgeslagen concepten konden niet worden geladen. Probeer de pagina opnieuw te openen.') })
    return () => { active = false }
  }, [])
  useEffect(() => {
    dirtyRef.current = dirty
    const warn = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = '' } }
    const beforeLogout = (event: Event) => { if (dirtyRef.current && !window.confirm('Uw laatste antwoorden zijn nog niet opgeslagen. Toch uitloggen? Het eerder opgeslagen concept blijft behouden.')) event.preventDefault() }
    const signedOut = () => { dirtyRef.current = false; setDirty(false); setAnswers({}); setDrafts([]); setReport(null); draft.current = null; transaction.current = null }
    window.addEventListener('workmatchr:before-sign-out', beforeLogout)
    window.addEventListener('workmatchr:signed-out', signedOut)
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn); window.removeEventListener('workmatchr:before-sign-out', beforeLogout); window.removeEventListener('workmatchr:signed-out', signedOut) }
  }, [dirty])
  const all = definition.modules.flatMap(m => m.questions)
  const resolved = resolveComplianceQuestions(all, answers)
  const currentModule = definition.modules[step]
  const questions = currentModule.questions.filter(q => resolved.visibleCodes.includes(q.code))
  useEffect(() => { heading.current?.focus() }, [step, report])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  function update(code: string, value: string) {
    setAnswers(a => ({ ...a, [code]: value })); setError('')
    setDirty(true); setNotice('')
    if (transaction.current) delete transaction.current.completedAt
  }
  async function persist() {
    transaction.current ??= { idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString() }
    const response = await fetch('/wijzers/compliance/v2/drafts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: transaction.current.idempotencyKey, revision: draft.current?.revision ?? null, answers }) })
    const data = await response.json()
    if (response.status === 409) throw new Error('Dit concept is in een ander tabblad gewijzigd. Uw huidige antwoorden blijven hier staan. Herlaad pas nadat u deze hebt veiliggesteld.')
    if (!response.ok || !data.draft) throw new Error('Uw concept kon niet worden opgeslagen. Uw invoer blijft op deze pagina behouden.')
    draft.current = data.draft
    transaction.current.startedAt = data.draft.startedAt
    setDirty(false); setNotice('Uw concept is opgeslagen in uw organisatieomgeving. U kunt later hervatten.')
  }
  async function save() {
    if (inFlight.current) return
    inFlight.current = true; setPending(true); setError('')
    try { await persist() } catch (error) { setError(error instanceof Error ? error.message : 'Opslaan is niet gelukt.') }
    finally { inFlight.current = false; setPending(false) }
  }
  function resume(saved: Draft) {
    if (dirty && !window.confirm('Uw niet-opgeslagen antwoorden vervangen door dit concept?')) return
    draft.current = saved; transaction.current = { idempotencyKey: saved.idempotencyKey, startedAt: saved.startedAt }
    setAnswers(saved.answers); setStep(0); setDirty(false); setError(''); setNotice('Uw opgeslagen concept is hervat.'); setDrafts([])
  }
  async function complete() {
    if (inFlight.current) return
    inFlight.current = true; setPending(true); setError('')
    try {
      if (!transaction.current?.completedAt) await persist()
      transaction.current!.completedAt ??= new Date().toISOString()
      const response = await fetch('/wijzers/compliance/v2/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...transaction.current, answers, draftRevision: draft.current?.revision }) })
      const result = await response.json()
      if (response.status === 409 && result.code === 'EXPIRED_COMPLETION') {
        // The server checked under its idempotency lock that no completed replay
        // exists. Only this definitive response permits a fresh submission.
        if (transaction.current) delete transaction.current.completedAt
        setError('De verzendtermijn is verlopen. Uw antwoorden blijven behouden. Kies opnieuw Beoordeling afronden en opslaan.')
        return
      }
      if (response.status === 402) { if (transaction.current) delete transaction.current.completedAt; setError('Voor deze scan is nog geen betaalde toegang bevestigd. Uw concept is opgeslagen. De betaalfunctie is nog niet vrijgegeven.'); return }
      if (!response.ok || !result.saved) throw new Error('Opslag mislukt.')
      setSavedRunId(result.runId); setReport(result.report)
    } catch (error) { setError(error instanceof Error ? error.message : 'Opslaan is niet gelukt. Uw antwoorden blijven behouden.') }
    finally { inFlight.current = false; setPending(false) }
  }
  async function download() {
    if (!savedRunId || pending) return
    setPending(true); setError('')
    try {
      const response = await fetch('/wijzers/compliance/pdf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ runId: savedRunId }) })
      if (!response.ok) throw new Error()
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = 'workmatchr-compliance.pdf'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch { setError('Het rapport kon niet worden gedownload. Probeer het opnieuw.') }
    finally { setPending(false) }
  }
  if (report) return <section><h2 ref={heading} tabIndex={-1} className="mb-6 text-2xl font-bold text-brand-dark">Uw resultaat</h2><Button disabled={pending} onClick={download}>Download rapport (PDF)</Button>{error && <p role="alert">{error}</p>}<ComplianceV2ReportView report={report} /></section>
  return <section className="mx-auto max-w-3xl space-y-6">
    <p className="text-text-secondary">Uw antwoorden zijn zelfverklaringen. Dit is geen certificaat of volledige juridische toets. Kies Concept opslaan om later verder te gaan. Alleen u kunt dit concept hervatten zolang u bevoegd bent binnen uw organisatie. Zonder opslaan blijft uw nieuwe invoer alleen op deze pagina.</p>
    <section aria-label="Prijs uitgebreide scan" className="rounded-card border border-border p-4">
      <h2 className="font-semibold text-brand-dark">Eerste scan: {formatF4Cents(f4Price('FIRST_SCAN').amountExclVatCents)} excl. btw</h2>
      <p>21% btw: {formatF4Cents(f4Price('FIRST_SCAN').vatAmountCents)}. Totaal: {formatF4Cents(f4Price('FIRST_SCAN').amountInclVatCents)} incl. btw.</p>
      <p>Opvolgscan: {formatF4Cents(f4Price('FOLLOW_UP_SCAN').amountExclVatCents)} excl. btw; de voorwaarden voor dit tarief worden nog vastgesteld. Geen automatische Pro-vrijstelling.</p>
      <p className="mt-2 text-sm">De betaalfunctie is nog niet vrijgegeven. U kunt uw concept voorbereiden en bewaren.</p>
    </section>
    {drafts.length > 0 && <section aria-label="Opgeslagen concepten" className="space-y-3 rounded-card border border-border p-4"><h2 className="font-semibold">Nog invullen</h2>{drafts.map(saved => <Button key={saved.id} variant="outline" disabled={pending} onClick={() => resume(saved)}>Hervat concept van {new Date(saved.updatedAt).toLocaleString('nl-NL')}</Button>)}</section>}
    {notice && <p role="status">{notice}</p>}
    <Button variant="outline" disabled={pending} onClick={save}>Concept opslaan</Button>
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
