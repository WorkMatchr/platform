'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { publicRoutes } from '@/content/public-routes'
import { freeIntakeV2Questions, freeIntakeV2Error, employeeScopeConflict, toggleFreeIntakeV2, type IntakeAnswers } from '@/lib/compliance/free-intake-v2'
import { freeIntakeV2DisplayQuestions, presentFreeIntakeV2 } from '@/lib/compliance/free-intake-v2-presentation'

type Props = {
  answers: IntakeAnswers
  stepIndex: number
  onChange: (answers: IntakeAnswers, stepIndex: number) => void
  onFinish: () => void
  onRestart: () => void
}

export function ComplianceFreeIntakeV2({ answers, stepIndex, onChange, onFinish, onRestart }: Props) {
  const [result, setResult] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (!moved.current) return
    heading.current?.focus({ preventScroll: true })
    heading.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [stepIndex, result])
  const q = freeIntakeV2DisplayQuestions[stepIndex]
  const orientation = presentFreeIntakeV2(answers)
  const progress = Math.round((stepIndex + 1) / 5 * 100)
  function changeStep(next: number) { moved.current = true; setError(null); onChange(answers, next) }
  function answer(value: string | string[]) {
    setError(null)
    onChange({ ...answers, [q.code]: value }, stepIndex)
  }

  if (result) return <div className="space-y-6">
    <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6">
      <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 text-2xl font-bold text-brand-dark">Uw onderwerpen om verder te verkennen</h2>
      <p className="mt-3 text-text-secondary">Deze selectie helpt u een volgende stap te kiezen. Zij stelt geen verplichtingen, risico’s of tekortkomingen vast. Niet-herkende situaties zijn niet automatisch uitgesloten.</p>
    </section>
    <section aria-labelledby="orientation-topics" className="rounded-card border border-border bg-surface p-6">
      <h2 id="orientation-topics" className="text-xl font-bold text-brand-dark">Dit sluit aan op uw antwoorden</h2>
      <p className="mt-2 text-text-secondary">{orientation.shortlist.length
        ? 'Eerst uw informatiebehoefte, daarna herkende werksituaties en uw personeelskeuze. We tonen hier maximaal zes onderwerpen.'
        : 'Uw antwoorden geven nog onvoldoende richting voor een persoonlijke selectie. U kunt hieronder onderwerpen bekijken of verdergaan met de gratis Compliance-wijzer.'}</p>
      {orientation.shortlist.length > 0 && <ul role="list" className="mt-5 grid list-none gap-3 md:grid-cols-2">
        {orientation.shortlist.map(m => <li key={m.code} className="min-w-0 rounded-control border border-border p-4">
          <h3 className="font-semibold text-brand-dark">{m.title}</h3>
          <p className="mt-2 text-sm text-text-secondary">{m.explanation}</p>
        </li>)}
      </ul>}
    </section>
    <details className="rounded-card border border-border bg-surface p-5">
      <summary className="min-h-11 cursor-pointer rounded-control py-2 font-semibold text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">Overige mogelijk relevante onderwerpen ({orientation.remaining.length})</summary>
      <p className="mt-3 text-sm text-text-secondary">Deze onderwerpen zijn niet uitgesloten of inhoudelijk beoordeeld. Ook onderwerpen die niet in de eerste selectie passen, kunnen voor uw organisatie van belang zijn.</p>
      <ul role="list" className="mt-4 grid list-none gap-3 md:grid-cols-2">
        {orientation.remaining.map(m => <li key={m.code} className="min-w-0 border-t border-border pt-3">
          <h3 className="font-semibold text-brand-dark">{m.title}</h3>
          {m.priority > 0 && <p className="mt-1 text-sm text-text-secondary">{m.explanation}</p>}
        </li>)}
      </ul>
    </details>
    <section className="rounded-card border border-border bg-surface p-6">
      <h2 className="text-xl font-bold text-brand-dark">Verder met de gratis Compliance-wijzer</h2>
      <p className="mt-2 text-text-secondary">In de bestaande Compliance-wijzer kunt u met een gratis account en actieve organisatie de basis van uw arbobeleid verkennen en een resultaat bewaren. Uw antwoorden uit deze intake worden nog niet meegenomen. U vult daar zelf de gevraagde gegevens in.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <LinkButton href={publicRoutes.complianceGuide}>Naar de Compliance-wijzer</LinkButton>
        <Button variant="outline" onClick={() => { setResult(false); moved.current = true; onRestart() }}>Nieuwe intake starten</Button>
      </div>
      <p className="mt-5 text-sm text-text-secondary">Uitgebreide Compliance Scan — in voorbereiding en nog niet beschikbaar.</p>
    </section>
  </div>

  return <form ref={form} onSubmit={event => {
    event.preventDefault()
    const invalid = freeIntakeV2Questions.slice(0, stepIndex + 1).find(question => freeIntakeV2Error(answers, question.code))
    if (invalid) {
      const next = freeIntakeV2Questions.indexOf(invalid)
      if (next !== stepIndex) changeStep(next)
      setError(freeIntakeV2Error(answers, invalid.code))
      requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('input')?.focus())
      return
    }
    if (stepIndex === 4) { moved.current = true; onFinish(); setResult(true) }
    else changeStep(stepIndex + 1)
  }} className="mx-auto max-w-4xl space-y-6">
    <p className="text-sm text-text-secondary" aria-live="polite">Hoofdvraag {stepIndex + 1} van 5 · Sommige vragen hebben meerdere keuzes.</p>
    <div role="progressbar" aria-label="Voortgang gratis intake" aria-valuenow={stepIndex + 1} aria-valuemin={0} aria-valuemax={5} className="h-2 overflow-hidden rounded-pill bg-surface-subtle"><div className="h-full bg-brand-primary" style={{ width: `${progress}%` }} /></div>
    <h2 ref={heading} tabIndex={-1} className="scroll-mt-24 text-xl font-bold text-brand-dark">{q.prompt}</h2>
    <p id="intake-help" className="text-text-secondary">{q.help}</p>
    {stepIndex === 2 && !answers[q.code] && ['NONE', 'VOLUNTEERS_ONLY', 'OTHERS_UNDER_AUTHORITY'].includes(String(answers['FI2-01'])) && <div className="rounded-control bg-brand-primary-subtle p-4">
      <p>U gaf aan geen werknemers in dienst te hebben. Klopt het voorgestelde aantal 0?</p>
      <Button className="mt-3" variant="outline" onClick={() => answer('ZERO')}>Bevestig 0 werknemers</Button>
      <p className="mt-2 text-sm">U kunt hieronder ook een ander antwoord kiezen en uw personeelskeuze controleren.</p>
    </div>}
    {error && <p id="intake-error" role="alert" className="rounded-control border border-error p-3 text-error">{error}</p>}
    {employeeScopeConflict(answers) && <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => changeStep(0)}>Personeelskeuze controleren</Button><Button variant="outline" onClick={() => changeStep(2)}>Aantal werknemers controleren</Button></div>}
    <fieldset aria-describedby={`intake-help${error ? ' intake-error' : ''}`} aria-invalid={!!error} className="min-w-0 rounded-card border border-border bg-surface p-5">
      <legend className="px-1 font-semibold text-brand-dark">{q.multiple ? 'Kies wat voor uw organisatie past' : 'Kies één antwoord'}</legend>
      {[...new Set(q.options.map(o => o.group ?? ''))].map(group => <div key={group} className="mt-4 first:mt-0">
        {group && <h3 className="mb-3 font-semibold text-brand-dark">{group}</h3>}
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.filter(o => (o.group ?? '') === group).map(o => <label key={o.value} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border px-4 py-3 hover:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary">
            <input className="mt-1 shrink-0" type={q.multiple ? 'checkbox' : 'radio'} name={q.code} value={o.value} aria-describedby={error ? 'intake-error' : undefined}
              checked={q.multiple ? Array.isArray(answers[q.code]) && answers[q.code].includes(o.value) : answers[q.code] === o.value}
              onChange={() => answer(q.multiple ? toggleFreeIntakeV2(q, Array.isArray(answers[q.code]) ? answers[q.code] as string[] : [], o.value) : o.value)} />
            <span className="min-w-0">{o.label}</span>
          </label>)}
        </div>
      </div>)}
    </fieldset>
    <div className="flex flex-wrap justify-between gap-3">
      <Button variant="outline" disabled={stepIndex === 0} onClick={() => changeStep(stepIndex - 1)}>Vorige</Button>
      <Button type="submit">{stepIndex === 4 ? 'Bekijk relevante onderwerpen' : 'Volgende'}</Button>
    </div>
  </form>
}
