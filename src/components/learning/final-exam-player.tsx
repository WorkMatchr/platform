'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { saveFinalExamAnswerAction, submitFinalExamAction, updateFinalExamPositionAction } from '@/app/e-learnings/exam-actions'
import { Card } from '@/components/ui/card'

type ExamQuestion = {
  id: string
  code: string
  position: number
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE'
  questionText: string
  options: Array<{ value: string; text: string }>
}

type Props = {
  attemptId: string
  attemptNumber: number
  currentPosition: number
  questions: ExamQuestion[]
  savedAnswers: Record<string, unknown>
}

function answerIsSelected(answer: unknown, value: string) {
  return Array.isArray(answer) ? answer.includes(value) : answer === value
}

export function FinalExamPlayer({ attemptId, attemptNumber, currentPosition, questions, savedAnswers }: Props) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const dialogCancelRef = useRef<HTMLButtonElement>(null)
  const reviewTriggerRef = useRef<HTMLButtonElement>(null)
  const isPendingRef = useRef(false)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const saveSequence = useRef(0)
  const saveFailed = useRef(false)
  const [position, setPosition] = useState(currentPosition)
  const [answers, setAnswers] = useState<Record<string, unknown>>(savedAnswers)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [feedback, setFeedback] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const question = questions[position - 1]
  const answeredCount = useMemo(() => questions.filter((item) => {
    const answer = answers[item.id]
    return typeof answer === 'string' || (Array.isArray(answer) && answer.length > 0)
  }).length, [answers, questions])
  const unanswered = questions.length - answeredCount

  useEffect(() => { isPendingRef.current = isPending }, [isPending])
  useEffect(() => { headingRef.current?.focus() }, [position])

  function closeReview() {
    setReviewOpen(false)
    window.setTimeout(() => reviewTriggerRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!reviewOpen) return
    dialogCancelRef.current?.focus()

    function keepFocusInDialog(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        dialogCancelRef.current?.focus()
      }
    }

    function handleDialogKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!isPendingRef.current) closeReview()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) {
        event.preventDefault()
        dialogCancelRef.current?.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('focusin', keepFocusInDialog)
    document.addEventListener('keydown', handleDialogKeys)
    return () => {
      document.removeEventListener('focusin', keepFocusInDialog)
      document.removeEventListener('keydown', handleDialogKeys)
    }
  }, [reviewOpen])

  function persistAnswer(questionId: string, nextAnswer: unknown | null) {
    const sequence = ++saveSequence.current
    saveFailed.current = false
    setSaveState('saving')
    queue.current = queue.current.catch(() => undefined).then(async () => {
      const result = await saveFinalExamAnswerAction(attemptId, questionId, nextAnswer)
      if (sequence !== saveSequence.current) return
      if (result.ok) setSaveState('saved')
      else {
        saveFailed.current = true
        setSaveState('error')
        setFeedback(result.message)
      }
    })
  }

  function selectSingle(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }))
    setFeedback('')
    persistAnswer(questionId, value)
  }

  function toggleMulti(questionId: string, value: string) {
    const currentAnswer = Array.isArray(answers[questionId]) ? answers[questionId] as string[] : []
    const next = currentAnswer.includes(value) ? currentAnswer.filter((item) => item !== value) : [...currentAnswer, value]
    setAnswers((current) => ({ ...current, [questionId]: next }))
    setFeedback('')
    persistAnswer(questionId, next.length ? next : null)
  }

  function goTo(nextPosition: number) {
    if (nextPosition < 1 || nextPosition > questions.length) return
    setPosition(nextPosition)
    startTransition(async () => { await updateFinalExamPositionAction(attemptId, nextPosition) })
  }

  async function submit() {
    setFeedback('')
    await queue.current
    if (saveFailed.current) {
      setFeedback('Een antwoord is nog niet opgeslagen. Probeer de laatste wijziging opnieuw voordat u inlevert.')
      closeReview()
      return
    }
    const result = await submitFinalExamAction(attemptId)
    if (result.ok) router.push(result.href)
    else setFeedback(result.message)
  }

  if (!question) return <Card><p>Deze toetspoging is niet beschikbaar.</p><Link href="/e-learnings/mijn">Terug naar Mijn e-learnings</Link></Card>

  const selectedAnswer = answers[question.id]
  const questionStatus = (item: ExamQuestion) => {
    const answer = answers[item.id]
    return typeof answer === 'string' || (Array.isArray(answer) && answer.length > 0)
  }

  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <div inert={reviewOpen}>
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-primary">Eindtoets · poging {attemptNumber}</p>
          <p role="status" aria-live="polite" className="text-sm text-text-secondary">{saveState === 'saving' ? 'Opslaan…' : saveState === 'error' ? 'Niet opgeslagen' : 'Opgeslagen'}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <button type="button" className="min-h-11 rounded-control border border-border px-4 font-semibold text-brand-primary disabled:opacity-40" onClick={() => goTo(position - 1)} disabled={position === 1 || isPending}>Vorige</button>
          <p className="text-sm font-semibold text-text-secondary">Vraag {position} van {questions.length}</p>
          <button type="button" className="min-h-11 rounded-control border border-border px-4 font-semibold text-brand-primary disabled:opacity-40" onClick={() => goTo(position + 1)} disabled={position === questions.length || isPending}>Volgende</button>
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-tight text-brand-dark outline-none">{question.questionText}</h1>
        {question.type === 'MULTI_CHOICE' && <p className="rounded-card border border-brand-primary/20 bg-brand-primary/5 p-3 text-sm font-medium leading-6 text-brand-dark">Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.</p>}
        <fieldset className="space-y-3">
          <legend className="sr-only">{question.type === 'MULTI_CHOICE' ? 'Meerdere antwoorden mogelijk' : 'Kies één antwoord'}</legend>
          {question.options.map((option) => <label key={option.value} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-card border border-border p-4 hover:border-brand-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-primary">
            <input
              type={question.type === 'MULTI_CHOICE' ? 'checkbox' : 'radio'}
              name={`answer-${question.id}`}
              value={option.value}
              checked={answerIsSelected(selectedAnswer, option.value)}
              onChange={() => question.type === 'MULTI_CHOICE' ? toggleMulti(question.id, option.value) : selectSingle(question.id, option.value)}
              className="mt-1 size-5 shrink-0 accent-brand-primary"
            />
            <span className="leading-6 text-brand-dark">{option.text}</span>
          </label>)}
        </fieldset>
        {feedback && <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger">{feedback}</p>}
      </Card>
      <Card className="space-y-3">
        <p className="font-semibold text-brand-dark">Antwoordstatus</p>
        <p className="text-sm text-text-secondary">Beantwoord: {answeredCount} van {questions.length} · onbeantwoord: {unanswered}</p>
        <button ref={reviewTriggerRef} type="button" onClick={() => setReviewOpen(true)} className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark">Toets inleveren</button>
        <Link className="ml-4 inline-flex min-h-11 items-center font-semibold text-brand-primary hover:underline" href="/e-learnings/mijn">Toets verlaten — antwoorden worden bewaard</Link>
      </Card>
    </div>
    <Card className="h-fit space-y-3">
      <h2 className="text-lg font-bold text-brand-dark">Vragenoverzicht</h2>
      <p className="text-sm text-text-secondary">Huidige vraag, beantwoord of onbeantwoord.</p>
      <nav aria-label="Vragenoverzicht" className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5">
        {questions.map((item) => {
          const answered = questionStatus(item)
          return <button key={item.id} type="button" aria-current={item.position === position ? 'step' : undefined}
            aria-label={`Vraag ${item.position}, ${item.position === position ? 'huidige vraag, ' : ''}${answered ? 'beantwoord' : 'onbeantwoord'}`}
            onClick={() => goTo(item.position)}
            className={`min-h-11 rounded-control border px-2 text-sm font-semibold ${item.position === position ? 'border-brand-primary bg-brand-primary text-text-on-dark' : answered ? 'border-success/50 bg-success/10 text-brand-dark' : 'border-border bg-surface text-brand-dark'}`}>
            {item.position}<span className="sr-only"> — {answered ? 'beantwoord' : 'onbeantwoord'}</span>
          </button>
        })}
      </nav>
      <p className="text-sm text-text-secondary"><span aria-hidden="true">●</span> Beantwoord · <span aria-hidden="true">○</span> Onbeantwoord · huidige vraag is omlijnd met merkaccent.</p>
    </Card>
    </div>
    {reviewOpen && <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="exam-submit-title" aria-describedby="exam-submit-instructions" className="w-full max-w-lg space-y-4 rounded-card bg-surface p-6 shadow-xl">
        <h2 id="exam-submit-title" className="text-xl font-bold text-brand-dark">Toets inleveren?</h2>
        <p id="exam-submit-instructions" className="leading-6">Beantwoord: {answeredCount} van {questions.length}. Onbeantwoord: {unanswered}.</p>
        {unanswered > 0 && <p className="rounded-card border border-warning/30 bg-warning/10 p-3 text-sm leading-6">U heeft nog {unanswered} onbeantwoorde vragen. Onbeantwoorde vragen leveren 0 punten op.</p>}
        <p className="text-sm leading-6 text-text-secondary">Na definitief inleveren kunt u de antwoorden van deze poging niet meer wijzigen.</p>
        {feedback && <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger">{feedback}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <button ref={dialogCancelRef} type="button" onClick={closeReview} className="min-h-11 rounded-control border border-border px-4 font-semibold text-brand-primary">Terug naar de toets</button>
          <button type="button" disabled={isPending || saveState === 'saving'} onClick={() => startTransition(() => { void submit() })} className="min-h-11 rounded-control bg-brand-primary px-4 font-semibold text-text-on-dark disabled:opacity-50">Toch inleveren</button>
        </div>
      </section>
    </div>}
  </div>
}
