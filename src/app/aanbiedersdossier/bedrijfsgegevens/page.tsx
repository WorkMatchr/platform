import Link from 'next/link'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierDashboard, getProviderDossierOrganizationSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderOrganizationPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/bedrijfsgegevens')
  const [data, dashboard] = await Promise.all([getProviderDossierOrganizationSection(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'ORGANIZATION' || !data.value) return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('ORGANIZATION')
  const readOnlyMessage = context.canManage
    ? 'De organisatiegegevens kunnen tijdens de huidige beoordeling niet worden gewijzigd.'
    : 'Deze organisatiegegevens zijn alleen-lezen. Een eigenaar of beheerder kan wijzigingen uitvoeren.'
  return <><ProviderPageHeader title="Bedrijfsgegevens" description="Controleer hier de administratieve organisatiegegevens. Uw introductie, omschrijving en werkwijze beheert u uitsluitend in het dienstverlenersprofiel." readOnly={!editable} readOnlyMessage={readOnlyMessage} />
    <Card className="mb-6"><h2 className="text-lg font-bold">Organisatiebasis</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-secondary">Naam</dt><dd>{data.value.organization.name}</dd></div><div><dt className="text-sm text-text-secondary">Handelsnaam</dt><dd>{data.value.organization.tradeName ?? 'Niet ingevuld'}</dd></div><div><dt className="text-sm text-text-secondary">KvK-nummer</dt><dd>{data.value.organization.chamberOfCommerceNumber ?? 'Niet ingevuld'}</dd></div><div><dt className="text-sm text-text-secondary">Website</dt><dd>{data.value.organization.website ?? 'Niet ingevuld'}</dd></div></dl>{context.canManage && <Link href="/organisatie/profiel" className="mt-5 inline-block font-semibold text-brand underline">Organisatiegegevens wijzigen</Link>}</Card>
    <Card><h2 className="text-lg font-bold">Dienstverlenersprofiel</h2><p className="mt-2 text-text-secondary">De inhoudelijke presentatie van uw dienstverlening staat op één centrale plek.</p><Link href="/aanbiedersdossier/profiel" className="mt-5 inline-block font-semibold text-brand underline">Dienstverlenersprofiel openen</Link></Card>
  </>
}
