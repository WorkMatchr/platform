import Link from 'next/link'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { LinkButton } from '@/components/ui/link-button'
import { StatusMessage } from '@/components/auth/auth-shell'
import { IntakeProgress } from '@/components/intakes/intake-progress'
import { IntakeReadyForm } from '@/components/intakes/intake-ready-form'
import { IntakeStatusBadge } from '@/components/intakes/intake-status-badge'
import type { IntakeDetailView, IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { getIntakeCategoryByKey, intakeCategorySteps } from '@/lib/intakes/intake-presentation'
import { generateAssignmentDescription, generateAssignmentTitle } from '@/lib/assignments/assignment-generation'

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
  action,
  readyNotice = false,
}: {
  intake: IntakeDetailView
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  readyNotice?: boolean
}) {
  const missingCategories = [...new Set(
    intake.progress.missingQuestionKeys
      .map((key) => intake.questions.find((question) => question.key === key)?.category)
      .filter((category): category is IntakeQuestionView['category'] => Boolean(category)),
  )]
  const maySubmit = intake.viewerRole === 'OWNER' || intake.viewerRole === 'ADMIN'
  const firstMissingStep = getIntakeCategoryByKey(missingCategories[0])
  const answerText = (key: string) => {
    const value = intake.questions.find((question) => question.key === key)?.value
    return typeof value === 'string' ? value : ''
  }
  const assignmentPreview = intake.status === 'READY_FOR_REVIEW'
    ? {
        title: generateAssignmentTitle(answerText('HELP_REQUEST_DESCRIPTION')),
        description: generateAssignmentDescription({
          helpRequest: answerText('HELP_REQUEST_DESCRIPTION'),
          desiredOutcome: answerText('DESIRED_OUTCOME_DESCRIPTION'),
          situation: answerText('SITUATION_DESCRIPTION'),
        }),
      }
    : null

  return (
    <div className="space-y-6">
      {readyNotice && <StatusMessage>De intake is gereed voor controle.</StatusMessage>}

      <div className="rounded-card border border-border bg-surface-subtle p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <IntakeStatusBadge status={intake.status} />
          <p className="text-sm text-text-secondary">
            Laatst opgeslagen op {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(intake.updatedAt))}
          </p>
        </div>
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
        </dl>
      </div>

      {missingCategories.length > 0 && (
        <div className="rounded-card border border-warning/40 bg-warning/10 p-5" role="status">
          <h2 className="font-bold text-brand-dark">Nog niet alle verplichte vragen zijn ingevuld</h2>
          <ul className="mt-3 space-y-2">
            {missingCategories.map((category) => {
              const step = getIntakeCategoryByKey(category)
              return step ? (
                <li key={category}>
                  <Link className="font-semibold text-brand-primary-hover underline underline-offset-4" href={`/hulpvragen/${intake.id}/${step.slug}`}>
                    {step.label} aanvullen
                  </Link>
                </li>
              ) : null
            })}
          </ul>
        </div>
      )}

      {intakeCategorySteps.map((step) => {
        const questions = intake.questions.filter((question) => question.category === step.category)
        if (questions.length === 0) return null
        return (
          <section key={step.category} className="rounded-card border border-border bg-surface p-6 sm:p-7" aria-labelledby={`review-${step.category}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id={`review-${step.category}`} className="text-xl font-bold text-brand-dark">{step.label}</h2>
              {(intake.status === 'DRAFT' || intake.status === 'IN_PROGRESS') && (
                <LinkButton href={`/hulpvragen/${intake.id}/${step.slug}`} variant="ghost">Wijzigen</LinkButton>
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
          <h2 className="text-lg font-bold text-brand-dark">Deze intake is veilig bewaard</h2>
          <p className="mt-2 text-text-secondary">
            De hulpvraag is ingediend en kan niet meer worden gewijzigd. De gevormde conceptopdracht vindt U bij Uw opdrachten.
          </p>
          <LinkButton href="/opdrachten" variant="outline" className="mt-5">Naar mijn opdrachten</LinkButton>
        </div>
      ) : intake.status === 'READY_FOR_REVIEW' ? (
        <div className="space-y-6">
          {assignmentPreview && (
            <section className="rounded-card border border-border bg-surface p-6" aria-labelledby="assignment-preview-title">
              <h2 id="assignment-preview-title" className="text-xl font-bold text-brand-dark">Voorbeeld van Uw conceptopdracht</h2>
              <p className="mt-2 text-sm text-text-secondary">Deze titel en omschrijving worden zonder AI uit Uw gecontroleerde antwoorden samengesteld.</p>
              <dl className="mt-5 space-y-5">
                <div><dt className="text-sm font-semibold text-text-secondary">Titel</dt><dd className="mt-1 font-bold text-brand-dark">{assignmentPreview.title}</dd></div>
                <div><dt className="text-sm font-semibold text-text-secondary">Omschrijving</dt><dd className="mt-1 whitespace-pre-wrap text-text-primary">{assignmentPreview.description}</dd></div>
              </dl>
            </section>
          )}
          <div className="rounded-card border border-warning/40 bg-warning/10 p-6">
          <h2 className="text-lg font-bold text-brand-dark">Klaar om bewust in te dienen</h2>
          <p className="mt-2 text-text-secondary">
            Na succesvolle indiening wordt deze intake bewaard en kan deze niet meer worden gewijzigd. WorkMatchr maakt een conceptopdracht aan. Publicatie en matching starten nog niet.
          </p>
          {maySubmit ? (
            <LinkButton href={`/hulpvragen/${intake.id}/indienen`} className="mt-5 w-full sm:w-auto">
              Hulpvraag indienen
            </LinkButton>
          ) : (
            <p className="mt-4 font-semibold text-brand-dark">
              Uw hulpvraag staat klaar voor controle door een eigenaar of beheerder van de organisatie.
            </p>
          )}
          </div>
        </div>
      ) : (
        <>
          <IntakeReadyForm
            action={action}
            intakeId={intake.id}
            expectedIntakeVersion={intake.version}
            isComplete={intake.progress.isComplete}
          />
          {!intake.progress.isComplete && firstMissingStep && (
            <LinkButton href={`/hulpvragen/${intake.id}/${firstMissingStep.slug}`} variant="outline" className="w-full sm:w-auto">
              Ga naar het eerstvolgende ontbrekende onderdeel
            </LinkButton>
          )}
        </>
      )}
    </div>
  )
}
