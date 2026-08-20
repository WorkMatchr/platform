'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { ArboGuideStatus } from '@/components/arbo-guides/arbo-guide-status'
import { knowledgeContextHref, resolveKnowledgeContextByRoute } from '@/content/knowledge/knowledge-contexts'
import { collectComplianceSources, type ComplianceReportSource } from '@/lib/compliance-guide/compliance-report'
import {
  complianceAnswerValues,
  complianceStepScrollBehavior,
  evaluateComplianceGuide,
  initialComplianceGuideAnswers,
  summarizeComplianceResults,
  type ComplianceAnswer,
  type ComplianceGuideAnswers,
} from '@/lib/compliance-guide/compliance-guide'

type AnswerKey = Exclude<keyof ComplianceGuideAnswers, 'employeeCount' | 'representation'>
type Question = Readonly<{ key: AnswerKey; label: string; help?: string }>
type Step = Readonly<{ title: string; description: string; questions: readonly Question[] }>

const answerLabels: Record<ComplianceAnswer, string> = { YES: 'Ja', NO: 'Nee', UNKNOWN: 'Dat weet ik niet' }
const steps: readonly Step[] = [
  {
    title: 'Uw organisatie', description: 'We bepalen alleen welke algemene werkgeversverplichtingen mogelijk relevant zijn.',
    questions: [
      { key: 'hasEmployees', label: 'Heeft uw organisatie werknemers?' },
      { key: 'generalPolicy', label: 'Is binnen uw organisatie een samenhangend arbobeleid geregeld?' },
    ],
  },
  {
    title: 'RI&E en plan van aanpak', description: 'Dit is een indicatieve controle van de basis, niet van de inhoudelijke kwaliteit van uw RI&E.',
    questions: [
      { key: 'rie', label: 'Heeft uw organisatie een actuele RI&E?' },
      { key: 'actionPlan', label: 'Is er een plan van aanpak bij de RI&E?' },
      { key: 'rieUpdated', label: 'Wordt de RI&E aangepast bij relevante veranderingen of nieuwe risico’s?' },
      { key: 'rieTesting', label: 'Is deskundige toetsing geregeld wanneer die voor uw RI&E verplicht is?' },
    ],
  },
  {
    title: 'Preventie en noodorganisatie', description: 'De inrichting moet passen bij uw organisatie en risico’s; vaste aantallen alleen zijn niet bepalend.',
    questions: [
      { key: 'preventionOfficer', label: 'Is minimaal één preventiemedewerker aangewezen?' },
      { key: 'preventionConsultation', label: 'Is de werknemersvertegenwoordiging betrokken bij persoon en positie van de preventiemedewerker waar dat vereist is?' },
      { key: 'bhvOrganized', label: 'Is bedrijfshulpverlening georganiseerd?' },
      { key: 'bhvAppointed', label: 'Zijn één of meer BHV’ers aangewezen en is vervanging geregeld?' },
      { key: 'bhvRiskBased', label: 'Sluit de BHV-organisatie aantoonbaar aan op de RI&E, bezetting, locaties en bedrijfsrisico’s?' },
      { key: 'bhvPrepared', label: 'Zijn passende opleiding, oefeningen en middelen geregeld?' },
    ],
  },
  {
    title: 'Arbodienstverlening en gezondheid', description: 'We controleren de aanwezigheid van basisafspraken; niet de volledige juridische contractinhoud.',
    questions: [
      { key: 'basicContract', label: 'Is er een basiscontract met een arbodienst of bedrijfsarts?' },
      { key: 'occupationalPhysicianAccess', label: 'Kunnen werknemers de bedrijfsarts ook preventief en zonder onnodige drempels raadplegen?' },
      { key: 'expertTasksCovered', label: 'Zijn de relevante wettelijke deskundige taken in de arbodienstverlening geborgd?' },
      { key: 'pagoOffered', label: 'Wordt periodiek een PAGO aangeboden dat aansluit op de arbeidsrisico’s?' },
    ],
  },
  {
    title: 'Instructie, raadpleging en ongevallen', description: 'Controleer of afspraken niet alleen bestaan, maar ook praktisch bekend en uitvoerbaar zijn.',
    questions: [
      { key: 'instruction', label: 'Krijgen werknemers passende voorlichting en instructie over werkzaamheden en arbeidsrisico’s?' },
      { key: 'supervision', label: 'Wordt waar nodig toezicht gehouden op veilig gebruik van arbeidsmiddelen en persoonlijke beschermingsmiddelen?' },
      { key: 'workerConsultation', label: 'Worden werknemers aantoonbaar geraadpleegd over relevante arbo-onderwerpen?' },
      { key: 'accidentRegistration', label: 'Is er een proces voor het registreren van relevante arbeidsongevallen?' },
      { key: 'accidentReporting', label: 'Is bekend dat overlijden, ziekenhuisopname of blijvend letsel direct bij de Nederlandse Arbeidsinspectie moet worden gemeld?' },
    ],
  },
]

