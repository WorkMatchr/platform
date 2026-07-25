import Link from 'next/link'
import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listPlatformProviders, type ProviderListFilters } from '@/lib/platform-admin/platform-admin-query-service'

const statusLabels = { NOT_SELECTABLE: 'Niet selecteerbaar', SELECTABLE: 'Selecteerbaar', STALE: 'Actualisatie nodig', BLOCKED: 'Geblokkeerd' } as const

export default async function PlatformProvidersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/dienstverleners')
  const params = await searchParams
  const filters: ProviderListFilters = {
    query: params.q,
    status: Object.keys(statusLabels).includes(params.status ?? '') ? params.status as ProviderListFilters['status'] : undefined,
    service: params.service,
    sector: params.sector,
    region: params.region,
    qualification: params.qualification,
  }
  const providers = await listPlatformProviders(administrator.id, filters)
  return (
    <>
      <AdminPageHeader title="Dienstverleners" description="Kwalificatie, dossierstatus en de actuele Trusted Provider-status blijven afzonderlijk zichtbaar." />
      <FilterForm>
        <FilterField name="q" label="Organisatienaam" defaultValue={filters.query} />
        <FilterField name="status" label="Selecteerbaarheid"><select className="min-h-10 rounded-control border border-border px-3" name="status" defaultValue={filters.status ?? ''}><option value="">Alle statussen</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
        <FilterField name="service" label="Dienstcode" defaultValue={filters.service} />
        <FilterField name="sector" label="Sectorcode" defaultValue={filters.sector} />
        <FilterField name="region" label="Regiocode" defaultValue={filters.region} />
        <FilterField name="qualification" label="Kwalificatiecode" defaultValue={filters.qualification} />
      </FilterForm>
      {providers.length === 0 ? <EmptyState>Geen dienstverleners gevonden met deze filters.</EmptyState> : (
        <AdminTable headers={['Dienstverlener', 'Dossier', 'Kwalificatie', 'Readiness', 'Selecteerbaarheid', 'Professionals', 'Actie']}>
          {providers.map((provider) => <tr key={provider.id}>
            <td className="px-4 py-3 font-semibold text-brand-dark">{provider.organization.name}</td>
            <td className="px-4 py-3">{provider.lifecycleStatus}</td>
            <td className="px-4 py-3">{provider.platformQualificationStatus}</td>
            <td className="px-4 py-3">{provider.readinessStatus}</td>
            <td className="px-4 py-3"><StatusPill tone={provider.selectabilityStatus === 'SELECTABLE' ? 'good' : provider.selectabilityStatus === 'BLOCKED' ? 'bad' : 'warning'}>{statusLabels[provider.selectabilityStatus]}</StatusPill></td>
            <td className="px-4 py-3">{provider._count.professionals}</td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/dienstverleners/${provider.id}`}>Bekijken</Link></td>
          </tr>)}
        </AdminTable>
      )}
    </>
  )
}
