import { reviewQueue } from '@/lib/marketplace/assignment-scope-workflow'
import { launchScopes } from '@/lib/marketplace/assignment-scope'
import { decideScopeAction } from '@/app/marktplaats/actions'
import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  applyMarketplaceMatchInterventionAction,
  correctMarketplaceCreditsAction,
  grantMarketplaceCreditsAction,
} from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireUser } from '@/lib/authorization'
import { getMarketplacePlatformDashboard } from '@/lib/marketplace/dashboard-query-service'
import { presentMatchConfidence } from '@/lib/marketplace/marketplace-presentation'

export const metadata: Metadata = { title: 'Marktplaatsbeheer | WorkMatchr' }

const selectClassName = 'rounded-control border border-border bg-surface px-4 py-3 font-normal'
const textAreaClassName = 'min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal'

export default async function MarketplaceAdminPage() {
  const user = await requireUser('/beheer/marktplaats')
  const dashboard = await getMarketplacePlatformDashboard(user.id).catch(() => null)
  if (!dashboard?.canManageMarketplace) notFound()

  const queue=await reviewQueue(user.id)
  return (
    <Section spacing="compact">
      <Heading as="h1" size="h2">Marktplaatsbeheer</Heading>
      <p className="mt-3 text-text-secondary">
        Beheer gecontroleerde uitzonderingen. Iedere handeling wordt met uitvoerder, reden en eenmalige procesreferentie vastgelegd.
      </p>
      <h2 className="mt-8 text-lg font-semibold">Werkzaamheden beoordelen</h2>
      {!queue.length && <p>Geen actuele aanvragen voor inhoudelijke beoordeling.</p>}
      {queue.map(s=><Card key={s.digest}><h3>{s.title} · {launchScopes[s.service].name}</h3><p>{s.description}</p><p className="whitespace-pre-line">{s.secondary.join('\n')}</p>
      <p>Deskundigheid: {s.specialisms.join(', ')} · Opdrachtversie {s.revision} · Beleidsversie {s.policyVersion}</p>
      <p className="whitespace-pre-line">{launchScopes[s.service].definition.replaceAll('**','')}</p>
      <form action={decideScopeAction} className="grid gap-3"><input type="hidden" name="service" value={s.service}/><input type="hidden" name="assignmentId" value={s.id}/><input type="hidden" name="digest" value={s.digest}/>
      <label>Motivering (geen persoonsgegevens)<textarea name="reason" minLength={10} maxLength={500} required/></label>
      <label>Besluit <select name="decision" required defaultValue=""><option value="">Kies een besluit</option><option value="binnen">Binnen de werkingssfeer, geen aanvullende bevoegdheid nodig</option><option value="buiten">Buiten scope: aanpassen of doorverwijzen</option></select></label>
      <Button type="submit">Besluit vastleggen</Button></form></Card>)}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Gratis credits toekennen</h2>
          <form action={grantMarketplaceCreditsAction} className="mt-5 grid gap-4">
            <label className="grid gap-2 font-semibold">
              Dienstverlener
              <select name="providerOrganizationId" required className={selectClassName}>
                <option value="">Kies een organisatie</option>
                {dashboard.providerOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-semibold">Aantal credits<input name="amount" type="number" min="1" step="1" required className={selectClassName} /></label>
            <label className="grid gap-2 font-semibold">Reden<textarea name="reason" required minLength={10} maxLength={500} className={textAreaClassName} /></label>
            <input type="hidden" name="idempotencyKey" value={`GRANT:${randomUUID()}`} />
            <Button type="submit" className="justify-self-start">Credits toekennen</Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Creditcorrectie</h2>
          <form action={correctMarketplaceCreditsAction} className="mt-5 grid gap-4">
            <label className="grid gap-2 font-semibold">
              Dienstverlener
              <select name="providerOrganizationId" required className={selectClassName}>
                <option value="">Kies een organisatie</option>
                {dashboard.providerOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 font-semibold">Correctie, positief of negatief<input name="amount" type="number" step="1" required className={selectClassName} /></label>
            <label className="grid gap-2 font-semibold">Reden<textarea name="reason" required minLength={10} maxLength={500} className={textAreaClassName} /></label>
            <input type="hidden" name="idempotencyKey" value={`CORRECTION:${randomUUID()}`} />
            <Button type="submit" className="justify-self-start">Correctie vastleggen</Button>
          </form>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Operationeel overzicht</h2>
          <dl className="mt-5 grid gap-4">
            <div><dt className="font-semibold">Dossiers voor beoordeling</dt><dd>{dashboard.providerReviews}</dd></div>
            <div><dt className="font-semibold">Actieve opdrachten</dt><dd>{dashboard.activeAssignments}</dd></div>
            <div><dt className="font-semibold">Mislukte notificaties</dt><dd>{dashboard.failedOutbox}</dd></div>
          </dl>
        </Card>
      </div>
      <div className="mt-8 grid gap-6">
        <Heading as="h2" size="h3">Selectie-interventies</Heading>
        {dashboard.openMatchRuns.length === 0 ? (
          <p className="text-text-secondary">Er zijn geen selecties die kunnen worden aangepast.</p>
        ) : dashboard.openMatchRuns.map((run) => (
          <Card key={run.id}>
            <h3 className="text-lg font-semibold">{run.assignment.title}</h3>
            <p className="mt-2 text-sm text-text-secondary">Kwaliteitsinschatting: {presentMatchConfidence(run.confidenceLevel)}</p>
            <form action={applyMarketplaceMatchInterventionAction} className="mt-5 grid gap-4">
              <fieldset className="grid gap-3">
                <legend className="font-semibold">Kies maximaal {run.assignment.maxSelections} geschikte dienstverleners</legend>
                {run.candidates.map((candidate) => (
                  <label key={candidate.id} className="flex items-start gap-3">
                    <input type="checkbox" name="candidateIds" value={candidate.id} defaultChecked={candidate.status === 'SELECTED'} className="mt-1" />
                    <span>{candidate.providerProfile.organization.name}{candidate.rank ? ` — rang ${candidate.rank}` : ''}</span>
                  </label>
                ))}
              </fieldset>
              <label className="grid gap-2 font-semibold">Reden voor de interventie<textarea name="reason" required minLength={10} maxLength={500} className="min-h-24 rounded-control border border-border bg-surface px-4 py-3 font-normal" /></label>
              <input type="hidden" name="matchRunId" value={run.id} />
              <input type="hidden" name="idempotencyKey" value={`MATCH_INTERVENTION:${run.id}:${randomUUID()}`} />
              <Button type="submit" className="justify-self-start">Selectie gecontroleerd aanpassen</Button>
            </form>
          </Card>
        ))}
      </div>
    </Section>
  )
}
