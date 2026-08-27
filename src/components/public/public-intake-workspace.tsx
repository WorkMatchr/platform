'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
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
  PublicHelpRequestProgress,
  PublicIntakeMobileContext,
} from './public-intake-context'
import { PublicIntakeRestartDialog } from './public-intake-restart-dialog'
import { ProfessionalRequirementList } from '@/components/advice-dossiers/professional-requirement-list'
import { AdviceDossierReadyActions } from './advice-dossier-ready-actions'
import { authClient } from '@/lib/auth-client'

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
          <ProfessionalRequirementList
            primary={presentation.primaryProfessionalRequirement}
            additional={
              presentation.additionalProfessionalRequirements
            }
            possible={presentation.possibleProfessionalRequirements}
          />
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

export function AnonymousAdviceSavePanel({ experience = 'ADVICE_GUIDE' }: { experience?: 'ADVICE_GUIDE' | 'HELP_REQUEST_V2' }) {
  const { data: session } = authClient.useSession()
  const returnTo = experience === 'HELP_REQUEST_V2' ? '/hulpvragen/start' : '/advieswijzer'
  return (
    <section
      className="rounded-card border border-border bg-surface-subtle p-5 sm:p-6"
      aria-labelledby="anonymous-advice-save-title"
    >
      <h2
        id="anonymous-advice-save-title"
        className="text-lg font-bold text-brand-dark"
      >
        {experience === 'HELP_REQUEST_V2' ? 'Doorgaan met mijn aanvraag' : 'Wilt u dit advies bewaren?'}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
        {experience === 'HELP_REQUEST_V2'
          ? 'Log in of maak een opdrachtgeveraccount aan. Uw ingevulde hulpvraag blijft op dit apparaat bewaard.'
          : 'Log in met een opdrachtgeveraccount om dit advies op te slaan in Mijn adviesdossiers.'}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {session ? (
          <LinkButton href={`/organisatie/nieuw?returnTo=${encodeURIComponent(returnTo)}`}>Organisatie aanmaken en doorgaan</LinkButton>
        ) : (
          <>
            <LinkButton href={`/inloggen?returnTo=${encodeURIComponent(returnTo)}`}>Inloggen en doorgaan</LinkButton>
            <LinkButton href={`/registreren?returnTo=${encodeURIComponent(returnTo)}`} variant="outline">Account aanmaken</LinkButton>
          </>
        )}
      </div>
    </section>
  )
}

