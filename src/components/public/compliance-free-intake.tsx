'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import {
  complianceFreeIntakeQuestions,
  type ComplianceFreeIntakeQuestion,
} from '@/lib/compliance/free-intake'
import {
  buildComplianceFreeIntakeTeaser,
  normalizeComplianceFreeIntakeAnswers,
} from '@/lib/compliance/free-intake-applicability'

const STORAGE_KEY = 'workmatchr:compliance-free-intake:v1'
const stepGroups = [
  ['FI-01', 'FI-02', 'FI-03'],
  ['FI-04', 'FI-05', 'FI-06'],
  ['FI-07', 'FI-08', 'FI-09'],
  ['FI-10', 'FI-11', 'FI-12'],
  ['FI-13', 'FI-14', 'FI-15'],
] as const

const labels: Record<string, string> = {
  YES: 'Ja', NO: 'Nee', UNKNOWN: 'Dat weet ik niet', PARTIAL: 'Gedeeltelijk',
  ONE_TO_25: '1–25 werknemers', MORE_THAN_25: 'Meer dan 25 werknemers',
  HOME: 'Thuiswerk', MULTIPLE_LOCATIONS: 'Meerdere eigen locaties', THIRD_PARTY_LOCATIONS: 'Locaties van anderen',
  NONE: 'Geen van deze', MACHINES: 'Machines', WORK_EQUIPMENT: 'Arbeidsmiddelen', VEHICLES: 'Voertuigen / mobiele werktuigen',
  HAZARDOUS_SUBSTANCES: 'Gevaarlijke stoffen', BIOLOGICAL_AGENTS: 'Biologische agentia', ATEX: 'Mogelijk explosieve atmosfeer',
  PHYSICAL_LOAD: 'Fysieke belasting', DISPLAY_SCREEN: 'Beeldschermwerk', WORKPLACE_SETUP: 'Bijzondere werkplekinrichting',
  NOISE: 'Geluid', VIBRATION: 'Trillingen', CLIMATE: 'Warmte, koude of klimaat',
  HEIGHT: 'Werken op hoogte', ELECTRICAL: 'Elektrotechnische risico\'s', PRESSURE: 'Drukapparatuur / perslucht', RADIATION: 'Straling',
  LONE_WORK: 'Alleenwerk', NIGHT_OR_SHIFT: 'Nacht- of ploegendienst',
}

type Answers = Record<string, string | string[]>

function questionByCode(code: string) {
  return complianceFreeIntakeQuestions.find((question) => question.code === code)!
}

