import { AdminPageHeader, AdminSection, AdminTable, EmptyState, FilterField, FilterForm } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAuditOverview } from '@/lib/platform-admin/platform-admin-query-service'

export default async function PlatformAuditorPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/auditor')
  const params = await searchParams
  const data = await getPlatformAuditOverview(administrator.id, params.q)
  const events = [
    ...data.accountEvents.map((event) => ({ id: `account-${event.id}`, source: 'Account', action: event.eventType, entity: event.subjectUserId, reason: event.reasonCode, at: event.occurredAt })),
    ...data.membershipEvents.map((event) => ({ id: `membership-${event.id}`, source: 'Membership', action: event.eventType, entity: event.userId, reason: event.reasonCode, at: event.occurredAt })),
    ...data.marketplaceEvents.map((event) => ({ id: `marketplace-${event.id}`, source: 'Marketplace', action: event.action, entity: event.entityId, reason: event.entityType, at: event.createdAt })),
    ...data.adminActions.map((event) => ({ id: `admin-${event.id}`, source: 'Beheeractie', action: event.action, entity: event.entityId, reason: event.reason, at: event.createdAt })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 150)
  return (
    <>
      <AdminPageHeader title="Auditor" description="Samengevoegd, filterbaar en volledig read-only overzicht van append-only auditbronnen." />
      <FilterForm><FilterField name="q" label="Actie, type of redencode" defaultValue={params.q} /></FilterForm>
      <AdminSection title="Recente auditgebeurtenissen">
        {events.length === 0 ? <EmptyState>Geen auditgebeurtenissen gevonden.</EmptyState> : <AdminTable headers={['Bron', 'Actie', 'Entiteit', 'Reden', 'Moment']}>{events.map((event) => <tr key={event.id}><td className="px-4 py-3">{event.source}</td><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3 font-mono text-xs">{event.entity}</td><td className="px-4 py-3">{event.reason ?? '—'}</td><td className="px-4 py-3">{event.at.toLocaleString('nl-NL')}</td></tr>)}</AdminTable>}
      </AdminSection>
    </>
  )
}
