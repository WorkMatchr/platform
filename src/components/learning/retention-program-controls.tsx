'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { answerRetentionQuestionAction, setAnnualReminderConsentAction, startRetentionParticipationAction, stopRetentionParticipationAction } from '@/app/e-learnings/retention-actions'

export function RetentionOptIn() {
  const formRef = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return <form ref={formRef} className="space-y-4" onSubmit={(event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await startRetentionParticipationAction(form)
      setMessage(result.message)
      if (result.ok) router.refresh()
    })
  }}>
    <h2 className="text-xl font-bold text-brand-dark">Houd uw RI&E-kennis actief</h2>
    <p>Wilt u de komende 12 weken uw kennis blijven onderhouden?</p>
    <p>Iedere week staat een korte kennischeck van 5 vragen voor u klaar. Dat kost ongeveer 3–5 minuten.</p>
    <p>We sturen u één e-mail wanneer een nieuwe kennischeck klaarstaat. Deze berichten gaan uitsluitend over uw opleiding en kennisbehoud. Geen reclame of commerciële berichten.</p>
    <p>Deelname is vrijwillig en u kunt op ieder moment stoppen.</p>
    <label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5 accent-brand-primary" type="checkbox" name="consent" value="yes" required /><span>Ja, ik wil deelnemen aan 12 weken kennisbehoud.</span></label>
    <button disabled={pending} className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark disabled:opacity-60" type="submit">{pending ? 'Deelname starten…' : 'Deelnemen'}</button>
    {message && <p role="status" aria-live="polite" className="text-sm text-text-secondary">{message}</p>}
  </form>
}

export function AnnualReminderConsent({ enabled, scheduledFor, sent }: { enabled: boolean; scheduledFor: string | null; sent: boolean }) {
  const [consented, setConsented] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  async function change(value: boolean) {
    startTransition(async () => {
      const result = await setAnnualReminderConsentAction(value)
      setMessage(result.ok ? (value ? 'Jaarherinnering ingeschakeld.' : 'Jaarherinnering uitgeschakeld.') : result.message)
      if (result.ok) { setConsented(false); router.refresh() }
    })
  }
  return <section className="space-y-3 border-t border-border pt-4" aria-labelledby="annual-reminder-title">
    <h2 id="annual-reminder-title" className="text-lg font-bold text-brand-dark">Jaarherinnering</h2>
    <p className="text-sm leading-6 text-text-secondary">Herinner mij over ongeveer één jaar om mijn RI&E-kennis opnieuw te controleren. Dit is een aparte, vrijwillige keuze en verandert niets aan uw certificaat.</p>
    {sent ? <>
      <p role="status">De jaarherinnering is verzonden. U kunt de jaarlijkse kennischeck openen.</p>
      <Link className="inline-flex min-h-11 items-center font-semibold text-brand-primary underline" href="/e-learnings/rie-in-de-praktijk/kennisbehoud/jaarlijks">Open jaarlijkse kennischeck</Link>
    </> : enabled ? <>
      {scheduledFor && <p className="text-sm">Gepland rond {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date(scheduledFor))}.</p>}
      <button type="button" disabled={pending} onClick={() => change(false)} className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary">Jaarherinnering uitschakelen</button>
    </> : <>
      <label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5 accent-brand-primary" type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} /><span>Ja, stuur mij één herinnering over ongeveer één jaar.</span></label>
      <button type="button" disabled={!consented || pending} onClick={() => change(true)} className="inline-flex min-h-11 items-center rounded-control border border-brand-primary px-4 font-semibold text-brand-primary disabled:opacity-50">Jaarherinnering inschakelen</button>
    </>}
    {message && <p role="status" aria-live="polite" className="text-sm text-text-secondary">{message}</p>}
  </section>
}