function SingleSelectQuestion({ question, value, onChange }: {
  question: ComplianceFreeIntakeQuestion
  value: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <fieldset className="rounded-card border border-border bg-surface p-5">
      <legend className="px-1 font-semibold text-brand-dark">{question.prompt}</legend>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-3 hover:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary">
            <input type="radio" name={question.code} checked={value === option} onChange={() => onChange(option)} />
            <span>{labels[option] ?? option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function MultiSelectQuestion({ question, value, onChange }: {
  question: ComplianceFreeIntakeQuestion
  value: string[]
  onChange: (value: string[]) => void
}) {
  function toggle(option: string) {
    if (option === 'NONE' || option === 'UNKNOWN') {
      onChange(value.includes(option) ? [] : [option])
      return
    }
    const withoutExclusive = value.filter((item) => item !== 'NONE' && item !== 'UNKNOWN')
    onChange(withoutExclusive.includes(option)
      ? withoutExclusive.filter((item) => item !== option)
      : [...withoutExclusive, option])
  }

  return (
    <fieldset className="rounded-card border border-border bg-surface p-5">
      <legend className="px-1 font-semibold text-brand-dark">{question.prompt}</legend>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-3 hover:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary">
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggle(option)} />
            <span>{labels[option] ?? option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function readStoredIntake(): { answers: Answers; stepIndex: number } {
  if (typeof window === 'undefined') return { answers: {}, stepIndex: 0 }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return { answers: {}, stepIndex: 0 }
    const parsed = JSON.parse(stored) as { answers?: Record<string, unknown>; stepIndex?: number }
    return {
      answers: normalizeComplianceFreeIntakeAnswers(parsed.answers ?? {}) as Answers,
      stepIndex: Math.max(0, Math.min(stepGroups.length - 1, parsed.stepIndex ?? 0)),
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return { answers: {}, stepIndex: 0 }
  }
}

export function ComplianceFreeIntake() {
  const [initialState] = useState(readStoredIntake)
  const [answers, setAnswers] = useState<Answers>(initialState.answers)
  const [stepIndex, setStepIndex] = useState(initialState.stepIndex)
  const [showResult, setShowResult] = useState(false)

  useEffect(() => {
    if (showResult) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stepIndex }))
  }, [answers, showResult, stepIndex])

  const currentQuestions = stepGroups[stepIndex].map(questionByCode)
  const teaser = useMemo(() => buildComplianceFreeIntakeTeaser(answers), [answers])
  const currentComplete = currentQuestions.every((question) => {
    const value = answers[question.code]
    return Array.isArray(value) ? value.length > 0 : typeof value === 'string'
  })

  function setAnswer(code: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [code]: value }))
  }

  function restart() {
    window.localStorage.removeItem(STORAGE_KEY)
    setAnswers({})
    setStepIndex(0)
    setShowResult(false)
  }

  if (showResult) {
    const visibleModules = teaser.modules.filter((module) => module.applicability !== 'NOT_APPLICABLE')
    return (
      <div className="space-y-6">
        <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Gratis intake afgerond</p>
          <h2 className="mt-2 text-2xl font-bold text-brand-dark">Uw scanprofiel is bepaald</h2>
          <p className="mt-3 max-w-3xl text-text-secondary">{teaser.teaserText}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-control bg-surface p-4"><strong className="block text-2xl text-brand-dark">{teaser.counts.relevant}</strong><span className="text-sm text-text-secondary">relevante onderwerpen</span></div>
            <div className="rounded-control bg-surface p-4"><strong className="block text-2xl text-brand-dark">{teaser.counts.possiblyRelevant}</strong><span className="text-sm text-text-secondary">mogelijk relevante onderwerpen</span></div>
            <div className="rounded-control bg-surface p-4"><strong className="block text-2xl text-brand-dark">{teaser.coreSignals}</strong><span className="text-sm text-text-secondary">basissignalen voor verdieping</span></div>
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface p-6">
          <h2 className="text-xl font-bold text-brand-dark">Onderwerpen voor uw volledige scan</h2>
          <p className="mt-2 text-text-secondary">Dit is alleen de selectie van onderwerpen. De gratis intake geeft nog geen inhoudelijke beoordeling, juridische conclusie of detailactie.</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {visibleModules.map((module) => (
              <li key={module.moduleCode} className="rounded-control bg-surface-subtle px-4 py-3">
                <strong className="text-brand-dark">{module.title}</strong>
                <span className="mt-1 block text-sm text-text-secondary">{module.applicability === 'RELEVANT' ? 'Relevant voor verdere beoordeling' : 'Mogelijk relevant — nader bepalen'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card bg-brand-dark p-6 text-text-on-dark">
          <h2 className="text-xl font-bold">Volledige Arbo Compliance Scan</h2>
          <p className="mt-2 max-w-3xl text-text-on-dark-muted">In de volledige scan worden de geselecteerde onderwerpen beoordeeld en krijgt u per onderwerp de status, onderbouwing, prioriteit en aanbevolen vervolgstap.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href="/dashboard/compliance/scan/nieuw">Volledige scan starten</LinkButton>
            <Button variant="outline" onClick={restart}>Intake opnieuw doen</Button>
          </div>
        </section>
      </div>
    )
  }

  const progress = String(Math.round(((stepIndex + 1) / stepGroups.length) * 100)) + '%'

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-4 text-sm text-text-secondary">
        <span>Stap {stepIndex + 1} van {stepGroups.length}</span>
        <span>{progress}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-subtle" aria-hidden="true">
        <div className="h-full bg-brand-primary" style={{ width: progress }} />
      </div>

      <div className="mt-7 space-y-4">
        {currentQuestions.map((question) => (
          question.inputType === 'MULTI_SELECT'
            ? <MultiSelectQuestion key={question.code} question={question} value={Array.isArray(answers[question.code]) ? answers[question.code] as string[] : []} onChange={(value) => setAnswer(question.code, value)} />
            : <SingleSelectQuestion key={question.code} question={question} value={typeof answers[question.code] === 'string' ? answers[question.code] as string : undefined} onChange={(value) => setAnswer(question.code, value)} />
        ))}
      </div>

      <div className="mt-7 flex flex-wrap justify-between gap-3">
        <Button variant="outline" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => current - 1)}>Vorige</Button>
        <Button disabled={!currentComplete} onClick={() => {
          if (stepIndex === stepGroups.length - 1) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, stepIndex }))
            setShowResult(true)
          } else {
            setStepIndex((current) => current + 1)
          }
        }}>
          {stepIndex === stepGroups.length - 1 ? 'Bekijk relevante onderwerpen' : 'Volgende'}
        </Button>
      </div>

      <p className="mt-6 text-sm text-text-secondary">Uw voortgang wordt alleen in deze browser bewaard zodat u de gratis intake kunt hervatten. Vul geen namen, medische gegevens of ongevalsgegevens in.</p>
    </div>
  )
}
