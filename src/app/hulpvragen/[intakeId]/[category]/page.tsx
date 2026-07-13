import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { saveIntakeStepAction } from '@/app/hulpvragen/actions'
import { IntakeProgress } from '@/components/intakes/intake-progress'
import { IntakeStatusBadge } from '@/components/intakes/intake-status-badge'
import { IntakeStepForm } from '@/components/intakes/intake-step-form'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import {
  getIntakeCategoryBySlug,
  getPreviousIntakeCategory,
  intakeCategorySteps,
} from '@/lib/intakes/intake-presentation'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'

export const metadata: Metadata = { title: 'Hulpvraag invullen | WorkMatchr' }

export default async function IntakeCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ intakeId: string; category: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { intakeId, category: categorySlug } = await params
  const user = await requireUser(`/hulpvragen/${intakeId}/${categorySlug}`)
  const step = getIntakeCategoryBySlug(categorySlug)
  if (!step) notFound()

  let intake
  try {
    intake = await getIntakeDetail(user.id, intakeId)
  } catch (error) {
    if (error instanceof IntakeServiceError) notFound()
    throw error
  }
  if (intake.status === 'READY_FOR_REVIEW') redirect(`/hulpvragen/${intake.id}/controle`)
  if (intake.status !== 'DRAFT' && intake.status !== 'IN_PROGRESS') redirect('/hulpvragen')

  const questions = intake.questions.filter((question) => question.category === step.category)
  if (questions.length === 0) notFound()
  const previousStep = getPreviousIntakeCategory(step.category)
  const query = await searchParams
  const workModeQuestion = intake.questions.find((question) => question.key === 'PREFERRED_WORK_MODE')
  const remoteOptionId = workModeQuestion?.options.find((option) => option.value === 'REMOTE')?.id
  const selectedWorkModes = Array.isArray(workModeQuestion?.value) ? workModeQuestion.value : []
  const primaryLocationRequired = !remoteOptionId || !selectedWorkModes.includes(remoteOptionId)
  const currentStepNumber = intakeCategorySteps.findIndex((candidate) => candidate.category === step.category) + 1

  return (
    <Section spacing="compact">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <IntakeStatusBadge status={intake.status} />
            <span className="text-sm text-text-secondary">Stap {currentStepNumber} van {intakeCategorySteps.length}</span>
          </div>
          <Heading as="h1" size="h2" className="mt-4">{step.label}</Heading>
          <p className="mt-3 text-text-secondary">Uw antwoorden worden als concept bewaard voor {intake.organizationName}.</p>
          {query.opgeslagen === '1' && (
            <p role="status" className="mt-5 rounded-control bg-success/10 p-3 text-success">De vorige stap is opgeslagen.</p>
          )}
          <Card className="mt-7">
            <IntakeStepForm
              action={saveIntakeStepAction}
              intakeId={intake.id}
              expectedIntakeVersion={intake.version}
              category={step.category}
              questions={questions}
              locations={intake.locations}
              previousHref={previousStep ? `/hulpvragen/${intake.id}/${previousStep.slug}` : '/hulpvragen'}
              primaryLocationRequired={primaryLocationRequired}
            />
          </Card>
        </div>
        <aside className="rounded-card border border-border bg-surface-subtle p-5 lg:sticky lg:top-6" aria-label="Voortgang intake">
          <IntakeProgress progress={intake.progress} />
          <ol className="mt-5 space-y-2 text-sm">
            {intakeCategorySteps.map((candidate, index) => (
              <li key={candidate.category} className={candidate.category === step.category ? 'font-bold text-brand-dark' : 'text-text-secondary'}>
                {index + 1}. {candidate.label}{candidate.category === step.category ? ' — huidige stap' : ''}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Section>
  )
}