export function StopRetention({ participationId }: { participationId: string }) {
  const [confirm, setConfirm] = useState(false)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  return <div className="space-y-3 border-t border-border pt-4">
    {!confirm ? <button type="button" onClick={() => setConfirm(true)} className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary">Kennisbehoud stoppen</button> : <div className="space-y-3" role="group" aria-label="Stoppen met kennisbehoud bevestigen">
      <p>Als u stopt, ontvangt u geen nieuwe wekelijkse kennischecks of e-mails meer. Uw opleiding, examenuitslag en certificaat blijven gewoon beschikbaar.</p>
      <button type="button" disabled={pending} onClick={() => startTransition(async () => {
        const result = await stopRetentionParticipationAction(participationId)
        setMessage(result.ok ? 'Uw deelname is gestopt.' : result.message)
        setConfirm(false); router.refresh()
      })} className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark">Bevestig stoppen</button>
      <button type="button" onClick={() => setConfirm(false)} className="ml-3 inline-flex min-h-11 items-center px-4 font-semibold text-brand-primary">Annuleren</button>
    </div>}
    {message && <p role="status">{message}</p>}
  </div>
}

type WeeklyCheck = {
  id: string; participationId: string; weekNumber: number; currentPosition: number | null; answeringAllowed: boolean
  questions: Array<{ id: string; position: number; answered: boolean; presentation: {
    type: 'SINGLE_CHOICE' | 'MULTI_CHOICE'; questionText: string; multiSelectInstruction: string | null
    options: Array<{ value: string; text: string; selected: boolean; review?: 'CORRECT' | 'INCORRECT' | 'MISSED' }>
    feedback: null | { isCorrect: boolean; label: string; explanation: string; missedCorrectOptions: string[]; selectedIncorrectOptions: string[] }
  }}>
  result: null | { title: string; score: string; correct: number; maxScore: number; attentionAreas: string[]; strongAreas: string[]; chapterLinks: Array<{ knowledgeArea: string; chapterNumber: number; href: string }> }
}

