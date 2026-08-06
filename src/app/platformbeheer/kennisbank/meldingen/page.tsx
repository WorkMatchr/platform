import type { Metadata } from 'next'
import Link from 'next/link'
import type { KnowledgeImprovementReportStatus } from '@/generated/prisma/enums'
import { KnowledgeImprovementHandlingForm } from '@/components/platform-admin/knowledge-improvement-handling-form'
import { AdminPageHeader, AdminTable, EmptyState, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { knowledgeAdminLabels } from '@/lib/knowledge/knowledge-admin-presentation'
import { getKnowledgeImprovementReports } from '@/lib/knowledge/knowledge-improvement-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

export const metadata: Metadata = { title: 'Inhoudelijke meldingen | WorkMatchr' }

const statuses = ['NEW', 'UNDER_INVESTIGATION', 'PROCESSED', 'REJECTED', 'DUPLICATE'] as const satisfies readonly KnowledgeImprovementReportStatus[]

export default async function KnowledgeImprovementReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePlatformAdministrator('/platformbeheer/kennisbank/meldingen')
  const query = await searchParams
  const status = statuses.includes(query.status as KnowledgeImprovementReportStatus) ? query.status as KnowledgeImprovementReportStatus : undefined
  const reports = await getKnowledgeImprovementReports(status)

  return (
    <div>
      <AdminPageHeader
        eyebrow="Kennisbeheer"
        title="Inhoudelijke meldingen"
        description="Onderzoek gerichte signalen van professionals. Een melding wijzigt kennis nooit automatisch en heropent alleen de gekoppelde broncontrole."
        action={<Link className="inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle" href="/platformbeheer/kennisbank">Terug naar kennisbeheer</Link>}
      />
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="status">Status
          <select className="min-h-10 rounded-control border border-border bg-surface px-3" defaultValue={status ?? ''} id="status" name="status">
            <option value="">Alle meldingen</option>
            {statuses.map((value) => <option key={value} value={value}>{knowledgeAdminLabels.improvementReportStatus(value)}</option>)}
          </select>
        </label>
        <button className="min-h-10 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white" type="submit">Filter</button>
      </form>
      {reports.length === 0 ? <EmptyState>Er zijn geen inhoudelijke meldingen die aan dit filter voldoen.</EmptyState> : (
        <AdminTable headers={['Kennisitem', 'Melding', 'Melder', 'Status', 'Controletaak', 'Afhandeling']}>
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="max-w-sm px-4 py-3"><span className="font-semibold text-brand-dark">{report.claim.topic.title}</span><span className="mt-1 block text-xs text-text-secondary">{report.claim.externalKey} · risico {knowledgeAdminLabels.controlRisk(report.claim.controlRisk).toLowerCase()}</span></td>
              <td className="max-w-md px-4 py-3"><span className="font-semibold">{knowledgeAdminLabels.improvementReportType(report.reportType)}</span><p className="mt-1 text-sm">{report.explanation}</p>{report.sourceReference ? <p className="mt-1 break-all text-xs text-text-secondary">Bron: {report.sourceReference}</p> : null}</td>
              <td className="px-4 py-3">{report.reporterUser.displayName || report.reporterUser.email}</td>
              <td className="px-4 py-3"><StatusPill tone={report.status === 'NEW' ? 'warning' : report.status === 'PROCESSED' ? 'good' : report.status === 'REJECTED' ? 'bad' : 'neutral'}>{knowledgeAdminLabels.improvementReportStatus(report.status)}</StatusPill></td>
              <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline-offset-4 hover:underline" href={`/platformbeheer/kennisbank/beoordelingen/${report.reviewTask.id}`}>Open kenniscontrole</Link></td>
              <td className="px-4 py-3">{['PROCESSED', 'REJECTED', 'DUPLICATE'].includes(report.status) ? <span className="text-sm text-text-secondary">{report.resolution}</span> : <KnowledgeImprovementHandlingForm reportId={report.id} reviewTaskId={report.reviewTask.id} version={report.version} />}</td>
            </tr>
          ))}
        </AdminTable>
      )}
    </div>
  )
}
