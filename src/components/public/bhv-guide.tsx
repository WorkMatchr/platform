'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { ArboGuideStatus } from '@/components/arbo-guides/arbo-guide-status'
import { ConsultedSources } from '@/components/public/compliance-guide'
import { knowledgeContextHref, resolveKnowledgeContextByRoute } from '@/content/knowledge/knowledge-contexts'
import { buildBhvReportData } from '@/lib/bhv-guide/bhv-report'
import { bhvAnswerValues, evaluateBhvGuide, initialBhvGuideAnswers, normalizeBhvGuideAnswers, selectBhvScenarios, type BhvAnswer, type BhvBooleanKey, type BhvGuideAnswers } from '@/lib/bhv-guide/bhv-guide'

const labels: Record<BhvAnswer, string> = { YES: 'Ja', NO: 'Nee', UNKNOWN: 'Dat weet ik niet' }
type Question = Readonly<{ key: BhvBooleanKey; label: string; when?: (answers: BhvGuideAnswers) => boolean }>
type Step = Readonly<{ title: string; description: string; questions: readonly Question[] }>
const q = (key: BhvBooleanKey, label: string, when?: Question['when']): Question => ({ key, label, when })
const steps: readonly Step[] = [
  { title: 'Organisatie en aanwezigheid', description: 'Wie kan aanwezig zijn, wanneer en op hoeveel plaatsen?', questions: [
    q('hasEmployees', 'Heeft uw organisatie werknemers?'), q('visitors', 'Zijn regelmatig bezoekers, klanten of medewerkers van andere organisaties aanwezig?'),
    q('multipleLocations', 'Wordt op meerdere locaties gewerkt?'), q('outsideHours', 'Wordt buiten reguliere daguren gewerkt?'), q('shiftWork', 'Wordt in ploegen gewerkt?'),
    q('loneWork', 'Komt alleenwerk voor?'), q('remoteWork', 'Wordt op afgelegen of moeilijk bereikbare plekken gewerkt?'),
  ] },
  { title: 'Locatie en zelfredzaamheid', description: 'Kenmerken van gebouwen en aanwezigen bepalen hoeveel tijd, hulp en spreiding nodig kunnen zijn.', questions: [
    q('multipleBuildings', 'Zijn er meerdere gebouwen of gescheiden gebouwdelen?'), q('multipleFloors', 'Zijn er meerdere verdiepingen?'), q('complexEscapeRoutes', 'Zijn vluchtroutes lang, complex of niet overal direct zichtbaar?'),
    q('sleepingPersons', 'Kunnen slapende personen aanwezig zijn?'), q('unfamiliarVisitors', 'Zijn er aanwezigen die het gebouw of de instructies niet kennen?'), q('childrenPresent', 'Kunnen kinderen aanwezig zijn?'),
    q('elderlyPresent', 'Kunnen ouderen aanwezig zijn die extra hulp nodig hebben?'), q('physicalLimitations', 'Kunnen personen met lichamelijke beperkingen aanwezig zijn?'), q('cognitiveLimitations', 'Kunnen personen aanwezig zijn die instructies niet zelfstandig kunnen volgen?'),
    q('emergencyAccessIssues', 'Zijn er beperkingen voor de toegang van externe hulpdiensten?'),
  ] },
  { title: 'Risico’s en incidentscenario’s', description: 'Selecteer alleen risico’s die in uw werkzaamheden of omgeving werkelijk kunnen voorkomen.', questions: [
    q('hazardousSubstances', 'Wordt gewerkt met gevaarlijke stoffen?'), q('machines', 'Wordt gewerkt met machines of andere arbeidsmiddelen?'), q('electricity', 'Bestaat een relevant risico op elektrische incidenten?'),
    q('workAtHeight', 'Wordt op hoogte gewerkt?'), q('confinedSpaces', 'Wordt in besloten ruimten gewerkt?'), q('asphyxiationRisk', 'Bestaat risico op verstikking of zuurstoftekort?'),
    q('fireExplosionRisk', 'Bestaat verhoogd brand- of explosierisico?'), q('aggressionRisk', 'Bestaat risico op agressie of geweld?'), q('outdoorRemoteWork', 'Vindt risicovol werk buiten of afgelegen plaats?'), q('waterRisk', 'Wordt bij of op water gewerkt?'),
  ] },
  { title: 'Feitelijke dekking en organisatie', description: 'Beoordeel niet alleen wie is opgeleid, maar wie tijdens het werk werkelijk inzetbaar is.', questions: [
    q('coverageNormal', 'Is tijdens normale werktijden aantoonbaar voldoende BHV-capaciteit aanwezig?'), q('coverageOutsideHours', 'Is ook buiten reguliere tijden passende BHV-dekking aanwezig?', (a) => a.outsideHours === 'YES' || a.shiftWork === 'YES'),
    q('coverageSpread', 'Is de dekking passend verspreid over locaties, gebouwen of verdiepingen?', (a) => a.multipleLocations === 'YES' || a.multipleBuildings === 'YES' || a.multipleFloors === 'YES'),
    q('replacement', 'Is vervanging bij verlof, ziekte en opleiding geregeld?'), q('breakCoverage', 'Blijft dekking tijdens pauzes en tijdelijke afwezigheid intact?'), q('simultaneousTasks', 'Kan de organisatie noodzakelijke taken gelijktijdig uitvoeren?'),
    q('alarmOrganized', 'Is duidelijk hoe BHV en aanwezigen worden gealarmeerd?'), q('taskDivision', 'Zijn taken en bevoegdheden vooraf verdeeld?'), q('coordination', 'Is coördinatie tijdens een incident geregeld?'), q('emergencyReception', 'Is geregeld wie externe hulpdiensten opvangt en informeert?'),
  ] },
  { title: 'Middelen en voorzieningen', description: 'Middelen horen voort te komen uit scenario’s; bijzondere risico’s kunnen specialistische beoordeling vragen.', questions: [
    q('firstAidResources', 'Zijn passende eerstehulpmiddelen bereikbaar?'), q('alarmMeans', 'Zijn betrouwbare alarmeringsmiddelen aanwezig?'), q('recognizability', 'Zijn BHV’ers tijdens een incident herkenbaar?'), q('communicationMeans', 'Zijn passende communicatiemiddelen beschikbaar?'),
    q('accessMeans', 'Zijn relevante sleutels, kaarten of toegangsmiddelen beschikbaar?'), q('evacuationInfo', 'Zijn ontruimingsroutes en -instructies bruikbaar en bekend?'), q('emergencyLighting', 'Zijn noodverlichting en vluchtwegaanduiding waar nodig op orde?'),
    q('equipmentMaintenance', 'Worden BHV-middelen en voorzieningen periodiek gecontroleerd?'), q('scenarioSpecificMeansAssessed', 'Is per bijzonder scenario deskundig beoordeeld welke aanvullende mensen en middelen nodig zijn?'),
  ] },
  { title: 'Opleiding, oefenen en verbeteren', description: 'Borg dat de organisatie niet alleen op papier bestaat, maar leert van oefeningen en veranderingen.', questions: [
    q('trained', 'Zijn BHV’ers opgeleid voor hun taken en de relevante scenario’s?'), q('skillsMaintained', 'Worden vaardigheden aantoonbaar onderhouden?'), q('exercisesHeld', 'Wordt de BHV-organisatie geoefend?'), q('scenariosExercised', 'Sluiten oefeningen aan op geloofwaardige incidentscenario’s?'),
    q('exerciseEvaluated', 'Worden oefeningen en incidenten geëvalueerd?'), q('actionsFollowedUp', 'Worden verbeteracties toegewezen en opgevolgd?'), q('workersInformed', 'Weten werknemers en relevante aanwezigen wat zij bij alarm moeten doen?'),
    q('responsibilitiesAssigned', 'Is duidelijk wie de BHV-organisatie beheert en actualiseert?'), q('changeReview', 'Wordt BHV opnieuw beoordeeld bij veranderingen in werk, gebouw of bezetting?'), q('rieAligned', 'Zijn BHV-scenario’s en maatregelen aantoonbaar verbonden met de RI&E en restrisico’s?'), q('periodicReview', 'Wordt de totale BHV-organisatie periodiek beoordeeld?'),
  ] },
]

