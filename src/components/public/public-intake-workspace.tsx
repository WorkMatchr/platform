'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  confirmPublicIntakeAIClassificationAction,
  recordPublicIntakeAnswerAction,
  recordPublicIntakeTopicSelectionAction,
} from '@/app/advieswijzer/actions'
import {
  getPublicIntakeAnswerLabel,
  getPublicIntakePrototypeQuestion,
} from '@/lib/public-intake/public-intake-prototype'
import { getAIIntakeUnderstanding } from '@/lib/public-intake/public-intake-ai-presentation'
import { presentPublicIntakeGuidance } from '@/lib/public-intake/public-intake-guidance-presentation'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import type { GuidanceOutcome } from '@/lib/guidance/guidance-domain'
import {
  PublicIntakeDesktopContext,
  PublicIntakeMobileContext,
} from './public-intake-context'
import { PublicIntakeRestartDialog } from './public-intake-restart-dialog'

type PendingAnswer = {
  disposition: 'ANSWERED' | 'UNKNOWN' | 'SKIPPED'
  value?: string | number | boolean
}

export function PublicIntakeGuidanceResult({
  outcome,
}: {
  outcome: GuidanceOutcome
}) {
  const presentation = presentPublicIntakeGuidance(outcome)

  return (
    <section
      className="rounded-card border border-border bg-surface p-5 sm:p-7"
      aria-labelledby="public-intake-situation-title"
    >
      <h2
        id="public-intake-situation-title"
        className="text-heading-2 font-bold leading-tight text-brand-dark"
      >
        Uw situatie
      </h2>
      <p className="mt-2 max-w-3xl text-text-secondary">
        {presentation.situationSummary}
      </p>
      {presentation.uncertainties.length > 0 && (
        <section
          className="mt-4 rounded-control border border-warning/30 bg-warning-subtle p-4"
          aria-labelledby="public-intake-uncertainties-title"
        >
          <h3
            id="public-intake-uncertainties-title"
            className="font-semibold text-brand-dark"
          >
            Nog niet volledig duidelijk
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
            {presentation.uncertainties.map((uncertainty) => (
              <li key={uncertainty}>{uncertainty}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 space-y-6">
        <section aria-labelledby="public-intake-advice-title">
          <p className="text-sm font-semibold text-brand-primary">
            Ons advies
          </p>
          <h3
            id="public-intake-advice-title"
            className="mt-1 text-xl font-bold text-brand-dark"
          >
            {presentation.adviceTitle}
          </h3>
          <p className="mt-2 max-w-3xl text-text-secondary">
            {presentation.adviceBody}
          </p>
        </section>

        <section aria-labelledby="public-intake-reasons-title">
          <h3
            id="public-intake-reasons-title"
            className="font-semibold text-brand-dark"
          >
            Waarom adviseren wij dit?
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
            {presentation.adviceReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="public-intake-self-actions-title">
          <h3
            id="public-intake-self-actions-title"
            className="font-semibold text-brand-dark"
          >
            Wat kunt u zelf al doen?
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-text-secondary">
            {presentation.selfActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="public-intake-expertise-title">
          <h3
            id="public-intake-expertise-title"
            className="font-semibold text-brand-dark"
          >
            Aanbevolen deskundigheid
          </h3>
          {presentation.primaryProfessionalRequirement ? (
            <div className="mt-2 rounded-control border border-brand-primary/25 bg-brand-primary-subtle p-4">
              <p className="font-semibold text-brand-dark">
                {presentation.primaryProfessionalRequirement.label}
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                {presentation.primaryProfessionalRequirement.reason}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Relevante expertise
              </p>
              <p className="mt-1 text-sm text-brand-dark">
                {presentation.primaryProfessionalRequirement.expertise.join(
                  ', ',
                )}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-text-secondary">
              Op basis van de beschikbare informatie is nog geen specifieke
              deskundigheid aan te bevelen.
            </p>
          )}

          {presentation.additionalProfessionalRequirements.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-brand-dark">
                Mogelijk aanvullend
              </p>
              <ul className="mt-2 space-y-2">
                {presentation.additionalProfessionalRequirements.map(
                  (requirement) => (
                    <li
                      key={`${requirement.label}:${requirement.reason}`}
                      className="rounded-control border border-border bg-surface-subtle p-3"
                    >
                      <p className="font-semibold text-brand-dark">
                        {requirement.label}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {requirement.reason}
                      </p>
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="public-intake-knowledge-title">
          <h3
            id="public-intake-knowledge-title"
            className="font-semibold text-brand-dark"
          >
            Relevante kennis en bronnen
          </h3>
          {presentation.knowledgeReferences.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {presentation.knowledgeReferences.map((reference) => (
                <li key={reference.id}>
                  <a
                    href={reference.href}
                    className="font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {reference.title}
                  </a>
                  <p className="mt-0.5 text-sm text-text-secondary">
                    {reference.summary}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-text-secondary">
              Er is nog geen specifieke kennisverwijzing beschikbaar.
            </p>
          )}
          {presentation.sourceReferences.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {presentation.sourceReferences.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-primary underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {source.title} ({source.publisher})
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="public-intake-next-steps-title">
          <h3
            id="public-intake-next-steps-title"
            className="font-semibold text-brand-dark"
          >
            Mogelijke vervolgstappen
          </h3>
          <p className="mt-2 text-text-secondary">
            Gebruik dit advies om uw situatie verder te beoordelen. Wanneer u
            professionele ondersteuning overweegt, kan de genoemde
            deskundigheid helpen om de vraag gericht te bespreken.
          </p>
        </section>

      </div>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-secondary">
        {presentation.disclaimer}
      </p>
    </section>
  )
}

export function PublicIntakeWorkspace({
  initialDraft,
  onRestart,
}: {
  initialDraft: PublicIntakeDraftView
  onRestart: () => void
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(null)
  const [numberAnswer, setNumberAnswer] = useState('')
  const [showTopicCorrection, setShowTopicCorrection] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState(
    initialDraft.answers.length > 0 ? 'Uw conceptsessie is hervat.' : '',
  )
  const [isPending, startTransition] = useTransition()
  const firstQuestionControlRef = useRef<HTMLInputElement>(null)
  const confirmationContainerRef = useRef<HTMLElement>(null)
  const clarification = draft.guidance.clarification
  const nextQuestionKey = clarification.nextQuestion?.key ?? null
  const currentStep = clarification.isComplete ? 'SUMMARY' : 'SITUATION'
  const isReadyForSummary =
    draft.guidance.completion.status === 'COMPLETED_WITH_GUIDANCE' ||
    draft.guidance.completion.status === 'COMPLETED_WITH_SAFE_FALLBACK'
  const baseQuestion = getPublicIntakePrototypeQuestion(nextQuestionKey)
  const understanding =
    nextQuestionKey === 'guidance_topic'
      ? getAIIntakeUnderstanding(draft.aiClassification)
      : null
  const showUnderstandingConfirmation =
    Boolean(understanding) && !showTopicCorrection
  const question =
    baseQuestion && showTopicCorrection && baseQuestion.questionKey === 'guidance_topic'
      ? {
          ...baseQuestion,
          legend: 'Waar gaat uw vraag dan vooral over?',
          explanation:
            'Kies het onderwerp dat het beste bij uw vraag past. Uw keuze vervangt ons voorstel.',
        }
      : baseQuestion

  const answeredQuestions = useMemo(
    () => draft.answers.filter((answer) => getPublicIntakePrototypeQuestion(answer.questionKey)),
    [draft.answers],
  )

  useEffect(() => {
    if (showUnderstandingConfirmation) {
      confirmationContainerRef.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus()
      return
    }
    if (nextQuestionKey) firstQuestionControlRef.current?.focus()
  }, [nextQuestionKey, showUnderstandingConfirmation])

  function saveAnswer(answer: PendingAnswer) {
    if (!question || isPending) return
    setPendingAnswer(answer)
    setSaveError(null)
    setSaveMessage('Uw antwoord wordt opgeslagen…')
    startTransition(() => {
      const action =
        question.questionKey === 'guidance_topic'
          ? recordPublicIntakeTopicSelectionAction
          : recordPublicIntakeAnswerAction
      void action({
        questionKey: question.questionKey,
        questionVersion: question.questionVersion,
        disposition: answer.disposition,
        ...(answer.value !== undefined ? { value: answer.value } : {}),
      }).then((result) => {
        if (!result.ok) {
          setSaveError(result.message)
          setSaveMessage('')
          return
        }
        setDraft(result.draft)
        setPendingAnswer(null)
        setNumberAnswer('')
        setSaveError(null)
        setSaveMessage(
          answer.disposition === 'SKIPPED' && question.skipMessage
            ? question.skipMessage
            : 'Uw antwoord is opgeslagen.',
        )
      })
    })
  }

  function confirmUnderstanding() {
    if (isPending) return
    setSaveError(null)
    setSaveMessage('Uw bevestiging wordt opgeslagen…')
    startTransition(() => {
      void confirmPublicIntakeAIClassificationAction().then((result) => {
        if (!result.ok) {
          setSaveError(result.message)
          setSaveMessage('')
          return
        }
        setDraft(result.draft)
        setShowTopicCorrection(false)
        setSaveError(null)
        setSaveMessage('Uw bevestiging is opgeslagen.')
      })
    })
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <PublicIntakeRestartDialog onAbandoned={onRestart} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(15rem,3fr)_minmax(0,7fr)] lg:items-start">
        <PublicIntakeDesktopContext step={currentStep} />

        <div className="min-w-0 space-y-3">
          <PublicIntakeMobileContext step={currentStep} />

        {showUnderstandingConfirmation && understanding && (
          <section
            ref={confirmationContainerRef}
            className="rounded-card border border-border bg-surface p-5 sm:p-6"
            aria-labelledby="public-intake-understanding-title"
          >
            <p className="text-sm font-semibold text-brand-primary">
              Uw hulpvraag
            </p>
            <p className="mt-1 break-words text-sm text-text-secondary">
              {draft.originalInput}
            </p>

            <h2
              id="public-intake-understanding-title"
              className="mt-5 text-[clamp(1.5rem,2.5vw,2rem)] font-bold leading-tight tracking-[-0.02em] text-brand-dark"
            >
              Als wij u goed begrijpen...
            </h2>
            <p className="mt-2 text-text-secondary">
              {understanding.summary}
            </p>

            <div className="mt-5 rounded-control border border-brand-primary/25 bg-brand-primary-subtle p-4">
              <p className="text-sm text-text-secondary">
                Dit lijkt ons het belangrijkste onderwerp van uw vraag:
              </p>
              <p className="mt-1 font-semibold text-brand-dark">
                {understanding.subjectLabel}
              </p>
            </div>

            <h3 className="mt-5 font-semibold text-brand-dark">Klopt dat?</h3>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={isPending}
                onClick={confirmUnderstanding}
              >
                Ja, dat klopt
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setShowTopicCorrection(true)
                  setSaveError(null)
                  setSaveMessage('')
                }}
              >
                Nee, ik bedoel iets anders
              </Button>
            </div>

            {saveError && (
              <p role="alert" className="mt-4 text-sm font-semibold text-error">
                {saveError}
              </p>
            )}
          </section>
        )}

        {question && !showUnderstandingConfirmation && (
          <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                if (question.inputKind === 'NUMBER' && numberAnswer.trim()) {
                  saveAnswer({ disposition: 'ANSWERED', value: numberAnswer })
                }
              }}
            >
              <fieldset
                disabled={isPending}
                aria-describedby="public-intake-question-help"
                aria-labelledby="public-intake-question-title"
              >
                <legend className="sr-only">{question.legend}</legend>
                <h2
                  id="public-intake-question-title"
                  className="text-[clamp(1.5rem,2.5vw,2rem)] font-bold leading-tight tracking-[-0.02em] text-brand-dark"
                >
                  {question.legend}
                </h2>
                <p id="public-intake-question-help" className="mt-2 text-text-secondary">
                  {question.explanation}
                </p>
                {question.inputKind === 'NUMBER' && (
                  <div className="mt-4 max-w-sm">
                    <label
                      htmlFor={question.questionKey}
                      className="block text-sm font-semibold text-brand-dark"
                    >
                      {question.numberLabel}
                    </label>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <input
                        ref={firstQuestionControlRef}
                        id={question.questionKey}
                        name={question.questionKey}
                        type="number"
                        min={1}
                        max={1000}
                        inputMode="numeric"
                        value={numberAnswer}
                        placeholder={question.numberPlaceholder}
                        onChange={(event) => setNumberAnswer(event.target.value)}
                        className="min-h-11 w-full rounded-control border border-border bg-surface px-4 py-2.5 text-brand-dark outline-none focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25"
                      />
                      <Button type="submit" disabled={!numberAnswer.trim()}>
                        Antwoord opslaan
                      </Button>
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(question.options ?? []).map((option, optionIndex) => {
                    const optionKey = `${option.disposition}:${option.value ?? ''}`
                    const selectedKey = pendingAnswer
                      ? `${pendingAnswer.disposition}:${pendingAnswer.value ?? ''}`
                      : null
                    return (
                      <label
                        key={optionKey}
                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border px-4 py-2.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-focus/25 ${
                          selectedKey === optionKey
                            ? 'border-brand-primary bg-brand-primary-subtle text-brand-dark'
                            : 'border-border bg-surface text-brand-dark hover:border-brand-primary'
                        }`}
                      >
                        <input
                          ref={optionIndex === 0 ? firstQuestionControlRef : undefined}
                          type="radio"
                          name={question.questionKey}
                          checked={selectedKey === optionKey}
                          onChange={() =>
                            saveAnswer({
                              disposition: option.disposition,
                              ...(option.value !== undefined
                                ? { value: option.value }
                                : {}),
                            })
                          }
                          className="size-4 shrink-0 accent-brand-primary focus-visible:outline-none"
                        />
                        <span>{option.label}</span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {saveError && (
                <div className="mt-4">
                  <p role="alert" className="text-sm font-semibold text-error">
                    {saveError}
                  </p>
                  {pendingAnswer && (
                    <Button
                      className="mt-3"
                      variant="outline"
                      onClick={() => saveAnswer(pendingAnswer)}
                    >
                      Probeer opnieuw
                    </Button>
                  )}
                </div>
              )}
            </form>
          </section>
        )}

        {isReadyForSummary && draft.guidance.outcome && (
          <PublicIntakeGuidanceResult outcome={draft.guidance.outcome} />
        )}

        {answeredQuestions.length > 0 && (
          <section
            className="rounded-card border border-border bg-surface-subtle p-4 sm:p-5"
            aria-labelledby="public-intake-answers-title"
          >
            <h2 id="public-intake-answers-title" className="font-semibold text-brand-dark">
              Uw antwoorden
            </h2>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {answeredQuestions.map((answer) => (
                <div key={answer.questionKey} className="min-w-0">
                  <dt className="text-xs text-text-secondary">
                    {getPublicIntakePrototypeQuestion(answer.questionKey)?.legend}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-brand-dark">
                    {getPublicIntakeAnswerLabel(answer)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

          <p aria-live="polite" aria-atomic="true" className="min-h-5 text-sm text-text-secondary">
            {saveMessage}
          </p>
        </div>
      </div>
    </div>
  )
}
