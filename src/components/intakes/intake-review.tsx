import Link from 'next/link'
import type { PublishIntakeActionState } from '@/app/opdrachten/actions'
import { PublishIntakeForm } from '@/components/assignments/submit-intake-form'
import { LinkButton } from '@/components/ui/link-button'
import { IntakeProgress } from '@/components/intakes/intake-progress'
import { IntakeStatusBadge } from '@/components/intakes/intake-status-badge'
import type { IntakeDetailView, IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { getIntakeStepLabel, getVisibleIntakeSteps } from '@/lib/intakes/intake-presentation'
import { createIntakeAnswerLookup, isReviewQuestionVisible } from '@/lib/intakes/intake-question-catalog'
import { generateAssignmentDescription, generateAssignmentTitle } from '@/lib/assignments/assignment-generation'
import type { IntakeAssignmentReadiness } from '@/lib/assignments/intake-assignment-readiness'

export function displayIntakeAnswer(question: IntakeQuestionView, intake: IntakeDetailView): string {
  const value = question.value
  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) return 'Niet ingevuld'
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee'
  if (question.inputType === 'ORGANIZATION_LOCATION' && typeof value === 'string') {
    return intake.locations.find((location) => location.id === value)?.label ?? 'Niet meer beschikbare locatie'
  }
  if (Array.isArray(value)) {
    return value
      .map((optionId) => question.options.find((option) => option.id === optionId)?.label)
      .filter((label): label is string => Boolean(label))
      .join(', ') || 'Niet ingevuld'
  }
  if (question.inputType === 'DATE' && typeof value === 'string') {
    return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(
      new Date(`${value}T00:00:00.000Z`),
    )
  }
  return String(value)
}

