import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { knownService,launchScopes } from '@/lib/marketplace/assignment-scope'
import { clientScope } from '@/lib/marketplace/assignment-scope-workflow'
import { requestScopeReviewAction,startMarketplaceMatchingAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { ActionForm, SubmitButton as Button } from '@/components/ui/action-form'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { getAssignmentSelectionView } from '@/lib/marketplace/dashboard-query-service'
import { presentMatchConfidence } from '@/lib/marketplace/marketplace-presentation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Selectie starten | WorkMatchr' }

export default async function AssignmentSelectionPage({ params,searchParams }: { params: Promise<{ assignmentId: string }>;searchParams:Promise<{service?:string;aangevraagd?:string}> }) {
  const { assignmentId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/opdrachten/${assignmentId}/selectie`)
  const result = await getAssignmentSelectionView(user.id, activeMembership.organization.id, assignmentId).catch(() => null)
  if (!result) notFound()
  const query=await searchParams
  const service=query.service
  const scope=knownService(service)?await clientScope(user.id,activeMembership.organization.id,assignmentId,service):null
  const latestRun = result.assignment.marketplaceMatchRuns[0]
  const previous=latestRun?.assignmentSnapshot as Record<string,unknown>|undefined
  const current=knownService(previous?.scopeService)?await clientScope(user.id,activeMembership.organization.id,assignmentId,previous.scopeService):null
  const stale=latestRun && (!current || current.state!=='BINNEN_SCOPE' || current.digest!==previous?.scopeDigest)

  return (
    <Section spacing="compact">
      <Heading as="h1" size="h2">Dienstverleners selecteren</Heading>
      <p className="mt-3 text-text-secondary">
        Start de uitlegbare selectie bewust voor {result.assignment.title}. WorkMatchr selecteert maximaal {result.assignment.maxSelections} geschikte dienstverleners.
      </p>
      <Card className="mt-8">
        {stale?<p>De opdracht of het dienstbeleid is gewijzigd. De eerdere selectie is niet meer geldig. Laat de actuele opdracht opnieuw controleren.</p>:latestRun ? (
          <>
            <h2 className="text-lg font-semibold">Laatste selectie</h2>
            <p className="mt-2 text-text-secondary">
              Afgerond op {latestRun.completedAt?.toLocaleString('nl-NL')} · kwaliteitsinschatting: {presentMatchConfidence(latestRun.confidenceLevel)} · {latestRun.candidates.length} geselecteerd.
            </p>
          </>
        ) : result.assignment.matchingBlockReason ? (<p>Uw opdracht is gepubliceerd. Professionals kunnen pas worden geselecteerd nadat u expliciet een primaire deskundigheid heeft gekozen.</p>) : result.assignment.status === 'OPEN' ? (
          <><form method="get" className="grid gap-3">
            <label>Dienst voor deze opdracht <select name="service" defaultValue={service??''} required><option value="">Kies een dienst</option>{Object.entries(launchScopes).map(([key,row])=><option key={key} value={key}>{row.name}</option>)}</select></label>
            <button type="submit">Controleer werkzaamheden</button></form>
            {scope && <p role="status" className="my-4">{scope.message} {scope.state==='BUITEN_SCOPE'&&'Pas de opdracht aan of kies een passende andere dienst.'}</p>}
            {scope?.reviewable && (scope.requested?<p>Uw beoordeling is aangevraagd.</p>:<ActionForm action={requestScopeReviewAction}>
              <input type="hidden" name="assignmentId" value={assignmentId}/><input type="hidden" name="service" value={service}/><input type="hidden" name="digest" value={scope.digest}/>
              <Button type="submit">Vraag inhoudelijke beoordeling aan</Button></ActionForm>)}
            {scope?.state==='BINNEN_SCOPE' && <ActionForm action={startMarketplaceMatchingAction}>
            <input type="hidden" name="service" value={service}/>
            <input type="hidden" name="assignmentId" value={result.assignment.id} />
            <input type="hidden" name="expectedAssignmentVersion" value={result.assignment.version} />
            <input type="hidden" name="idempotencyKey" value={`MATCH:${result.assignment.id}:${randomUUID()}`} />
            <Button type="submit">Selectie starten</Button>
            <p className="mt-3 text-sm text-text-secondary">
              Publicatie alleen start geen selectie. Deze actie legt een reproduceerbaar selectierapport vast.
            </p>
          </ActionForm>}</>
        ) : (
          <p>De selectie kan in de huidige opdrachtstatus niet worden gestart.</p>
        )}
      </Card>
    </Section>
  )
}