export function RetentionWeeklyPlayer({ check }: { check: WeeklyCheck }) {
  const [index, setIndex] = useState(Math.max(0, (check.currentPosition ?? 1) - 1))
  const [selected, setSelected] = useState<string[]>([])
  const [localFeedback, setLocalFeedback] = useState<null | { correct: boolean; explanation: string; missedCorrectOptions: string[]; selectedIncorrectOptions: string[] }>(null)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const heading = useRef<HTMLHeadingElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const question = check.questions[index]
  const goNext = () => { setIndex((value) => Math.min(check.questions.length - 1, value + 1)); setSelected([]); setLocalFeedback(null); setError(''); router.refresh() }
  useEffect(() => { if (localFeedback) feedbackRef.current?.focus(); else heading.current?.focus() }, [index, localFeedback])
  if (check.result) return <section className="space-y-4" aria-labelledby="retention-result-title">
    <h2 id="retention-result-title" tabIndex={-1} className="text-2xl font-bold text-brand-dark">{check.result.title}</h2>
    <p className="text-lg font-semibold">{check.result.score}</p>
    {check.result.strongAreas.length > 0 && <p>Sterk: {check.result.strongAreas.join(', ')}</p>}
    {check.result.attentionAreas.length > 0 && <div><p>Opnieuw bekijken: {check.result.attentionAreas.join(', ')}</p><ul className="mt-2 list-inside list-disc">{check.result.chapterLinks.map((link) => <li key={`${link.chapterNumber}-${link.knowledgeArea}`}><a className="font-semibold text-brand-primary underline" href={link.href}>{link.knowledgeArea} — hoofdstuk {link.chapterNumber}</a></li>)}</ul></div>}
    <Link className="inline-flex min-h-11 items-center rounded-control border border-border px-4 font-semibold text-brand-primary" href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link>
  </section>
  if (!question) return <p>Deze kennischeck is niet beschikbaar.</p>
  const answered = question.answered
  const feedback = localFeedback ?? (question.presentation.feedback ? {
    correct: question.presentation.feedback.isCorrect,
    explanation: question.presentation.feedback.explanation,
    missedCorrectOptions: question.presentation.feedback.missedCorrectOptions,
    selectedIncorrectOptions: question.presentation.feedback.selectedIncorrectOptions,
  } : null)
  const submit = () => startTransition(async () => {
    setError('')
    const result = await answerRetentionQuestionAction({ participationId: check.participationId, checkId: check.id, weeklyQuestionId: question.id, answer: question.presentation.type === 'SINGLE_CHOICE' ? selected[0] : selected })
    if (!result.ok) { setError(result.message); return }
    setLocalFeedback({ correct: result.result.correct, explanation: result.result.feedback, missedCorrectOptions: result.result.missedCorrectOptions, selectedIncorrectOptions: result.result.selectedIncorrectOptions })
  })
  return <section className="space-y-5" aria-labelledby="weekly-question-title">
    <p className="text-sm font-semibold text-brand-primary">Week {check.weekNumber} van 12 · Vraag {question.position} van 5</p>
    <h2 id="weekly-question-title" ref={heading} tabIndex={-1} className="text-xl font-bold leading-7 text-brand-dark">{question.presentation.questionText}</h2>
    {question.presentation.multiSelectInstruction && <p className="text-sm font-semibold">{question.presentation.multiSelectInstruction}</p>}
    <fieldset disabled={answered || Boolean(localFeedback) || pending} className="space-y-3">
      <legend className="sr-only">{question.presentation.type === 'SINGLE_CHOICE' ? 'Kies één antwoord' : 'Kies alle juiste antwoorden'}</legend>
      {question.presentation.options.map((option) => <label key={option.value} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-card border border-border p-4 leading-6 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2">
        <input className="mt-1 size-5 shrink-0 accent-brand-primary" type={question.presentation.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={`retention-${question.id}`} checked={selected.includes(option.value) || (answered && option.selected)} onChange={() => setSelected((values) => question.presentation.type === 'SINGLE_CHOICE' ? [option.value] : values.includes(option.value) ? values.filter((value) => value !== option.value) : [...values, option.value])} />
        <span>{option.text}{option.review && <span className="ml-2 text-sm font-semibold">{option.review === 'CORRECT' ? 'Gekozen — juist' : option.review === 'INCORRECT' ? 'Gekozen — niet juist' : 'Niet gekozen — juiste onderdeel'}</span>}{localFeedback && (selected.includes(option.value) || localFeedback.missedCorrectOptions.includes(option.value)) && <span className="ml-2 text-sm font-semibold">{selected.includes(option.value) ? localFeedback.selectedIncorrectOptions.includes(option.value) ? 'Gekozen — niet juist' : 'Gekozen — juist' : 'Niet gekozen — juiste onderdeel'}</span>}</span>
      </label>)}
    </fieldset>
    {!check.answeringAllowed && !answered && <p role="status" className="rounded-card border border-warning/40 p-3">Deze kennischeck kan niet meer worden ingevuld. Opgeslagen antwoorden blijven zichtbaar.</p>}
    {!answered && !localFeedback && check.answeringAllowed && <button type="button" disabled={pending || selected.length === 0} onClick={submit} className="inline-flex min-h-11 items-center rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark disabled:opacity-50">{pending ? 'Antwoord controleren…' : 'Controleer antwoord'}</button>}
    {error && <p role="alert" className="rounded-card border border-danger/40 p-3">{error}</p>}
    {(answered || localFeedback) && feedback && <div ref={feedbackRef} tabIndex={-1} role="status" aria-live="polite" className="space-y-2 rounded-card border border-border bg-surface p-4 outline-none"><p className="font-bold">{feedback.correct ? 'Goed' : 'Niet helemaal'}</p><p>{feedback.explanation}</p>{feedback.missedCorrectOptions.length > 0 && <p>Gemist: {feedback.missedCorrectOptions.join(', ')}</p>}{feedback.selectedIncorrectOptions.length > 0 && <p>Niet juist gekozen: {feedback.selectedIncorrectOptions.join(', ')}</p>}
      {index < 4 ? <button type="button" onClick={goNext} className="mt-2 inline-flex min-h-11 items-center rounded-control border border-brand-primary px-4 font-semibold text-brand-primary">Volgende vraag</button> : <button type="button" onClick={() => router.refresh()} className="mt-2 inline-flex min-h-11 items-center rounded-control border border-brand-primary px-4 font-semibold text-brand-primary">Resultaat bekijken</button>}
    </div>}
  </section>
}
