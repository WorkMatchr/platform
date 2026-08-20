import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { LinkButton } from '@/components/ui/link-button'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { arboGuideReportSnapshotSchema, listArboGuideRuns } from '@/lib/arbo-guides/arbo-guide-run-service'

export const metadata = { title: 'Mijn Arbo-wijzers | WorkMatchr' }
const guideLabels = { COMPLIANCE: 'Compliance-wijzer', BHV: 'BHV-wijzer', RIE: 'RI&E-wijzer', RISK: 'Risicowijzer' } as const

export default async function MyArboGuidesPage() {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/mijn-arbo-wijzers')
  const runs = await listArboGuideRuns({ userId: user.id, organizationId: activeMembership.organization.id })
  return (
    <AuthShell title="Mijn Arbo-wijzers" intro="Bekijk en download de afgeronde wijzers van uw organisatie." wide>
      {runs.length === 0 ? (
        <StatusMessage>Er zijn nog geen afgeronde Arbo-wijzers voor uw organisatie.</StatusMessage>
      ) : (
        <ul className="grid gap-5">
          {runs.map((run) => {
            const report = arboGuideReportSnapshotSchema.parse(run.reportSnapshot)
            return (
              <li key={run.id} className="rounded-card border border-border bg-surface p-6 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-brand-dark">{guideLabels[run.guideType]}</h2>
                    <p className="mt-1 text-sm text-text-secondary">{run.reportNumber} · {new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(run.completedAt!)}</p>
                    <p className="mt-2 text-sm text-text-secondary">Wijzerversie {run.guideVersion} · rapportversie {run.reportVersion}</p>
                    <p className="mt-3 text-text-secondary">{report.summary.order} op orde · {report.summary.action} actie nodig · {report.summary.check} controleren · {report.summary.notApplicable} niet van toepassing</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <LinkButton href={`/mijn-arbo-wijzers/${run.id}`}>Bekijken</LinkButton>
                    <LinkButton href={`/mijn-arbo-wijzers/${run.id}/pdf`} variant="outline">Rapport downloaden</LinkButton>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </AuthShell>
  )
}