function AnswerQuestion({ question, value, onChange }: { question: Question; value: ComplianceAnswer; onChange: (value: ComplianceAnswer) => void }) {
  return (
    <fieldset className="rounded-card border border-border bg-surface p-5">
      <legend className="px-1 font-semibold text-brand-dark">{question.label}</legend>
      {question.help && <p className="mt-1 text-sm text-text-secondary">{question.help}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {complianceAnswerValues.map((answer) => (
          <label key={answer} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-2 hover:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary">
            <input type="radio" name={question.key} value={answer} checked={value === answer} onChange={() => onChange(answer)} />
            <span>{answerLabels[answer]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ConsultedSources({ sources }: { sources: readonly ComplianceReportSource[] }) {
  return (
    <section className="rounded-card border border-border bg-surface p-6 text-center" aria-labelledby="consulted-sources-title">
      <h2 id="consulted-sources-title" className="text-xl font-bold text-brand-dark">Geraadpleegde bronnen</h2>
      <ul className="mx-auto mt-5 grid max-w-4xl grid-cols-1 gap-4 text-left md:grid-cols-2">
        {sources.map((source) => (
          <li key={source.id} className="rounded-control bg-surface-subtle p-4">
            <a className="font-semibold text-brand-primary-hover underline underline-offset-4" href={source.url} target="_blank" rel="noreferrer">
              {source.title}<span className="sr-only"> (opent in een nieuw venster)</span>
            </a>
            <span className="mt-1 block text-sm text-text-secondary">
              {source.publisher} · gecontroleerd op {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(new Date(`${source.reviewedAt}T00:00:00Z`))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

type SavedRun = Readonly<{ runId: string; reportNumber: string }>

function Results({ answers, onRestart, headingRef, idempotencyKey, startedAt, completedAt }: {
  answers: ComplianceGuideAnswers
  onRestart: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
  idempotencyKey: string
  startedAt: string
  completedAt: string
}) {
  const results = useMemo(() => evaluateComplianceGuide(answers), [answers])
  const summary = summarizeComplianceResults(results)
  const sources = useMemo(() => collectComplianceSources(results), [results])
  const context = resolveKnowledgeContextByRoute('/wijzers/compliance')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [savedRun, setSavedRun] = useState<SavedRun | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function saveAuthenticatedRun() {
      try {
        const response = await fetch('/wijzers/compliance/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers, idempotencyKey, startedAt, completedAt }),
          signal: controller.signal,
        })
        if (response.status === 401) return
        if (!response.ok) throw new Error('save failed')
        const body = await response.json() as SavedRun & { saved: true }
        setSavedRun({ runId: body.runId, reportNumber: body.reportNumber })
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setSaveFailed(true)
      }
    }
    void saveAuthenticatedRun()
    return () => controller.abort()
  }, [answers, completedAt, idempotencyKey, startedAt])

  async function downloadBasicReport() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const response = savedRun
        ? await fetch(`/mijn-arbo-wijzers/${savedRun.runId}/pdf`)
        : await fetch('/wijzers/compliance/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: 'BASIC', answers }),
          })
      if (!response.ok) throw new Error('download failed')
      const blobUrl = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `workmatchr-compliance-rapport-${new Date().toISOString().slice(0, 10)}.pdf`
      link.click()
      URL.revokeObjectURL(blobUrl)
    } catch {
      setDownloadError('Het rapport kon niet worden gemaakt. Probeer het opnieuw.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6" aria-labelledby="compliance-summary-title" role="status">
        <h2 ref={headingRef} tabIndex={-1} id="compliance-summary-title" className="scroll-mt-28 text-xl font-bold text-brand-dark focus:outline-none">Uw indicatieve overzicht</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          <li><strong>{summary.order}</strong> onderdelen op orde</li>
          <li><strong>{summary.action}</strong> onderdelen vragen actie</li>
          <li><strong>{summary.check}</strong> onderdelen moeten worden gecontroleerd</li>
          <li><strong>{summary.notApplicable}</strong> onderdelen niet van toepassing</li>
        </ul>
        <p className="mt-4 text-sm text-text-secondary">De Compliance-wijzer geeft een indicatief overzicht op basis van uw antwoorden. De uitkomst is geen formele juridische beoordeling of certificering.</p>
      </section>

      <div className="space-y-5">
        {results.map((result) => (
            <article key={result.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-xl font-bold text-brand-dark">{result.title}</h2>
                <ArboGuideStatus status={result.status} />
              </div>
              <p className="mt-3 text-text-secondary">{result.explanation}</p>
              <h3 className="mt-5 font-semibold text-brand-dark">Waarom dit relevant is</h3>
              <p className="mt-1 text-text-secondary">{result.relevance}</p>
              <h3 className="mt-5 font-semibold text-brand-dark">Aanbevolen vervolgstap</h3>
              <p className="mt-1 text-text-secondary">{result.nextStep}</p>
              {result.detailHref && <Link className="mt-5 inline-flex min-h-11 items-center font-semibold text-brand-primary underline underline-offset-4" href={result.detailHref}>Lees de inhoudelijke toelichting</Link>}
            </article>
        ))}
      </div>

      <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="compliance-report-title">
        <h2 id="compliance-report-title" className="text-xl font-bold text-brand-dark">Bewaar uw resultaat</h2>
        <p className="mt-2 text-text-secondary">Download de samenvatting, aandachtspunten, belangrijkste acties en officiële bronnen als PDF. De volledige scan en dit basisrapport zijn gratis.</p>
        {savedRun && <p className="mt-3 text-sm text-text-secondary">Rapportnummer: <strong>{savedRun.reportNumber}</strong>. U vindt dit rapport ook bij Mijn Arbo-wijzers.</p>}
        {saveFailed && <p className="mt-3 text-sm text-warning" role="status">Uw resultaat kon niet in uw account worden bewaard. U kunt het basisrapport wel downloaden.</p>}
        <Button className="mt-5" onClick={downloadBasicReport} disabled={downloading}>{downloading ? 'Rapport wordt gemaakt…' : 'Download rapport (PDF)'}</Button>
        {downloadError && <p className="mt-3 text-sm font-semibold text-error" role="alert">{downloadError}</p>}
      </section>

      <section className="rounded-card bg-brand-dark p-6 text-text-on-dark">
        <h2 className="text-xl font-bold">Wilt u uw situatie laten beoordelen?</h2>
        <p className="mt-2 text-text-on-dark-muted">De Advieswijzer helpt u bepalen welke ondersteuning passend is. Uw antwoorden uit deze wijzer worden niet in de URL meegestuurd.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {context && <LinkButton href={knowledgeContextHref('/advieswijzer', context)}>Schakel een adviseur in</LinkButton>}
          <Button variant="outline" onClick={onRestart}>Opnieuw beginnen</Button>
        </div>
      </section>
      <ConsultedSources sources={sources} />
    </div>
  )
}

export function ComplianceGuide() {
  const [answers, setAnswers] = useState<ComplianceGuideAnswers>(initialComplianceGuideAnswers)
  const [stepIndex, setStepIndex] = useState(0)
  const guideRef = useRef<HTMLDivElement>(null)
  const contentHeadingRef = useRef<HTMLHeadingElement>(null)
  const navigationStartedRef = useRef(false)
  const [runIdentity, setRunIdentity] = useState(() => ({
    idempotencyKey: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    completedAt: null as string | null,
  }))
  const showingResults = stepIndex === steps.length
  const step = steps[Math.min(stepIndex, steps.length - 1)]

  useEffect(() => {
    if (!navigationStartedRef.current) return
    const frame = requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      guideRef.current?.scrollIntoView({ behavior: complianceStepScrollBehavior(reducedMotion), block: 'start' })
      contentHeadingRef.current?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [stepIndex])

  function updateAnswer(key: AnswerKey, value: ComplianceAnswer) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function navigateToStep(nextStep: number) {
    navigationStartedRef.current = true
    if (nextStep === steps.length && !runIdentity.completedAt) {
      setRunIdentity((current) => ({ ...current, completedAt: new Date().toISOString() }))
    }
    setStepIndex(Math.max(0, Math.min(steps.length, nextStep)))
  }

  if (showingResults && runIdentity.completedAt) return <div ref={guideRef} className="scroll-mt-24"><Results answers={answers} headingRef={contentHeadingRef} idempotencyKey={runIdentity.idempotencyKey} startedAt={runIdentity.startedAt} completedAt={runIdentity.completedAt} onRestart={() => { setAnswers(initialComplianceGuideAnswers); setRunIdentity({ idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString(), completedAt: null }); navigateToStep(0) }} /></div>

  return (
    <div ref={guideRef} className="mx-auto max-w-4xl scroll-mt-24">
      <div className="mb-6 flex items-center justify-between gap-4 text-sm text-text-secondary">
        <span>Stap {stepIndex + 1} van {steps.length}</span>
        <span>{step.title}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-subtle" aria-hidden="true"><div className="h-full bg-brand-primary" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
      <section className="mt-7" aria-labelledby="compliance-step-title">
        <h2 ref={contentHeadingRef} tabIndex={-1} id="compliance-step-title" className="scroll-mt-28 text-2xl font-bold text-brand-dark focus:outline-none">{step.title}</h2>
        <p className="mt-2 text-text-secondary">{step.description}</p>
        <div className="mt-6 space-y-4">
          {step.questions.map((question) => <AnswerQuestion key={question.key} question={question} value={answers[question.key]} onChange={(value) => updateAnswer(question.key, value)} />)}
          {stepIndex === 0 && answers.hasEmployees === 'YES' && (
            <fieldset className="rounded-card border border-border bg-surface p-5">
              <legend className="px-1 font-semibold text-brand-dark">Hoeveel werknemers heeft uw organisatie?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[['ONE_TO_25', '1–25 werknemers'], ['MORE_THAN_25', 'Meer dan 25 werknemers']].map(([value, label]) => <label key={value} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-2"><input type="radio" name="employeeCount" checked={answers.employeeCount === value} onChange={() => setAnswers((current) => ({ ...current, employeeCount: value as ComplianceGuideAnswers['employeeCount'] }))} />{label}</label>)}
              </div>
            </fieldset>
          )}
          {stepIndex === 4 && (
            <fieldset className="rounded-card border border-border bg-surface p-5">
              <legend className="px-1 font-semibold text-brand-dark">Hoe worden werknemers vertegenwoordigd?</legend>
              <select className="mt-3 min-h-11 w-full rounded-control border border-border bg-surface px-4" value={answers.representation ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, representation: (event.target.value || null) as ComplianceGuideAnswers['representation'] }))}>
                <option value="">Kies een antwoord</option><option value="OR">Ondernemingsraad (OR)</option><option value="PVT">Personeelsvertegenwoordiging (PVT)</option><option value="DIRECT">Rechtstreekse raadpleging</option><option value="NONE">Geen raadplegingsvorm</option><option value="UNKNOWN">Dat weet ik niet</option>
              </select>
            </fieldset>
          )}
        </div>
      </section>
      <div className="mt-7 flex flex-wrap justify-between gap-3">
        <Button variant="outline" disabled={stepIndex === 0} onClick={() => navigateToStep(stepIndex - 1)}>Vorige</Button>
        <Button onClick={() => navigateToStep(stepIndex + 1)}>{stepIndex === steps.length - 1 ? 'Bekijk mijn overzicht' : 'Volgende'}</Button>
      </div>
      <p className="mt-6 text-sm text-text-secondary">Uw antwoorden blijven tijdens deze controle alleen in deze browserweergave en worden niet via de URL gedeeld. Vul geen namen, medische gegevens of ongevalsgegevens in.</p>
    </div>
  )
}
