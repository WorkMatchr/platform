'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { c01RieQuestions } from '@/lib/compliance/c01-rie'
import { determineComplianceModuleApplicability, normalizeComplianceFreeIntakeAnswers } from '@/lib/compliance/free-intake-applicability'
import { fullScanModules } from '@/lib/compliance/full-scan-content'
import { completeFullComplianceScan } from './actions'

const STORAGE_KEY = 'workmatchr:compliance-free-intake:v1'
const labels = { YES: 'Ja', PARTIAL: 'Gedeeltelijk', NO: 'Nee', UNKNOWN: 'Dat weet ik niet', NOT_APPLICABLE: 'Niet van toepassing', LT_1Y: 'Minder dan 1 jaar geleden', Y1_2: '1–2 jaar geleden', Y2_5: '2–5 jaar geleden', GT_5Y: 'Meer dan 5 jaar geleden' } as const

type Question = { code: string; prompt: string; options: readonly string[]; moduleCode: string; moduleTitle: string }

function loadIntake() {
  if (typeof window === 'undefined') return {}
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    const parsed = JSON.parse(stored) as { answers?: Record<string, unknown> }
    return normalizeComplianceFreeIntakeAnswers(parsed.answers ?? {})
  } catch {
    return {}
  }
}

export function FullComplianceScan() {
  const [initialIntake] = useState(loadIntake)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [identity] = useState(() => ({ idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString() }))

  const steps = useMemo(() => {
    const applicability = determineComplianceModuleApplicability(initialIntake)
    const relevant = new Set(applicability.filter((item) => item.applicability !== 'NOT_APPLICABLE').map((item) => item.moduleCode))
    const groups: Array<{ title: string; questions: Question[] }> = []

    if (relevant.has('C01')) {
      const c01 = c01RieQuestions.map((q) => ({ code: q.code, prompt: q.prompt, options: q.options, moduleCode: 'C01', moduleTitle: 'RI&E' }))
      for (let i = 0; i < c01.length; i += 5) groups.push({ title: i === 0 ? 'RI&E' : 'RI&E — vervolg', questions: c01.slice(i, i + 5) })
    }

    for (const module of fullScanModules) {
      if (!relevant.has(module.code)) continue
      groups.push({
        title: module.title,
        questions: module.questions.map((q) => ({ code: q.code, prompt: q.prompt, options: ['YES','PARTIAL','NO','UNKNOWN'], moduleCode: module.code, moduleTitle: module.title })),
      })
    }
    return groups
  }, [initialIntake])

  if (Object.keys(initialIntake).length === 0) {
    return <div className="rounded-card border border-border bg-surface p-6"><h2 className="text-xl font-bold text-brand-dark">Gratis intake ontbreekt</h2><p className="mt-2 text-text-secondary">Doorloop eerst de gratis intake zodat WorkMatchr kan bepalen welke modules relevant zijn.</p><a className="mt-5 inline-flex font-semibold text-brand-primary underline" href="/wijzers/compliance/scan">Start gratis intake</a></div>
  }

  const current = steps[step]
  const complete = current.questions.every((q) => typeof answers[q.code] === 'string')

  async function finish() {
    setSubmitting(true)
    try {
      await completeFullComplianceScan({ intakeAnswers: initialIntake as Record<string, unknown>, scanAnswers: answers, ...identity })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between text-sm text-text-secondary"><span>Stap {step + 1} van {steps.length}</span><span>{current.title}</span></div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-subtle"><div className="h-full bg-brand-primary" style={{ width: String(Math.round(((step + 1) / steps.length) * 100)) + '%' }} /></div>
      <section className="mt-7">
        <h2 className="text-2xl font-bold text-brand-dark">{current.title}</h2>
        <div className="mt-5 space-y-4">
          {current.questions.map((q) => (
            <fieldset key={q.code} className="rounded-card border border-border bg-surface p-5">
              <legend className="px-1 font-semibold text-brand-dark">{q.prompt}</legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {q.options.map((option) => (
                  <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-3">
                    <input type="radio" name={q.code} checked={answers[q.code] === option} onChange={() => setAnswers((currentAnswers) => ({ ...currentAnswers, [q.code]: option }))} />
                    <span>{labels[option as keyof typeof labels] ?? option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </section>
      <div className="mt-7 flex justify-between gap-3">
        <Button variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((value) => value - 1)}>Vorige</Button>
        {step === steps.length - 1
          ? <Button disabled={!complete || submitting} onClick={finish}>{submitting ? 'Scan wordt afgerond…' : 'Scan afronden'}</Button>
          : <Button disabled={!complete || submitting} onClick={() => setStep((value) => value + 1)}>Volgende</Button>}
      </div>
      <p className="mt-6 text-sm text-text-secondary">De scan gebruikt uw eigen antwoorden. Vul geen namen, medische persoonsgegevens of individuele ongevalsdetails in.</p>
    </div>
  )
}
