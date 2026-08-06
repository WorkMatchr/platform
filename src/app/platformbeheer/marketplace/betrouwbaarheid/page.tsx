import Link from 'next/link'
import { AdminPageHeader, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { listMarketplaceReliability } from '@/lib/marketplace/marketplace-reliability-service'

export default async function MarketplaceReliabilityPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer/marketplace/betrouwbaarheid')
  const organizations = await listMarketplaceReliability(administrator.id)
  return (
    <>
      <AdminPageHeader eyebrow="Marketplace" title="Betrouwbaarheid" description="Interne, objectieve signalen met de onderliggende gebeurtenissen. Deze informatie is niet zichtbaar voor opdrachtgevers of professionals." />
      <AdminTable headers={['Organisatie', 'KvK-nummer', 'Gepubliceerd', 'Relevante intrekkingen', 'Open verzoek', 'Actie']}>
        {organizations.map((organization) => (
          <tr key={organization.id}>
            <td className="px-4 py-3 font-semibold">{organization.name}</td>
            <td className="px-4 py-3">{organization.chamberOfCommerceNumber ?? 'Niet vastgelegd'}</td>
            <td className="px-4 py-3">{organization._count.requestsAsOrganization}</td>
            <td className="px-4 py-3">{organization._count.marketplaceReliabilityEvents}</td>
            <td className="px-4 py-3"><StatusPill tone={organization._count.marketplaceContactRequests ? 'warning' : 'neutral'}>{organization._count.marketplaceContactRequests ? 'Ja' : 'Nee'}</StatusPill></td>
            <td className="px-4 py-3"><Link className="font-semibold text-brand-primary underline" href={`/platformbeheer/marketplace/betrouwbaarheid/${organization.id}`}>Bekijk details</Link></td>
          </tr>
        ))}
      </AdminTable>
    </>
  )
}