function QuestionField({ question, value, onChange }: { question: Question; value: BhvAnswer; onChange: (value: BhvAnswer) => void }) {
  return <fieldset className="rounded-card border border-border bg-surface p-5"><legend className="px-1 font-semibold text-brand-dark">{question.label}</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{bhvAnswerValues.map((answer) => <label key={answer} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-4 py-2 hover:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary"><input type="radio" name={question.key} checked={value === answer} onChange={() => onChange(answer)} /><span>{labels[answer]}</span></label>)}</div></fieldset>
}
function NumberField({ name, label, value, onChange }: { name: string; label: string; value: number | null; onChange: (value: number | null) => void }) {
  return <label className="block rounded-card border border-border bg-surface p-5 font-semibold text-brand-dark">{label}<input name={name} type="number" min={0} max={100000} inputMode="numeric" value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} className="mt-3 min-h-11 w-full rounded-control border border-border bg-surface px-4 font-normal text-text-primary" /></label>
}

export function BhvGuide() {
  const [answers, setAnswers] = useState<BhvGuideAnswers>(initialBhvGuideAnswers)
  const [stepIndex, setStepIndex] = useState(0)
  const [identity, setIdentity] = useState(() => ({ idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString(), completedAt: null as string | null }))
  const [saved, setSaved] = useState<{ runId: string; reportNumber: string } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const guideRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const showingResults = stepIndex === steps.length
  const results = useMemo(() => evaluateBhvGuide(answers), [answers])
  const report = useMemo(() => buildBhvReportData({ answers, scannedAt: new Date(identity.completedAt ?? identity.startedAt), tier: 'BASIC' }), [answers, identity.completedAt, identity.startedAt])
  const context = resolveKnowledgeContextByRoute('/wijzers/bhv')
  useEffect(() => { if (!moved.current) return; requestAnimationFrame(() => { guideRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); headingRef.current?.focus({ preventScroll: true }) }) }, [stepIndex])
  useEffect(() => {
    if (!showingResults || !identity.completedAt) return
    const controller = new AbortController()
    void fetch('/wijzers/bhv/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers, ...identity }), signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('save failed')
        setSaved(await response.json() as { runId: string; reportNumber: string })
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setSaveFailed(true)
      })
    return () => controller.abort()
  }, [answers, identity, showingResults])
  function navigate(next: number) { moved.current = true; if (next === steps.length && !identity.completedAt) { setSaveFailed(false); setIdentity((current) => ({ ...current, completedAt: new Date().toISOString() })) } setStepIndex(Math.max(0, Math.min(steps.length, next))) }
  async function download() { if (!saved) return; const response = await fetch(`/mijn-arbo-wijzers/${saved.runId}/pdf`); if (!response.ok) return; const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = `workmatchr-bhv-rapport-${saved.reportNumber}.pdf`; link.click(); URL.revokeObjectURL(url) }

  if (showingResults && !saved) return <div ref={guideRef} className="scroll-mt-24"><section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6" role={saveFailed ? 'alert' : 'status'}><h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 text-xl font-bold text-brand-dark focus:outline-none">{saveFailed ? 'Uw resultaat kon niet veilig worden opgeslagen' : 'Uw resultaat wordt veilig opgeslagen'}</h2><p className="mt-3 text-text-secondary">{saveFailed ? 'Er is geen rapport aangemaakt. Controleer uw sessie en probeer de wijzer opnieuw.' : 'Een ogenblik. We koppelen deze scan aan uw organisatie en maken het historische rapport gereed.'}</p>{saveFailed && <Button className="mt-5" onClick={() => { setAnswers(initialBhvGuideAnswers); setIdentity({ idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString(), completedAt: null }); setSaved(null); setSaveFailed(false); navigate(0) }}>Opnieuw proberen</Button>}</section></div>

  if (showingResults && saved) {
    const savedRun = saved
    return <div ref={guideRef} className="space-y-7 scroll-mt-24">
    <section className="rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6"><h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-brand-dark focus:outline-none">Uw BHV-overzicht</h2><p className="mt-3 text-text-secondary">{report.managementSummary}</p><ul className="mt-4 grid gap-2 sm:grid-cols-3"><li><strong>{report.summary.order}</strong> op orde</li><li><strong>{report.summary.action}</strong> actie nodig</li><li><strong>{report.summary.check}</strong> controleren</li></ul></section>
    <section className="rounded-card border border-border bg-surface p-6"><h2 className="text-xl font-bold text-brand-dark">Relevante incidentscenario’s</h2><ul className="mt-4 grid list-disc gap-2 pl-5 sm:grid-cols-2">{selectBhvScenarios(answers).map((scenario) => <li key={scenario.id}>{scenario.label}</li>)}</ul></section>
    <div className="space-y-5">{results.map((result) => <article key={result.id} className="rounded-card border border-border bg-surface p-6 shadow-card"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-xl font-bold text-brand-dark">{result.title}</h2><ArboGuideStatus status={result.status} /></div><p className="mt-3 text-text-secondary">{result.explanation}</p><h3 className="mt-5 font-semibold text-brand-dark">Waarom dit relevant is</h3><p className="mt-1 text-text-secondary">{result.relevance}</p><h3 className="mt-5 font-semibold text-brand-dark">Aanbevolen vervolgstap</h3><p className="mt-1 text-text-secondary">{result.nextStep}</p></article>)}</div>
    <section className="rounded-card border border-border bg-surface p-6"><h2 className="text-xl font-bold text-brand-dark">Bewaar uw resultaat</h2><p className="mt-2 text-text-secondary">Download uw managementsamenvatting, scenario’s, resultaten, aandachtspunten en geraadpleegde bronnen.</p><p className="mt-3 text-sm">Rapportnummer: <strong>{savedRun.reportNumber}</strong>. U vindt dit rapport ook bij Mijn Arbo-wijzers.</p><Button className="mt-5" onClick={() => void download()}>Download rapport (PDF)</Button></section>
    <section className="rounded-card bg-brand-dark p-6 text-text-on-dark"><h2 className="text-xl font-bold">Wilt u uw BHV-organisatie laten beoordelen?</h2><p className="mt-2 text-text-on-dark-muted">De Advieswijzer helpt u passende ondersteuning te kiezen. Uw antwoorden worden niet in de URL meegestuurd.</p><div className="mt-5 flex flex-wrap gap-3">{context && <LinkButton href={knowledgeContextHref('/advieswijzer', context)}>Schakel een adviseur in</LinkButton>}<Button variant="outline" onClick={() => { setAnswers(initialBhvGuideAnswers); setIdentity({ idempotencyKey: crypto.randomUUID(), startedAt: new Date().toISOString(), completedAt: null }); setSaved(null); setSaveFailed(false); navigate(0) }}>Opnieuw beginnen</Button></div></section>
    <ConsultedSources sources={report.sources} />
  </div>
  }

  const step = steps[stepIndex]
  const visibleQuestions = step.questions.filter((question) => !question.when || question.when(answers))
  return <div ref={guideRef} className="mx-auto max-w-4xl scroll-mt-24"><div className="mb-6 flex justify-between gap-4 text-sm text-text-secondary"><span>Stap {stepIndex + 1} van {steps.length}</span><span>{step.title}</span></div><div className="h-2 overflow-hidden rounded-pill bg-surface-subtle"><div className="h-full bg-brand-primary" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div><section className="mt-7"><h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 text-2xl font-bold text-brand-dark focus:outline-none">{step.title}</h2><p className="mt-2 text-text-secondary">{step.description}</p><div className="mt-6 space-y-4">{stepIndex === 0 && <div className="grid gap-4 sm:grid-cols-2"><NumberField name="employeeCount" label="Aantal werknemers" value={answers.employeeCount} onChange={(value) => setAnswers((a) => ({ ...a, employeeCount: value }))} /><NumberField name="maximumPresent" label="Maximaal aantal aanwezigen tegelijk" value={answers.maximumPresent} onChange={(value) => setAnswers((a) => ({ ...a, maximumPresent: value }))} /></div>}{stepIndex === 3 && <div className="grid gap-4 sm:grid-cols-2"><NumberField name="trainedBhvCount" label="Aantal opgeleide BHV’ers" value={answers.trainedBhvCount} onChange={(value) => setAnswers((a) => ({ ...a, trainedBhvCount: value }))} /><NumberField name="minimumBhvPresent" label="Minimum feitelijk aanwezig tijdens werk" value={answers.minimumBhvPresent} onChange={(value) => setAnswers((a) => ({ ...a, minimumBhvPresent: value }))} /></div>}{visibleQuestions.map((question) => <QuestionField key={question.key} question={question} value={answers[question.key]} onChange={(value) => setAnswers((a) => normalizeBhvGuideAnswers({ ...a, [question.key]: value }))} />)}</div></section><div className="mt-7 flex justify-between gap-3"><Button variant="outline" disabled={stepIndex === 0} onClick={() => navigate(stepIndex - 1)}>Vorige</Button><Button onClick={() => navigate(stepIndex + 1)}>{stepIndex === steps.length - 1 ? 'Bekijk mijn overzicht' : 'Volgende'}</Button></div><p className="mt-6 text-sm text-text-secondary">Vul geen namen, medische gegevens of incidentdetails in. Uw antwoorden worden niet via de URL gedeeld.</p></div>
}
