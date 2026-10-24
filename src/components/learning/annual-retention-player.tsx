'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { answerAnnualRetentionQuestionAction } from '@/app/e-learnings/retention-actions'
import { Card } from '@/components/ui/card'

type AnnualCheck = {
  nextPosition: number | null
  questions: Array<{
    position: number
    answered: boolean
    presentation: {
      type: 'SINGLE_CHOICE' | 'MULTI_CHOICE'
      questionText: string
      multiSelectInstruction: string | null
      options: Array<{ value: string; text: string; selected: boolean; review?: 'CORRECT' | 'INCORRECT' | 'MISSED' }>
      feedback: { isCorrect: boolean; label: 'Goed' | 'Niet helemaal'; explanation: string } | null
    }
  }>
}

export function AnnualRetentionPlayer({ check }: { check: AnnualCheck }) {
  const router = useRouter()
  const [position, setPosition] = useState(check.nextPosition ?? 1)
  const [selection, setSelection] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; label: string; explanation: string } | null>(null)
  const [error, setError] = useState('')
  const [answeredPositions, setAnsweredPositions] = useState(() => new Set(check.questions.filter((item) => item.answered).map((item) => item.position)))
  const [isPending, startTransition] = useTransition()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const current = check.questions[position - 1]
  const selectedValues = current?.answered ? current.presentation.options.filter((option) => option.selected).map((option) => option.value) : selection
  const answeredCount = answeredPositions.size

  useEffect(() => { headingRef.current?.focus() }, [position])

  function toggle(value: string) {
    if (!current || current.answered || isPending) return
    setSelection((values) => current.presentation.type === 'SINGLE_CHOICE'
      ? [value]
      : values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
    setError('')
  }

  function checkAnswer() {
    if (!current || current.answered || selectedValues.length === 0 || isPending) return
    setError('')
    const answer: string | string[] = current.presentation.type === 'SINGLE_CHOICE' ? selectedValues[0]! : selectedValues
    startTransition(async () => {
      const result = await answerAnnualRetentionQuestionAction(position, answer)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setFeedback({
        isCorrect: result.result.isCorrect,
        label: result.result.isCorrect ? 'Goed' : 'Niet helemaal',
        explanation: result.result.feedback,
      })
      setAnsweredPositions((previous) => new Set(previous).add(position))
      window.setTimeout(() => feedbackRef.current?.focus(), 0)
      if (result.result.progress?.completed) router.refresh()
    })
  }

  function goTo(nextPosition: number) {
    if (nextPosition < 1 || nextPosition > check.questions.length) return
    setFeedback(check.questions[nextPosition - 1]?.presentation.feedback ?? null)
    setSelection(check.questions[nextPosition - 1]?.presentation.options.filter((option) => option.selected).map((option) => option.value) ?? [])
    setError('')
    setPosition(nextPosition)
  }

  if (!current) return <Card><p>Deze jaarlijkse kennischeck is niet beschikbaar.</p></Card>
  const existingFeedback = current.presentation.feedback
  const visibleFeedback = existingFeedback ?? feedback

  return <div className="space-y-5">
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-primary">Jaarlijkse kennischeck</p>
        <p role="status" className="text-sm text-text-secondary">Beantwoord: {answeredCount} van 10</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => goTo(position - 1)} disabled={position === 1 || isPending} className="min-h-11 rounded-control border border-border px-4 font-semibold text-brand-primary disabled:opacity-50">Vorige</button>
        <p className="text-sm font-semibold text-text-secondary">Vraag {position} van 10</p>
        <button type="button" onClick={() => goTo(position + 1)} disabled={position === 10 || isPending} className="min-h-11 rounded-control border border-border px-4 font-semibold text-brand-primary disabled:opacity-50">Volgende</button>
      </div>
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold leading-tight text-brand-dark outline-none">{current.presentation.questionText}</h1>
      {current.presentation.multiSelectInstruction && <p className="rounded-card border border-brand-primary/20 bg-brand-primary/5 p-3 text-sm font-medium leading-6 text-brand-dark">{current.presentation.multiSelectInstruction}</p>}
      <fieldset className="space-y-3" disabled={current.answered || isPending}>
        <legend className="sr-only">{current.presentation.type === 'MULTI_CHOICE' ? 'Meerdere antwoorden mogelijk' : 'Kies één antwoord'}</legend>
        {current.presentation.options.map((option) => <label key={option.value} className="flex min-h-14 cursor-pointer items-start gap-3 rounded-card border border-border p-4 hover:border-brand-primary focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-primary">
          <input
            type={current.presentation.type === 'MULTI_CHOICE' ? 'checkbox' : 'radio'}
            name={`annual-answer-${position}`}
            value={option.value}
            checked={selectedValues.includes(option.value)}
            onChange={() => toggle(option.value)}
            className="mt-1 size-5 shrink-0 accent-brand-primary"
          />
          <span className="min-w-0 flex-1 leading-6 text-brand-dark">{option.text}</span>
          {option.review && <span className="text-sm font-semibold text-text-secondary">{option.review === 'CORRECT' ? 'Geselecteerd en juist' : option.review === 'MISSED' ? 'Niet geselecteerd' : 'Geselecteerd en niet juist'}</span>}
        </label>)}
      </fieldset>
      {error && <p role="alert" className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm leading-6 text-danger">{error}</p>}
      {visibleFeedback && <div ref={feedbackRef} tabIndex={-1} aria-live="polite" className={`space-y-2 rounded-card border p-4 outline-none ${visibleFeedback.isCorrect ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/10'}`}>
        <p className="font-semibold text-brand-dark">{visibleFeedback.label}</p>
        <p className="text-sm leading-6 text-brand-dark">{visibleFeedback.explanation}</p>
      </div>}
      {!current.answered && <button type="button" onClick={checkAnswer} disabled={selectedValues.length === 0 || isPending} aria-busy={isPending} className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-text-on-dark disabled:opacity-50">{isPending ? 'Antwoord controleren…' : 'Controleer antwoord'}</button>}
    </Card>
  </div>
}
