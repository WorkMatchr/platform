import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  archiveIntakeAction,
  markIntakeReadyForReviewAction,
  reopenIntakeAction,
} from '@/app/hulpvragen/actions'
import { IntakeReview } from '@/components/intakes/intake-review'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'

export const metadata: Metadata = { title: 'Intake controleren | WorkMatchr' }

export default async function IntakeReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ intakeId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { intakeId } = await params
  const user = await requireUser(`/hulpvragen/${intakeId}/controle`)
  let intake
  try {
    intake = await getIntakeDetail(user.id, intakeId)
  } catch (error) {
    if (error instanceof IntakeServiceError) notFound()
    throw error
  }
  if (!['DRAFT', 'IN_PROGRESS', 'READY_FOR_REVIEW', 'CONVERTED'].includes(intake.status)) {
    redirect('/hulpvragen')
  }
  const query = await searchParams

  return (
    <Section spacing="compact" containerSize="narrow">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading as="h1" size="h2">Controleer Uw intake</Heading>
          <p className="mt-3 text-text-secondary">Bekijk de volledige vraagverheldering en controleer wat er met Uw hulpvraag gebeurt.</p>
        </div>
        <LinkButton href="/hulpvragen" variant="outline">Naar overzicht</LinkButton>
      </div>
      {(query.opgeslagen === '1' || query.actie === 'mislukt') && (
        <p role="status" className={`mt-6 rounded-control p-3 ${query.actie ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {query.actie ? 'De actie kon niet worden uitgevoerd. Vernieuw de pagina en probeer het opnieuw.' : 'De laatste stap is opgeslagen.'}
        </p>
      )}
      <div className="mt-8">
        <IntakeReview intake={intake} action={markIntakeReadyForReviewAction} readyNotice={query.gereed === '1'} />
      </div>
      {intake.status === 'READY_FOR_REVIEW' && (
        <form action={reopenIntakeAction} className="mt-6 rounded-card border border-border bg-surface p-6">
          <input type="hidden" name="intakeId" value={intake.id} />
          <input type="hidden" name="expectedIntakeVersion" value={intake.version} />
          <h2 className="text-lg font-bold text-brand-dark">Nog iets aanpassen?</h2>
          <p className="mt-2 text-text-secondary">Zet de intake terug naar ‘In behandeling’ om antwoorden te wijzigen.</p>
          <Button type="submit" variant="outline" className="mt-5">Terug voor correctie</Button>
        </form>
      )}
      {(intake.status === 'DRAFT' || intake.status === 'IN_PROGRESS') && (
        <details className="mt-6 rounded-card border border-border bg-surface p-6">
          <summary className="min-h-11 cursor-pointer font-semibold text-brand-dark">Conceptintake archiveren</summary>
          <p className="mt-3 text-text-secondary">De intake verdwijnt uit het normale overzicht en kan daarna niet verder worden ingevuld.</p>
          <form action={archiveIntakeAction} className="mt-4">
            <input type="hidden" name="intakeId" value={intake.id} />
            <input type="hidden" name="expectedIntakeVersion" value={intake.version} />
            <Button type="submit" variant="outline">Archiveren bevestigen</Button>
          </form>
        </details>
      )}
    </Section>
  )
}
