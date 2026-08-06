import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformSettingsOverview } from '@/lib/platform-admin/platform-admin-query-service'
import {
  notificationOutboxStatusLabels,
  organizationStatusLabels,
  providerTaxonomyVersionStatusLabels,
  questionnaireVersionStatusLabels,
} from '@/lib/presentation/platform-labels'

export default async function PlatformSettingsPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/instellingen')
  const data = await getPlatformSettingsOverview(administrator.id)
  return (
    <>
      <AdminPageHeader title="Instellingen" description="Alleen-lezenoverzicht van de platformconfiguratie. Hier worden geen systeeminstellingen gewijzigd." />
      <AdminSection title="Platformorganisatie">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="font-semibold text-brand-dark">{data.platformOrganization?.name ?? 'Niet geconfigureerd'}</p>
          <p className="mt-2 text-sm text-text-secondary">Systeemstatus: <StatusPill tone={data.platformOrganization?.status === 'ACTIVE' ? 'good' : 'bad'}>{data.platformOrganization ? organizationStatusLabels[data.platformOrganization.status] : 'Niet geconfigureerd'}</StatusPill></p>
        </div>
      </AdminSection>
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Taxonomieën voor dienstverleners"><AdminTable headers={['Status', 'Aantal']}>{data.taxonomies.map((item) => <tr key={item.status}><td className="px-4 py-3">{providerTaxonomyVersionStatusLabels[item.status]}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
        <AdminSection title="Vraagsetversies"><AdminTable headers={['Status', 'Aantal']}>{data.questionnaireVersions.map((item) => <tr key={item.status}><td className="px-4 py-3">{questionnaireVersionStatusLabels[item.status]}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
      </div>
      <AdminSection title="Wachtrij voor meldingen"><AdminTable headers={['Status', 'Aantal']}>{data.outbox.map((item) => <tr key={item.status}><td className="px-4 py-3">{notificationOutboxStatusLabels[item.status]}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
