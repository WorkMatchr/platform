import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { archiveIntakeAction } from '@/app/hulpvragen/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { requireUser } from '@/lib/authorization'
import { IntakeServiceError } from '@/lib/intakes/intake-errors'
import { getIntakeDetail } from '@/lib/intakes/intake-query-service'

export const metadata: Metadata = { title: 'Opdracht verwijderen | WorkMatchr' }

export default async function DeleteIntakePage({ params }: { params: Promise<{ intakeId: string }> }) {
  const { intakeId } = await params
  const user = await requireUser(`/hulpvragen/${intakeId}/verwijderen`)
  let intake
  try {
    intake = await getIntakeDetail(user.id, intakeId)
  } catch (error) {
    if (error instanceof IntakeServiceError) notFound()
    throw error
  }
  if (!['OWNER', 'ADMIN'].includes(intake.viewerRole)) notFound()
  if (!['DRAFT', 'IN_PROGRESS'].includes(intake.status)) redirect('/hulpvragen')

  return (
    <Section spacing="compact" containerSize="narrow">
      <Heading as="h1" size="h2">Opdracht verwijderen</Heading>
      <Card className="mt-6">
        <p className="font-semibold text-brand-dark">Weet u zeker dat u deze nog niet gepubliceerde opdracht wilt verwijderen?</p>
        <p className="mt-3 text-text-secondary">De opdracht verdwijnt uit uw overzicht. De audit- en statushistorie blijven veilig bewaard.</p>
        <p className="mt-4 rounded-control bg-surface-subtle p-4 text-sm text-text-secondary">{intake.freeText}</p>
        <form action={archiveIntakeAction} className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <input type="hidden" name="intakeId" value={intake.id} />
          <input type="hidden" name="expectedIntakeVersion" value={intake.version} />
          <LinkButton href="/hulpvragen" variant="outline">Annuleren</LinkButton>
          <Button type="submit" variant="outline">Opdracht verwijderen</Button>
        </form>
      </Card>
    </Section>
  )
}