export function IntakeReview({
  intake,
  readiness,
  action,
}: {
  intake: IntakeDetailView
  readiness: IntakeAssignmentReadiness
  action: (state: PublishIntakeActionState, formData: FormData) => Promise<PublishIntakeActionState>
}) {
  const maySubmit = intake.viewerRole === 'OWNER' || intake.viewerRole === 'ADMIN'
  const answerLookup = createIntakeAnswerLookup(intake.questions)
  const hasAnswer = (question: IntakeQuestionView) => question.value !== null && question.value !== '' && (!Array.isArray(question.value) || question.value.length > 0)
  const visibleQuestions = intake.questions.filter((question) => isReviewQuestionVisible(
    question.key,
    answerLookup,
    intake.questionnaireVersion,
    hasAnswer(question),
  ))
  const visibleSteps = getVisibleIntakeSteps([...new Set(visibleQuestions.map((question) => question.category))])
  const answerText = (key: string) => {
    const value = intake.questions.find((question) => question.key === key)?.value
    return typeof value === 'string' ? value : ''
  }
  const assignmentPreview = readiness.isReady && intake.status !== 'CONVERTED'
    ? {
        title: generateAssignmentTitle(answerText('HELP_REQUEST_DESCRIPTION')),
        description: generateAssignmentDescription({
          helpRequest: answerText('HELP_REQUEST_DESCRIPTION'),
          desiredOutcome: answerText('DESIRED_OUTCOME_DESCRIPTION') || answerText('GENERAL_SUPPORT_GOAL'),
          situation: answerText('SITUATION_DESCRIPTION') || answerText('GENERAL_RELEVANT_CONTEXT'),
        }),
      }
    : null

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border bg-surface-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <IntakeStatusBadge status={intake.status} />
          <p className="text-sm text-text-secondary">
            Laatst opgeslagen op {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(intake.updatedAt))}
          </p>
        </div>
        {intake.adviceDossierHandoff && (
          <p className="mt-5 rounded-control border border-success-border bg-success-subtle p-3 text-sm text-text-secondary">
            Deze opdracht is gestart vanuit Adviesdossier {intake.adviceDossierHandoff.dossierCode}. De overgenomen gegevens blijven aan dat dossier gekoppeld; u kunt uw opdracht hier verder aanvullen.
          </p>
        )}
        <div className="mt-5"><IntakeProgress progress={intake.progress} /></div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-text-secondary">Organisatie</dt>
            <dd className="mt-1 font-medium text-text-primary">{intake.organizationName}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-text-secondary">Oorspronkelijke hulpvraag</dt>
            <dd className="mt-1 whitespace-pre-wrap font-medium text-text-primary">{intake.freeText}</dd>
          </div>
          {intake.knowledgeContext && (
            <div>
              <dt className="text-sm font-semibold text-text-secondary">Onderwerp waarmee u begon</dt>
              <dd className="mt-1 font-medium text-text-primary">{intake.knowledgeContext.title}</dd>
            </div>
          )}
        </dl>
      </div>

      {!readiness.isReady && (
        <div className="rounded-card border border-warning/40 bg-warning/10 p-5" role="status">
          <h2 className="font-bold text-brand-dark">Uw opdracht kan nog niet worden gepubliceerd</h2>
          <p className="mt-2 text-text-secondary">Vul eerst de volgende gegevens aan:</p>
          <ul className="mt-3 space-y-2">
            {readiness.issues.map((issue) => (
              <li key={`${issue.code}-${issue.questionId ?? issue.section}`} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{issue.message}</span>
                {issue.editHref && (
                  <Link className="font-semibold text-brand-primary-hover underline underline-offset-4" href={issue.editHref}>
                    Aanpassen
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {visibleSteps.map((step) => {
        const questions = visibleQuestions.filter((question) => question.category === step.category)
        if (questions.length === 0) return null
        return (
          <section key={step.category} className="rounded-card border border-border bg-surface p-6 sm:p-7" aria-labelledby={`review-${step.category}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`review-${step.category}`} className="text-xl font-bold text-brand-dark">{getIntakeStepLabel(step.category, intake.questionnaireVersion)}</h2>
              {(intake.status === 'DRAFT' || intake.status === 'IN_PROGRESS') && (
                <LinkButton href={`/hulpvragen/${intake.id}/${step.slug}?wijzig=1`} variant="ghost">Wijzigen</LinkButton>
              )}
            </div>
            <dl className="mt-5 space-y-5">
              {questions.map((question) => (
                <div key={question.id}>
                  <dt className="text-sm font-semibold text-text-secondary">{question.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap font-medium text-text-primary">{displayIntakeAnswer(question, intake)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}

      {intake.status === 'CONVERTED' ? (
        <div className="rounded-card border border-border bg-surface-subtle p-6">
          <h2 className="text-lg font-bold text-brand-dark">Deze intake is verwerkt</h2>
          <p className="mt-2 text-text-secondary">
            De antwoorden zijn veilig bewaard en kunnen niet meer worden gewijzigd. De bijbehorende opdracht vindt u bij uw opdrachten.
          </p>
          <LinkButton href="/opdrachten" variant="outline" className="mt-5">Naar mijn opdrachten</LinkButton>
        </div>
      ) : (
        <div className="space-y-6">
          {assignmentPreview && (
            <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="assignment-preview-title">
              <h2 id="assignment-preview-title" className="text-xl font-bold text-brand-dark">Uw opdracht</h2>
              <p className="mt-2 text-sm text-text-secondary">Deze titel en omschrijving worden zonder AI uit uw gecontroleerde antwoorden samengesteld en bij publicatie vastgelegd.</p>
              <dl className="mt-5 space-y-5">
                <div><dt className="text-sm font-semibold text-text-secondary">Titel</dt><dd className="mt-1 font-bold text-brand-dark">{assignmentPreview.title}</dd></div>
                <div><dt className="text-sm font-semibold text-text-secondary">Omschrijving</dt><dd className="mt-1 whitespace-pre-wrap text-text-primary">{assignmentPreview.description}</dd></div>
              </dl>
            </section>
          )}
          <div className="rounded-card border border-warning/40 bg-warning/10 p-6">
          <h2 className="text-lg font-bold text-brand-dark">Opdracht publiceren</h2>
          <p className="mt-2 text-text-secondary">Na publicatie kan WorkMatchr passende professionals selecteren. Controleer daarom of uw opdracht volledig en correct is.</p>
          {intake.questionnaireVersion >= 2 && (
            <p className="mt-3 text-sm text-text-secondary">De definitieve planning en uitvoerbaarheid spreekt u later met de professional af.</p>
          )}
          {maySubmit ? (
            <PublishIntakeForm action={action} intakeId={intake.id} expectedIntakeVersion={intake.version} readiness={readiness} />
          ) : (
            <p className="mt-4 font-semibold text-brand-dark">
              Uw opdracht staat klaar voor publicatie door een eigenaar of beheerder van de organisatie.
            </p>
          )}
          </div>
        </div>
      )}
    </div>
  )
}
