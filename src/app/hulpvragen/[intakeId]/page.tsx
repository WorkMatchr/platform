import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getIntakeCategoryByKey, intakeCategorySteps } from '@/lib/intakes/intake-presentation'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'

export default async function ResumeIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params
  const user = await requireUser(`/hulpvragen/${intakeId}`)
  let intake
  try {
    intake = await getIntakeDetail(user.id, intakeId)
  } catch (error) {
    if (error instanceof IntakeServiceError) notFound()
    throw error
  }

  if (intake.status === 'READY_FOR_REVIEW') redirect(`/hulpvragen/${intake.id}/controle`)
  if (intake.status !== 'DRAFT' && intake.status !== 'IN_PROGRESS') redirect('/hulpvragen')

  const nextStep = intake.progress.nextIncompleteCategory
    ? getIntakeCategoryByKey(intake.progress.nextIncompleteCategory)
    : intakeCategorySteps[0]
  redirect(
    intake.progress.isComplete || !nextStep
      ? `/hulpvragen/${intake.id}/controle`
      : `/hulpvragen/${intake.id}/${nextStep.slug}`,
  )
}