export function PublicIntakeWorkspace({
  initialDraft,
  onRestart,
  experience = 'ADVICE_GUIDE',
}: {
  initialDraft: PublicIntakeDraftView
  onRestart: () => void
  experience?: 'ADVICE_GUIDE' | 'HELP_REQUEST_V2'
}) {
  const [draft, setDraft] = useState(initialDraft)
  const [pendingAnswer, setPendingAnswer] = useState<PendingAnswer | null>(null)
  const [numberAnswer, setNumberAnswer] = useState('')
  const [editingQuestionKey, setEditingQuestionKey] = useState<string | null>(null)
  const [showTopicCorrection, setShowTopicCorrection] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState(
    initialDraft.answers.length > 0 ? 'Uw eerdere antwoorden zijn hervat.' : '',
  )
  const [isPending, startTransition] = useTransition()
  const firstQuestionControlRef = useRef<HTMLInputElement>(null)
  const confirmationContainerRef = useRef<HTMLElement>(null)
  const clarification = draft.guidance.clarification
  const nextContextQuestion = (draft.contextQuestions ?? []).find(
    (question) => !draft.answers.some((answer) => answer.questionKey === question.questionKey),
  )
  const nextQuestionKey = nextContextQuestion?.questionKey ?? clarification.nextQuestion?.key ?? null
  const currentStep = nextContextQuestion || !clarification.isComplete ? 'SITUATION' : 'SUMMARY'
  const isReadyForSummary =
    !nextContextQuestion &&
    (draft.guidance.completion.status === 'COMPLETED_WITH_GUIDANCE' ||
      draft.guidance.completion.status === 'COMPLETED_WITH_SAFE_FALLBACK')
  const isHelpRequestV2 = experience === 'HELP_REQUEST_V2'
  const unansweredContextQuestions = (draft.contextQuestions ?? []).filter(
    (contextQuestion) => !draft.answers.some((answer) => answer.questionKey === contextQuestion.questionKey),
  ).length
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
      : baseQuestion && nextContextQuestion
        ? { ...baseQuestion, legend: nextContextQuestion.textSnapshot }
        : baseQuestion

  const answeredQuestions = useMemo(
    () => draft.answers.filter((answer) => getPublicIntakePrototypeQuestion(answer.questionKey)),
    [draft.answers],
  )
  const editingBaseQuestion = editingQuestionKey
    ? getPublicIntakePrototypeQuestion(editingQuestionKey)
    : null
  const editingContextQuestion = editingQuestionKey
    ? draft.contextQuestions?.find((item) => item.questionKey === editingQuestionKey)
    : null
  const editingQuestion = editingBaseQuestion
    ? {
        ...editingBaseQuestion,
        ...(editingContextQuestion ? { legend: editingContextQuestion.textSnapshot } : {}),
      }
    : null

  useEffect(() => {
    if (showUnderstandingConfirmation) {
      confirmationContainerRef.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus()
      return
    }
    if (nextQuestionKey) firstQuestionControlRef.current?.focus()
  }, [nextQuestionKey, showUnderstandingConfirmation])

  function saveAnswer(answer: PendingAnswer, targetQuestion = question) {
    if (!targetQuestion || isPending) return
    setPendingAnswer(answer)
    setSaveError(null)
    setSaveMessage('Uw antwoord wordt opgeslagen…')
    startTransition(() => {
      const action =
        targetQuestion.questionKey === 'guidance_topic'
          ? recordPublicIntakeTopicSelectionAction
          : recordPublicIntakeAnswerAction
      void action({
        questionKey: targetQuestion.questionKey,
        questionVersion: targetQuestion.questionVersion,
        disposition: answer.disposition,
        ...(answer.value !== undefined ? { value: answer.value } : {}),
      }).then((result) => {
        if (!result.ok) {
          setSaveError(result.message)
          setSaveMessage('')
          return
        }
        setDraft(result.draft)
        setEditingQuestionKey(null)
        setPendingAnswer(null)
        setNumberAnswer('')
        setSaveError(null)
        setSaveMessage(
          answer.disposition === 'SKIPPED' && targetQuestion.skipMessage
            ? targetQuestion.skipMessage
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
      {isHelpRequestV2 && (
        <div className="mb-4">
          <PublicHelpRequestProgress
            step={isReadyForSummary ? 'REVIEW' : draft.originalInput ? 'QUESTIONS' : 'HELP_REQUEST'}
            remainingQuestions={unansweredContextQuestions || (question ? 1 : 0)}
          />
        </div>
      )}
      <div className={isHelpRequestV2 ? 'grid gap-4' : 'grid gap-4 lg:grid-cols-[minmax(15rem,3fr)_minmax(0,7fr)] lg:items-start'}>
        {!isHelpRequestV2 && <PublicIntakeDesktopContext step={currentStep} />}

        <div className="min-w-0 space-y-3">
          {!isHelpRequestV2 && <PublicIntakeMobileContext step={currentStep} />}

          {draft.aiClassificationProtection && (
            <p role="status" className="rounded-control border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">
              Er zijn tijdelijk te veel aanvragen gedaan. U kunt het later opnieuw proberen of uw onderwerp zelf kiezen.
            </p>
          )}

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

        {isReadyForSummary && isHelpRequestV2 && (
          <section className="rounded-card border border-brand-primary/25 bg-brand-primary-subtle p-5 sm:p-6" aria-labelledby="help-request-summary-title">
            <p className="text-sm font-semibold text-brand-primary">Controle</p>
            <h2 id="help-request-summary-title" className="mt-1 text-2xl font-bold text-brand-dark">Dit hebben wij van uw vraag begrepen</h2>
            <dl className="mt-5 space-y-4">
              <div><dt className="text-sm font-semibold text-text-secondary">Uw oorspronkelijke hulpvraag</dt><dd className="mt-1 break-words text-brand-dark">{draft.originalInput}</dd></div>
              {getAIIntakeUnderstanding(draft.aiClassification) && <div><dt className="text-sm font-semibold text-text-secondary">Voorgestelde richting</dt><dd className="mt-1 font-semibold text-brand-dark">{getAIIntakeUnderstanding(draft.aiClassification)?.subjectLabel}</dd></div>}
            </dl>
            <p className="mt-4 text-sm text-text-secondary">Controleer uw antwoorden hieronder. De analyse is adviserend; u bevestigt zelf welke informatie bij uw aanvraag hoort.</p>
          </section>
        )}

        {isReadyForSummary && isHelpRequestV2 && editingQuestion && (
          <section className="rounded-card border border-border bg-surface p-5 sm:p-6" aria-labelledby="help-request-edit-title">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-primary">Antwoord aanpassen</p>
                <h2 id="help-request-edit-title" className="mt-1 text-xl font-bold text-brand-dark">{editingQuestion.legend}</h2>
              </div>
              <Button type="button" variant="outline" onClick={() => setEditingQuestionKey(null)}>Annuleren</Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(editingQuestion.options ?? []).map((option) => (
                <Button
                  key={`${option.disposition}:${option.value ?? ''}`}
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => saveAnswer({
                    disposition: option.disposition,
                    ...(option.value !== undefined ? { value: option.value } : {}),
                  }, editingQuestion)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </section>
        )}

        {isReadyForSummary && draft.guidance.outcome && !isHelpRequestV2 && (
          <PublicIntakeGuidanceResult outcome={draft.guidance.outcome} />
        )}

        {isReadyForSummary && draft.adviceDossier && (
          <section
            className="rounded-card border border-success-border bg-success-subtle p-5 sm:p-6"
            aria-labelledby="public-intake-dossier-title"
          >
            <p className="text-sm font-semibold text-success">
              Adviesdossier gereed
            </p>
            <h2
              id="public-intake-dossier-title"
              className="mt-1 text-xl font-bold text-brand-dark"
            >
              Uw WorkMatchr Adviesdossier is veilig opgeslagen
            </h2>
            <p className="mt-2 text-text-secondary">
              Dossiercode{' '}
              <span className="font-semibold text-brand-dark">
                {draft.adviceDossier.dossierCode}
              </span>
            </p>
            <AdviceDossierReadyActions dossierId={draft.adviceDossier.id} />
          </section>
        )}

        {isReadyForSummary && draft.adviceDossier === null && (
          <AnonymousAdviceSavePanel experience={experience} />
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
                <div key={answer.questionKey} className="min-w-0 rounded-control border border-transparent p-2">
                  <dt className="text-xs text-text-secondary">
                    {getPublicIntakePrototypeQuestion(answer.questionKey)?.legend}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-brand-dark">
                    {getPublicIntakeAnswerLabel(answer)}
                  </dd>
                  {isHelpRequestV2 && (getPublicIntakePrototypeQuestion(answer.questionKey)?.options?.length ?? 0) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setEditingQuestionKey(answer.questionKey)}
                    >
                      Wijzigen
                    </Button>
                  )}
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
