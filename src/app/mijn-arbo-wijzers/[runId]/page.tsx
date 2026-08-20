import { notFound } from 'next/navigation'
import { AuthShell } from '@/components/auth/auth-shell'
import { ArboGuideReportView } from '@/components/arbo-guides/arbo-guide-report-view'
import { LinkButton } from '@/components/ui/link-button'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { ArboGuideRunError, getArboGuideRun } from '@/lib/arbo-guides/arbo-guide-run-service'

const guideLabels = { COMPLIANCE: 'Compliance-wijzer', BHV: 'BHV-wijzer', RIE: 'RI&E-wijzer', RISK: 'Risicowijzer' } as const

export default async function MyArboGuideDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/mijn-arbo-wijzers/${runId}`)
  let run
  try {
    run = await getArboGuideRun({ userId: user.id, organizationId: activeMembership.organization.id }, runId)
  } catch (error) {
    if (error instanceof ArboGuideRunError) notFound()
    throw error
  }
  return (
    <AuthShell title={guideLabels[run.guideType]} intro={`${run.reportNumber} · afgerond op ${new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long' }).format(run.completedAt!)}`} wide>
      <div className="mb-7 flex flex-wrap gap-3">
        <LinkButton href={`/mijn-arbo-wijzers/${run.id}/pdf`}>Download rapport (PDF)</LinkButton>
        <LinkButton href="/mijn-arbo-wijzers" variant="outline">Terug naar overzicht</LinkButton>
      </div>
      <ArboGuideReportView report={run.reportSnapshot} />
    </AuthShell>
  )
}
