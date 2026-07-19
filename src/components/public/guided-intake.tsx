'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { fieldClassName } from '@/components/auth/auth-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { buildGuidedIntakeResult } from '@/lib/guided-intake/guided-intake-engine'
import { validateGuidedAnswer } from '@/lib/guided-intake/guided-intake-flow'
import {
  guidedIntakeQuestions,
  MAX_DECISION_MOMENTS,
  unavailableStartingSituations,
} from '@/lib/guided-intake/guided-intake-questions'
import type {
  GuidedAnswers,
  GuidedAnswerValue,
  GuidedIntakeResult,
} from '@/lib/guided-intake/guided-intake-types'

function AdviceResult({ result, onRevise, onRestart }: {
  result: GuidedIntakeResult
  onRevise: () => void
  onRestart: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="space-y-8">
      <Card className="border-brand-primary/30 shadow-none">
        <Badge variant="success">Eerste advies</Badge>
        <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-balance text-heading-2 font-bold leading-tight tracking-[-0.025em] outline-none">
          {result.recommendation.title}
        </h2>
        <Text size="lg" className="mt-4 text-text-secondary">{result.recommendation.summary}</Text>

        <Heading as="h3" size="h3" className="mt-8">Waarom dit advies past</Heading>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-text-secondary">
          {result.recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>

        <Heading as="h3" size="h3" className="mt-8">Wat u nu kunt doen</Heading>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-text-secondary">
          {result.recommendation.nextActions.map((action) => <li key={action}>{action}</li>)}
        </ol>
      </Card>

      <Card variant="subtle" className="shadow-none">
        <Heading as="h2" size="h3">Uw antwoorden in hoofdlijnen</Heading>
        <ul className="mt-4 space-y-2 text-sm text-text-secondary">
          {result.facts.map((fact) => <li key={fact.key}>• {fact.label}</li>)}
        </ul>
      </Card>

      <section aria-labelledby="guidance-links-title">
        <Heading as="h2" size="h3" id="guidance-links-title">Lees eerst de relevante uitleg</Heading>
        <Text className="mt-3 text-text-secondary">
          Gebruik deze informatie om het advies te controleren en uw situatie verder te verduidelijken.
        </Text>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {result.recommendation.knowledgeLinks.map((link) => (
            <LinkButton key={link.href} href={link.href} variant="outline">{link.label}</LinkButton>
          ))}
        </div>
      </section>

      <section aria-labelledby="service-links-title" className="border-t border-border pt-8">
        <Heading as="h2" size="h3" id="service-links-title">Mogelijke dienstverlening</Heading>
        <Text className="mt-3 text-text-secondary">
          Wilt u na het lezen van het advies ondersteuning onderzoeken? Bekijk dan pas welke dienstverlening kan passen.
        </Text>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {result.recommendation.serviceLinks.map((link) => (
            <LinkButton key={link.href} href={link.href}>{link.label}</LinkButton>
          ))}
        </div>
      </section>

      <p className="rounded-control bg-surface-subtle p-4 text-sm text-text-secondary">{result.disclaimer}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onRevise}>Pas het laatste antwoord aan</Button>
        <Button variant="ghost" onClick={onRestart}>Begin opnieuw</Button>
      </div>
    </div>
  )
}

