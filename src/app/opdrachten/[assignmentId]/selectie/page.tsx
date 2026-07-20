import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { startMarketplaceMatchingAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getAssignmentSelectionView } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Selectie starten | WorkMatchr' }

export default async function AssignmentSelectionPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/selectie`)
  const result = await getAssignmentSelectionView(user.id, activeMembership.organization.id, assignmentId).catch(() => null)
  if (!result) notFound()
  const latestRun = result.assignment.marketplaceMatchRuns[0]
  return <Section spacing="compact"><Heading as="h1" size="h2">Aanbieders selecteren</Heading><p className="mt-3 text-text-secondary">Start de uitlegbare selectie bewust voor {result.assignment.title}. WorkMatchr nodigt maximaal drie geschikte aanbieders uit.</p><Card className="mt-8">{latestRun ? <><h2 className="text-lg font-semibold">Laatste selectie</h2><p className="mt-2 text-text-secondary">Afgerond op {latestRun.completedAt?.toLocaleString('nl-NL')} · kwaliteitsinschatting {latestRun.confidenceLevel.toLowerCase()} · {latestRun.candidates.length} geselecteerd.</p></> : result.assignment.status === 'OPEN' ? <form action={startMarketplaceMatchingAction}><input type="hidden" name="assignmentId" value={result.assignment.id}/><input type="hidden" name="expectedAssignmentVersion" value={result.assignment.version}/><input type="hidden" name="idempotencyKey" value={`MATCH:${result.assignment.id}:${randomUUID()}`}/><Button type="submit">Selectie starten</Button><p className="mt-3 text-sm text-text-secondary">Publicatie alleen start geen selectie. Deze actie legt een reproduceerbaar Decision Report vast.</p></form> : <p>De selectie kan in de huidige opdrachtstatus niet worden gestart.</p>}</Card></Section>
}
