import Link from 'next/link'
import { AdminPageHeader, AdminTable, EmptyState, FilterField, FilterForm, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listPlatformProviders, type ProviderListFilters } from '@/lib/platform-admin/platform-admin-query-service'
import {
  providerLifecycleLabels,
  providerQualificationLabels,
  providerReadinessLabels,
  providerSelectabilityLabels,
} from '@/lib/providers/provider-dossier-presentation'

export default async function PlatformProvidersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/dienstverleners')
  const params = await searchParams
  const filters: ProviderListFilters = {
    query: params.q,
    status: Object.keys(providerSelectabilityLabels).includes(params.status ?? '') ? params.status as ProviderListFilters['status'] : undefined,
    service: params.service,
    sector: params.sector,
    region: params.region,
    qualification: params.qualification,
  }
  const providers = await listPlatformProviders(administrator.id, filters)
  return (
    <>
      <AdminPageHeader title="Dienstverleners" description="Kwalificatie, dossierstatus en selecteerbaarheid blijven afzonderlijk zichtbaar." />
      <FilterForm>
        <FilterField name="q" label="Organisatienaam" defaultValue={filters.query} />
        <FilterField name="status" label="Selecteerbaarheid"><select className="min-h-10 rounded-control border border-border px-3" name="status" defaultValue={filters.status ?? ''}><option value="">Alle statussen</option>{Object.entries(providerSelectabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></FilterField>
        <FilterField name="service" label="Dienst" defaultValue={filters.service} />
        <FilterField name="sector" label="Sector" defaultValue={filters.sector} />
        <FilterField name="region" label="Regio" defaultValue={filters.region} />
        <FilterField name="qualification" label="Kwalificatie" defaultValue={filters.qualification} />
      </FilterForm>
      {providers.length === 0 ? <EmptyState>Geen dienstverleners gevonden met deze filters.</EmptyState> : (
        <AdminTable headers={['Dienstverlener', 'Dossier', 'Kwalificatie', 'Volledigheid', 'Selecteerbaarheid', 'Professionals', 'Actie']}>
          {providers.map((provider) => <tr key={provider.id}>
            <td className="px-4 py-3 font-semibold text-brand-dark">{provider.organization.name}</td>
            <td className="px-4 py-3">{providerLifecycleLabels[provider.lifecycleStatus]}</td>
            <td className="px-4 py-3">{providerQualificationLabels[provider.platformQualificationStatus]}</td>
            <td className="px-4 py-3">{providerReadinessLabels[provider.readinessStatus]}</td>
            <td className="px-4 py-3"><StatusPill tone={provider.selectabilityStatus === 'SELECTABLE' ? 'good' : provider.selectabilityStatus === 'BLOCKED' ? 'bad' : 'warning'}>{providerSelectabilityLabels[provider.selectabilityStatus]}</StatusPill></td>
            <td className="px-4 py-3">{provider._count.professionals}</td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/dienstverleners/${provider.id}`}>Bekijken</Link></td>
          </tr>)}
        </AdminTable>
      )}
    </>
  )
}