export function GuidedIntake() {
  const [answers, setAnswers] = useState<GuidedAnswers>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GuidedIntakeResult | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fieldsetRef = useRef<HTMLFieldSetElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)
  const descriptionId = useId()
  const errorId = useId()
  const questionTitleId = useId()
  const question = guidedIntakeQuestions[currentIndex]
  const selectedValue = answers[question.id]

  useEffect(() => {
    if (!result) headingRef.current?.focus()
  }, [currentIndex, result])

  function selectAnswer(value: GuidedAnswerValue) {
    setAnswers((current) => ({
      ...current,
      [question.id]: value,
      ...(question.id === 'DESIRED_TIMING' && value !== 'SPECIFIC_DATE' ? { desiredDate: undefined } : {}),
    }))
    setError(null)
  }

  function continueJourney() {
    const message = validateGuidedAnswer(question.id, answers)
    if (message) {
      setError(message)
      if (question.id === 'DESIRED_TIMING' && selectedValue === 'SPECIFIC_DATE') {
        dateRef.current?.focus()
      } else {
        fieldsetRef.current?.focus()
      }
      return
    }

    setError(null)
    if (currentIndex === guidedIntakeQuestions.length - 1) {
      setResult(buildGuidedIntakeResult(answers))
      return
    }
    setCurrentIndex((index) => index + 1)
  }

  function goBack() {
    setError(null)
    setCurrentIndex((index) => Math.max(0, index - 1))
  }

  function restart() {
    setAnswers({})
    setCurrentIndex(0)
    setError(null)
    setResult(null)
  }

  if (result) {
    return (
      <AdviceResult
        result={result}
        onRevise={() => setResult(null)}
        onRestart={restart}
      />
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <Card className="min-w-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-secondary">
          <span>Vraag {currentIndex + 1} van {MAX_DECISION_MOMENTS}</span>
          <span>{Math.round(((currentIndex + 1) / MAX_DECISION_MOMENTS) * 100)}% van de stappen</span>
        </div>
        <progress
          className="mt-3 h-2 w-full accent-brand-primary"
          max={MAX_DECISION_MOMENTS}
          value={currentIndex + 1}
          aria-label="Voortgang Advieswijzer"
        />

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            continueJourney()
          }}
          noValidate
        >
          <h2
            ref={headingRef}
            id={questionTitleId}
            tabIndex={-1}
            className="text-balance text-heading-2 font-bold leading-tight tracking-[-0.025em] outline-none"
          >
            {question.title}
          </h2>
          <Text id={descriptionId} className="mt-3 text-text-secondary">{question.helpText}</Text>

          <fieldset
            ref={fieldsetRef}
            tabIndex={-1}
            aria-labelledby={questionTitleId}
            aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ''}`}
            aria-invalid={Boolean(error)}
            className="mt-6 min-w-0 outline-none"
          >

            <div className="grid gap-3">
              {question.options.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-control border p-4 transition-colors ${
                    selectedValue === option.value
                      ? 'border-brand-primary bg-brand-primary-subtle'
                      : 'border-border bg-surface hover:border-brand-primary/60'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={selectedValue === option.value}
                    onChange={() => selectAnswer(option.value)}
                    className="mt-1 size-4 accent-brand-primary"
                  />
                  <span>
                    <span className="block font-semibold text-brand-dark">{option.label}</span>
                    {'description' in option && option.description && (
                      <span className="mt-1 block text-sm text-text-secondary">{option.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>

            {'dateRefinement' in question && selectedValue === question.dateRefinement.when && (
              <div className="mt-6 rounded-control border border-border bg-surface-subtle p-4">
                <label htmlFor="guided-desired-date" className="font-semibold text-brand-dark">
                  {question.dateRefinement.label}
                </label>
                <p className="mt-1 text-sm text-text-secondary" id="guided-desired-date-help">
                  {question.dateRefinement.helpText}
                </p>
                <input
                  ref={dateRef}
                  id="guided-desired-date"
                  type="date"
                  value={answers.desiredDate ?? ''}
                  onInput={(event) => {
                    const desiredDate = event.currentTarget.value
                    setAnswers((current) => ({ ...current, desiredDate }))
                    setError(null)
                  }}
                  aria-describedby={`guided-desired-date-help${error ? ` ${errorId}` : ''}`}
                  aria-invalid={Boolean(error)}
                  className={`${fieldClassName} max-w-xs`}
                />
              </div>
            )}
          </fieldset>

          {error && <p id={errorId} role="alert" className="mt-4 text-sm font-semibold text-error">{error}</p>}

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {currentIndex > 0 ? <Button variant="ghost" onClick={goBack}>Vorige vraag</Button> : <span />}
            <Button type="submit">
              {currentIndex === guidedIntakeQuestions.length - 1 ? 'Bekijk uw advies' : 'Volgende vraag'}
            </Button>
          </div>
        </form>
      </Card>

      <aside className="rounded-card border border-border bg-surface-subtle p-5 text-sm text-text-secondary">
        <p className="font-semibold text-brand-dark">Over deze Advieswijzer</p>
        <ul className="mt-3 space-y-2">
          <li>• maximaal vijf gerichte stappen;</li>
          <li>• geen account of opslag;</li>
          <li>• algemene vraagverheldering, geen individueel juridisch advies.</li>
        </ul>

        {question.id === 'START_SITUATION' && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="font-semibold text-brand-dark">Andere situaties</p>
            <p className="mt-2">Deze routes zijn nog niet interactief beschikbaar:</p>
            <ul className="mt-3 space-y-2">
              {unavailableStartingSituations.map((situation) => (
                <li key={situation}>{situation} <span className="font-semibold">— volgt later</span></li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
