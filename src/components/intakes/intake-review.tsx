import Link from 'next/link'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { LinkButton } from '@/components/ui/link-button'
import { StatusMessage } from '@/components/auth/auth-shell'
import { IntakeProgress } from '@/components/intakes/intake-progress'
import { IntakeReadyForm } from '@/components/intakes/intake-ready-form'
import { IntakeStatusBadge } from '@/components/intakes/intake-status-badge'
import type { IntakeDetailView, IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { getIntakeCategoryByKey, intakeCategorySteps } from '@/lib/intakes/intake-presentation'

function displayValue(question: IntakeQuestionView, intake: IntakeDetailView): string {
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
              {intake.status !== 'READY_FOR_REVIEW' && (
                <LinkButton href={`/hulpvragen/${intake.id}/${step.slug}`} variant="ghost">Wijzigen</LinkButton>
              )}
            </div>
            <dl className="mt-5 space-y-5">
              {questions.map((question) => (
                <div key={question.id}>
                  <dt className="text-sm font-semibold text-text-secondary">{question.label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap font-medium text-text-primary">{displayValue(question, intake)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}

      {intake.status === 'READY_FOR_REVIEW' ? (
        <div className="rounded-card border border-success/30 bg-success/10 p-6">
          <h2 className="text-lg font-bold text-brand-dark">Klaar voor de volgende module</h2>
          <p className="mt-2 text-text-secondary">
            De intake is gereed voor controle. Indienen, opdrachtvorming en matching zijn in deze versie nog niet beschikbaar.
          </p>
        </div>
      ) : (
        <IntakeReadyForm
          action={action}
          intakeId={intake.id}
          expectedIntakeVersion={intake.version}
          isComplete={intake.progress.isComplete}
        />
      )}
    </div>
  )
}
