import { notFound, redirect } from 'next/navigation'
import { requireClientAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { getLegacySimpleAdvice } from '@/lib/requests/legacy-simple-advice-service'
import { RequestServiceError } from '@/lib/requests/request-service'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { publishLegacySimpleAdviceAction, saveLegacySimpleAdviceAction } from '@/app/hulpvragen/simple-actions'
import { SimpleAdviceForm } from './simple-advice-form'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'

export async function LegacySimpleAdvicePage({ intakeId }: { intakeId: string }) {
  const viewer = await requireClientAdviceDossierViewer(`/hulpvragen/${intakeId}/hulpvraag`)
  let draft
  try { draft = await getLegacySimpleAdvice(viewer, intakeId) }
  catch (error) {
    if (error instanceof RequestServiceError || error instanceof IntakeServiceError) notFound()
    throw error
  }
  if ('publishedRequestId' in draft) redirect(`/aanvragen/${draft.publishedRequestId}/gepubliceerd`)
  if ('historicalAssignmentId' in draft) redirect(`/opdrachten/${draft.historicalAssignmentId}`)
  return <Section spacing="compact">
    <Heading as="h1" size="h2">Maak uw opdracht</Heading>
    <p className="mb-6 mt-3 text-text-secondary">Kies een deskundigheid of onderwerp. Beschrijf daarna waar u hulp bij nodig heeft.</p>
    <SimpleAdviceForm key={intakeId} draftId={intakeId} initialValues={draft.initialValues} initialVersion={draft.version}
      viewerId={viewer.userId} locations={draft.locations}
      action={publishLegacySimpleAdviceAction.bind(null, intakeId)} saveAction={saveLegacySimpleAdviceAction.bind(null, intakeId)} />
  </Section>
}
