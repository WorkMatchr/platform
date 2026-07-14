import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { submitIntakeAction } from '@/app/opdrachten/actions'
import { SubmitIntakeForm } from '@/components/assignments/submit-intake-form'
import { displayIntakeAnswer } from '@/components/intakes/intake-review'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { AssignmentServiceError } from '@/lib/assignments/assignment-errors'
import { getIntakeSubmissionContext } from '@/lib/assignments/assignment-query-service'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Hulpvraag indienen | WorkMatchr' }

export default async function SubmitIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/hulpvragen/${intakeId}/indienen`)

  let intake
  try {
    const context = await getIntakeSubmissionContext(user.id, activeMembership.organization.id, intakeId)
    if (context.assignmentId) redirect(`/opdrachten/${context.assignmentId}/aangemaakt`)
    if (context.status !== 'READY_FOR_REVIEW') redirect(`/hulpvragen/${intakeId}/controle`)

    intake = await getIntakeDetail(user.id, intakeId)
  } catch (error) {
    if (error instanceof AssignmentServiceError || error instanceof IntakeServiceError) notFound()
    throw error
  }
  const locationQuestion = intake.questions.find((question) => question.key === 'PRIMARY_LOCATION')
  const startDateQuestion = intake.questions.find((question) => question.key === 'PREFERRED_START_DATE')

  return (
      <Section spacing="compact" containerSize="narrow">
        <Heading as="h1" size="h2">Wilt U deze hulpvraag indienen?</Heading>
        <p className="mt-3 max-w-2xl text-text-secondary">
          Na indiening wordt Uw hulpvraag omgezet naar een conceptopdracht. De oorspronkelijke intake en antwoorden kunnen daarna niet meer worden gewijzigd.
        </p>

        <Card className="mt-8">
          <h2 className="text-xl font-bold text-brand-dark">Controleer Uw bevestiging</h2>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><dt className="text-sm font-semibold text-text-secondary">Organisatie</dt><dd className="mt-1 font-medium">{intake.organizationName}</dd></div>
            <div><dt className="text-sm font-semibold text-text-secondary">Beantwoorde onderdelen</dt><dd className="mt-1 font-medium">{intake.progress.answeredQuestionCount} van {intake.progress.totalQuestionCount}</dd></div>
            <div className="sm:col-span-2"><dt className="text-sm font-semibold text-text-secondary">Hulpvraag</dt><dd className="mt-1 whitespace-pre-wrap font-medium">{intake.freeText}</dd></div>
            {locationQuestion?.value && <div><dt className="text-sm font-semibold text-text-secondary">Locatie</dt><dd className="mt-1 font-medium">{displayIntakeAnswer(locationQuestion, intake)}</dd></div>}
            {startDateQuestion?.value && <div><dt className="text-sm font-semibold text-text-secondary">Gewenste startdatum</dt><dd className="mt-1 font-medium">{displayIntakeAnswer(startDateQuestion, intake)}</dd></div>}
          </dl>
        </Card>

        <div className="mt-8 rounded-card border border-warning/40 bg-warning/10 p-5">
          <h2 className="font-bold text-brand-dark">Goed om te weten</h2>
          <p className="mt-2 text-text-secondary">
            WorkMatchr maakt alleen een conceptopdracht. Deze wordt nog niet gepubliceerd en er worden nog geen specialisten geselecteerd.
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-start">
          <LinkButton href={`/hulpvragen/${intake.id}/controle`} variant="outline">Terug naar controle</LinkButton>
          <SubmitIntakeForm action={submitIntakeAction} intakeId={intake.id} expectedIntakeVersion={intake.version} />
        </div>
      </Section>
    )
}
