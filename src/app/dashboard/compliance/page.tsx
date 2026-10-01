import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { LinkButton } from '@/components/ui/link-button'
import { Button } from '@/components/ui/button'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { getComplianceDashboard } from '@/lib/compliance/compliance-action-service'
import { c01RieQuestions } from '@/lib/compliance/c01-rie'
import { updateComplianceActionFromForm } from './actions'

export const metadata = { title: 'Arbo Compliance | WorkMatchr' }

const statusLabels = {
  OPEN: 'Open',
  IN_PROGRESS: 'In uitvoering',
  WAITING_EXTERNAL: 'Wacht op extern',
  DONE: 'Gereed',
  NOT_APPLICABLE: 'Niet van toepassing',
} as const

const priorityLabels = {
  CRITICAL: 'Kritiek',
  HIGH: 'Hoog',
  NORMAL: 'Normaal',
  LOW: 'Laag',
} as const

const resultStatusLabels = {
  ORDER: 'Op orde',
  ACTION: 'Actie vereist',
  CHECK: 'Aandacht nodig',
  NOT_APPLICABLE: 'Niet van toepassing',
} as const

const questionLabels = new Map<string, string>(c01RieQuestions.map((question) => [question.code, question.prompt]))

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium' }).format(new Date(value))
}

