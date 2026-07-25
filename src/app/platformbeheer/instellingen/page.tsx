import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformSettingsOverview } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformSettingsPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/instellingen')
  const data = await getPlatformSettingsOverview(administrator.id)
  return (
    <>
      <AdminPageHeader title="Instellingen" description="Read-only zicht op platformconfiguratie. Deze module wijzigt geen systeeminstellingen." />
      <AdminSection title="Platformorganisatie">
        <div className="rounded-card border border-border bg-surface p-5">
          <p className="font-semibold text-brand-dark">{data.platformOrganization?.name ?? 'Niet geconfigureerd'}</p>
          <p className="mt-2 text-sm text-text-secondary">Systeemstatus: <StatusPill tone={data.platformOrganization?.status === 'ACTIVE' ? 'good' : 'bad'}>{data.platformOrganization?.status ?? 'Ontbreekt'}</StatusPill></p>
        </div>
      </AdminSection>
      <div className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Providertaxonomieën"><AdminTable headers={['Status', 'Aantal']}>{data.taxonomies.map((item) => <tr key={item.status}><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
        <AdminSection title="Vraagsetversies"><AdminTable headers={['Status', 'Aantal']}>{data.questionnaireVersions.map((item) => <tr key={item.status}><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
      </div>
      <AdminSection title="Notificatie-outbox"><AdminTable headers={['Status', 'Aantal']}>{data.outbox.map((item) => <tr key={item.status}><td className="px-4 py-3">{item.status}</td><td className="px-4 py-3">{item._count}</td></tr>)}</AdminTable></AdminSection>
    </>
  )
}
