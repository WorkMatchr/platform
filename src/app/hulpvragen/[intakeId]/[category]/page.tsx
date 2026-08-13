import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { saveIntakeStepAction } from '@/app/hulpvragen/actions'
import { IntakeProgress } from '@/components/intakes/intake-progress'
import { IntakeStatusBadge } from '@/components/intakes/intake-status-badge'
import { IntakeStepForm } from '@/components/intakes/intake-step-form'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import {
  getIntakeCategoryBySlug,
  getIntakeStepLabel,
  getVisibleIntakeSteps,
} from '@/lib/intakes/intake-presentation'
import { classifyIntakeHelpRequest } from '@/lib/intakes/intake-classification'
import {
  createIntakeAnswerLookup,
  getVisibleIntakeCategories,
  isCatalogQuestionActive,
  isCatalogQuestionVisible,
} from '@/lib/intakes/intake-question-catalog'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'

export const metadata: Metadata = { title: 'Opdracht invullen | WorkMatchr' }

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

  const answerLookup = createIntakeAnswerLookup(intake.questions)
  const visibleSteps = getVisibleIntakeSteps(getVisibleIntakeCategories(intake.questions, answerLookup, intake.questionnaireVersion))
  const questions = intake.questions.filter((question) =>
    question.category === step.category &&
    isCatalogQuestionActive(question.key, intake.questionnaireVersion) &&
    !(intake.questionnaireVersion >= 2 && question.key === 'HELP_REQUEST_DESCRIPTION'),
  )
  const currentStepIndex = visibleSteps.findIndex((candidate) => candidate.category === step.category)
  const visibleQuestions = questions.filter((question) =>
    isCatalogQuestionVisible(question.key, answerLookup, intake.questionnaireVersion),
  )
  const initialVisibilityAnswers = Object.fromEntries(
    [...answerLookup].map(([key, values]) => [key, [...values]]),
  )

  if (questions.length === 0 || visibleQuestions.length === 0 || currentStepIndex < 0) {
    return (
      <Section spacing="compact" containerSize="narrow">
        <Card>
          <Heading as="h1" size="h2">De vragen konden niet worden geladen</Heading>
          <p className="mt-3 text-text-secondary">
            De vragen voor deze categorie konden niet worden geladen. Ga terug en kies de categorie opnieuw.
          </p>
          <div className="mt-6">
            <LinkButton href={`/hulpvragen/${intake.id}/hulpvraag`}>
              Terug naar categoriekeuze
            </LinkButton>
          </div>
        </Card>
      </Section>
    )
  }

  const previousStep = currentStepIndex > 0 ? visibleSteps[currentStepIndex - 1] : undefined
  const query = await searchParams
  const returnToReview = query.wijzig === '1'
  const workModeQuestion = intake.questions.find((question) => question.key === 'PREFERRED_WORK_MODE')
  const remoteOptionId = workModeQuestion?.options.find((option) => option.value === 'REMOTE')?.id
  const selectedWorkModes = Array.isArray(workModeQuestion?.value) ? workModeQuestion.value : []
  const primaryLocationRequired = !remoteOptionId || !selectedWorkModes.includes(remoteOptionId)
  const currentStepNumber = currentStepIndex + 1
  const classification = intake.questionnaireVersion >= 2
    ? classifyIntakeHelpRequest(
        intake.freeText,
        resolveActiveKnowledgeContext(intake.knowledgeContext?.id),
      )
    : undefined

  return (
    <Section spacing="compact">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <IntakeStatusBadge status={intake.status} />
            <span className="text-sm text-text-secondary">Stap {currentStepNumber} van {visibleSteps.length}</span>
          </div>
          <Heading as="h1" size="h2" className="mt-4">{getIntakeStepLabel(step.category, intake.questionnaireVersion)}</Heading>
          <p className="mt-3 text-text-secondary">Uw antwoorden worden automatisch bewaard voor {intake.organizationName}.</p>
          {intake.adviceDossierHandoff && (
            <p className="mt-5 rounded-control border border-success-border bg-success-subtle p-3 text-sm text-text-secondary" role="status">
              We hebben uw hulpvraag en relevante context uit Adviesdossier {intake.adviceDossierHandoff.dossierCode} overgenomen. U kunt deze opdracht hieronder aanvullen en corrigeren.
            </p>
          )}
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
              originalHelpRequest={intake.questionnaireVersion >= 2 && step.category === 'HELP_REQUEST' ? intake.freeText : undefined}
              classification={classification}
              questionnaireVersion={intake.questionnaireVersion}
              initialVisibilityAnswers={initialVisibilityAnswers}
              returnToReview={returnToReview}
              locations={intake.locations}
              previousHref={previousStep ? `/hulpvragen/${intake.id}/${previousStep.slug}` : '/hulpvragen'}
              primaryLocationRequired={primaryLocationRequired}
            />
          </Card>
        </div>
        <aside className="rounded-card border border-border bg-surface-subtle p-5 lg:sticky lg:top-6" aria-label="Voortgang intake">
          <IntakeProgress progress={intake.progress} />
          <ol className="mt-5 space-y-2 text-sm">
            {visibleSteps.map((candidate, index) => (
              <li key={candidate.category} className={candidate.category === step.category ? 'font-bold text-brand-dark' : 'text-text-secondary'}>
                {index + 1}. {getIntakeStepLabel(candidate.category, intake.questionnaireVersion)}{candidate.category === step.category ? ' — huidige stap' : ''}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Section>
  )
}