export default async function ComplianceDashboardPage() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/dashboard/compliance')
  const dashboard = await getComplianceDashboard({
    userId: user.id,
    organizationId: activeMembership.organization.id,
  })

  if (!dashboard.latestRun) {
    return (
      <AuthShell title="Arbo Compliance" intro="Beoordeel arbo-onderwerpen, leg acties vast en volg de voortgang." wide>
        <StatusMessage>Er is nog geen afgeronde Compliance Scan voor uw organisatie.</StatusMessage>
        <div className="mt-5">
          <LinkButton href="/wijzers/compliance/scan">Start gratis intake</LinkButton>
        </div>
      </AuthShell>
    )
  }

  const report = dashboard.latestRun.reportSnapshot
  const framework = dashboard.latestRun.complianceFrameworkVersion
  const activeActions = dashboard.actions.filter((action) => action.status !== 'DONE' && action.status !== 'NOT_APPLICABLE')
  const priorityOrder = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 } as const
  const actions = [...dashboard.actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return (
    <AuthShell
      title="Arbo Compliance"
      intro="Uw actuele scanuitkomst, aandachtspunten en opvolgacties op één plek."
      wide
    >
      <div className="mb-7 flex flex-wrap gap-3">
        <LinkButton href="/wijzers/compliance/scan">Nieuwe scan starten</LinkButton>
        <LinkButton href={'/mijn-arbo-wijzers/' + dashboard.latestRun.id + '/pdf'} variant="outline">PDF downloaden</LinkButton>
        <LinkButton href="/mijn-arbo-wijzers" variant="outline">Scanhistorie</LinkButton>
      </div>

      <section className="grid gap-4 md:grid-cols-4" aria-label="Samenvatting">
        <div className="rounded-card border border-border bg-surface p-5">
          <span className="text-sm text-text-secondary">Laatste scan</span>
          <strong className="mt-1 block text-lg text-brand-dark">{formatDate(dashboard.latestRun.completedAt)}</strong>
          <span className="mt-1 block text-sm text-text-secondary">{dashboard.latestRun.reportNumber}</span>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <span className="text-sm text-text-secondary">Actie vereist</span>
          <strong className="mt-1 block text-3xl text-brand-dark">{report.summary.action}</strong>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <span className="text-sm text-text-secondary">Aandacht nodig</span>
          <strong className="mt-1 block text-3xl text-brand-dark">{report.summary.check}</strong>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <span className="text-sm text-text-secondary">Open acties</span>
          <strong className="mt-1 block text-3xl text-brand-dark">{activeActions.length}</strong>
        </div>
      </section>

      <section className="mt-7 rounded-card border border-border bg-surface p-6">
        <h2 className="text-xl font-bold text-brand-dark">Scan en methodiek</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-sm text-text-secondary">Framework</dt><dd className="font-semibold text-brand-dark">{framework ? framework.frameworkCode + ' / ' + framework.version : 'Legacy Compliance-wijzer'}</dd></div>
          <div><dt className="text-sm text-text-secondary">Rapportversie</dt><dd className="font-semibold text-brand-dark">{dashboard.latestRun.reportVersion}</dd></div>
          <div><dt className="text-sm text-text-secondary">Rapporttype</dt><dd className="font-semibold text-brand-dark">{report.tier === 'EXTENDED' ? 'Volledige scan' : 'Indicatief basisrapport'}</dd></div>
        </dl>
        {report.tier !== 'EXTENDED' && (
          <p className="mt-4 rounded-control bg-surface-subtle p-4 text-sm text-text-secondary">
            Dit is een historisch basisrapport uit de eerdere Compliance-wijzer. Operationeel actiemanagement wordt alleen uit volledige scans opgebouwd.
          </p>
        )}
      </section>

      <section className="mt-7" aria-labelledby="compliance-results-heading">
        <h2 id="compliance-results-heading" className="text-2xl font-bold text-brand-dark">Resultaten per onderwerp</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {report.results.map((result) => (
            <article key={result.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-xl font-bold text-brand-dark">{result.title}</h3>
                <span className="rounded-pill bg-surface-subtle px-3 py-1 text-sm font-semibold text-brand-dark">{resultStatusLabels[result.status]}</span>
              </div>
              <p className="mt-3 text-text-secondary">{result.explanation}</p>
              <h4 className="mt-5 font-semibold text-brand-dark">Aanbevolen vervolgstap</h4>
              <p className="mt-1 text-text-secondary">{result.nextStep}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <span className="rounded-pill bg-surface-subtle px-3 py-1">Prioriteit: {priorityLabels[result.extended.priority]}</span>
                {result.extended.assessmentMode && <span className="rounded-pill bg-surface-subtle px-3 py-1">Beoordeling: {result.extended.assessmentMode === 'FULL' ? 'Volledig binnen scan' : result.extended.assessmentMode === 'SCREENING' ? 'Screening' : 'Specialist nodig'}</span>}
              </div>
              {result.extended.answerKeys.length > 0 && (
                <details className="mt-5">
                  <summary className="cursor-pointer font-semibold text-brand-primary">Waarop is dit gebaseerd?</summary>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                    {result.extended.answerKeys.map((code) => <li key={code}>{questionLabels.get(code) ?? 'Antwoord uit de scan'}</li>)}
                  </ul>
                </details>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="compliance-actions-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="compliance-actions-heading" className="text-2xl font-bold text-brand-dark">Actieplan</h2>
            <p className="mt-1 text-text-secondary">Wijs acties toe, plan een datum en houd de voortgang bij. De oorspronkelijke scanuitkomst blijft ongewijzigd.</p>
          </div>
        </div>

        {actions.length === 0 ? (
          <div className="mt-5 rounded-card border border-border bg-surface p-6 text-text-secondary">
            {report.tier === 'EXTENDED' ? 'Voor deze scan zijn geen operationele acties aangemaakt.' : 'Actiemanagement is beschikbaar bij een volledige Compliance Scan.'}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {actions.map((action) => (
              <article key={action.id} className="rounded-card border border-border bg-surface p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-pill bg-surface-subtle px-3 py-1">Prioriteit: {priorityLabels[action.priority]}</span>
                      <span className="rounded-pill bg-surface-subtle px-3 py-1">{statusLabels[action.status]}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-brand-dark">{action.title}</h3>
                    <p className="mt-2 text-text-secondary">{action.description}</p>
                  </div>
                </div>

                <form action={updateComplianceActionFromForm} className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
                  <input type="hidden" name="actionId" value={action.id} />
                  <label className="grid gap-1 text-sm font-semibold text-brand-dark">
                    Voortgang
                    <select name="status" defaultValue={action.status} className="min-h-11 rounded-control border border-border bg-surface px-3 font-normal">
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-brand-dark">
                    Verantwoordelijke
                    <select name="assignedUserId" defaultValue={action.assignedUserId ?? ''} className="min-h-11 rounded-control border border-border bg-surface px-3 font-normal">
                      <option value="">Nog niet toegewezen</option>
                      {dashboard.members.map((member) => <option key={member.id} value={member.id}>{member.displayName || member.email}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-brand-dark">
                    Deadline
                    <input name="dueAt" type="date" defaultValue={action.dueAt ? action.dueAt.toISOString().slice(0, 10) : ''} className="min-h-11 rounded-control border border-border bg-surface px-3 font-normal" />
                  </label>
                  <Button type="submit">Opslaan</Button>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-card bg-brand-dark p-6 text-text-on-dark">
        <h2 className="text-xl font-bold">Hulp nodig bij een actie?</h2>
        <p className="mt-2 max-w-3xl text-text-on-dark-muted">De volgende koppeling wordt de route van een concrete compliancebevinding naar een reviewbaar Adviesdossier en daarna de bestaande WorkMatchr-marktplaats.</p>
        <LinkButton href="/advieswijzer?context=COMPLIANCE" className="mt-5">Hulp inschakelen</LinkButton>
      </section>
    </AuthShell>
  )
}
